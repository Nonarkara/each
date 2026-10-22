import { storeApi } from '../lib/store'
import { accountClient, frappeClient, isFrappeEnabled, type WorkspaceClient } from './api'
import { getAuthSession } from '../lib/auth'
import { accountApi } from './account'
import type { BackendKind, BackendStatus } from '../lib/storageStatus'

export type { BackendKind, BackendStatus } from '../lib/storageStatus'

const SAVE_DELAY_MS = 500

/**
 * Workspace persistence for a signed-in account.
 *
 * The account service is the default (one origin, one process); Frappe is used
 * when VITE_FRAPPE_URL is configured. Both speak the same method contract.
 * localStorage stays the offline cache: nothing is lost when the server is down.
 */
export async function resolveBackend(): Promise<{ kind: BackendKind; client: WorkspaceClient | null }> {
  if (isFrappeEnabled()) return { kind: 'frappe', client: frappeClient }
  const session = await accountApi.session()
  if (session.available && session.user) return { kind: 'account', client: accountClient }
  return { kind: 'none', client: null }
}

/** Pull the stored workspace for the signed-in account, if one exists. */
export async function loadRemoteStore(client: WorkspaceClient): Promise<boolean> {
  await client.login()
  const remote = await client.getStore()
  if (!remote) return false
  storeApi.load(remote)
  return true
}

/**
 * Hydrate once from the server, then persist store changes with a short debounce.
 * Demo data and un-onboarded workspaces are never written to a server.
 */
export function startWorkspaceSync(
  kind: BackendKind,
  client: WorkspaceClient | null,
  onStatus: (status: BackendStatus) => void,
): () => void {
  if (!client || kind === 'none') {
    onStatus('off')
    return () => undefined
  }

  let stopped = false
  let unsubscribe: (() => void) | undefined
  let saveTimer: ReturnType<typeof setTimeout> | undefined
  let writes = Promise.resolve()

  onStatus('connecting')
  void client
    .login()
    .then(async () => {
      const remote = await client.getStore()
      if (stopped) return
      if (remote && !getAuthSession()?.demo && remote.dataTenant !== 'abc') {
        storeApi.load(remote)
      }
      if (stopped) return

      unsubscribe = storeApi.subscribe((next) => {
        if (saveTimer) clearTimeout(saveTimer)
        if (getAuthSession()?.demo || next.dataTenant === 'abc' || !next.onboarded) return
        saveTimer = setTimeout(() => {
          // Preserve write order even when a previous request is still in flight.
          writes = writes
            .then(async () => {
              if (stopped) return
              await client.putStore(next)
              if (!stopped) onStatus('connected')
            })
            .catch(() => {
              if (!stopped) onStatus('error')
            })
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

