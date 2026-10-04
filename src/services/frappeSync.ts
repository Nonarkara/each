import { storeApi } from '../lib/store'
import { frappeClient, isFrappeEnabled } from './api'
import { getAuthSession } from '../lib/auth'

export type BackendStatus = 'off' | 'connecting' | 'connected' | 'error'

const SAVE_DELAY_MS = 500

/**
 * Hydrate once from Frappe, then persist store changes with a short debounce.
 * localStorage remains the offline cache and fallback if Frappe is unavailable.
 */
export function startFrappeSync(
  onStatus: (status: BackendStatus) => void,
): () => void {
  if (!isFrappeEnabled()) {
    onStatus('off')
    return () => undefined
  }

  let stopped = false
  let unsubscribe: (() => void) | undefined
  let saveTimer: ReturnType<typeof setTimeout> | undefined
  let writes = Promise.resolve()
  const initial = storeApi.get()

  onStatus('connecting')
  void frappeClient
    .login()
    .then(() => frappeClient.getStore())
    .then(async (remote) => {
      if (stopped) return
      if (remote && !getAuthSession()?.demo) {
        if (storeApi.get() !== initial) throw new Error('Local edits occurred during database loading; reload to retry')
        storeApi.load(remote)
      }
      if (stopped) return

      unsubscribe = storeApi.subscribe((next) => {
        if (saveTimer) clearTimeout(saveTimer)
        if (getAuthSession()?.demo || next.dataTenant === 'abc' || !next.onboarded) return
        saveTimer = setTimeout(() => {
          // Preserve write order even when a previous request is still in flight.
          writes = writes.then(async () => {
            if (stopped || getAuthSession()?.demo) return
            await frappeClient.putStore(next)
            if (!stopped) onStatus('connected')
          }).catch(() => { if (!stopped) onStatus('error') })
        }, SAVE_DELAY_MS)
      })
      onStatus('connected')
    })
    .catch(() => {
      if (!stopped) onStatus('error')
    })

  return () => {
    stopped = true
    unsubscribe?.()
    if (saveTimer) clearTimeout(saveTimer)
  }
}

export function backendStatusLabel(status: BackendStatus): string {
  switch (status) {
    case 'connecting':
      return 'Database connecting…'
    case 'connected':
      return 'MariaDB via Frappe'
    case 'error':
      return 'Database offline · local fallback'
    default:
      return 'Browser storage'
  }
}
