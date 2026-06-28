/* sheets.js — Google Sheets CSV export. Four files: finances, people, projects, journal. */
(function (global) {
  'use strict';
  const D = window.Data;

  function csv(rows) {
    return rows.map(r => r.map(cell => {
      if (cell === null || cell === undefined) return '';
      const s = String(cell);
      return (s.includes(',') || s.includes('"') || s.includes('\n'))
        ? '"' + s.replace(/"/g, '""') + '"'
        : s;
    }).join(',')).join('\n');
  }

  function download(filename, content) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function exportAll() {
    const s = D.Store.get();
    const date = new Date().toISOString().slice(0, 10);
    const prefix = ((s.company && s.company.legalName) ? s.company.legalName.replace(/\s+/g, '-') : 'each') + '-' + date;

    download(prefix + '-finances.csv', csv([
      ['Date', 'Vendor', 'Category', 'Type', 'Amount', 'Currency', 'Owner'],
      ...(s.expenses || []).map(e => [e.date, e.vendor, e.category, e.type, e.amount, e.currency, e.owner])
    ]));

    download(prefix + '-people.csv', csv([
      ['Name', 'Type', 'Role', 'Vendor / Dept', 'Monthly Cost', 'Currency', 'Efficiency %', 'Started'],
      ...(s.aiEmployees || []).map(e => [e.name, 'AI', e.role, e.vendor, e.cost, e.currency, e.efficiency, e.started]),
      ...(s.employees   || []).map(e => [e.name, 'Human', e.role, '', e.salary, e.currency, '', e.started])
    ]));

    download(prefix + '-projects.csv', csv([
      ['Title', 'Status', 'Deal', 'Client', 'Total Value', 'Received', 'Tax Deducted', 'Owner', 'Tasks Done', 'Tasks Total'],
      ...(s.projects || []).map(p => {
        const done  = (p.checklist || []).filter(c => c.done).length;
        const total = (p.checklist || []).length;
        return [p.title, p.status, p.dealStatus, p.client, p.totalValue, p.received, p.taxDeducted, p.owner, done, total];
      })
    ]));

    download(prefix + '-journal.csv', csv([
      ['Date', 'Description', 'Account', 'Debit', 'Credit', 'Type'],
      ...(s.journal || []).flatMap(j =>
        (j.lines || []).map(l => {
          const acct = (s.accounts || []).find(a => a.id === l.accountId);
          return [j.date, j.description, acct ? acct.name : l.accountId, l.debit || '', l.credit || '', j.auto ? 'auto' : 'manual'];
        })
      )
    ]));
  }

  global.Sheets = { exportAll };
})(window);
