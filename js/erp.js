/* erp.js — Finances pillar. Cash, burn, runway, CapEx/OpEx, benchmarks, OKR. */
(function () {
  'use strict';
  const { el, station, bar, statusPlate } = window.UI;
  const D = window.Data;

  /* the finance engine — thin, deterministic, honest. Phase 2 = Frappe accounting. */
  function calc(s) {
    const cur = s.currency;
    const founding = sum(s.foundingCapital, 'amount');
    const totalExpenses = sum(s.expenses, 'amount');
    const totalOpex = sum(s.expenses.filter(e => e.type === 'opex'), 'amount');
    const totalCapex = sum(s.expenses.filter(e => e.type === 'capex'), 'amount');
    // revenue — the startup earns, not only burns
    const receivedRevenue = sum(s.projects, 'received');
    const commissioned = s.projects.filter(p => p.dealStatus === 'commissioned');
    const pipeline = s.projects.filter(p => p.dealStatus === 'pipeline');
    const contractedRevenue = sum(commissioned, 'totalValue');
    const pipelineRevenue = sum(pipeline, 'totalValue');
    const tierWeight = { 1: 1, 2: 0.5, 3: 0.25 };
    const expectedPipeline = pipeline.reduce((a, p) => a + (Number(p.totalValue) || 0) * (tierWeight[p.scenarioTier] || 0.5), 0);
    const outstanding = Math.max(0, contractedRevenue - receivedRevenue);
    const cash = founding + receivedRevenue - totalExpenses;

    const aiMonthly = sum(s.aiEmployees, 'cost');
    const humanMonthly = sum(s.employees, 'salary');
    const recurring = aiMonthly + humanMonthly;

    // one-off opex dated this calendar month (receipts, rent, utilities, etc.)
    const monthKey = (s.asOf || today()).slice(0, 7);
    const monthOpex = sum(s.expenses.filter(e => e.type === 'opex' && String(e.date).slice(0, 7) === monthKey), 'amount');
    const monthCapex = sum(s.expenses.filter(e => e.type === 'capex' && String(e.date).slice(0, 7) === monthKey), 'amount');

    const monthlyDebtService = sum(s.loans, 'installment');
    const monthlyBurn = recurring + monthOpex + monthlyDebtService;
    const runwayMonths = monthlyBurn > 0 ? Math.floor(cash / monthlyBurn) : Infinity;

    const denom = (monthCapex + recurring + monthOpex) || 1;
    const capexShare = monthCapex / denom;
    const opexShare = (recurring + monthOpex) / denom;

    // runway projection (cash declining until depletion)
    const proj = [];
    let bal = cash;
    for (let m = 0; m < 48 && bal > 0 && monthlyBurn > 0; m++) {
      proj.push(bal);
      bal -= monthlyBurn;
    }

    const totalDebt = sum(s.loans, 'principal');

    return {
      cur, founding, cash, totalExpenses, totalOpex, totalCapex,
      aiMonthly, humanMonthly, recurring, monthOpex, monthCapex,
      monthlyDebtService, totalDebt, monthlyBurn, runwayMonths, capexShare, opexShare, proj,
      receivedRevenue, commissionedCount: commissioned.length, pipelineCount: pipeline.length,
      contractedRevenue, pipelineRevenue, expectedPipeline, outstanding,
    };
  }
  function sum(arr, key) { return (arr || []).reduce((a, b) => a + (Number(b[key]) || 0), 0); }
  function today() { return new Date().toISOString().slice(0, 10); }

  function render(s, remount) {
    const f = calc(s);
    const wrap = el('div', null);
    wrap.appendChild(station('F', 'PILLAR 01 · FINANCES', 'Finances', 'As of ' + s.asOf));

    /* ---- The Divine Move: one oversized figure — runway. ---- */
    const safe = f.runwayMonths >= 6;
    wrap.appendChild(el('div.split-phi', { style: 'margin-bottom:22px' },
      el('div', null,
        el('div.micro', { text: 'Runway at current burn' }),
        el('div.hero-move' + (safe ? '' : '.red'), { text: isFinite(f.runwayMonths) ? f.runwayMonths + ' mo' : '∞' }),
        el('div.meta', { text: f.monthlyBurn > 0 ? D.money(f.monthlyBurn, f.cur) + ' / month' : 'No burn recorded', style: 'margin-top:6px' })),
      el('div.stack.gap-s', null,
        el('div.label', { text: 'Status' }),
        el('div.status-plate', null,
          el('div.tag' + (safe ? '.blue' : '.red'), { text: safe ? 'ON TRACK' : 'AT RISK' }),
          el('div.body', null,
            el('div.t-value', { text: safe ? 'Spend within the safe line.' : 'Burn exceeds the safe line.' }),
            el('div.meta', { text: safe ? 'The absence of red is the good news.' : 'Raise or cut. Silence is not a plan.' }))))));

    /* ---- stat grid ---- */
    const burnSub = f.monthlyDebtService
      ? 'Recurring + debt + this month'
      : 'Recurring + this month';
    wrap.appendChild(el('div.hgrid.g-4', { style: 'margin-bottom:22px' },
      cell('Cash on hand', D.money(f.cash, f.cur), 'After ' + s.expenses.length + ' transactions'),
      cell('Founding capital', D.money(f.founding, f.cur), s.foundingCapital.length + ' entries'),
      cell('Monthly burn', D.money(f.monthlyBurn, f.cur), burnSub),
      cell('Recurring OpEx', D.money(f.recurring, f.cur), s.aiEmployees.length + ' AI · ' + s.employees.length + ' human')));

    wrap.appendChild(loans(s, f, remount));
    wrap.appendChild(revenue(f, s));

    /* ---- CapEx vs OpEx allocation ---- */
    wrap.appendChild(el('div', null,
      el('div.sec-head', null, el('span.label', { text: 'Spend allocation this month' }), el('span.label-meta', { text: 'CapEx vs OpEx' })),
      el('div.stack-bar.tall', null,
        el('span', { style: 'width:' + (f.capexShare * 100) + '%;background:var(--ink)' }),
        el('span', { style: 'width:' + (f.opexShare * 100) + '%;background:var(--blue)' })),
      el('div.row.between', { style: 'margin-top:6px' },
        el('span.micro', { text: 'CapEx ' + D.money(f.monthCapex, f.cur) + ' · ' + Math.round(f.capexShare * 100) + '%' }),
        el('span.micro', { text: 'OpEx ' + D.money(f.recurring + f.monthOpex, f.cur) + ' · ' + Math.round(f.opexShare * 100) + '%' }))));

    wrap.appendChild(runwayChart(f, s));
    wrap.appendChild(benchmarks(f, s));
    wrap.appendChild(okr(s, remount));
    wrap.appendChild(ledger(s, remount));
    return wrap;
  }
  function cell(label, value, sub) {
    return el('div.cell', null, el('span.label', { text: label }), el('div.v', { text: value }), sub ? el('div.sub', { text: sub }) : null);
  }

  /* Credit & installments — borrowed blocks that must be paid back. */
  function loans(s, f, remount) {
    const add = () => {
      const lender = el('input.input', { placeholder: 'Lender' });
      const principal = el('input.input', { type: 'number', placeholder: 'Principal remaining' });
      const rate = el('input.input', { type: 'number', placeholder: 'Annual rate %' });
      const term = el('input.input', { type: 'number', placeholder: 'Term in months' });
      const installment = el('input.input', { type: 'number', placeholder: 'Monthly installment' });
      const body = el('div.stack.gap-m', null,
        el('div.hgrid.g-2', null, cell2('Lender', lender), cell2('Principal (' + s.currency + ')', principal)),
        el('div.hgrid.g-2', null, cell2('Annual rate %', rate), cell2('Term (months)', term)),
        el('div.hgrid.g-2', null, cell2('Monthly installment (' + s.currency + ')', installment), el('div.cell')));
      const m = UI.modal('Add loan / credit line', body, [
        el('button.btn.ghost', { text: 'Cancel', onclick: () => m.close() }),
        el('button.btn', { text: 'Record', onclick: () => {
          const inst = Number(installment.value) || 0;
          const prin = Number(principal.value) || 0;
          if (!lender.value || prin <= 0 || inst <= 0) return;
          Data.Store.update(st => { st.loans.push({ id: D.uid(), lender: lender.value, principal: prin, rate: Number(rate.value) || 0, termMonths: Number(term.value) || 0, installment: inst, currency: st.currency, startDate: today(), note: '' }); return st; });
          m.close(); remount();
        } }),
      ]);
    };

    const rows = (s.loans || []).map(l =>
      '<tr><td>' + UI.esc(l.lender) + '</td><td class="num">' + D.money(l.principal, l.currency || s.currency) + '</td>' +
      '<td class="num">' + (l.rate || 0) + '%</td><td class="num">' + (l.termMonths || '—') + '</td>' +
      '<td class="num">' + D.money(l.installment, l.currency || s.currency) + '</td>' +
      '<td style="text-align:right"><button class="btn link red sm" onclick="if(confirm(\'Remove loan from ' + UI.esc(l.lender) + '?\')) { Data.Store.update(st => { st.loans = st.loans.filter(x => x.id !== \'' + l.id + '\'); return st; }); App.remount(); }">×</button></td></tr>').join('');

    return el('div', { style: 'margin-bottom:22px' },
      el('div.sec-head', null, el('span.label', { text: 'Credit & installments' }), el('span.label-meta', { text: (s.loans || []).length + ' loans · ' + D.money(f.totalDebt, f.cur) + ' owed · ' + D.money(f.monthlyDebtService, f.cur) + ' / mo' })),
      el('table.axiom', { html: '<thead><tr><th>Lender</th><th class="num">Principal</th><th class="num">Rate</th><th class="num">Term</th><th class="num">Installment</th><th></th></tr></thead><tbody>'
        + (rows || '<tr><td colspan="6" class="empty">No loans. Borrowed blocks appear here.</td></tr>') + '</tbody>' }),
      el('button.btn.ghost.sm', { text: '+ Add loan', style: 'margin-top:10px', onclick: add }),
      f.monthlyDebtService ? el('div.note-callout', { style: 'margin-top:10px' }, el('div.label', { text: 'Note', style: 'margin-bottom:4px' }), 'Debt service is included in monthly burn and runway.') : null);
  }

  /* Revenue pipeline — the startup earns. Received → contracted → pipeline (tier-weighted). */
  function revenue(f, s) {
    const funnel = f.receivedRevenue + f.outstanding + f.pipelineRevenue;
    const r = funnel ? (f.receivedRevenue / funnel) * 100 : 0;
    const o = funnel ? (f.outstanding / funnel) * 100 : 0;
    const p = funnel ? (f.pipelineRevenue / funnel) * 100 : 0;
    return el('div', null,
      el('div.sec-head', null, el('span.label', { text: 'Revenue pipeline' }), el('span.label-meta', { text: 'Ikigai book · ' + s.projects.length + ' projects' })),
      el('div.hgrid.g-4',
        cell('Received to date', D.money(f.receivedRevenue, f.cur), 'Cash in'),
        cell('Contracted', D.money(f.contractedRevenue, f.cur), f.commissionedCount + ' commissioned'),
        cell('Outstanding', D.money(f.outstanding, f.cur), 'Contracted, unbilled'),
        cell('Expected pipeline', D.money(f.expectedPipeline, f.cur), 'Tier-weighted')),
      el('div.stack-bar.tall', { style: 'margin-top:12px' },
        el('span', { style: 'width:' + r + '%;background:var(--ink)' }),
        el('span', { style: 'width:' + o + '%;background:var(--blue)' }),
        el('span', { style: 'width:' + p + '%;background:var(--n4)' })),
      el('div.row.between', { style: 'margin-top:6px' },
        el('span.micro', { text: 'Received ' + Math.round(r) + '%' }),
        el('span.micro', { text: 'Outstanding ' + Math.round(o) + '%' }),
        el('span.micro', { text: 'Pipeline ' + Math.round(p) + '%' })));
  }
  /* Runway projection — cash declining monthly until depletion (the Lined Glass). */
  function runwayChart(f, s) {
    if (!f.proj.length || f.monthlyBurn <= 0) {
      return el('div', null, el('div.sec-head', null, el('span.label', { text: 'Runway projection' }), el('span.label-meta', { text: 'No burn' })),
        el('div.empty', { text: 'Record expenses to see the projection.' }));
    }
    const max = f.proj[0] || 1;
    const bars = el('div.row', { style: 'align-items:flex-end;gap:3px;height:90px' });
    f.proj.slice(0, 24).forEach((bal, i) => {
      const h = Math.max(2, (bal / max) * 90);
      const last = i === f.proj.length - 1;
      bars.appendChild(el('div', {
        title: 'M' + i + ': ' + D.money(Math.max(0, bal), f.cur),
        style: 'width:10px;height:' + h + 'px;background:' + (last ? 'var(--red)' : 'var(--ink)') + ';opacity:' + (last ? 1 : Math.max(0.3, 1 - i / 30)) }));
    });
    return el('div', null,
      el('div.sec-head', null, el('span.label', { text: 'Runway projection' }), el('span.label-meta', { text: f.proj.length + ' months to depletion' })),
      bars,
      el('div.row.between', { style: 'margin-top:6px' },
        el('span.micro', { text: 'Now' }), el('span.micro', { text: 'Cash hits zero' })));
  }

  /* Benchmarks — you vs seed-stage medians. Numbers over adjectives. */
  function benchmarks(f, s) {
    const rows = [
      ['Monthly burn', f.monthlyBurn, 35000, f.cur],
      ['AI operator spend', f.aiMonthly, 300, f.cur],
      ['Human headcount', s.employees.length, 8, ''],
    ];
    const body = el('div.stack');
    rows.forEach(function (r) {
      const label = r[0], you = r[1], med = r[2], cur = r[3];
      const mx = Math.max(you, med, 1);
      body.appendChild(el('div.drow', null,
        el('span.t-body', { text: label }),
        el('span.row.gap-m', null,
          el('div.bar.thin', { style: 'width:90px' }, el('div.fill', { style: 'width:' + (you / mx * 100) + '%' })),
          el('span.t-value', { text: cur ? D.money(you, cur) : you }),
          el('span.delta', { text: 'med ' + (cur ? D.compact(med, cur) : med) }))));
    });
    return el('div', null,
      el('div.sec-head', null, el('span.label', { text: 'Benchmarks' }), el('span.label-meta', { text: 'You vs seed-stage median' })),
      body);
  }

  /* OKR — objectives, not KPIs. Key results as Lined-Glass progress. */
  function okr(s, remount) {
    if (!s.objectives.length) {
      const seeded = [
        { id: 'o1', objective: 'Reach capital-efficient product-market fit', keyResults: [{ k: 'First paying pilot', done: false }, { k: 'Burn under $4k/mo', done: true }, { k: 'Runway > 18 mo', done: true }] },
        { id: 'o2', objective: 'Ship the Frappe migration', keyResults: [{ k: 'ERPNext live', done: false }, { k: 'Chart of accounts mapped', done: false }] },
      ];
      Data.Store.set({ objectives: seeded });
      s = Data.Store.get();
    }
    const body = el('div.stack');
    s.objectives.forEach(o => {
      const kr = o.keyResults || [];
      const done = kr.filter(k => k.done).length;
      const pct = kr.length ? (done / kr.length) * 100 : 0;
      body.appendChild(el('div.hgrid.g-phi', { style: 'margin-bottom:1px' },
        el('div.cell', null,
          el('div.micro', { text: 'OBJECTIVE' }),
          el('div.t-value', { text: o.objective, style: 'margin-top:3px' }),
          el('div.bar.thin', { style: 'margin-top:8px;width:80%' }, el('div.fill.blue', { style: 'width:' + pct + '%' }))),
        el('div.cell', null,
          el('ul.check', null, ...kr.map((k, i) => el('li' + (k.done ? '.done' : ''), null,
            el('input', { type: 'checkbox', checked: k.done ? 'checked' : null,
              onclick: (e) => { API.toggleOKRTask(o.id, i, e.target.checked); remount(); } }),
            k.k))))));
    });
    return el('div', null,
      el('div.sec-head', null, el('span.label', { text: 'Objectives & key results' }), el('span.label-meta', { text: 'OKR · not KPI' })),
      body);
  }
  /* Ledger — startup-transparent. Everyone sees everyone's expenses. */
  function ledger(s, remount) {
    const add = () => {
      const vendor = el('input.input', { placeholder: 'Vendor' });
      const v = el('input.input', { type: 'number', placeholder: '0' });
      const cat = el('input.input', { placeholder: 'Category' });
      const type = el('select.select', null, el('option', { value: 'opex', text: 'OpEx' }), el('option', { value: 'capex', text: 'CapEx' }));
      const body = el('div.stack.gap-m', null,
        el('div.hgrid.g-2', null, cell2('Vendor', vendor), cell2('Amount (' + s.currency + ')', v)),
        el('div.hgrid.g-2', null, cell2('Category', cat), cell2('Type', type)));
      const m = UI.modal('Add expense', body, [
        el('button.btn.ghost', { text: 'Cancel', onclick: () => m.close() }),
        el('button.btn', { text: 'Record', onclick: () => {
          const amt = Number(v.value);
          if (!vendor.value || !v.value) return;
          if (amt <= 0) { alert('Amount must be greater than 0.'); return; }
          API.addExpense({ date: today(), vendor: vendor.value, category: cat.value || '—', type: type.value, amount: amt, currency: s.currency, source: 'Manual', owner: 'Founder' });
          m.close(); remount();
        } }),
      ]);
    };

    const rows = s.expenses.slice().reverse().map(e =>
      '<tr><td>' + UI.esc(e.date) + '</td><td>' + UI.esc(e.vendor) + '</td><td>' + UI.esc(e.category) +
      '</td><td><span class="tag-chip ' + (e.type === 'capex' ? 'capex' : 'opex') + '">' + e.type.toUpperCase() + '</span></td>' +
      '<td>' + UI.esc(e.owner) + '</td><td class="num">' + D.money(e.amount, e.currency) + '</td>' +
      '<td style="text-align:right">' + (e.source === 'Manual' ? '<button class="btn link red sm" onclick="API.removeExpense(\'' + e.id + '\'); App.remount();">×</button>' : '') + '</td></tr>').join('');

    return el('div', null,
      el('div.sec-head', null, el('span.label', { text: 'Expense ledger' }), el('span.label-meta', { text: 'Transparent — all members' })),
      el('table.axiom', { html: '<thead><tr><th>Date</th><th>Vendor</th><th>Category</th><th>Type</th><th>Owner</th><th class="num">Amount</th><th></th></tr></thead><tbody>'
        + (rows || '<tr><td colspan="7" class="empty">No expenses yet. Connect Gmail or add manually.</td></tr>') + '</tbody>' }),
      el('button.btn.ghost.sm', { text: '+ Add expense', style: 'margin-top:10px', onclick: add }));
  }
  function cell2(label, input) { return el('div.cell', null, el('span.label', { text: label }), input); }

  window.ERP = { render, calc };
})();



