/* ui.js — tiny DOM + AXIOM component helpers. No framework. Keeps pillars terse. */
(function (global) {
  'use strict';

  function esc(s) { return String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  /* el('div.row', {onclick:fn}, [...children]) — class shorthand + props */
  function el(tag, props) {
    const classes = tag.split('.');
    const idm = classes[0].match(/^([a-zA-Z0-9]+)(?:#([\w-]+))?$/);
    const node = document.createElement((idm && idm[1]) || 'div');
    if (idm && idm[2]) node.id = idm[2];
    if (classes[1]) node.className = classes.slice(1).join(' ');
    props = props || {};
    for (const k in props) {
      const v = props[k];
      if (k === 'text') node.textContent = v;
      else if (k === 'html') node.innerHTML = v;
      else if (k === 'class') node.className = (node.className ? node.className + ' ' : '') + v;
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'dataset') Object.assign(node.dataset, v);
      else if (v != null) node.setAttribute(k, v);
    }
    const append = (c) => {
      if (c == null || c === false) return;
      if (Array.isArray(c)) { c.forEach(append); return; }
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    };
    for (let i = 2; i < arguments.length; i++) append(arguments[i]);
    return node;
  }

  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); return node; }

  /* components */
  function station(disc, kicker, title, meta) {
    return el('div.station', null,
      el('div.row-c.gap-m', null,
        el('span.disc', { text: disc }),
        el('div', null,
          el('div.micro', { text: kicker }),
          el('div.title', { text: title }))),
      el('div.label-meta', { text: meta || '' }));
  }

  function statCell(label, value, sub) {
    return el('div.stat-cell', null,
      el('span.label', { text: label }),
      el('div.v', { text: value }),
      sub ? el('div.sub', { text: sub }) : null);
  }

  function bar(pct, cls) {
    return el('div.bar', null, el('div.fill' + (cls ? '.' + cls : ''), { style: 'width:' + Math.max(0, Math.min(100, pct)) + '%' }));
  }

  function statusPlate(tagText, headline, sub, tagCls) {
    return el('div.status-plate', null,
      el('div.tag' + (tagCls ? '.' + tagCls : ''), { text: tagText }),
      el('div.body', null,
        el('div.t-value', { text: headline }),
        sub ? el('div.meta', { text: sub, style: 'margin-top:2px' }) : null));
  }

  /* modal */
  function modal(title, bodyNode, footChildren) {
    const overlay = el('div.overlay', { onclick: (e) => { if (e.target === overlay) close(); } });
    function close() { overlay.remove(); }
    function onKey(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); } }
    document.addEventListener('keydown', onKey);
    const m = el('div.modal', null,
      el('div.modal-head', null,
        el('div.t-stat-sm', { text: title }),
        el('button.btn.link', { text: 'Close', onclick: close })),
      el('div.modal-body', null, bodyNode),
      footChildren && footChildren.length ? el('div.modal-foot', null, ...footChildren) : null);
    overlay.appendChild(m);
    document.body.appendChild(overlay);
    return { close, el: m };
  }

  /* formField — labelled input with optional help text and error slot. Real affordances. */
  function formField(label, input, helpText) {
    const errSlot = el('div.field-error', { style: 'color:var(--red);font-size:11px;margin-top:4px;display:none' });
    const wrap = el('div.field', null,
      el('label.label', { text: label }),
      input,
      helpText ? el('div.micro', { text: helpText, style: 'margin-top:4px' }) : null,
      errSlot);
    return { wrap, input, errSlot,
      setError(msg) { errSlot.textContent = msg; errSlot.style.display = msg ? 'block' : 'none'; input.style.borderColor = msg ? 'var(--red)' : ''; },
      clear() { this.setError(''); },
    };
  }

  /* toast — non-blocking feedback. Use for success / error / info. */
  function toast(message, kind, ms) {
    ms = ms || 2400;
    const colors = { info: 'var(--blue)', error: 'var(--red)', success: 'var(--blue)' };
    const node = el('div.toast', { text: message, style: 'position:fixed;bottom:18px;left:50%;transform:translateX(-50%);background:var(--ink);color:#fff;padding:11px 18px;font-size:12px;font-weight:600;letter-spacing:0.08em;z-index:200;border-left:3px solid ' + (colors[kind] || 'var(--ink)') + ';box-shadow:0 1px 0 rgba(0,0,0,0.04)' });
    document.body.appendChild(node);
    setTimeout(() => { node.style.transition = 'opacity .2s ease'; node.style.opacity = '0'; setTimeout(() => node.remove(), 220); }, ms);
  }

  /* confirm — branded modal-based confirm, returns a Promise<boolean>. */
  function confirmDialog(message, opts) {
    opts = opts || {};
    const danger = opts.danger;
    const body = el('div.stack.gap-m', null,
      opts.title ? el('div.label', { text: opts.title }) : null,
      el('div.editorial', { text: message, style: 'font-size:14px;line-height:1.5' }));
    let resolveFn;
    const promise = new Promise(r => { resolveFn = r; });
    const m = modal(opts.title || 'Confirm', body, [
      el('button.btn.ghost', { text: opts.cancelText || 'Cancel', onclick: () => { m.close(); resolveFn(false); } }),
      el('button.btn' + (danger ? '.critical' : ''), { text: opts.confirmText || 'Confirm', onclick: () => { m.close(); resolveFn(true); } }),
    ]);
    return promise;
  }

  global.UI = { esc, el, clear, station, statCell, bar, statusPlate, modal, formField, toast, confirm: confirmDialog };
})(window);
