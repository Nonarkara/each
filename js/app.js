/* app.js — shell, cockpit, routing. The spine the three pillars hang on. */
(function () {
  'use strict';
  const { el, clear, station } = window.UI;
  const D = window.Data;

  const ROUTES = [
    { id: 'erp',     disc: 'F', kicker: 'PILLAR 01', label: 'Finances' },
    { id: 'hr',      disc: 'H', kicker: 'PILLAR 02', label: 'People' },
    { id: 'crm',     disc: 'P', kicker: 'PILLAR 03', label: 'Projects' },
    { id: 'acct',    disc: 'A', kicker: 'PILLAR 04', label: 'Accounting' },
    { id: 'dossier', disc: 'I', kicker: 'EXPORT',    label: 'Dossier' },
  ];
  let current = 'erp';

  function mount() {
    const root = document.getElementById('root');
    clear(root);
    const s = D.Store.get();
    if (!s.onboarded) { root.appendChild(Onboarding.render(done)); return; }

    root.appendChild(el('div.app-shell', null, cockpit(s), el('main#view.main')));
    go(current);
    if (window.Sync) window.Sync.load();
  }

  function cockpit(s) {
    const navItems = ROUTES.map(r => el('div.nav-item' + (r.id === current ? '.active' : ''),
      { onclick: () => go(r.id), title: r.label },
      el('span.disc.sm', { text: r.disc }), r.label));

    const fin = ERP.calc(s);
    const syncWrap = el('div.row-c.gap-s', null,
      el('span.live-dot'), el('span.label-meta', { text: 'Live' }));
    if (window.Sync) window.Sync.mountIndicator(syncWrap);

    const vitals = el('div.row.gap-l', null,
      mini('Cash', D.money(fin.cash, s.currency), 'On hand'),
      mini('Runway', fin.runwayMonths + ' mo', fin.runwayMonths < 6 ? 'Below safe line' : 'At current burn'),
      syncWrap);

    return el('header.cockpit', null,
      el('div.cockpit-bar', null,
        mark(s.company && s.company.legalName),
        el('nav.nav', null, ...navItems),
        el('div.spacer'),
        vitals,
        el('div.row-c.gap-m', null,
          el('button.btn.link', { text: 'Export', title: 'Download your data', onclick: exportData }),
          el('button.btn.link', { text: 'Import', title: 'Restore from a backup file', onclick: importData }),
          el('button.btn.link', { text: 'Reset',
            onclick: () => { if (confirm('Clear all prototype data?')) { D.Store.reset(); location.reload(); } } }))));
  }

  function mark(companyName) {
    return el('div.row-c.gap-m', null,
      el('span.disc.ink', { text: 'A', title: 'AXIOM — hub station' }),
      el('div', null,
        el('div.label', { text: 'AXIOM', style: 'letter-spacing:0.2em' }),
        el('div.micro', { text: companyName ? companyName.split(' ').slice(0, 2).join(' ') : 'Superapp' })));
  }
  function mini(label, value, sub) {
    return el('div', null,
      el('div.micro', { text: label }),
      el('div.t-value', { text: value, class: (sub === 'Below safe line') ? 'red' : '' }),
      el('div.micro', { text: sub, style: 'opacity:.7' }));
  }

  function go(route) {
    current = route;
    document.querySelectorAll('.nav-item').forEach((n, i) => n.classList.toggle('active', ROUTES[i].id === route));
    const view = document.getElementById('view');
    clear(view);
    const s = D.Store.get();
    if (route === 'erp') view.appendChild(ERP.render(s, mount));
    else if (route === 'hr') view.appendChild(HR.render(s, mount));
    else if (route === 'crm') view.appendChild(CRM.render(s, mount));
    else if (route === 'acct') view.appendChild(Accounting.render(s, mount));
    else if (route === 'dossier') view.appendChild(dossier(s));
    window.scrollTo(0, 0);
  }
  window.App = { remount: mount, go };
  /* Investor dossier — Editorial mode. The end-of-year printout. */
  function dossier(s) {
    const fin = ERP.calc(s);
    const wrap = el('div', null,
      station('I', 'EXPORT · FY' + new Date().getFullYear(), 'Investor dossier', 'As of ' + s.asOf));

    const head = el('div.status-plate', { style: 'margin-bottom:22px' }, null,
      el('div.tag.blue', { text: 'DOSSIER' }),
      el('div.body', null,
        el('div.t-section', { text: s.company ? s.company.legalName : '—' }),
        el('div.meta', { text: ((s.company && s.company.industry) ? s.company.industry + ' · ' : '') + (s.company && s.company.country || '') })));
    wrap.appendChild(head);

    const facts = el('div.hgrid.g-4', { style: 'margin-bottom:22px' },
      cell('Cash on hand', D.money(fin.cash, s.currency), 'After ' + s.expenses.length + ' txns'),
      cell('Founding capital', D.money(fin.founding, s.currency), s.foundingCapital.length + ' entries'),
      cell('Contracted revenue', D.money(fin.contractedRevenue, s.currency), fin.commissionedCount + ' commissioned'),
      cell('Runway', fin.runwayMonths + ' months'));

    const narrative = el('div.split-phi', null,
      el('div.editorial', null,
        el('p', { text: 'The company holds ' + D.money(fin.cash, s.currency) + ' against a monthly burn of ' + D.money(fin.monthlyBurn, s.currency) + '. Runway reads ' + fin.runwayMonths + ' months at current spend.' }),
        el('p', { text: 'Revenue: ' + D.money(fin.contractedRevenue, s.currency) + ' contracted (' + D.money(fin.receivedRevenue, s.currency) + ' received), ' + D.money(fin.expectedPipeline, s.currency) + ' expected pipeline. The book stands at ' + D.money(fin.contractedRevenue + fin.pipelineRevenue, s.currency) + '.' }),
        el('p', { text: 'Capital efficiency over headcount. ' + s.aiEmployees.length + ' AI operators and ' + s.employees.length + ' human staff. OpEx ' + Math.round(fin.opexShare * 100) + '% of spend, CapEx ' + Math.round(fin.capexShare * 100) + '%.' }),
        el('p', { text: fin.runwayMonths < 6 ? 'Burn exceeds the safe line. Raise or cut. Silence is not a plan.' : 'Spend is disciplined. The absence of red is the good news.' })),
      el('div.stack.gap-s', null,
        el('div.label', { text: 'Spend allocation' }),
        el('div.stack-bar', null,
          el('span', { style: 'width:' + (fin.capexShare * 100) + '%;background:var(--ink)' }),
          el('span', { style: 'width:' + (fin.opexShare * 100) + '%;background:var(--blue)' })),
        el('div.row.between', null,
          el('span.micro', { text: 'CapEx ' + Math.round(fin.capexShare * 100) + '%' }),
          el('span.micro', { text: 'OpEx ' + Math.round(fin.opexShare * 100) + '%' }))));

    wrap.appendChild(el('div.stack.gap-l', null, facts, narrative,
      el('div', null,
        el('div.sec-head', null, el('span.label', { text: 'Projects in flight' }), el('span.label-meta', { text: s.projects.length + ' total' })),
        el('table.axiom', { html: projectRows(s) })),
      el('div.row.gap-m', { style: 'margin-top:8px' },
        el('button.btn', { text: 'Print dossier', onclick: () => window.print() }),
        el('span.meta', { text: 'Provenance: prototype state, ' + s.asOf }))));
    return wrap;
  }
  function cell(label, value) { return el('div.cell', null, el('span.label', { text: label }), el('div.v', { text: value })); }

  function projectRows(s) {
    const order = { backlog: 0, doing: 1, review: 2, done: 3 };
    const rows = s.projects.slice().sort((a, b) => order[a.status] - order[b.status]);
    return '<thead><tr><th>Project</th><th>Status</th><th>Owner</th><th class="num">Tasks</th></tr></thead><tbody>'
      + rows.map(p => {
          const done = (p.checklist || []).filter(c => c.done).length, tot = (p.checklist || []).length;
          return '<tr><td>' + UI.esc(p.title) + '</td><td>' + UI.esc(p.status.toUpperCase()) + '</td><td>' + UI.esc(p.owner) + '</td><td class="num">' + done + '/' + tot + '</td></tr>';
        }).join('') + '</tbody>';
  }

  function done() { mount(); go('erp'); }

  function exportData() {
    const blob = new Blob([JSON.stringify(D.Store.get(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'axiom-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }
  function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = () => {
      const file = input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const obj = JSON.parse(reader.result);
          if (!confirm('Replace current data with the backup? This cannot be undone.')) return;
          D.Store.load(obj);
          location.reload();
        } catch (e) {
          alert('Invalid backup file.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  document.addEventListener('DOMContentLoaded', mount);
})();

