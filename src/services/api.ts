import type { EachStore } from '../lib/types'
import { storeApi } from '../lib/store'

interface FrappeResponse<T> {
  message: T
}

export interface WorkspaceClient {
  login(): Promise<void>
  getStore(): Promise<EachStore | null>
  putStore(store: EachStore): Promise<EachStore>
  health(): Promise<{ ok: boolean; site?: string; database?: string }>
}

const FRAPPE_URL = String(import.meta.env?.VITE_FRAPPE_URL || '').replace(/\/$/, '')
/** Empty means same origin: the account service serves the app and the API together. */
export const ACCOUNT_URL = String(import.meta.env?.VITE_ACCOUNT_URL || '').replace(/\/$/, '')

/**
 * One client, two backends. The account service and the Frappe app implement the
 * same `each_backend.api.*` method contract, so the swap is a URL, not a rewrite.
 */
export function createWorkspaceClient(base: string, enabled: boolean): WorkspaceClient {
  let csrfToken = ''

  async function call<T>(method: string, init?: RequestInit): Promise<T> {
    if (init?.method && init.method !== 'GET' && !csrfToken) {
      throw new Error('A workspace session is required before saving')
    }
    const res = await fetch(`${base}/api/method/${method}`, {
      credentials: 'include',
      signal: AbortSignal.timeout(15000),
      ...init,
      headers: { ...init?.headers, ...(csrfToken ? { 'X-Frappe-CSRF-Token': csrfToken } : {}) },
    })
    if (!res.ok) throw new Error(`Workspace request failed (${res.status})`)
    const body = (await res.json()) as FrappeResponse<T>
    return body.message
  }

  return {
    async login() {
      csrfToken = ''
      const session = await call<{ csrf_token: string }>('each_backend.api.session_info')
      if (!session.csrf_token) throw new Error('Missing session token')
      csrfToken = session.csrf_token
    },

    async getStore() {
      if (!enabled) return storeApi.get()
      return call<EachStore | null>('each_backend.api.get_state')
    },

    async putStore(store) {
      if (!enabled) return storeApi.load(store)
      const body = new URLSearchParams({ state: JSON.stringify(store) })
      return call<EachStore>('each_backend.api.put_state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body,
      })
    },

    async health() {
      if (!enabled) return { ok: true, site: 'browser storage' }
      try {
        return await call<{ ok: boolean; site?: string; database?: string }>('each_backend.api.health')
      } catch {
        return { ok: false, site: base || 'same origin' }
      }
    },
  }
}

export const frappeClient = createWorkspaceClient(FRAPPE_URL, Boolean(FRAPPE_URL))
export const accountClient = createWorkspaceClient(ACCOUNT_URL, true)

export function isFrappeEnabled(): boolean {
  return Boolean(FRAPPE_URL)
}
