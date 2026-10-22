import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

export const PASSWORD_MIN = 10
export const PASSWORD_MAX = 200

export const SESSION_COOKIE = 'each_session'

// scrypt cost parameters. N=16384 with r=8 needs ~16 MB, under Node's 32 MB default maxmem.
const SCRYPT_N = 16384
const SCRYPT_R = 8
const SCRYPT_P = 1
const SCRYPT_KEYLEN = 64
const SALT_BYTES = 16

/** Hash a password with a fresh random salt. The raw password is never stored or logged. */
export function hashPassword(password) {
  const salt = randomBytes(SALT_BYTES)
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  })
  return [
    'scrypt',
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString('base64url'),
    hash.toString('base64url'),
  ].join('$')
}

/** Verify a password against a stored `scrypt$N$r$p$salt$hash` string in constant time. */
export function verifyPassword(password, stored) {
  const parts = String(stored || '').split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false
  const [, nRaw, rRaw, pRaw, saltRaw, hashRaw] = parts
  const N = Number.parseInt(nRaw, 10)
  const r = Number.parseInt(rRaw, 10)
  const p = Number.parseInt(pRaw, 10)
  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) return false

  let salt
  let expected
  try {
    salt = Buffer.from(saltRaw, 'base64url')
    expected = Buffer.from(hashRaw, 'base64url')
  } catch {
    return false
  }
  if (expected.length === 0) return false

  const actual = scryptSync(password, salt, expected.length, { N, r, p })
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

/** A dummy hash used to keep the timing of "unknown email" and "wrong password" comparable. */
export const DUMMY_PASSWORD_HASH = hashPassword('each-timing-equaliser')

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString('base64url')
}

/** Only the SHA-256 of a session token is ever persisted. */
export function hashToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

/** Constant-time comparison of two CSRF token strings. */
export function csrfMatches(provided, expected) {
  if (typeof provided !== 'string' || typeof expected !== 'string') return false
  const a = Buffer.from(provided, 'utf8')
  const b = Buffer.from(expected, 'utf8')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export function parseCookies(header) {
  const out = Object.create(null)
  if (!header) return out
  for (const part of String(header).split(';')) {
    const eq = part.indexOf('=')
    if (eq < 0) continue
    const key = part.slice(0, eq).trim()
    if (!key) continue
    const value = part.slice(eq + 1).trim()
    try {
      out[key] = decodeURIComponent(value)
    } catch {
      out[key] = value
    }
  }
  return out
}

export function sessionCookie(token, { maxAgeSeconds, secure }) {
  const flags = [
    `${SESSION_COOKIE}=${token}`,
    `Max-Age=${maxAgeSeconds}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
  ]
  if (secure) flags.push('Secure')
  return flags.join('; ')
}

export function clearedSessionCookie({ secure }) {
  const flags = [`${SESSION_COOKIE}=`, 'Max-Age=0', 'Path=/', 'HttpOnly', 'SameSite=Lax']
  if (secure) flags.push('Secure')
  return flags.join('; ')
}

/**
 * Fixed-window-per-key attempt limiter. Keys are opaque strings built by the caller
 * (IP + email), so no secret material ends up in the limiter state.
 *
 * Only *failed* attempts are recorded, so a founder who signs in ten times in an
 * afternoon is never locked out of their own account.
 */
export class RateLimiter {
  constructor({ limit, windowMs } = {}) {
    this.limit = Number.isInteger(limit) && limit > 0 ? limit : 10
    this.windowMs = Number.isInteger(windowMs) && windowMs > 0 ? windowMs : 15 * 60 * 1000
    this.hits = new Map()
  }

  /** True when the key has already spent its budget in this window. */
  blocked(key) {
    const now = Date.now()
    const recent = (this.hits.get(key) || []).filter((t) => now - t < this.windowMs)
    this.hits.set(key, recent)
    return recent.length >= this.limit
  }

  /** Record one failed attempt against the key. */
  record(key) {
    const now = Date.now()
    const recent = (this.hits.get(key) || []).filter((t) => now - t < this.windowMs)
    recent.push(now)
    this.hits.set(key, recent)
    this.prune(now)
  }

  /** Records an attempt. Returns false when the key is over the limit. */
  attempt(key) {
    if (this.blocked(key)) return false
    this.record(key)
    return true
  }

  /** Drop fully expired buckets so the map cannot grow without bound. */
  prune(now = Date.now()) {
    if (this.hits.size < 256) return
    for (const [key, times] of this.hits) {
      const kept = times.filter((t) => now - t < this.windowMs)
      if (kept.length === 0) this.hits.delete(key)
      else this.hits.set(key, kept)
    }
  }
}
