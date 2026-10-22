/**
 * Where the workspace lives, said honestly.
 *
 * The label must never claim a server save that did not happen: a founder
 * signing out on a shared laptop should know exactly where the numbers are.
 */
export type BackendStatus = 'off' | 'connecting' | 'connected' | 'error'
export type BackendKind = 'none' | 'frappe' | 'account'

export function backendStatusLabel(status: BackendStatus, kind: BackendKind = 'none'): string {
  if (status === 'connecting') return 'Connecting to your account…'
  if (status === 'connected') {
    return kind === 'frappe' ? 'Saved to your workspace database' : 'Saved to your account'
  }
  if (status === 'error') return 'Save failed · kept on this device'
  return 'Saved on this device only'
}
