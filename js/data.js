/* data.js — persistence + seed. Phase 2 swaps this thin layer for Frappe REST. */
(function (global) {
  'use strict';
  const KEY = 'axiom_crm2_state_v1';
  const listeners = new Set();
  let state = load();

  function load() {
    try { const raw = localStorage.getItem(KEY); if (raw) { const s = JSON.parse(raw); return migrate(s); } } catch (e) {}
    return seed();
  }
  function migrate(s) {
    if (!s.accounts || !s.accounts.length) s.accounts = seedAccounts();
    if (!s.journal) s.journal = [];
    if (!s.loans) s.loans = [];
    return s;
  }
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
    listeners.forEach(fn => fn(state));
  }
  const Store = {
    get() { return state; },
    set(patch) { state = Object.assign({}, state, patch); persist(); },
    update(fn) { state = fn(JSON.parse(JSON.stringify(state))); persist(); },
    reset() { state = seed(); persist(); },
    load(obj) { state = migrate(obj); persist(); },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };

  function today() { return new Date().toISOString().slice(0, 10); }

  function seed() {
    return {
      onboarded: false, company: null,
      foundingCapital: [],            // {id, source, taxId, amount, currency, date, note}
      expenses: [],                   // {id, date, vendor, category, type:capex|opex, amount, currency, source, owner}
      gmailConnected: false, gmailImported: 0,
      employees: [],                  // humans {id, name, role, salary, currency, started}
      aiEmployees: seedAIEmployees(), // {id, name, vendor, role, plan, cost, currency, efficiency, started}
      projects: seedProjects(),       // kanban {id, title, status, owner, checklist, notes, files}
      objectives: [],                 // OKRs {id, objective, keyResults:[{k,done}], quarter}
      accounts: seedAccounts(),       // chart of accounts {id, name, type}
      journal: [],                    // double-entry transactions {id, date, description, auto, lines:[{accountId, debit, credit}]}
      loans: [],                      // {id, lender, principal, rate, termMonths, installment, currency, startDate, note}
      currency: 'USD', asOf: today(),
    };
  }

  function seedAccounts() {
    return [
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
  }
  /* The signature framing: AI subscriptions as employees with faces. */
  function seedAIEmployees() {
    return [
      { id:'ai-1', name:'Claude', vendor:'Anthropic', role:'Reasoning & writing',   plan:'Max 5x',   cost:200, currency:'USD', efficiency:92, started:'2025-01-12' },
      { id:'ai-2', name:'Cursor', vendor:'Anysphere', role:'Engineering pair',      plan:'Pro',      cost:20,  currency:'USD', efficiency:88, started:'2025-02-03' },
      { id:'ai-3', name:'OpenAI', vendor:'OpenAI',    role:'General & vision',      plan:'Plus/Team',cost:150, currency:'USD', efficiency:85, started:'2025-01-20' },
      { id:'ai-4', name:'Gemini', vendor:'Google',    role:'Long-context research', plan:'Advanced', cost:20,  currency:'USD', efficiency:79, started:'2025-03-15' },
      { id:'ai-5', name:'Zed AI', vendor:'Zed',       role:'Inline edits',          plan:'Pro',      cost:10,  currency:'USD', efficiency:74, started:'2025-04-01' },
      { id:'ai-6', name:'Kimi',   vendor:'Moonshot',  role:'Long-doc & CN market',  plan:'Pro',      cost:15,  currency:'USD', efficiency:70, started:'2025-05-09' },
    ];
  }
  function seedProjects() {
    return [
      { id:'p1', title:'Investor dossier Q1', status:'doing', owner:'Founder',
        checklist:[{k:'Compile runway model',done:true},{k:'Write narrative',done:false},{k:'Export PDF',done:false}],
        notes:[{t:'Pitch angle: capital efficiency, not headcount.',at:today()}], files:['runway-model.xlsx'] },
      { id:'p2', title:'Migrate ERP to Frappe', status:'doing', owner:'Founder',
        checklist:[{k:'Provision MariaDB',done:true},{k:'Install ERPNext',done:false},{k:'Map chart of accounts',done:false}],
        notes:[], files:[] },
      { id:'p3', title:'First customer pilot', status:'backlog', owner:'Founder', checklist:[], notes:[], files:[] },
      { id:'p4', title:'Brand mark final', status:'review', owner:'Founder',
        checklist:[{k:'Disc construction on phi grid',done:true}], notes:[], files:[] },
      { id:'p5', title:'Gmail receipt ingestion', status:'done', owner:'Founder', checklist:[], notes:[], files:[] },
    ];
  }
  /* Simulated public-domain registry (the AI autofill).
     Production = LLM + registrar API + web search. Here: latency + small registry + fallback. */
  const REGISTRY = {
    '0105566000000': { legalName:'AXIOM DECISION SYSTEMS CO., LTD.', address:'88 Silom Rd, Bang Rak, Bangkok 10500', country:'Thailand', industry:'Decision systems / software', founded:'2024-09-01', capitalHint:1000000, currency:'THB' },
    '0011223344':    { legalName:'AXIOM SYSTEMS INC.', address:'1 Market St, San Francisco, CA 94105', country:'United States', industry:'Software / SaaS', founded:'2024-09-01', capitalHint:50000, currency:'USD' },
  };
  function registryLookup(regNumber, nameHint) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const hit = REGISTRY[String(regNumber).trim()];
        if (hit) { resolve(Object.assign({ found:true, source:'Public business registry' }, hit)); return; }
        const guess = (nameHint || '').trim();
        resolve({
          found: guess.length > 1,
          source: guess ? 'Inferred from public web (low confidence)' : 'No match',
          legalName: guess ? guess.toUpperCase() : '',
          address:'', country:'', industry:'', founded:'', capitalHint:0, currency:'USD',
        });
      }, 1100 + Math.random() * 900);
    });
  }

  /* Simulated Gmail receipt pull — anchored to the current month so burn reads true. */
  function gmailReceipts() {
    const ym = new Date().toISOString().slice(0, 7); // YYYY-MM
    const mk = (d) => ym + '-' + String(d).padStart(2, '0');
    return [
      { date: mk(1),  vendor:'AWS',    category:'Cloud',         type:'opex', amount:340,  currency:'USD', owner:'Founder' },
      { date: mk(2),  vendor:'Figma',  category:'Design',        type:'opex', amount:45,   currency:'USD', owner:'Founder' },
      { date: mk(4),  vendor:'Linear', category:'Productivity',  type:'opex', amount:32,   currency:'USD', owner:'Founder' },
      { date: mk(9),  vendor:'Apple',  category:'Hardware',      type:'capex',amount:2499, currency:'USD', owner:'Founder' },
      { date: mk(15), vendor:'WeWork', category:'Office',        type:'opex', amount:620,  currency:'USD', owner:'Founder' },
    ];
  }

  function money(n, cur) {
    const c = cur || 'USD';
    try { return new Intl.NumberFormat('en-US', { style:'currency', currency:c, maximumFractionDigits:0 }).format(n || 0); }
    catch (e) { return (n || 0).toFixed(0) + ' ' + c; }
  }
  function compact(n, cur) {
    const c = cur || 'USD';
    try { return new Intl.NumberFormat('en-US', { style:'currency', currency:c, notation:'compact', maximumFractionDigits:1 }).format(n || 0); }
    catch (e) { return (n || 0).toFixed(0); }
  }

  global.Data = { Store, registryLookup, gmailReceipts, money, compact, uid: () => 'id-' + Math.random().toString(36).slice(2, 9) };
})(window);

