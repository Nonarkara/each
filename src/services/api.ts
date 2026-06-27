import type { EachStore } from '../lib/types'
import { storeApi } from '../lib/store'

/**
 * Phase 2 Frappe REST integration — swap point.
 * UI components call storeApi today; Phase 2 replaces this module.
 */
export interface FrappeClient {
  getStore(): Promise<EachStore>
  patchStore(patch: Partial<EachStore>): Promise<EachStore>
  health(): Promise<{ ok: boolean; site?: string }>
}

const FRAPPE_URL = import.meta.env.VITE_FRAPPE_URL

export const frappeClient: FrappeClient = {
  async getStore() {
    if (!FRAPPE_URL) return storeApi.get()
    const res = await fetch(`${FRAPPE_URL}/api/method/each.api.get_state`, { credentials: 'include' })
    if (!res.ok) throw new Error('Frappe getStore failed')
    return res.json()
  },

  async patchStore(patch) {
    if (!FRAPPE_URL) return storeApi.set(patch)
    const res = await fetch(`${FRAPPE_URL}/api/method/each.api.patch_state`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (!res.ok) throw new Error('Frappe patchStore failed')
    return res.json()
  },

  async health() {
    if (!FRAPPE_URL) return { ok: true, site: 'localStorage' }
    try {
      const res = await fetch(`${FRAPPE_URL}/api/method/ping`)
      return { ok: res.ok, site: FRAPPE_URL }
    } catch {
      return { ok: false, site: FRAPPE_URL }
    }
  },
}

export function isFrappeEnabled(): boolean {
  return Boolean(FRAPPE_URL)
}
