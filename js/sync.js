/* sync.js — background cloud sync for Each state via /api/state.
   Falls back to localStorage when offline or when not served from Pages. */
(function (global) {
  'use strict';
  const D = window.Data;
  const API = '/api/state';
  const API_KEY_KEY = 'each_api_key';
  const API_KEY_LEGACY = 'axiom_api_key'; // ponytail: migrate old key on first auth call
  let status = 'local'; // local | loading | saving | saved | error
  let saveTimer = null;
  let statusEl = null;
  let textEl = null;

  function isRemoteCapable() {
    return location.protocol === 'http:' || location.protocol === 'https:';
  }

  function authHeaders() {
    let key = localStorage.getItem(API_KEY_KEY);
    if (!key) {
      const legacy = localStorage.getItem(API_KEY_LEGACY);
      if (legacy) { localStorage.setItem(API_KEY_KEY, legacy); localStorage.removeItem(API_KEY_LEGACY); key = legacy; }
    }
    return key ? { 'Authorization': 'Bearer ' + key } : {};
  }

  function label(s) {
    s = s || status;
    switch (s) {
      case 'local': return 'Local only';
      case 'loading': return 'Loading…';
      case 'saving': return 'Saving…';
      case 'saved': return 'Saved to cloud';
      case 'error': return 'Sync error';
      default: return '';
    }
  }

  async function load() {
    if (!isRemoteCapable()) return;
    setStatus('loading');
    try {
      const res = await fetch(API, { headers: authHeaders() });
      if (res.status === 401) { handleAuth(); return; }
      if (!res.ok) throw new Error(res.status + ' ' + res.statusText);
      const remote = await res.json();
      if (remote && Object.keys(remote).length > 0 && !remote.error) {
        D.Store.load(remote);
        setStatus('saved');
        if (window.App && window.App.remount) window.App.remount();
      } else {
        setStatus('local');
      }
    } catch (e) {
      console.error('Sync load failed:', e);
      setStatus('error');
    }
  }

  async function save() {
    if (!isRemoteCapable()) return;
    setStatus('saving');
    try {
      const body = JSON.stringify(D.Store.get());
      const res = await fetch(API, {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
        body,
      });
      if (res.status === 401) { handleAuth(); return; }
      if (!res.ok) throw new Error(res.status + ' ' + res.statusText);
      setStatus('saved');
    } catch (e) {
      console.error('Sync save failed:', e);
      setStatus('error');
    }
  }

  function scheduleSave() {
    if (!isRemoteCapable()) return;
    if (saveTimer) clearTimeout(saveTimer);
    setStatus('saving');
    saveTimer = setTimeout(save, 1200);
  }

  function handleAuth() {
    const key = prompt('This deployment requires an API key. Enter it now (or leave blank to work locally):');
    if (key === null) { setStatus('error'); return; }
    if (key.trim()) localStorage.setItem(API_KEY_KEY, key.trim());
    else localStorage.removeItem(API_KEY_KEY);
    load();
  }

  function setStatus(s) {
    status = s;
    if (statusEl) { statusEl.className = 'sync-status ' + s; statusEl.title = label(s); }
    if (textEl) textEl.textContent = label(s);
  }

  function mountIndicator(container) {
    if (!container || statusEl) return;
    statusEl = document.createElement('span');
    statusEl.className = 'sync-status local';
    textEl = document.createElement('span');
    textEl.className = 'label-meta';
    const wrap = document.createElement('span');
    wrap.className = 'row-c gap-s';
    wrap.appendChild(statusEl);
    wrap.appendChild(textEl);
    container.appendChild(wrap);
    setStatus(status);
  }

  // Auto-save on every local mutation
  D.Store.subscribe(scheduleSave);

  global.Sync = { load, save, scheduleSave, getStatus: () => status, mountIndicator, label };
})(window);
