import { corsHeaders, jsonResponse, checkAuth, handleOptions } from '../_utils.js';

const ROW_ID = 'default';
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB safety cap

export async function onRequestGet(context) {
  const { request, env } = context;
  const preflight = handleOptions(request);
  if (preflight) return preflight;

  const auth = checkAuth(request, env);
  if (!auth.ok) return jsonResponse({ error: auth.error }, 401, corsHeaders());

  try {
    const row = await env.DB.prepare('SELECT data FROM workspace_state WHERE id = ?')
      .bind(ROW_ID)
      .first();

    if (!row) {
      return jsonResponse({ onboarded: false, version: 1 }, 200, corsHeaders());
    }

    const data = JSON.parse(row.data || '{}');
    return jsonResponse(data, 200, corsHeaders());
  } catch (err) {
    console.error('GET /api/state error:', err);
    return jsonResponse({ error: 'Failed to load state' }, 500, corsHeaders());
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const preflight = handleOptions(request);
  if (preflight) return preflight;

  const auth = checkAuth(request, env);
  if (!auth.ok) return jsonResponse({ error: auth.error }, 401, corsHeaders());

  try {
    const body = await request.text();
    if (body.length > MAX_SIZE) {
      return jsonResponse({ error: 'State too large' }, 413, corsHeaders());
    }
    JSON.parse(body); // validate JSON

    const { success } = await env.DB.prepare(`
      INSERT INTO workspace_state (id, data, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
    `).bind(ROW_ID, body).run();

    if (!success) throw new Error('D1 write failed');
    return jsonResponse({ ok: true }, 200, corsHeaders());
  } catch (err) {
    console.error('POST /api/state error:', err);
    return jsonResponse({ error: 'Failed to save state' }, 500, corsHeaders());
  }
}
