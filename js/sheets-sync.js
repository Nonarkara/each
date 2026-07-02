/* sheets-sync.js — Google Sheets as the durable, human-readable store.
   Mirror-on-mutation. Sheets configured via Web App URL (Apps Script).
   The store stays in D1 (per-user cache); Sheets is the cross-user / shareable / analyzable engine. */
(function (global) {
  'use strict';

  const URL_KEY = 'each-sheets-web-app-url';
  const STATUS_KEY = 'each-sheets-status';
  const LAST_SAVE_KEY = 'each-sheets-last-saved';

  const STATUS = { idle: 'idle', loading: 'loading', saving: 'saving', saved: 'saved', error: 'error' };

  let status = STATUS.idle;
  let saveTimer = null;
  let statusListeners = new Set();
  let indicatorRefs = { dot: null, label: null };

  /* ---------- config ---------- */
  function getUrl() {
    try { return (localStorage.getItem(URL_KEY) || '').trim(); }
    catch (_) { return ''; }
  }
  function setUrl(url) {
    const t = String(url || '').trim();
    if (t) {
      try { localStorage.setItem(URL_KEY, t); } catch (_) {}
    } else {
      try { localStorage.removeItem(URL_KEY); } catch (_) {}
    }
  }
  function isConfigured() { return !!getUrl(); }

  /* ---------- status ---------- */
  function setStatus(s) {
    status = s;
    statusListeners.forEach(fn => { try { fn(s); } catch (_) {} });
    if (indicatorRefs.dot) {
      indicatorRefs.dot.className = 'sync-status sheets ' + s;
      indicatorRefs.dot.title = statusLabel(s);
    }
    if (indicatorRefs.label) indicatorRefs.label.textContent = statusLabel(s);
    try { localStorage.setItem(STATUS_KEY, s); } catch (_) {}
  }
  function getStatus() { return status; }
  function subscribeStatus(fn) { statusListeners.add(fn); fn(status); return () => statusListeners.delete(fn); }
  function statusLabel(s) {
    s = s || status;
    switch (s) {
      case STATUS.loading: return 'Loading from Sheet…';
      case STATUS.saving: return 'Saving to Sheet…';
      case STATUS.saved: return 'Synced to Sheet';
      case STATUS.error: return 'Sheet sync error';
      case STATUS.idle:
      default: return isConfigured() ? 'Sheet connected' : 'Not connected';
    }
  }
  function lastSavedAt() {
    try { return parseInt(localStorage.getItem(LAST_SAVE_KEY) || '0', 10) || 0; }
    catch (_) { return 0; }
  }

  /* ---------- I/O ---------- */
  async function test(url) {
    const target = (url || getUrl()).trim();
    if (!target) return { ok: false, message: 'No URL configured.' };
    if (!/^https:\/\/script\.google\.com\/.*exec/.test(target)) {
      return { ok: false, message: 'That does not look like an Apps Script Web App URL. Expected https://script.google.com/.../exec' };
    }
    try {
      const res = await fetch(target, { method: 'GET', redirect: 'follow' });
      const text = await res.text();
      let data = null;
      try { data = JSON.parse(text); } catch (_) {}
      if (data && data.error) return { ok: false, message: 'Apps Script error: ' + data.error, data };
      if (res.ok) return { ok: true, message: 'Connected.', data: data || {} };
      return { ok: false, message: 'HTTP ' + res.status + ' ' + res.statusText };
    } catch (e) {
      return { ok: false, message: 'Network error: ' + (e && e.message || e) };
    }
  }

  async function loadAll() {
    const url = getUrl();
    if (!url) return null;
    setStatus(STATUS.loading);
    try {
      const res = await fetch(url, { method: 'GET', redirect: 'follow' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      if (data && data.error) throw new Error(data.error);
      setStatus(STATUS.saved);
      return data && Object.keys(data).length ? data : null;
    } catch (e) {
      console.error('[SheetsSync] load failed:', e);
      setStatus(STATUS.error);
      return null;
    }
  }

  async function saveNow(state) {
    const url = getUrl();
    if (!url) return false;
    setStatus(STATUS.saving);
    try {
      await fetch(url, {
        method: 'POST',
        body: JSON.stringify(state),
        mode: 'no-cors',
      });
      try { localStorage.setItem(LAST_SAVE_KEY, String(Date.now())); } catch (_) {}
      setStatus(STATUS.saved);
      return true;
    } catch (e) {
      console.error('[SheetsSync] save failed:', e);
      setStatus(STATUS.error);
      return false;
    }
  }

  function scheduleSave(state) {
    if (!isConfigured()) return;
    if (saveTimer) clearTimeout(saveTimer);
    setStatus(STATUS.saving);
    saveTimer = setTimeout(() => { saveNow(state); }, 1200);
  }

  function flushPending() {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  }

  /* ---------- indicator mount (for cockpit) ---------- */
  function mountIndicator(container) {
    if (!container || indicatorRefs.dot) return;
    indicatorRefs.dot = document.createElement('span');
    indicatorRefs.dot.className = 'sync-status sheets ' + status;
    indicatorRefs.dot.title = statusLabel();
    indicatorRefs.label = document.createElement('span');
    indicatorRefs.label.className = 'label-meta';
    indicatorRefs.label.textContent = statusLabel();
    indicatorRefs.dot.style.cursor = 'pointer';
    indicatorRefs.dot.addEventListener('click', () => openSettings());
    indicatorRefs.label.style.cursor = 'pointer';
    indicatorRefs.label.addEventListener('click', () => openSettings());
    const wrap = document.createElement('div');
    wrap.className = 'row-c gap-s';
    wrap.appendChild(indicatorRefs.dot);
    wrap.appendChild(indicatorRefs.label);
    container.appendChild(wrap);
    setStatus(status);
  }

  /* ---------- settings modal ---------- */
  function openSettings() {
    const { el, modal } = global.UI;
    if (!el || !modal) { console.warn('UI not loaded'); return; }

    const current = getUrl();
    const lastSaved = lastSavedAt();
    const lastSavedText = lastSaved
      ? 'Last successful save ' + new Date(lastSaved).toLocaleString()
      : 'Never saved to Sheet yet';

    const urlInput = el('input.input', {
      type: 'url',
      placeholder: 'https://script.google.com/macros/s/AKfyc.../exec',
      value: current || '',
      autocomplete: 'off',
      spellcheck: 'false',
    });
    const statusLine = el('div.meta', { text: lastSavedText });
    const testBadge = el('span', { text: '' });

    const connectBtn = el('button.btn.blue', { text: 'Test & Connect' });
    const pullBtn = el('button.btn.ghost', {
      text: 'Pull from Sheet',
      title: 'Replace local state with latest from your Google Sheet',
      onclick: async () => {
        if (!confirm('Pull the latest data from your Google Sheet? Any local changes since the last sync will be lost.')) return;
        pullBtn.disabled = true;
        pullBtn.textContent = 'Pulling…';
        const remote = await loadAll();
        pullBtn.disabled = false;
        pullBtn.textContent = 'Pull from Sheet';
        if (remote && window.Data && window.Data.Store) {
          window.Data.Store.load(remote);
          try { localStorage.setItem('axiom_crm2_state_v1', JSON.stringify(window.Data.Store.get())); } catch (_) {}
          ref.close();
          if (window.App && window.App.remount) window.App.remount();
        } else {
          alert('Could not reach the Sheet. Open the URL in a browser to confirm it returns JSON.');
        }
      },
    });
    const disconnectBtn = el('button.btn.ghost', {
      text: 'Disconnect',
      onclick: () => {
        if (!confirm('Disconnect from this Sheet? Your data will still be cached locally.')) return;
        setUrl('');
        try { localStorage.removeItem(LAST_SAVE_KEY); } catch (_) {}
        flushPending();
        ref.close();
        if (window.App && window.App.remount) window.App.remount();
      },
    });
    const closeBtn = el('button.btn.link', { text: 'Close', onclick: () => ref.close() });

    const result = el('div.note-callout', { text: 'Test will run a GET to confirm the URL is reachable.', style: 'margin-top:10px' });

    async function runTest() {
      connectBtn.disabled = true;
      connectBtn.textContent = 'Testing…';
      testBadge.textContent = '';
      const u = urlInput.value.trim();
      const out = await test(u);
      connectBtn.disabled = false;
      connectBtn.textContent = 'Test & Connect';
      if (!out.ok) {
        testBadge.style.color = 'var(--red)';
        testBadge.textContent = '✕ ' + out.message;
        result.style.borderLeftColor = 'var(--red)';
        result.textContent = '';
        result.appendChild(testBadge);
        return;
      }
      setUrl(u);
      testBadge.style.color = 'var(--blue)';
      testBadge.textContent = '✓ Connected — first sync kicked off.';
      result.style.borderLeftColor = 'var(--blue)';
      result.textContent = '';
      result.appendChild(testBadge);
      try {
        const state = window.Data && window.Data.Store && window.Data.Store.get();
        if (state) await saveNow(state);
      } catch (_) {}
      if (window.App && window.App.remount) window.App.remount();
    }

    connectBtn.addEventListener('click', runTest);
    urlInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); runTest(); } });

    /* ----- Install snippet ----- */
    const scriptCode = el('div.code', { id: 'each-script-snippet', text: getAppsScript().slice(0, 1200) + '\n\n/* (snippet — full code copied via the button below) */' });
    const copyBtn = el('button.btn.ghost.sm', { text: 'Copy full script', onclick: async () => {
      try { await navigator.clipboard.writeText(getAppsScript()); copyBtn.textContent = 'Copied ✓'; setTimeout(() => { copyBtn.textContent = 'Copy full script'; }, 1800); }
      catch (e) { alert('Clipboard blocked. Select the snippet below and copy manually.'); }
    } });

    const newSheetLink = 'https://sheets.new';
    const helpBlock = el('div.stack.gap-m', null,
      el('div.banner', null,
        el('span.label', { text: 'Why connect?' }),
        el('div', { text: 'EACH writes every change to a Google Sheet so you can chart, audit, and share the data behind the app. Sheets becomes the readable engine — EACH is the editor lens.' })),
      el('div', null,
        el('div.label', { text: 'Setup — three steps' }),
        el('div.steps', { style: 'margin-top:8px' },
          el('div.step' + (current ? '.done' : ''), null,
            el('div.num', { text: current ? '✓' : '1' }),
            el('div.body', null,
              el('div.title', { text: 'Create a fresh Sheet' }),
              el('div.copy', null,
                el('a', { href: newSheetLink, target: '_blank', text: 'Open a new Google Sheet ↗' }),
                el('span', { text: '  (sheets.new works). Name it "EACH — [Your Company]".' })))),
          el('div.step', null,
            el('div.num', { text: '2' }),
            el('div.body', null,
              el('div.title', { text: 'Install the script' }),
              el('div.copy', { text: 'Extensions → Apps Script → delete any starter code → paste the script below (or click Copy full script) → Save.' }),
              copyBtn,
              scriptCode,
              el('div.copy', { text: 'Run setupWorkbook once (Run menu → function: setupWorkbook → Run). Authorize on first run.' }))),
          el('div.step', null,
            el('div.num', { text: '3' }),
            el('div.body', null,
              el('div.title', { text: 'Deploy as Web App' }),
              el('div.copy', { text: 'Deploy → New deployment → type "Web app" → Execute as "Me" → Who has access "Anyone" → Deploy → copy the URL.' }))))),
      el('div.banner.blue', null,
        el('span.label', { text: 'Sheets is the engine. EACH is the lens.' }),
        el('div', { text: 'Every change in EACH writes to this Sheet within ~1.2s. You can edit tabs directly; click "Pull from Sheet" to overwrite local state with your manual edits.' })),
    );

    const body = el('div.stack.gap-m', null,
      el('div.stack.gap-s', null,
        el('div.label', { text: 'Sheet Web App URL' }),
        urlInput,
        el('div.micro', { text: 'Stored locally. Never sent anywhere except script.google.com.' })),
      el('div.row-c.gap-s', null, connectBtn, isConfigured() ? pullBtn : null, isConfigured() ? disconnectBtn : null, testBadge),
      result,
      el('div', { style: 'border-top:1px solid var(--line);padding-top:14px' },
        el('div.label', { text: 'Status' }),
        statusLine,
      ),
      helpBlock,
    );

    const ref = modal('Connect to Google Sheet', body, [closeBtn]);
    setTimeout(() => { try { urlInput.focus(); } catch (_) {} }, 30);
  }

  /* ---------- public ---------- */

  /* The Apps Script body — pinned to a stable version. When the user makes
     a Sheet, they paste this into Extensions → Apps Script → Deploy as web app.
     Kept in code (not a separate file) so the Settings modal can offer 1-click copy. */
  const APPS_SCRIPT = [
    '/**',
    ' * EACH — Apps Script backend. Two-way sync between the web app and a Google Sheet.',
    ' * Setup (once):',
    ' *   1. In your Sheet → Extensions → Apps Script → paste this whole file.',
    ' *   2. Run setupWorkbook() once (Run menu) and grant permissions.',
    ' *   3. Deploy → New deployment → Web app → Execute as Me → Anyone → Deploy.',
    ' *   4. Copy the Web App URL into EACH → Settings → Connect Sheet.',
    ' *',
    ' * The Sheet is the human-readable source of truth. EACH mirrors edits; you can',
    ' * also edit tabs directly — pull from EACH Settings to overwrite (last write wins).',
    ' */',
    '',
    'var SKIP = [\'Dashboard\', \'RawData_Backup\'];',
    'var HEADERS = {}; // numeric column position → header text, set per-tab',
    '',
    'function doPost(e) {',
    '  try {',
    '    var state = JSON.parse(e.postData.contents);',
    '    var ss = SpreadsheetApp.getActiveSpreadsheet();',
    '    writeState_(ss, state);',
    '    refreshDashboard(ss);',
    '    return jsonOut_({ success: true, savedAt: new Date().toISOString() });',
    '  } catch (err) {',
    '    return jsonOut_({ error: String(err) });',
    '  }',
    '}',
    '',
    'function doGet(e) {',
    '  try {',
    '    var ss = SpreadsheetApp.getActiveSpreadsheet();',
    '    var data = readState_(ss);',
    '    if (Object.keys(data).length === 0) {',
    '      var b = ss.getSheetByName(\'RawData_Backup\');',
    '      if (b) { try { data = JSON.parse(b.getRange(1, 1).getValue()); } catch(_) {} }',
    '    }',
    '    return jsonOut_(data);',
    '  } catch (err) {',
    '    return jsonOut_({ error: String(err) });',
    '  }',
    '}',
    '',
    'function doOptions() { return ContentService.createTextOutput(\'OK\'); }',
    '',
    'function setupWorkbook() {',
    '  var ss = SpreadsheetApp.getActiveSpreadsheet();',
    '  var tabs = [\'Dashboard\',\'Metadata\',\'foundingCapital\',\'expenses\',\'employees\',\'aiEmployees\',\'projects\',\'loans\',\'objectives\',\'actions\',\'invoices\',\'payrollRuns\',\'customers\'];',
    '  tabs.forEach(function(n){ getOrCreateSheet_(ss, n); });',
    '  refreshDashboard(ss);',
    '  SpreadsheetApp.getUi().alert(\'EACH workbook ready. Deploy as Web App, then paste the URL into EACH Settings.\');',
    '}',
    '',
    'function eachVersion() { return jsonOut_({ version: \'each-v1\', now: new Date().toISOString() }); }',
    '',
    'function refreshDashboard(ss) {',
    '  if (!ss) ss = SpreadsheetApp.getActiveSpreadsheet();',
    '  var dash = getOrCreateSheet_(ss, \'Dashboard\');',
    '  dash.clear();',
    '  var rows = [',
    '    [\'Metric\',\'Value\',\'Plain English\'],',
    '    [\'Founding capital\',\'=SUM(foundingCapital!D2:D)\',\'Money shareholders put in\'],',
    '    [\'Revenue received\',\'=SUM(projects!H2:H)\',\'Cash already collected from deals\'],',
    '    [\'Total expenses\',\'=SUM(expenses!F2:F)\',\'Everything spent so far\'],',
    '    [\'Cash on hand\',\'=B2+B3-B4\',\'Blocks in your hand right now\'],',
    '    [\'AI operator /mo\',\'=SUM(aiEmployees!F2:F)\',\'Monthly AI subscriptions\'],',
    '    [\'Human payroll /mo\',\'=SUM(employees!D2:D)\',\'Monthly salaries\'],',
    '    [\'Debt service /mo\',\'=SUM(loans!F2:F)\',\'Loan installments due each month\'],',
    '    [\'This month OpEx\',\'=SUMIFS(expenses!F:F,expenses!E:E,"opex",expenses!B:B,">="&EOMONTH(TODAY(),-1)+1,expenses!B:B,"<="&EOMONTH(TODAY(),0))\',\'One-off operating spend this calendar month\'],',
    '    [\'Monthly burn\',\'=B7+B8+B9+B10\',\'What leaves the bank each month at current pace\'],',
    '    [\'Runway (months)\',\'=IF(B11>0,FLOOR(B5/B11),"")\',\'Months until cash hits zero\'],',
    '    [\'Contracted revenue\',\'=SUMIF(projects!K:K,"commissioned",projects!G:G)\',\'Signed deals total value\'],',
    '    [\'Outstanding AR\',\'=B13-B3\',\'Contracted but not yet received\'],',
    '  ];',
    '  dash.getRange(1,1,rows.length,3).setValues(rows);',
    '  dash.getRange(1,1,1,3).setFontWeight(\'bold\');',
    '  dash.setColumnWidth(1,180);',
    '  dash.setColumnWidth(2,160);',
    '  dash.setColumnWidth(3,360);',
    '  dash.getRange(\'B2:B13\').setNumberFormat(\'#,##0\');',
    '}',
    '',
    'function writeState_(ss, state) {',
    '  var meta = getOrCreateSheet_(ss, \'Metadata\');',
    '  var backup = getOrCreateSheet_(ss, \'RawData_Backup\');',
    '  var metaRows = [];',
    '  for (var k in state) {',
    '    var v = state[k];',
    '    if (Array.isArray(v)) {',
    '      if (SKIP.indexOf(k) === -1) writeArrayToSheet_(ss, k, v);',
    '    } else {',
    '      metaRows.push([k, typeof v === \'object\' ? JSON.stringify(v) : v]);',
    '    }',
    '  }',
    '  meta.clear();',
    '  if (metaRows.length) { meta.getRange(1,1,metaRows.length,2).setValues(metaRows); meta.getRange(1,1,1,2).setFontWeight(\'bold\'); }',
    '  backup.clear();',
    '  backup.getRange(1,1).setValue(JSON.stringify(state));',
    '  if (!backup.isSheetHidden()) backup.hideSheet();',
    '}',
    '',
    'function readState_(ss) {',
    '  var sheets = ss.getSheets();',
    '  var data = {};',
    '  sheets.forEach(function(sheet){',
    '    var name = sheet.getName();',
    '    if (name === \'RawData_Backup\' || name === \'Dashboard\') return;',
    '    var vals = sheet.getDataRange().getValues();',
    '    if (vals.length === 0) return;',
    '    if (name === \'Metadata\') {',
    '      vals.forEach(function(r){',
    '        var k = r[0]; if (!k) return;',
    '        var v = r[1];',
    '        if (typeof v === \'string\' && (v.charAt(0)===\'{\' || v.charAt(0)===\'[\')) { try { v = JSON.parse(v); } catch(_){} }',
    '        if (v instanceof Date) v = v.toISOString().slice(0,10);',
    '        data[k] = v;',
    '      });',
    '      return;',
    '    }',
    '    var headers = vals[0];',
    '    var arr = [];',
    '    for (var i=1; i<vals.length; i++) {',
    '      var row = vals[i];',
    '      var obj = {};',
    '      var empty = true;',
    '      for (var j=0; j<headers.length; j++) {',
    '        var h = headers[j]; if (!h) continue;',
    '        var c = row[j];',
    '        if (c !== \'\') empty = false;',
    '        if (typeof c === \'string\' && (c.charAt(0)===\'{\' || c.charAt(0)===\'[\')) { try { c = JSON.parse(c); } catch(_){} }',
    '        if (c instanceof Date) c = c.toISOString().slice(0,10);',
    '        obj[h] = c;',
    '      }',
    '      if (!empty) arr.push(obj);',
    '    }',
    '    data[name] = arr;',
    '  });',
    '  return data;',
    '}',
    '',
    'function writeArrayToSheet_(ss, name, arr) {',
    '  var sh = getOrCreateSheet_(ss, name);',
    '  sh.clear();',
    '  if (!arr || !arr.length) return;',
    '  var keys = {};',
    '  arr.forEach(function(o){ if (o && typeof o === \'object\') Object.keys(o).forEach(function(k){ keys[k] = true; }); });',
    '  var headers = Object.keys(keys);',
    '  if (!headers.length) return;',
    '  var rows = [headers];',
    '  arr.forEach(function(o){ rows.push(headers.map(function(h){ var v = o[h]; if (typeof v === \'object\' && v !== null) return JSON.stringify(v); if (v === undefined || v === null) return \'\'; return v; })); });',
    '  sh.getRange(1,1,rows.length,headers.length).setValues(rows);',
    '  sh.getRange(1,1,1,headers.length).setFontWeight(\'bold\');',
    '}',
    '',
    'function getOrCreateSheet_(ss, name) { var s = ss.getSheetByName(name); return s || ss.insertSheet(name); }',
    'function jsonOut_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }',
    '',
    'function onOpen() { SpreadsheetApp.getUi().createMenu(\'EACH\').addItem(\'Setup workbook\',\'setupWorkbook\').addItem(\'Refresh dashboard\',\'refreshDashboard\').addToUi(); }',
  ].join('\n');

  function getAppsScript() { return APPS_SCRIPT; }

  global.SheetsSync = {
    getUrl, setUrl, isConfigured,
    test, loadAll, saveNow, scheduleSave, flushPending,
    getStatus, subscribeStatus, statusLabel,
    mountIndicator, openSettings,
    lastSavedAt,
    getAppsScript,
    STATUS,
  };
})(window);
