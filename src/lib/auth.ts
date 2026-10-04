/** Phase 0 auth — sessionStorage gate. No secrets in repo. */

export type AuthProvider = 'google'
export type DataPath = 'axiom' | 'abc' | 'custom'

export interface AuthSession {
  provider: AuthProvider
  email: string
  name: string
  picture?: string
  dataPath: DataPath
  issuedAt: number
  /** Demo path skips OAuth but is not authenticated. */
  demo?: boolean
}

const SESSION_KEY = 'each-auth-v1'
const OAUTH_STATE_KEY = 'each-oauth-state'
const SESSION_TTL_MS = 8 * 60 * 60 * 1000

export function getAuthSession(): AuthSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as AuthSession
    if (!Number.isFinite(session.issuedAt) || session.issuedAt > Date.now() || Date.now() - session.issuedAt > SESSION_TTL_MS) {
      clearAuthSession()
      return null
    }
    return session
  } catch {
    return null
  }
}

export function setAuthSession(session: Omit<AuthSession, 'issuedAt'>): AuthSession {
  const next: AuthSession = { ...session, issuedAt: Date.now() }
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(next))
  return next
}

export function clearAuthSession(): void {
  sessionStorage.removeItem(SESSION_KEY)
}

export function setOAuthState(state: string): void {
  sessionStorage.setItem(OAUTH_STATE_KEY, state)
}

export function consumeOAuthState(): string | null {
  const state = sessionStorage.getItem(OAUTH_STATE_KEY)
  sessionStorage.removeItem(OAUTH_STATE_KEY)
  return state
}

export function isGoogleConfigured(): boolean {
  return Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID && import.meta.env.VITE_FRAPPE_URL)
}


interface GoogleJwtPayload {
  iss?: string
  aud?: string
  exp?: number
  email?: string
  name?: string
  picture?: string
  sub?: string
}

function decodeJwtPayload(token: string): GoogleJwtPayload {
  const part = token.split('.')[1]
  if (!part) throw new Error('Invalid JWT')
  const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'))
  return JSON.parse(json) as GoogleJwtPayload
}

/** Browser claims are untrusted; the server verifies signatures and entitlement. */
export async function verifyGoogleCredential(credential: string): Promise<AuthSession> {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  if (!clientId) throw new Error('VITE_GOOGLE_CLIENT_ID not set')
  const payload = decodeJwtPayload(credential)
  const now = Math.floor(Date.now() / 1000)
  if (payload.exp && payload.exp < now) throw new Error('Google token expired')
  if (payload.aud !== clientId) throw new Error('Google token audience mismatch')
  const backend = String(import.meta.env.VITE_FRAPPE_URL || '').replace(/\/$/, '')
  if (!backend) throw new Error('Google sign-in requires a verification server')
  const response = await fetch(`${backend}/api/method/each_backend.api.verify_google`, {
    method: 'POST', credentials: 'omit', signal: AbortSignal.timeout(15000),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: new URLSearchParams({ credential }),
  })
  if (!response.ok) throw new Error('Google sign-in failed or workspace access was denied')
  const result = await response.json() as { message?: { email?: string; name?: string; dataPath?: string } }
  if (!result.message?.email || result.message.dataPath !== 'axiom') throw new Error('Invalid verification response')
  const email = result.message.email
  return setAuthSession({
    provider: 'google',
    email,
    name: result.message.name || email,
    dataPath: 'axiom',
  })
}


export function setDemoSession(): AuthSession {
  return setAuthSession({
    provider: 'google',
    email: 'demo@each.local',
    name: 'ABC Demo',
    dataPath: 'abc',
    demo: true,
  })
}
