// Shared helpers for Pages Functions.

export function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

export function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
  });
}

export function checkAuth(request, env) {
  // If no API_KEY secret is set, allow all requests (useful for local dev).
  if (!env.API_KEY) return { ok: true };
  const auth = request.headers.get('Authorization') || '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match || match[1] !== env.API_KEY) {
    return { ok: false, error: 'Unauthorized' };
  }
  return { ok: true };
}

export function handleOptions(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(request.headers.get('Origin')) });
  }
  return null;
}
