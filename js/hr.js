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
          el('span.t-value', { text: D.money(a.cost, s.currency) })),
        el('div.row.between', { style: 'margin-top:8px' },
          el('div.row-c.gap-s', null,
            el('span.tag-chip.ai', { text: 'AI · OpEx' }),
            el('span.micro', { text: 'since ' + a.started })),
          el('button.btn.link.red.sm', { text: 'Terminate', onclick: () => { if (confirm('Terminate ' + a.name + '?')) { API.removeAI(a.id); remount(); } } }))))
    });

    const insight = best
      ? el('div.note-callout', null,
          el('div.label', { text: 'Operator read', style: 'margin-bottom:4px' }),
          best.name + ' returns the most efficiency per dollar. ' + worst.name + ' the least. Consolidate before adding the seventh.')
      : null;

    const add = () => {
      const name = el('input.input', { placeholder: 'Operator name' });
      const vendor = el('input.input', { placeholder: 'Vendor' });
      const cost = el('input.input', { type: 'number', placeholder: 'Monthly cost' });
      const eff = el('input.input', { type: 'number', placeholder: 'Efficiency %' });
      const body = el('div.stack.gap-m', null,
        el('div.hgrid.g-2', null, cell2('Name', name), cell2('Vendor', vendor)),
        el('div.hgrid.g-2', null, cell2('Monthly cost (' + s.currency + ')', cost), cell2('Efficiency %', eff)));
      const m = UI.modal('Add AI operator', body, [
        el('button.btn.ghost', { text: 'Cancel', onclick: () => m.close() }),
        el('button.btn', { text: 'Add', onclick: () => {
          if (!name.value) return;
          const c = Number(cost.value) || 0;
          if (c < 0) { alert('Monthly cost cannot be negative.'); return; }
          API.addAI({ name: name.value, vendor: vendor.value || '—', role: 'General', plan: '—', cost: c, currency: s.currency, efficiency: Math.min(100, Math.max(0, Number(eff.value) || 0)), started: new Date().toISOString().slice(0,10) });
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
      '<td style="text-align:right"><button class="btn link red sm" onclick="if(confirm(\'Terminate ' + UI.esc(h.name) + '?\')) { API.removeHuman(\'' + h.id + '\'); App.remount(); }">×</button></td></tr>').join('');

    const add = () => {
      const name = el('input.input', { placeholder: 'Full name' });
      const role = el('input.input', { placeholder: 'Role' });
      const sal = el('input.input', { type: 'number', placeholder: 'Monthly salary' });
      const body = el('div.stack.gap-m', null,
        el('div.hgrid.g-2', null, cell2('Name', name), cell2('Role', role)),
        el('div.hgrid.g-2', null, cell2('Monthly salary (' + s.currency + ')', sal), el('div.cell')));
      const m = UI.modal('Add human employee', body, [
        el('button.btn.ghost', { text: 'Cancel', onclick: () => m.close() }),
        el('button.btn', { text: 'Add', onclick: () => {
          if (!name.value) return;
          const salary = Number(sal.value) || 0;
          if (salary < 0) { alert('Salary cannot be negative.'); return; }
          API.addHuman({ name: name.value, role: role.value || '—', salary: salary, currency: s.currency, started: new Date().toISOString().slice(0,10) });
          m.close(); remount();
        } }) ]);
    };

    return el('div', null,
      el('div.sec-head', null, el('span.label', { text: 'Human staff' }), el('span.label-meta', { text: hum.length + ' on payroll' })),
      el('table.axiom', { html: '<thead><tr><th>Name</th><th>Role</th><th>Type</th><th>Started</th><th class="num">Salary / mo</th><th></th></tr></thead><tbody>'
        + (rows || '<tr><td colspan="6" class="empty">No human employees yet.</td></tr>') + '</tbody>' }),
      el('button.btn.ghost.sm', { text: '+ Add employee', style: 'margin-top:10px', onclick: add }));
  }
  function cell2(label, input) { return el('div.cell', null, el('span.label', { text: label }), input); }

  window.HR = { render };
})();

