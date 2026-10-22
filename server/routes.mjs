import {
  DUMMY_PASSWORD_HASH,
  PASSWORD_MAX,
  PASSWORD_MIN,
  clearedSessionCookie,
  csrfMatches,
  hashPassword,
  hashToken,
  randomToken,
  sessionCookie,
  verifyPassword,
} from './auth.mjs'

const COLLECTIONS = [
  'foundingCapital',
  'expenses',
  'employees',
  'aiEmployees',
  'projects',
  'objectives',
  'actions',
  'loans',
]

const MAX_STATE_BYTES = 2_000_000
const MAX_DECODED_BODY_BYTES = 3 * 1024 * 1024
const MAX_RAW_BODY_BYTES = 12 * 1024 * 1024

export class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

function respond(res, status, payload) {
  const body = JSON.stringify(payload)
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Content-Length', Buffer.byteLength(body))
  // Session and workspace payloads must never be cached by a proxy.
  res.setHeader('Cache-Control', 'no-store')
  res.end(body)
}

function publicUser(row) {
  return {
    email: row.email,
    name: row.name ?? null,
    companyName: row.company_name ?? null,
    createdAt: row.created_at,
  }
}

export function normalizeEmail(value) {
  if (typeof value !== 'string') return ''
  const email = value.trim().toLowerCase()
  if (!email || email.length > 254) return ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return ''
  return email
}

function clientIp(req) {
  // Only the socket address is trusted; forwarding headers are attacker-controlled.
  return req.socket?.remoteAddress || 'unknown'
}

/** Read the raw body, refusing anything past the hard cap. */
async function readRawBody(req) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_RAW_BODY_BYTES) {
      const error = new HttpError(413, 'Request body too large')
      error.fatal = true
      throw error
    }
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

async function readJsonBody(req) {
  const raw = await readRawBody(req)
  const text = raw.toString('utf8')
  if (Buffer.byteLength(text, 'utf8') > MAX_DECODED_BODY_BYTES) {
    throw new HttpError(413, 'Request body too large')
  }
  if (!text.trim()) return {}
  try {
    const parsed = JSON.parse(text)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    throw new HttpError(400, 'Invalid JSON body')
  }
}

/**
 * Read the workspace payload. Accepts JSON `{"state": {...}}` and the
 * urlencoded `state=<json string>` shape the Frappe client already sends.
 */
async function readStatePayload(req) {
  const contentType = String(req.headers['content-type'] || '').toLowerCase()
  const raw = await readRawBody(req)

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const text = raw.toString('utf8')
    const params = new URLSearchParams(text)
    const value = params.get('state')
    if (value === null) {
      // Decoded size still has to respect the transport cap.
      if (Buffer.byteLength(text, 'utf8') > MAX_DECODED_BODY_BYTES) {
        throw new HttpError(413, 'Request body too large')
      }
      throw new HttpError(400, 'State must be a JSON object')
    }
    if (Buffer.byteLength(value, 'utf8') > MAX_DECODED_BODY_BYTES) {
      throw new HttpError(413, 'Request body too large')
    }
    return value
  }

  const text = raw.toString('utf8')
  if (Buffer.byteLength(text, 'utf8') > MAX_DECODED_BODY_BYTES) {
    throw new HttpError(413, 'Request body too large')
  }
  if (!text.trim()) throw new HttpError(400, 'State must be a JSON object')
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new HttpError(400, 'State must be a JSON object')
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new HttpError(400, 'State must be a JSON object')
  }
  return Object.prototype.hasOwnProperty.call(parsed, 'state') ? parsed.state : parsed
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Mirrors the Frappe put_state validation, in the same order and with the same messages. */
export function validateState(raw) {
  let parsed = raw
  if (typeof parsed === 'string') {
    if (Buffer.byteLength(parsed, 'utf8') > MAX_STATE_BYTES) {
      throw new HttpError(400, 'Workspace exceeds the 2 MB limit')
    }
    try {
      parsed = JSON.parse(parsed)
    } catch {
      throw new HttpError(400, 'State must be a JSON object')
    }
  }
  if (!isPlainObject(parsed)) throw new HttpError(400, 'State must be a JSON object')
  if (parsed.dataTenant === 'abc' || parsed.onboarded !== true) {
    throw new HttpError(400, 'Demo and reset data cannot overwrite a database workspace')
  }
  for (const key of COLLECTIONS) {
    const rows = parsed[key]
    if (!Array.isArray(rows) || rows.length > 10000 || !rows.every(isPlainObject)) {
      throw new HttpError(400, `Invalid workspace collection: ${key}`)
    }
  }
  const encoded = JSON.stringify(parsed)
  if (Buffer.byteLength(encoded, 'utf8') > MAX_STATE_BYTES) {
    throw new HttpError(400, 'Workspace exceeds the 2 MB limit')
  }
  return { parsed, encoded }
}

function requireSession(ctx) {
  if (!ctx.session) throw new HttpError(401, 'Authentication required')
  return ctx.session
}

function issueSession(ctx, userId) {
  const token = randomToken(32)
  const csrfToken = randomToken(32)
  const now = new Date()
  const expires = new Date(now.getTime() + ctx.config.sessionDays * 24 * 60 * 60 * 1000)
  ctx.statements.insertSession.run(
    hashToken(token),
    userId,
    csrfToken,
    now.toISOString(),
    expires.toISOString(),
  )
  return { token, csrfToken }
}

function setSessionCookie(ctx, res, token) {
  res.setHeader(
    'Set-Cookie',
    sessionCookie(token, {
      maxAgeSeconds: ctx.config.sessionDays * 24 * 60 * 60,
      secure: ctx.config.secureCookies,
    }),
  )
}

function rateLimitKey(req, email) {
  return `${clientIp(req)}|${email}`
}

async function signup(ctx, req, res) {
  const body = await readJsonBody(req)
  const email = normalizeEmail(body.email)
  const key = rateLimitKey(req, email)
  if (!email) throw new HttpError(400, 'Enter a valid email address')
  if (ctx.rateLimiter.blocked(key)) throw new HttpError(429, 'Too many attempts. Try again later.')
  if (ctx.signupLimiter.blocked(clientIp(req))) {
    throw new HttpError(429, 'Too many accounts from this network. Try again later.')
  }

  const password = typeof body.password === 'string' ? body.password : ''
  if (password.length < PASSWORD_MIN) {
    ctx.rateLimiter.record(key)
    throw new HttpError(400, `Password must be at least ${PASSWORD_MIN} characters`)
  }
  if (password.length > PASSWORD_MAX) {
    ctx.rateLimiter.record(key)
    throw new HttpError(400, `Password must be at most ${PASSWORD_MAX} characters`)
  }

  if (ctx.statements.findUserByEmail.get(email)) {
    ctx.rateLimiter.record(key)
    throw new HttpError(409, 'That email already has an account')
  }

  const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim().slice(0, 200) : null
  const companyName =
    typeof body.companyName === 'string' && body.companyName.trim()
      ? body.companyName.trim().slice(0, 200)
      : null
  const createdAt = new Date().toISOString()

  const result = ctx.statements.insertUser.run(
    email,
    name,
    companyName,
    hashPassword(password),
    createdAt,
  )
  const userId = Number(result.lastInsertRowid)
  // Every account gets a workspace row so later saves have a home.
  ctx.statements.upsertWorkspace.run(userId, null, createdAt)
  ctx.signupLimiter.record(clientIp(req))

  const { token } = issueSession(ctx, userId)
  setSessionCookie(ctx, res, token)
  res.userEmail = email
  respond(res, 201, {
    user: { email, name, companyName, createdAt },
  })
}

async function login(ctx, req, res) {
  const body = await readJsonBody(req)
  const email = normalizeEmail(body.email)
  const password = typeof body.password === 'string' ? body.password : ''
  const key = rateLimitKey(req, email)
  if (ctx.rateLimiter.blocked(key)) throw new HttpError(429, 'Too many attempts. Try again later.')

  const user = email ? ctx.statements.findUserByEmail.get(email) : undefined
  if (!user) {
    // Burn an equivalent scrypt so a missing account is not faster than a wrong password.
    verifyPassword(password, DUMMY_PASSWORD_HASH)
    ctx.rateLimiter.record(key)
    throw new HttpError(401, 'Invalid email or password')
  }
  if (!verifyPassword(password, user.password_hash)) {
    ctx.rateLimiter.record(key)
    throw new HttpError(401, 'Invalid email or password')
  }

  const { token } = issueSession(ctx, Number(user.id))
  setSessionCookie(ctx, res, token)
  res.userEmail = user.email
  respond(res, 200, { user: publicUser(user) })
}

function logout(ctx, req, res) {
  if (ctx.session) {
    ctx.statements.deleteSession.run(ctx.session.token_hash)
    res.userEmail = ctx.session.email
  }
  res.setHeader('Set-Cookie', clearedSessionCookie({ secure: ctx.config.secureCookies }))
  res.statusCode = 204
  res.end()
}

function sessionInfo(ctx, req, res) {
  const session = ctx.session
  respond(res, 200, { user: session ? publicUser(session) : null })
}

function frappeSessionInfo(ctx, req, res) {
  const session = requireSession(ctx)
  respond(res, 200, { message: { user: session.email, csrf_token: session.csrf_token } })
}

function frappeHealth(ctx, req, res) {
  respond(res, 200, { message: { ok: true, site: 'each-account-service', database: 'sqlite' } })
}

function frappeGetState(ctx, req, res) {
  const session = requireSession(ctx)
  const row = ctx.statements.getWorkspace.get(session.user_id)
  const state = row && row.state_json ? JSON.parse(row.state_json) : null
  respond(res, 200, { message: state })
}

async function frappePutState(ctx, req, res) {
  const session = requireSession(ctx)

  // CSRF: a mutating call must carry the token issued with this session.
  const provided = req.headers['x-frappe-csrf-token']
  if (!csrfMatches(provided, session.csrf_token)) {
    throw new HttpError(403, 'CSRF token mismatch')
  }

  const raw = await readStatePayload(req)
  const { parsed, encoded } = validateState(raw)

  ctx.statements.upsertWorkspace.run(session.user_id, encoded, new Date().toISOString())
  respond(res, 200, { message: parsed })
}

/**
 * Route an /api/... request. Returns false when the path is not an API route,
 * so the caller can fall through to static file serving.
 */
export async function handleApi(ctx, req, res) {
  const { pathname, method } = ctx

  if (pathname === '/api/auth/signup' && method === 'POST') {
    await signup(ctx, req, res)
    return true
  }
  if (pathname === '/api/auth/login' && method === 'POST') {
    await login(ctx, req, res)
    return true
  }
  if (pathname === '/api/auth/logout' && (method === 'POST' || method === 'DELETE')) {
    logout(ctx, req, res)
    return true
  }
  if (pathname === '/api/auth/session' && method === 'GET') {
    sessionInfo(ctx, req, res)
    return true
  }

  if (pathname.startsWith('/api/method/')) {
    const name = pathname.slice('/api/method/'.length)
    if (name === 'each_backend.api.session_info' && method === 'GET') {
      frappeSessionInfo(ctx, req, res)
      return true
    }
    if (name === 'each_backend.api.get_state' && method === 'GET') {
      frappeGetState(ctx, req, res)
      return true
    }
    if (name === 'each_backend.api.put_state' && method === 'POST') {
      await frappePutState(ctx, req, res)
      return true
    }
    if (name === 'each_backend.api.health' && method === 'GET') {
      frappeHealth(ctx, req, res)
      return true
    }
    throw new HttpError(404, 'Unknown method')
  }

  return false
}

export function errorResponse(res, error) {
  const status = error instanceof HttpError ? error.status : 500
  const message =
    error instanceof HttpError ? error.message : 'Internal server error'
  respond(res, status, { error: message })
}
