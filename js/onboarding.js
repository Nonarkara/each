/* onboarding.js — the signature flow:
   register → AI autofill from public domain → founding capital (scan) → connect Gmail → live. */
(function () {
  'use strict';
  const { el, clear, station, bar, modal } = window.UI;
  const D = window.Data;

  function render(onDone) {
    const step = { i: 0, company: {}, draft: {} };
    const root = el('div', { style: 'max-width:760px;margin:0 auto;padding:48px 22px' });
    draw();
    return root;

    function draw() {
      clear(root);
      root.appendChild(el('div.row-c.gap-m', { style: 'margin-bottom:28px' },
        el('span.disc.ink.lg', { text: 'A' }),
        el('div', null,
          el('div.t-hero', { text: 'AXIOM' }),
          el('div.label-meta', { text: 'CRM + ERP + HR + Accounting · for the startup' }))));

      if (step.i === 0) {
        root.appendChild(el('div.stack.gap-s', { style: 'margin:' + (18) + 'px 0 14px' },
          el('div.label', { text: 'Choose how to start' }),
          el('div.t-body.muted', { text: 'Your work is saved automatically when you are online. You can also export a backup at any time from the top bar.' })));
        root.appendChild(el('div.hgrid.g-2', { style: 'margin-bottom:28px' },
          el('div.cell', { style: 'cursor:pointer', onclick: () => { Demo.load(); onDone(); } },
            el('div.label', { text: 'Demo workspace' }),
            el('div.t-body', { text: 'Load a pre-populated Thai AI-startup: 6 projects, real clients, 10.5M THB book.' }),
            el('button.btn.blue.sm', { style: 'margin-top:12px', text: 'Load demo' }, el('span.arrow', {}))),
          el('div.cell', { style: 'cursor:pointer', onclick: () => { step.i = 0; } },
            el('div.label', { text: 'Start blank' }),
            el('div.t-body', { text: 'Onboard your own company step by step. You can enter all details manually.' }),
            el('button.btn.ghost.sm', { style: 'margin-top:12px', text: 'Onboard' }, el('span.arrow', {})))));
      }

      // step rail
      const labels = ['Company', 'Founding capital', 'Connect Gmail'];
      root.appendChild(el('div.row.gap-m', { style: 'margin-bottom:30px' },
        labels.map((l, idx) => el('div.row-c.gap-s', null,
          el('span.disc.sm' + (idx <= step.i ? '' : '.grey'), { text: String(idx + 1) }),
          el('span.label-meta', { text: l, class: idx === step.i ? '' : 'meta' })))));

      if (step.i === 0) step0();
      else if (step.i === 1) step1();
      else if (step.i === 2) step2();
    }

    /* ---- Step 0: register + AI autofill ---- */
    function step0() {
      const c = step.company;
      root.appendChild(station('1', 'STEP 01', 'Register your company', 'Put in a little. The system finds the rest.'));
      root.appendChild(el('div.split-phi', null,
        el('div.field', null,
          el('label.label', { text: 'Company name' }),
          el('input.input', { id: 'ob-name', placeholder: 'e.g. Axiom Systems', value: c.name || '',
            oninput: (e) => { c.name = e.target.value; } })),
        el('div.field', null,
          el('label.label', { text: 'Registration number' }),
          el('input.input', { id: 'ob-reg', placeholder: 'Try 0105566000000', value: c.reg || '',
            oninput: (e) => { c.reg = e.target.value; } }))));

      const statusLine = el('div.meta', { style: 'min-height:18px' });
      const searchBtn = el('button.btn.blue', { text: 'Search public records',
        onclick: () => doLookup() }, el('span.arrow', {}));

      async function doLookup() {
        searchBtn.disabled = true;
        statusLine.textContent = 'Searching public business registry…';
        statusLine.style.color = 'var(--ink-2)';
        const res = await D.registryLookup(c.reg, c.name);
        searchBtn.disabled = false;
        if (!res.found) {
          statusLine.textContent = 'No public match found for "' + (c.reg || c.name || '—') + '". You can enter the details manually below.';
          statusLine.style.color = 'var(--red)';
          ensureFields(res);
          return;
        }
        Object.assign(c, res);
        statusLine.textContent = 'Found. ' + res.source + '.';
        statusLine.style.color = 'var(--blue)';
        ensureFields(res);
        fillFields(res);
      }
      root.appendChild(el('div.row.gap-m', { style: 'margin-bottom:8px' }, searchBtn, statusLine));

      function ensureFields(res) {
        if (document.getElementById('ob-fields')) return;
        root.appendChild(el('div#ob-fields.stack', { style: 'margin-top:14px' },
          el('div.hgrid.g-2', null,
            field('Legal name', 'ob-legal', res.legalName || ''),
            field('Country', 'ob-country', res.country || '')),
          el('div.hgrid.g-2', { style: 'margin-top:1px' },
            field('Industry', 'ob-industry', res.industry || ''),
            field('Founded', 'ob-founded', res.founded || '')),
          el('div.field', { style: 'margin-top:14px' },
            field('Registered address', 'ob-address', res.address || ''))));
      }
      function fillFields(res) {
        set('ob-legal', res.legalName); set('ob-country', res.country);
        set('ob-industry', res.industry); set('ob-founded', res.founded);
        set('ob-address', res.address);
      }
      function set(id, v) { const n = document.getElementById(id); if (n && v) n.value = v; }

      root.appendChild(el('div.row.between', { style: 'margin-top:24px' },
        el('span.meta', { text: 'Tip: registration number 0105566000000 returns a full record.' }),
        el('button.btn', { text: 'Continue', onclick: () => {
          collect0();
          if (!c.legalName && !c.name) { alert('Enter a company name or registration number to continue.'); return; }
          step.i = 1; draw();
        } }, el('span.arrow', {}))));

      function collect0() {
        c.legalName = val('ob-legal', c.name);
        c.country = val('ob-country'); c.industry = val('ob-industry');
        c.founded = val('ob-founded'); c.address = val('ob-address');
      }
      function val(id, fb) { const n = document.getElementById(id); return n && n.value.trim() ? n.value.trim() : (fb || ''); }
    }
    /* ---- Step 1: founding capital from scanned paperwork ---- */
    function step1() {
      const c = step.company;
      root.appendChild(station('2', 'STEP 02', 'Founding capital', 'Scan the registration paperwork. Tax ID and funds enter the ledger.'));
      const cur = c.currency || 'USD';

      const preview = el('div#cap-preview');
      function addCapital(taxId, amount, currency, source) {
        D.Store.update(s => { s.foundingCapital.push({ id: D.uid(), source, taxId, amount, currency, date: c.founded || D.Store.get().asOf, note: 'Registration paperwork' }); return s; });
        renderCapList();
      }
      function renderCapList() {
        clear(preview);
        const fc = D.Store.get().foundingCapital;
        if (!fc.length) { preview.appendChild(el('div.empty', { text: 'No capital recorded yet.' })); return; }
        preview.appendChild(el('table.axiom', { html:
          '<thead><tr><th>Source</th><th>Tax ID</th><th class="num">Amount</th></tr></thead><tbody>'
          + fc.map(x => '<tr><td>' + UI.esc(x.source) + '</td><td>' + UI.esc(x.taxId) + '</td><td class="num">' + D.money(x.amount, x.currency) + '</td></tr>').join('')
          + '</tbody>' }));
      }

      // dropzone simulating OCR on the scanned paperwork
      const dz = el('div.dropzone', {
        onclick: () => doScan(),
        ondragover: (e) => { e.preventDefault(); dz.classList.add('drag'); },
        ondragleave: () => dz.classList.remove('drag'),
        ondrop: (e) => { e.preventDefault(); dz.classList.remove('drag'); doScan(); }
      }, el('div.label', { text: 'Scan or drop registration paperwork' }),
         el('div.meta', { text: 'PDF or image · OCR reads Tax ID and paid-in capital', style: 'margin-top:6px' }));

      function doScan() {
        const status = el('div.meta', { text: 'Reading document…', style: 'color:var(--ink-2);margin-top:10px' });
        dz.replaceWith(el('div.dropzone', { style: 'cursor:default' }, el('span.live-dot'), el('span.label-meta', { text: 'OCRing document…', style: 'margin-left:8px' }), status));
        setTimeout(() => {
          const taxId = (c.reg && c.reg.length >= 5) ? c.reg : 'TAX-' + Math.floor(100000 + Math.random()*900000);
          const amount = c.capitalHint || (cur === 'THB' ? 1000000 : 50000);
          addCapital(taxId, amount, cur, 'Scanned registration document');
          status.textContent = 'Extracted Tax ID ' + taxId + ' and paid-in capital ' + D.money(amount, cur) + '.';
          status.style.color = 'var(--blue)';
        }, 1500);
      }

      // manual fallback
      const mTax = el('input.input', { placeholder: 'Tax ID' });
      const mAmt = el('input.input', { type: 'number', placeholder: 'Amount' });
      const manualRow = el('div.hgrid.g-2', null,
        el('div.cell', null, el('span.label', { text: 'Tax ID' }), mTax),
        el('div.cell', null, el('span.label', { text: 'Capital amount' }), mAmt));

      root.appendChild(dz);
      root.appendChild(el('div.row-c.gap-m', { style: 'margin:14px 0' },
        el('span.meta', { text: 'or enter manually' }),
        el('button.btn.ghost.sm', { text: 'Add entry', onclick: () => {
          if (mTax.value && mAmt.value) addCapital(mTax.value, Number(mAmt.value), cur, 'Manual entry'); } })));
      root.appendChild(manualRow);
      root.appendChild(preview);
      renderCapList();

      root.appendChild(el('div.row.between', { style: 'margin-top:24px' },
        el('button.btn.link', { text: 'Back', onclick: () => { step.i = 0; draw(); } }),
        el('button.btn', { text: 'Continue', onclick: () => { step.i = 2; draw(); } }, el('span.arrow', {}))));
    }

    /* ---- Step 2: connect Gmail → receipts become expenses ---- */
    function step2() {
      root.appendChild(station('3', 'STEP 03', 'Connect Gmail', 'Receipts flow into expenses automatically.'));
      const out = el('div#gm-out');
      root.appendChild(out);
      root.appendChild(el('div.status-plate', { style: 'margin:10px 0' }, null,
        el('div.tag', { text: 'GMAIL' }),
        el('div.body', null,
          el('div.t-value', { text: 'Connect your business inbox' }),
          el('div.meta', { text: 'Receipts and invoices are detected and categorized.' }))));

      const connectBtn = el('button.btn.blue', { text: 'Connect Gmail', onclick: () => connect() });
      root.appendChild(el('div.row.gap-m', { style: 'margin:14px 0' },
        connectBtn,
        el('button.btn.link', { text: 'Skip for now', onclick: () => finish() })));

      function connect() {
        connectBtn.disabled = true;
        out.appendChild(el('div.row-c.gap-s', { style: 'margin:8px 0' }, el('span.live-dot'), el('span.label-meta', { text: 'Authorizing… reading inbox…' })));
        setTimeout(() => {
          const recs = D.gmailReceipts();
          D.Store.update(s => {
            recs.forEach(r => s.expenses.push(Object.assign({ id: D.uid(), source: 'Gmail' }, r)));
            s.gmailConnected = true; s.gmailImported = recs.length;
            return s;
          });
          clear(out);
          out.appendChild(el('div.meta', { text: 'Imported ' + recs.length + ' receipts from Gmail.', style: 'color:var(--blue);margin:8px 0' }));
          finish();
        }, 1600);
      }
    }

    function finish() {
      D.Store.update(s => {
        s.company = Object.assign({}, step.company);
        s.currency = step.company.currency || 'USD';
        s.onboarded = true;
        return s;
      });
      onDone();
    }

    function field(label, id, value) {
      return el('div.cell', null,
        el('span.label', { text: label }),
        el('input.input', { id, value: value || '', style: 'margin-top:6px', oninput: (e) => { step.company[id.replace('ob-', '')] = e.target.value; } }));
    }
  }

  window.Onboarding = { render };
})();

