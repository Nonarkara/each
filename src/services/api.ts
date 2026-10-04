import type { EachStore } from '../lib/types'
import { storeApi } from '../lib/store'

interface FrappeResponse<T> {
  message: T
}

export interface FrappeClient {
  login(): Promise<void>
  getStore(): Promise<EachStore | null>
  putStore(store: EachStore): Promise<EachStore>
  health(): Promise<{ ok: boolean; site?: string; database?: string }>
}

const FRAPPE_URL = String(import.meta.env.VITE_FRAPPE_URL || '').replace(/\/$/, '')
let csrfToken = ''

async function call<T>(method: string, init?: RequestInit): Promise<T> {
  if (init?.method && init.method !== 'GET' && !csrfToken) throw new Error('A Frappe session is required before saving')
  const res = await fetch(`${FRAPPE_URL}/api/method/${method}`, {
    credentials: 'include',
    signal: AbortSignal.timeout(15000),
    ...init,
    headers: { ...init?.headers, ...(csrfToken ? { 'X-Frappe-CSRF-Token': csrfToken } : {}) },
  })
  if (!res.ok) throw new Error(`Frappe request failed (${res.status})`)
  const body = (await res.json()) as FrappeResponse<T>
  return body.message
}

export const frappeClient: FrappeClient = {
  async login() {
    if (!FRAPPE_URL) return
    csrfToken = ''
    const session = await call<{ csrf_token: string }>('each_backend.api.session_info')
    if (!session.csrf_token) throw new Error('Missing Frappe CSRF token')
    csrfToken = session.csrf_token
  },

  async getStore() {
    if (!FRAPPE_URL) return storeApi.get()
    return call<EachStore | null>('each_backend.api.get_state')
  },

  async putStore(store) {
    if (!FRAPPE_URL) return storeApi.load(store)
    const body = new URLSearchParams({ state: JSON.stringify(store) })
    return call<EachStore>('each_backend.api.put_state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body,
    })
  },

  async health() {
    if (!FRAPPE_URL) return { ok: true, site: 'localStorage' }
    try {
      return await call<{ ok: boolean; site?: string; database?: string }>('each_backend.api.health')
    } catch {
      return { ok: false, site: FRAPPE_URL }
    }
  },
}

export function isFrappeEnabled(): boolean {
  return Boolean(FRAPPE_URL)
}
