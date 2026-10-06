/** First-run workspace intent from the URL. No secrets. */

export type WorkspaceIntent = 'demo' | 'blank' | null

export function parseWorkspaceIntent(search: string): WorkspaceIntent {
  const raw = search.startsWith('?') ? search.slice(1) : search
  const value = new URLSearchParams(raw).get('workspace')
  if (value === 'demo' || value === 'blank') return value
  return null
}

/** Drop `workspace` so a refresh does not re-apply the first-run path. */
export function stripWorkspaceIntent(href: string, base = 'http://127.0.0.1'): string {
  const url = new URL(href, base)
  url.searchParams.delete('workspace')
  return `${url.pathname}${url.search}${url.hash}`
}
