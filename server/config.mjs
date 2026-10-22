import path from 'node:path'

const DEFAULTS = {
  port: 8080,
  dbPath: './data/each.sqlite',
  staticDir: './dist',
  sessionDays: 30,
  log: 'info',
  rateLimit: 10,
  signupLimit: 20,
}

/** Normalise an optional absolute origin to its bare origin (scheme://host[:port]). */
function parseOrigin(value) {
  if (!value) return null
  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

export function loadConfig(env = process.env) {
  const cwd = process.cwd()

  const port = Number.parseInt(env.EACH_PORT ?? '', 10)
  const sessionDays = Number.parseInt(env.EACH_SESSION_DAYS ?? '', 10)
  const rateLimit = Number.parseInt(env.EACH_RATE_LIMIT ?? '', 10)
  const signupLimit = Number.parseInt(env.EACH_SIGNUP_LIMIT ?? '', 10)

  return {
    port: Number.isInteger(port) && port >= 0 && port <= 65535 ? port : DEFAULTS.port,
    dbPath: path.resolve(cwd, env.EACH_DB_PATH || DEFAULTS.dbPath),
    staticDir: path.resolve(cwd, env.EACH_STATIC_DIR || DEFAULTS.staticDir),
    sessionDays: Number.isInteger(sessionDays) && sessionDays > 0 ? sessionDays : DEFAULTS.sessionDays,
    secureCookies: env.EACH_SECURE_COOKIES === '1',
    origin: parseOrigin(env.EACH_ORIGIN),
    log: env.EACH_LOG === 'silent' ? 'silent' : DEFAULTS.log,
    rateLimit: Number.isInteger(rateLimit) && rateLimit > 0 ? rateLimit : DEFAULTS.rateLimit,
    signupLimit: Number.isInteger(signupLimit) && signupLimit > 0 ? signupLimit : DEFAULTS.signupLimit,
  }
}
