import http from 'node:http'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { loadConfig } from './config.mjs'
import { openDatabase, prepare } from './db.mjs'
import { RateLimiter, hashToken, parseCookies, SESSION_COOKIE } from './auth.mjs'
import { handleApi, errorResponse, HttpError } from './routes.mjs'
import { serveStatic } from './static.mjs'

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000
// New accounts per network address per hour: stops signup flooding without
// punishing a founder who signs in many times.
const SIGNUP_LIMIT_WINDOW_MS = 60 * 60 * 1000
const SESSION_SWEEP_MS = 5 * 60 * 1000

function resolveSession(ctx, req) {
  const cookies = parseCookies(req.headers.cookie)
  const token = cookies[SESSION_COOKIE]
  if (!token) return null

  const tokenHash = hashToken(token)
  const row = ctx.statements.findSession.get(tokenHash)
  if (!row) return null

  // Expiry is enforced server side; the cookie's Max-Age is only a hint.
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    ctx.statements.deleteSession.run(tokenHash)
    return null
  }
  return row
}

function applyCors(ctx, req, res) {
  if (!ctx.config.origin) return
  res.setHeader('Vary', 'Origin')
  const origin = req.headers.origin
  if (origin && origin === ctx.config.origin) {
    res.setHeader('Access-Control-Allow-Origin', ctx.config.origin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
  }
}

function handlePreflight(ctx, req, res) {
  if (!ctx.config.origin || req.headers.origin !== ctx.config.origin) {
    res.statusCode = 204
    res.end()
    return
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Frappe-CSRF-Token, Accept')
  res.setHeader('Access-Control-Max-Age', '600')
  res.statusCode = 204
  res.end()
}

export function createApp(config) {
  const db = openDatabase(config.dbPath)
  const statements = prepare(db)
  const rateLimiter = new RateLimiter({ limit: config.rateLimit, windowMs: RATE_LIMIT_WINDOW_MS })
  const signupLimiter = new RateLimiter({ limit: config.signupLimit, windowMs: SIGNUP_LIMIT_WINDOW_MS })

  const base = { config, statements, db, rateLimiter, signupLimiter }

  const server = http.createServer(async (req, res) => {
    const started = process.hrtime.bigint()
    let pathname = '/'
    let method = 'GET'

    try {
      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
      try {
        pathname = decodeURIComponent(url.pathname)
      } catch {
        pathname = url.pathname
      }
      method = req.method || 'GET'

      // Per-request context: concurrent requests must never share session state.
      const ctx = { ...base, pathname, method, session: null }

      applyCors(ctx, req, res)

      if (method === 'OPTIONS') {
        handlePreflight(ctx, req, res)
        return
      }

      ctx.session = resolveSession(ctx, req)

      if (pathname.startsWith('/api/')) {
        const handled = await handleApi(ctx, req, res)
        if (!handled) {
          res.statusCode = 404
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify({ error: 'Not found' }))
        }
        return
      }

      if (!serveStatic(ctx, req, res)) {
        res.statusCode = 405
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.end(JSON.stringify({ error: 'Method not allowed' }))
      }
    } catch (error) {
      if (!(error instanceof HttpError)) {
        // Log the stack for diagnosis; never the request body, which can hold secrets.
        console.error('request failed:', error?.stack || error?.message || 'unknown error')
      }
      if (!res.headersSent) errorResponse(res, error)
      else res.destroy()
      if (error?.fatal) {
        res.on('finish', () => req.destroy())
      }
    } finally {
      if (config.log !== 'silent') {
        const durationMs = Number(process.hrtime.bigint() - started) / 1e6
        const user = res.userEmail ? ` user=${res.userEmail}` : ''
        console.log(
          `${new Date().toISOString()} ${method} ${pathname} ${res.statusCode} ${durationMs.toFixed(1)}ms${user}`,
        )
      }
    }
  })

  const sweep = setInterval(() => {
    try {
      statements.deleteExpiredSessions.run(new Date().toISOString())
    } catch {
      // A failed sweep must not take the server down.
    }
  }, SESSION_SWEEP_MS)
  sweep.unref?.()

  return {
    server,
    db,
    config,
    async close() {
      clearInterval(sweep)
      await new Promise((resolve) => server.close(resolve))
      try {
        db.close()
      } catch {
        // Already closed.
      }
    },
  }
}

export async function startServer(config = loadConfig()) {
  const app = createApp(config)
  await new Promise((resolve) => app.server.listen(config.port, resolve))
  const address = app.server.address()
  const port = typeof address === 'object' && address ? address.port : config.port
  if (config.log !== 'silent') {
    console.log(`EACH account service listening on http://localhost:${port}`)
    console.log(`  database ${config.dbPath}`)
    console.log(`  static   ${config.staticDir}`)
  }
  return { ...app, port }
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href

if (isMain) {
  const config = loadConfig()
  const app = await startServer(config)
  const shutdown = async () => {
    await app.close()
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}
