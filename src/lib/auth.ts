/** Phase 0 auth — sessionStorage gate. No secrets in repo. */

export type AuthProvider = 'google' | 'github'
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
    if (Date.now() - session.issuedAt > SESSION_TTL_MS) {
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
  return Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID)
}

export function isGitHubConfigured(): boolean {
  return Boolean(import.meta.env.VITE_GITHUB_CLIENT_ID)
}

export function githubRedirectUri(): string {
  const configured = import.meta.env.VITE_GITHUB_REDIRECT_URI
  if (configured) return configured
  const base = import.meta.env.BASE_URL || './'
  const path = base.endsWith('/') ? `${base}oauth/github/callback` : `${base}/oauth/github/callback`
  return new URL(path, window.location.href).href
}

export function githubAuthorizeUrl(): string {
  const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID
  if (!clientId) throw new Error('VITE_GITHUB_CLIENT_ID not set')
  const state = crypto.randomUUID()
  setOAuthState(state)
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: githubRedirectUri(),
    scope: 'read:user user:email',
    state,
  })
  return `https://github.com/login/oauth/authorize?${params}`
}

export function tokenExchangeUrl(): string {
  return (
    import.meta.env.VITE_GITHUB_TOKEN_EXCHANGE_URL ||
    `${window.location.origin}/api/auth/github`
  )
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

/** Client-side GIS credential check — aud/exp only; no secret in SPA. */
export function verifyGoogleCredential(credential: string): AuthSession {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  if (!clientId) throw new Error('VITE_GOOGLE_CLIENT_ID not set')
  const payload = decodeJwtPayload(credential)
  const now = Math.floor(Date.now() / 1000)
  if (payload.exp && payload.exp < now) throw new Error('Google token expired')
  if (payload.aud !== clientId) throw new Error('Google token audience mismatch')
  const email = payload.email || payload.sub || 'google-user'
  return setAuthSession({
    provider: 'google',
    email,
    name: payload.name || email,
    picture: payload.picture,
    dataPath: 'axiom',
  })
}

export async function exchangeGitHubCode(code: string): Promise<AuthSession> {
  const res = await fetch(tokenExchangeUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, redirect_uri: githubRedirectUri() }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error || `GitHub auth failed (${res.status})`)
  }
  const data = (await res.json()) as { email?: string; name?: string; login?: string; avatar_url?: string }
  const email = data.email || `${data.login || 'github-user'}@users.noreply.github.com`
  return setAuthSession({
    provider: 'github',
    email,
    name: data.name || data.login || email,
    picture: data.avatar_url,
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
