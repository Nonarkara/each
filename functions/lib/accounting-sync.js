// Server-side copy of the accounting sync logic.
// Keep in sync with js/accounting.js until a shared module is introduced.

export const DEFAULT_ACCOUNTS = [
  { id: '1000', name: 'Cash', type: 'asset' },
  { id: '1100', name: 'Accounts receivable', type: 'asset' },
  { id: '1200', name: 'Equipment', type: 'asset' },
  { id: '2000', name: 'Accounts payable', type: 'liability' },
  { id: '2100', name: 'Tax payable', type: 'liability' },
  { id: '3000', name: 'Founding capital', type: 'equity' },
  { id: '3100', name: 'Retained earnings', type: 'equity' },
  { id: '4000', name: 'Service revenue', type: 'revenue' },
  { id: '5000', name: 'Payroll', type: 'expense' },
  { id: '5100', name: 'Rent', type: 'expense' },
  { id: '5200', name: 'Cloud & software', type: 'expense' },
  { id: '5300', name: 'Hardware & depreciation', type: 'expense' },
  { id: '5400', name: 'Office & admin', type: 'expense' },
  { id: '5900', name: 'Withholding tax', type: 'expense' },
];

export function ensureAccounts(s) {
  if (!s.accounts || !s.accounts.length) {
    s.accounts = JSON.parse(JSON.stringify(DEFAULT_ACCOUNTS));
  }
  if (!s.journal) s.journal = [];
  return s;
}

function signFor(type) {
  return type === 'asset' || type === 'expense' ? 1 : -1;
}

export function balance(s) {
  const map = (s.accounts || []).reduce((m, a) => { m[a.id] = a; return m; }, {});
  const bal = {};
  (s.accounts || []).forEach(a => (bal[a.id] = 0));
  (s.journal || []).forEach(tx => {
    tx.lines.forEach(l => {
      const a = map[l.accountId];
      if (!a) return;
      bal[a.id] += signFor(a.type) * ((Number(l.debit) || 0) - (Number(l.credit) || 0));
    });
  });
  return bal;
}

export function typeBalance(s, types) {
  const bal = balance(s);
  return (s.accounts || []).filter(a => types.includes(a.type)).reduce((sum, a) => sum + bal[a.id], 0);
}

function expAccount(cat) {
  const c = (cat || '').toLowerCase();
  if (c.includes('cloud') || c.includes('software') || c.includes('productivity') || c.includes('design')) return '5200';
  if (c.includes('hardware') || c.includes('equipment') || c.includes('depreciation')) return '5300';
  if (c.includes('rent') || c.includes('office')) return '5100';
  if (c.includes('payroll') || c.includes('salary')) return '5000';
  if (c.includes('tax')) return '5900';
  return '5400';
}

export function sync(s) {
  s = ensureAccounts(s);
  const kept = (s.journal || []).filter(tx => !tx.auto);
  const next = [];
  const uid = () => 'id-' + Math.random().toString(36).slice(2, 9);

  (s.foundingCapital || []).forEach(fc => {
    next.push({
      id: uid(), date: fc.date || s.asOf, description: 'Paid-in capital — ' + String(fc.source), auto: true, sourceId: 'fc-' + fc.id,
      lines: [
        { accountId: '1000', debit: Number(fc.amount) || 0, credit: 0 },
        { accountId: '3000', debit: 0, credit: Number(fc.amount) || 0 },
      ],
    });
  });

  (s.expenses || []).forEach(e => {
    const amt = Number(e.amount) || 0;
    if (!amt) return;
    next.push({
      id: uid(), date: e.date || s.asOf, description: String(e.vendor) + ' — ' + String(e.category), auto: true, sourceId: 'exp-' + e.id,
      lines: [
        { accountId: expAccount(e.category), debit: amt, credit: 0 },
        { accountId: '1000', debit: 0, credit: amt },
      ],
    });
  });

  (s.projects || []).forEach(p => {
    if (p.dealStatus !== 'commissioned') return;
    const total = Number(p.totalValue) || 0;
    const received = Number(p.received) || 0;
    const tax = Number(p.taxDeducted) || 0;
    const client = String(p.client || p.title);
    if (received > 0) {
      const lines = [
        { accountId: '1000', debit: received, credit: 0 },
        { accountId: '4000', debit: 0, credit: received + tax },
      ];
      if (tax > 0) lines.push({ accountId: '2100', debit: tax, credit: 0 });
      next.push({ id: uid(), date: p.receivedDate || s.asOf, description: 'Revenue received — ' + client, auto: true, sourceId: 'rev-received-' + p.id, lines });
    }
    const receivedGross = received + tax;
    const outstanding = Math.max(0, total - receivedGross);
    if (outstanding > 0) {
      next.push({
        id: uid(), date: s.asOf, description: 'Revenue accrued — ' + client, auto: true, sourceId: 'rev-accrued-' + p.id,
        lines: [
          { accountId: '1100', debit: outstanding, credit: 0 },
          { accountId: '4000', debit: 0, credit: outstanding },
        ],
      });
    }
  });

  s.journal = kept.concat(next);
  return s;
}
