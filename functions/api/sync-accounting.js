import { corsHeaders, jsonResponse, checkAuth, handleOptions } from '../_utils.js';
import { sync } from '../lib/accounting-sync.js';

const ROW_ID = 'default';
const MAX_SIZE = 5 * 1024 * 1024;

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
    const state = JSON.parse(body);
    const synced = sync(state);
    const payload = JSON.stringify(synced);

    const { success } = await env.DB.prepare(`
      INSERT INTO workspace_state (id, data, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
    `).bind(ROW_ID, payload).run();

    if (!success) throw new Error('D1 write failed');
    return jsonResponse({ ok: true, journalEntries: synced.journal.length }, 200, corsHeaders());
  } catch (err) {
    console.error('POST /api/sync-accounting error:', err);
    return jsonResponse({ error: 'Failed to sync accounting' }, 500, corsHeaders());
  }
}
