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

  global.UI = { esc, el, clear, station, statCell, bar, statusPlate, modal };
})(window);
