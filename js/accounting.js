/* accounting.js — Accounting pillar. Chart of accounts, double-entry journal, BS + P&L. */
(function () {
  'use strict';
  const { el, station } = window.UI;
  const D = window.Data;

  const DEFAULT_ACCOUNTS = [
    { id:'1000', name:'Cash', type:'asset' },
    { id:'1100', name:'Accounts receivable', type:'asset' },
    { id:'1200', name:'Equipment', type:'asset' },
    { id:'2000', name:'Accounts payable', type:'liability' },
    { id:'2100', name:'Tax payable', type:'liability' },
    { id:'3000', name:'Founding capital', type:'equity' },
    { id:'3100', name:'Retained earnings', type:'equity' },
    { id:'4000', name:'Service revenue', type:'revenue' },
    { id:'5000', name:'Payroll', type:'expense' },
    { id:'5100', name:'Rent', type:'expense' },
    { id:'5200', name:'Cloud & software', type:'expense' },
    { id:'5300', name:'Hardware & depreciation', type:'expense' },
    { id:'5400', name:'Office & admin', type:'expense' },
    { id:'5900', name:'Withholding tax', type:'expense' },
  ];

  function ensureAccounts(s) {
    if (!s.accounts || !s.accounts.length) {
      s.accounts = JSON.parse(JSON.stringify(DEFAULT_ACCOUNTS));
    }
    if (!s.journal) s.journal = [];
    return s;
  }

  function accountMap(s) {
    return (s.accounts || []).reduce((m, a) => { m[a.id] = a; return m; }, {});
  }

  /* Balance direction: assets/expenses increase with debit; liabilities/equity/revenue increase with credit. */
  function signFor(type) { return (type === 'asset' || type === 'expense') ? 1 : -1; }

  function balance(s) {
    const map = accountMap(s);
    const bal = {};
    (s.accounts || []).forEach(a => bal[a.id] = 0);
    (s.journal || []).forEach(tx => {
      tx.lines.forEach(l => {
        const a = map[l.accountId];
        if (!a) return;
        bal[a.id] += signFor(a.type) * ((Number(l.debit) || 0) - (Number(l.credit) || 0));
      });
    });
    return bal;
  }

  function typeBalance(s, types) {
    const map = accountMap(s);
    const bal = balance(s);
    return (s.accounts || []).filter(a => types.includes(a.type)).reduce((sum, a) => sum + bal[a.id], 0);
  }

  /* Auto-sync: rebuild journal entries from founding capital, expenses, and project revenue.
     Manual entries are preserved; auto entries are replaced. */
  function sync(s) {
    s = ensureAccounts(s);
    const kept = (s.journal || []).filter(tx => !tx.auto);
    const next = [];

    (s.foundingCapital || []).forEach(fc => {
      next.push({
        id: D.uid(), date: fc.date || s.asOf, description: 'Paid-in capital — ' + UI.esc(fc.source), auto: true, sourceId: 'fc-' + fc.id,
        lines: [
          { accountId: '1000', debit: Number(fc.amount) || 0, credit: 0 },
          { accountId: '3000', debit: 0, credit: Number(fc.amount) || 0 },
        ]
      });
    });

    const expAccount = (cat) => {
      const c = (cat || '').toLowerCase();
      if (c.includes('cloud') || c.includes('software') || c.includes('productivity') || c.includes('design')) return '5200';
      if (c.includes('hardware') || c.includes('equipment') || c.includes('depreciation')) return '5300';
      if (c.includes('rent') || c.includes('office')) return '5100';
      if (c.includes('payroll') || c.includes('salary')) return '5000';
      if (c.includes('tax')) return '5900';
      return '5400';
    };
    (s.expenses || []).forEach(e => {
      const amt = Number(e.amount) || 0;
      if (!amt) return;
      next.push({
        id: D.uid(), date: e.date || s.asOf, description: UI.esc(e.vendor) + ' — ' + UI.esc(e.category), auto: true, sourceId: 'exp-' + e.id,
        lines: [
          { accountId: expAccount(e.category), debit: amt, credit: 0 },
          { accountId: '1000', debit: 0, credit: amt },
        ]
      });
    });

    (s.projects || []).forEach(p => {
      if (p.dealStatus !== 'commissioned') return;
      const total = Number(p.totalValue) || 0;
      const received = Number(p.received) || 0;
      const tax = Number(p.taxDeducted) || 0;
      const client = UI.esc(p.client || p.title);
      if (received > 0) {
        const lines = [
          { accountId: '1000', debit: received, credit: 0 },
          { accountId: '4000', debit: 0, credit: received + tax },
        ];
        if (tax > 0) lines.push({ accountId: '2100', debit: tax, credit: 0 });
        next.push({
          id: D.uid(), date: p.receivedDate || s.asOf, description: 'Revenue received — ' + client, auto: true, sourceId: 'rev-received-' + p.id,
          lines
        });
      }
      const receivedGross = received + tax;
      const outstanding = Math.max(0, total - receivedGross);
      if (outstanding > 0) {
        next.push({
          id: D.uid(), date: s.asOf, description: 'Revenue accrued — ' + client, auto: true, sourceId: 'rev-accrued-' + p.id,
          lines: [
            { accountId: '1100', debit: outstanding, credit: 0 },
            { accountId: '4000', debit: 0, credit: outstanding },
          ]
        });
      }
    });

    s.journal = kept.concat(next);
    return s;
  }

  function render(s, remount) {
    s = ensureAccounts(s);
    const wrap = el('div', null);
    wrap.appendChild(station('A', 'PILLAR 04 · ACCOUNTING', 'Accounting', (s.journal || []).length + ' journal entries · ' + (s.accounts || []).length + ' accounts'));

    const bal = balance(s);
    const assets = typeBalance(s, ['asset']);
    const liabilities = typeBalance(s, ['liability']);
    const equity = typeBalance(s, ['equity']);
    const revenue = typeBalance(s, ['revenue']);
    const expenses = typeBalance(s, ['expense']);
    const netIncome = revenue - expenses;
    const equityWithEarnings = equity + netIncome;

    /* Summary cards */
    wrap.appendChild(el('div.hgrid.g-4', { style: 'margin-bottom:22px' },
      cell('Assets', D.money(assets, s.currency), 'Cash + AR + equipment'),
      cell('Liabilities', D.money(liabilities, s.currency), 'Payables + tax'),
      cell('Equity', D.money(equityWithEarnings, s.currency), 'Capital + retained'),
      cell('Net income', D.money(netIncome, s.currency), revenue >= expenses ? 'P&L' : 'Loss')));

    wrap.appendChild(el('div.row.gap-m', { style: 'margin-bottom:22px' },
      el('button.btn.ghost.sm', { text: '↻ Sync to journal', onclick: () => { Data.Store.update(st => sync(st)); remount(); } }),
      el('button.btn.ghost.sm', { text: '+ Manual entry', onclick: () => addEntry(s, remount) }),
      el('span.meta', { text: 'Sync rebuilds auto entries from capital, expenses, and projects.' })));

    wrap.appendChild(reports(s, bal, assets, liabilities, equityWithEarnings, revenue, expenses));
    wrap.appendChild(journalTable(s, remount));
    return wrap;
  }

  function cell(label, value, sub) {
    return el('div.cell', null, el('span.label', { text: label }), el('div.v', { text: value }), sub ? el('div.sub', { text: sub }) : null);
  }

  function reports(s, bal, assets, liabilities, equity, revenue, expenses) {
    const map = accountMap(s);
    function rows(types) {
      return (s.accounts || []).filter(a => types.includes(a.type))
        .sort((a, b) => a.id.localeCompare(b.id))
        .map(a => ({ a, v: bal[a.id] }))
        .filter(r => r.v !== 0)
        .map(r => '<tr><td>' + UI.esc(r.a.id) + '</td><td>' + UI.esc(r.a.name) + '</td><td class="num">' + D.money(r.v, s.currency) + '</td></tr>')
        .join('') || '<tr><td colspan="3" class="empty">No entries</td></tr>';
    }

    const bs = el('div.cell', null,
      el('div.sec-head', null, el('span.label', { text: 'Balance sheet' }), el('span.label-meta', { text: 'Assets = Liabilities + Equity' })),
      el('table.axiom', { html: '<thead><tr><th>Account</th><th>Name</th><th class="num">Balance</th></tr></thead><tbody>' + rows(['asset', 'liability', 'equity']) + '</tbody>' }),
      el('div.row.between', { style: 'margin-top:8px' },
        el('span.micro', { text: 'Assets ' + D.money(assets, s.currency) }),
        el('span.micro', { text: 'L+E ' + D.money(liabilities + equity, s.currency) })));

    const pl = el('div.cell', null,
      el('div.sec-head', null, el('span.label', { text: 'Profit & loss' }), el('span.label-meta', { text: 'Revenue − Expenses' })),
      el('table.axiom', { html: '<thead><tr><th>Account</th><th>Name</th><th class="num">Balance</th></tr></thead><tbody>' + rows(['revenue', 'expense']) + '</tbody>' }),
      el('div.row.between', { style: 'margin-top:8px' },
        el('span.micro', { text: 'Revenue ' + D.money(revenue, s.currency) }),
        el('span.micro', { text: 'Expenses ' + D.money(expenses, s.currency) }),
        el('span.t-value' + (revenue >= expenses ? '' : '.red'), { text: 'Net ' + D.money(revenue - expenses, s.currency) })));

    return el('div.hgrid.g-2', { style: 'margin-bottom:22px' }, bs, pl);
  }

  function journalTable(s, remount) {
    const map = accountMap(s);
    const rows = (s.journal || []).slice().sort((a, b) => (a.date || '').localeCompare(b.date || '')).reverse().map(tx => {
      const lines = tx.lines.map(l => {
        const a = map[l.accountId] || { name: '—' };
        return '<tr><td></td><td class="pl">' + UI.esc(a.name) + '</td><td class="num">' + (l.debit ? D.money(l.debit, s.currency) : '') + '</td><td class="num">' + (l.credit ? D.money(l.credit, s.currency) : '') + '</td></tr>';
      }).join('');
      return '<tr class="tx-head"><td>' + UI.esc(tx.date) + '</td><td colspan="3"><strong>' + UI.esc(tx.description) + '</strong>' + (tx.auto ? ' <span class="micro">auto</span>' : '') + '</td></tr>' + lines;
    }).join('') || '<tr><td colspan="4" class="empty">No journal entries. Sync or add one.</td></tr>';

    return el('div', null,
      el('div.sec-head', null, el('span.label', { text: 'Journal' }), el('span.label-meta', { text: 'Double-entry ledger' })),
      el('table.axiom', { html: '<thead><tr><th>Date</th><th>Account</th><th class="num">Debit</th><th class="num">Credit</th></tr></thead><tbody>' + rows + '</tbody>' }));
  }

  function addEntry(s, remount) {
    const date = el('input.input', { type: 'date', value: s.asOf || new Date().toISOString().slice(0,10) });
    const desc = el('input.input', { placeholder: 'Description' });
    const lines = [
      { account: el('select.select', null, ...s.accounts.map(a => el('option', { value: a.id, text: a.id + ' ' + a.name }))), debit: el('input.input', { type: 'number', placeholder: '0' }), credit: el('input.input', { type: 'number', placeholder: '0' }) },
      { account: el('select.select', null, ...s.accounts.map(a => el('option', { value: a.id, text: a.id + ' ' + a.name }))), debit: el('input.input', { type: 'number', placeholder: '0' }), credit: el('input.input', { type: 'number', placeholder: '0' }) },
    ];

    const body = el('div.stack.gap-m', null,
      el('div.hgrid.g-2', null, cell2('Date', date), cell2('Description', desc)),
      el('div', null, el('div.label', { text: 'Lines' }),
        ...lines.map((l, i) => el('div.hgrid.g-4', { style: 'margin-top:8px' },
          el('div.cell', null, el('span.label', { text: 'Account ' + (i + 1) }), l.account),
          el('div.cell', null, el('span.label', { text: 'Debit' }), l.debit),
          el('div.cell', null, el('span.label', { text: 'Credit' }), l.credit)))));

    const m = UI.modal('Journal entry', body, [
      el('button.btn.ghost', { text: 'Cancel', onclick: () => m.close() }),
      el('button.btn', { text: 'Record', onclick: () => {
        const txLines = lines.map(l => ({
          accountId: l.account.value,
          debit: Number(l.debit.value) || 0,
          credit: Number(l.credit.value) || 0,
        })).filter(l => l.debit || l.credit);
        const debits = txLines.reduce((a, l) => a + l.debit, 0);
        const credits = txLines.reduce((a, l) => a + l.credit, 0);
        if (!desc.value.trim()) { alert('Enter a description.'); return; }
        if (txLines.length < 2) { alert('A journal entry needs at least two lines.'); return; }
        if (Math.abs(debits - credits) > 0.001) { alert('Debits (' + debits + ') must equal credits (' + credits + ').'); return; }
        if (txLines.some(l => l.debit < 0 || l.credit < 0)) { alert('Debit and credit amounts must be 0 or positive.'); return; }
        Data.Store.update(st => {
          st.journal.push({ id: D.uid(), date: date.value, description: desc.value.trim(), auto: false, lines: txLines });
          return st;
        });
        m.close(); remount();
      } })
    ]);
  }
  function cell2(label, input) { return el('div.cell', null, el('span.label', { text: label }), input); }

  window.Accounting = { render, sync, balance, DEFAULT_ACCOUNTS };
})();
