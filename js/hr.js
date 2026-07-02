/* hr.js — People pillar. Humans + AI operators. Both are OpEx. Both have faces. */
(function () {
  'use strict';
  const { el, station, bar } = window.UI;
  const D = window.Data;

  function render(s, remount) {
    const ai = s.aiEmployees || [];
    const hum = s.employees || [];
    const aiCost = ai.reduce((a, b) => a + (Number(b.cost) || 0), 0);
    const humCost = hum.reduce((a, b) => a + (Number(b.salary) || 0), 0);
    const total = aiCost + humCost;

    const wrap = el('div', null);
    wrap.appendChild(station('H', 'PILLAR 02 · PEOPLE', 'People', ai.length + ' AI · ' + hum.length + ' human'));

    // summary — the fewest instruments
    wrap.appendChild(el('div.hgrid.g-4', { style: 'margin-bottom:22px' },
      cell('Monthly people cost', D.money(total, s.currency), 'Feeds ERP OpEx directly'),
      cell('AI operators', ai.length, D.money(aiCost, s.currency) + ' / mo'),
      cell('Human staff', hum.length, D.money(humCost, s.currency) + ' / mo'),
      cell('Avg AI efficiency', avgEff(ai) + '%', 'Self-reported / rated')));

    // OpEx reflection — AI vs human split (links to ERP)
    const aiShare = total ? aiCost / total : 0;
    wrap.appendChild(el('div', { style: 'margin-bottom:22px' },
      el('div.sec-head', null, el('span.label', { text: 'People OpEx split' }), el('span.label-meta', { text: 'Reflects into ERP monthly burn' })),
      el('div.stack-bar.tall', null,
        el('span', { style: 'width:' + (aiShare * 100) + '%;background:var(--blue)' }),
        el('span', { style: 'width:' + ((1 - aiShare) * 100) + '%;background:var(--ink)' })),
      el('div.row.between', { style: 'margin-top:6px' },
        el('span.micro', { text: 'AI ' + D.money(aiCost, s.currency) + ' · ' + Math.round(aiShare * 100) + '%' }),
        el('span.micro', { text: 'Human ' + D.money(humCost, s.currency) + ' · ' + Math.round((1 - aiShare) * 100) + '%' }))));

    wrap.appendChild(aiRoster(ai, s, remount));
    wrap.appendChild(humanRoster(hum, s, remount));
    return wrap;
  }

  function avgEff(ai) {
    if (!ai.length) return 0;
    return Math.round(ai.reduce((a, b) => a + (Number(b.efficiency) || 0), 0) / ai.length);
  }
  function cell(label, value, sub) {
    return el('div.cell', null, el('span.label', { text: label }), el('div.v', { text: value }), sub ? el('div.sub', { text: sub }) : null);
  }
  /* AI operators as employees with faces — efficiency compared per dollar. */
  function aiRoster(ai, s, remount) {
    const byValue = ai.slice().sort((a, b) => (b.efficiency / b.cost) - (a.efficiency / a.cost));
    const best = byValue[0], worst = byValue[byValue.length - 1];

    const cards = el('div.hgrid.g-3');
    ai.forEach(a => {
      cards.appendChild(el('div.cell', null,
        el('div.row-c.gap-m', null,
          el('span.disc', { text: a.name.charAt(0) }),
          el('div', null,
            el('div.t-value', { text: a.name }),
            el('div.micro', { text: a.vendor + ' · ' + a.plan }))),
        el('div.meta', { text: a.role, style: 'margin-top:8px' }),
        el('div.row.between', { style: 'margin-top:10px' },
          el('span.micro', { text: 'Efficiency' }),
          el('span.t-value', { text: a.efficiency + '%' })),
        bar(a.efficiency, 'blue'),
        el('div.row.between', { style: 'margin-top:8px' },
          el('span.micro', { text: 'Monthly cost' }),
          el('span.t-value', { text: D.money(a.cost, a.currency || s.currency) })),
        el('div.row.between', { style: 'margin-top:8px' },
          el('div.row-c.gap-s', null,
            el('span.tag-chip.ai', { text: 'AI · OpEx' }),
            el('span.micro', { text: 'since ' + a.started })),
          el('button.btn.link.red.sm', { text: 'Terminate', dataset: { rmAI: a.id } }))))
    });

    cards.addEventListener('click', (e) => {
      const id = e.target?.dataset?.rmAI;
      if (id) {
        const aiOp = (Data.Store.get().aiEmployees || []).find(x => x.id === id);
        if (aiOp) UI.confirm('Terminate ' + aiOp.name + '? Their monthly cost will be removed from your burn.', { title: 'Terminate operator', danger: true, confirmText: 'Terminate' }).then(ok => { if (ok) { API.removeAI(id); UI.toast('Operator terminated', 'info'); remount(); } });
      }
    });

    const insight = best && ai.length > 1
      ? el('div.note-callout', null,
          el('div.label', { text: 'Operator read', style: 'margin-bottom:4px' }),
          best.name + ' returns the most efficiency per dollar. ' + worst.name + ' the least. Consolidate before adding the seventh.')
      : null;

    const add = () => {
      const nameInp = el('input.input', { placeholder: 'e.g. Claude, Cursor, GPT' });
      const vendorInp = el('input.input', { placeholder: 'e.g. Anthropic, OpenAI' });
      const roleInp = el('input.input', { placeholder: 'e.g. Reasoning, Engineering pair' });
      const planInp = el('input.input', { placeholder: 'e.g. Pro, Max 5x' });
      const costInp = el('input.input', { type: 'number', min: '0', step: '0.01', placeholder: '0' });
      const effInp = el('input.input', { type: 'number', min: '0', max: '100', step: '1', placeholder: '0–100' });
      const currencySel = el('select.select', null, ...['THB','USD','EUR','GBP','JPY','SGD','CNY','AUD','CAD'].map(c => el('option', { value: c, text: c, selected: c === s.currency ? 'selected' : null })));

      const fName = UI.formField('Name', nameInp);
      const fVendor = UI.formField('Vendor', vendorInp);
      const fRole = UI.formField('Role', roleInp);
      const fPlan = UI.formField('Plan', planInp);
      const fCost = UI.formField('Monthly cost', costInp);
      const fEff = UI.formField('Efficiency %', effInp, 'How much value per dollar, 0–100');
      const fCurrency = UI.formField('Currency', currencySel);

      const body = el('div.stack.gap-m', null,
        el('div.hgrid.g-2', null, fName.wrap, fVendor.wrap),
        el('div.hgrid.g-2', null, fRole.wrap, fPlan.wrap),
        el('div.hgrid.g-3', null, fCost.wrap, fEff.wrap, fCurrency.wrap));

      const m = UI.modal('Add AI operator', body, [
        el('button.btn.ghost', { text: 'Cancel', onclick: () => m.close() }),
        el('button.btn', { text: 'Add', onclick: () => {
          [fName, fVendor, fRole, fPlan, fCost, fEff, fCurrency].forEach(f => f.clear());
          if (!nameInp.value.trim()) { fName.setError('Name is required.'); return; }
          const c = Number(costInp.value) || 0;
          if (c < 0) { fCost.setError('Cost cannot be negative.'); return; }
          const eff = Math.min(100, Math.max(0, Number(effInp.value) || 0));
          API.addAI({ name: nameInp.value.trim(), vendor: vendorInp.value.trim() || '—', role: roleInp.value.trim() || 'General', plan: planInp.value.trim() || '—', cost: c, currency: currencySel.value || s.currency, efficiency: eff, started: new Date().toISOString().slice(0,10) });
          UI.toast('Added ' + nameInp.value.trim() + ' (' + D.compact(c, currencySel.value || s.currency) + '/mo)', 'success');
          m.close(); remount();
        } }) ]);
    };

    return el('div', null,
      el('div.sec-head', null, el('span.label', { text: 'AI operators' }), el('span.label-meta', { text: ai.length + ' active · framed as employees' })),
      cards, insight,
      el('button.btn.ghost.sm', { text: '+ Add operator', style: 'margin-top:12px', onclick: add }));
  }

  /* Human staff — the usual roster. */
  function humanRoster(hum, s, remount) {
    const rows = hum.map(h =>
      '<tr><td>' + UI.esc(h.name) + '</td><td>' + UI.esc(h.role) + '</td>' +
      '<td><span class="tag-chip human">Human</span></td>' +
      '<td>' + UI.esc(h.started) + '</td><td class="num">' + D.money(h.salary, h.currency || s.currency) + '</td>' +
      '<td style="text-align:right"><button class="btn link red sm" data-rm-human="' + h.id + '">×</button></td></tr>').join('');

    const table = el('table.axiom', { html: '<thead><tr><th>Name</th><th>Role</th><th>Type</th><th>Started</th><th class="num">Salary / mo</th><th></th></tr></thead><tbody>'
        + (rows || '<tr><td colspan="6" class="empty">No human employees yet.</td></tr>') + '</tbody>' });
    table.addEventListener('click', (e) => {
      const id = e.target?.dataset?.rmHuman;
      if (id) {
        const h = (Data.Store.get().employees || []).find(x => x.id === id);
        if (h) UI.confirm('Terminate ' + h.name + '? Their salary will be removed from your burn.', { title: 'Terminate employee', danger: true, confirmText: 'Terminate' }).then(ok => { if (ok) { API.removeHuman(id); UI.toast('Employee terminated', 'info'); remount(); } });
      }
    });

    const add = () => {
      const nameInp = el('input.input', { placeholder: 'Full name' });
      const roleInp = el('input.input', { placeholder: 'e.g. Engineer, Designer' });
      const salInp = el('input.input', { type: 'number', min: '0', step: '0.01', placeholder: '0' });
      const currencySel = el('select.select', null, ...['THB','USD','EUR','GBP','JPY','SGD','CNY','AUD','CAD'].map(c => el('option', { value: c, text: c, selected: c === s.currency ? 'selected' : null })));
      const startInp = el('input.input', { type: 'date', value: new Date().toISOString().slice(0,10) });

      const fName = UI.formField('Name', nameInp);
      const fRole = UI.formField('Role', roleInp);
      const fSal = UI.formField('Monthly salary', salInp);
      const fCurrency = UI.formField('Currency', currencySel);
      const fStart = UI.formField('Start date', startInp);

      const body = el('div.stack.gap-m', null,
        el('div.hgrid.g-2', null, fName.wrap, fRole.wrap),
        el('div.hgrid.g-2', null, fSal.wrap, fCurrency.wrap),
        fStart.wrap);

      const m = UI.modal('Add human employee', body, [
        el('button.btn.ghost', { text: 'Cancel', onclick: () => m.close() }),
        el('button.btn', { text: 'Add', onclick: () => {
          [fName, fRole, fSal, fCurrency, fStart].forEach(f => f.clear());
          if (!nameInp.value.trim()) { fName.setError('Name is required.'); return; }
          const salary = Number(salInp.value) || 0;
          if (salary < 0) { fSal.setError('Salary cannot be negative.'); return; }
          API.addHuman({ name: nameInp.value.trim(), role: roleInp.value.trim() || '—', salary: salary, currency: currencySel.value || s.currency, started: startInp.value || new Date().toISOString().slice(0,10) });
          UI.toast('Added ' + nameInp.value.trim() + ' (' + D.compact(salary, currencySel.value || s.currency) + '/mo)', 'success');
          m.close(); remount();
        } }) ]);
    };

    return el('div', null,
      el('div.sec-head', null, el('span.label', { text: 'Human staff' }), el('span.label-meta', { text: hum.length + ' on payroll' })),
      table,
      el('button.btn.ghost.sm', { text: '+ Add employee', style: 'margin-top:10px', onclick: add }));
  }
  function cell2(label, input) { return el('div.cell', null, el('span.label', { text: label }), input); }

  window.HR = { render };
})();

