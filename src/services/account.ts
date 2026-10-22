/**
 * Account client — the product's sign-up / sign-in surface.
 *
 * The account service speaks the same method contract as the Frappe app
 * (`each_backend.api.*`), so the UI talks to whichever backend is configured
 * without changing components. The base URL is empty by default, which means
 * same-origin: the account service serves the built app and the API from one
 * process, so there is no second host and no CORS.
 */

export interface AccountUser {
  email: string
  name: string
  companyName: string
  createdAt: string
}

export interface AccountSession {
  user: AccountUser | null
  /** False when no account service answers (static hosting, offline). */
  available: boolean
}

export class AccountError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

const BASE = String(import.meta.env?.VITE_ACCOUNT_URL || '').replace(/\/$/, '')

export function accountBaseUrl(): string {
  return BASE
}

async function request<T>(path: string, init?: RequestInit, timeoutMs = 15000): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    signal: AbortSignal.timeout(timeoutMs),
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json', ...(init?.headers || {}) } : init?.headers,
  })
  const text = await response.text()
  let body: unknown = null
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = null
    }
  }
  if (!response.ok) {
    const message =
      body && typeof body === 'object' && 'error' in body
        ? String((body as { error: unknown }).error)
        : `Request failed (${response.status})`
    throw new AccountError(message, response.status)
  }
  return body as T
}

export const accountApi = {
  /** Never throws: a missing account service is a supported state. */
  async session(): Promise<AccountSession> {
    try {
      const body = await request<{ user: AccountUser | null }>('/api/auth/session', undefined, 4000)
      return { user: body.user || null, available: true }
    } catch {
      return { user: null, available: false }
    }
  },

  async signup(input: {
    email: string
    password: string
    name?: string
    companyName?: string
  }): Promise<AccountUser> {
    const body = await request<{ user: AccountUser }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return body.user
  },

  async login(input: { email: string; password: string }): Promise<AccountUser> {
    const body = await request<{ user: AccountUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return body.user
  },

  async logout(): Promise<void> {
    await request<null>('/api/auth/logout', { method: 'POST' })
  },
}

export function validateEmail(email: string): string {
  const value = email.trim()
  if (!value) return 'Enter your work email.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) return 'That email address looks incomplete.'
  return ''
}

export function validatePassword(password: string): string {
  if (password.length < 10) return 'Use at least 10 characters.'
  if (password.length > 200) return 'Use at most 200 characters.'
  return ''
}
