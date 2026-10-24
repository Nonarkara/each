// Addressable surfaces: a module is a link, and the sample workspace is linkable.
//
// Why this exists: the spatial gate measures the panel, not the sign-in wall. A
// route that cannot be opened by URL is a surface nobody — human or instrument —
// can measure, so the module lives behind a click and the gate can only see the
// gate.
//
// WHY THE QUERY STRING AND NOT A HASH
//
// A hash is invisible to a server, to a crawler and to a link preview: the
// bytes before "#" are the whole request. It also survives nothing that
// rewrites the URL. The spatial gate measures a page by loading it fresh and
// reading its geometry, and it identifies the load it expects by a token it
// puts in the QUERY string — a token a fragment cannot carry, because a
// fragment never reaches the document's search. Measured with a hash route, the
// harness reloads itself inside its own frame and the sweep measures the
// instrument, not the product.
//
// So the route lives in the query: `?module=erp`. It works on any static host
// with no rewrite rule, it is a real link a founder can send, and the same URL
// opens the same surface for a person and for the gate.
//
// `?demo=1` opens the sample workspace without an account, so the surface is
// reachable by link and not only by a click through the sign-in wall.

export type AppRoute =
  | 'erp'
  | 'act'
  | 'crm'
  | 'hr'
  | 'dossier'
  | 'intake'
  | 'mirrors'
  | 'security'
  | 'design'

export const ROUTES: AppRoute[] = [
  'erp',
  'act',
  'crm',
  'hr',
  'dossier',
  'intake',
  'mirrors',
  'security',
  'design',
]

/** "?module=erp&demo=1" → route "erp", params { module: "erp", demo: "1" }. */
export function parseQuery(search: string): { route: AppRoute | null; params: URLSearchParams } {
  const params = new URLSearchParams(search.replace(/^\?/, ''))
  const name = (params.get('module') ?? '').trim().toLowerCase()
  const route = (ROUTES as string[]).includes(name) ? (name as AppRoute) : null
  return { route, params }
}

/** The URL of a surface: `?module=erp`, keeping the sample-workspace flag. */
export function urlForRoute(route: AppRoute, params?: URLSearchParams | string): string {
  const next = params instanceof URLSearchParams ? new URLSearchParams(params) : new URLSearchParams(params ?? '')
  const demo = next.get('demo')
  next.delete('demo')
  next.set('module', route)
  if (demo) next.set('demo', demo)
  return '?' + next.toString()
}

/**
 * The module the address names. The query is the address; the hash is not read,
 * so there is one way to say where a surface is and one way to get there.
 */
export function routeFromLocation(): AppRoute {
  if (typeof window === 'undefined') return 'erp'
  return parseQuery(window.location.search).route ?? 'erp'
}

/**
 * The sample workspace is shareable: /?module=erp&demo=1 opens it without an
 * account. Read once, at load, before anything rewrites the address.
 */
export const DEMO_REQUESTED =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('demo') === '1'
