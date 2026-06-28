import type { EachStore } from './types'

/** Ikigai Finance Engine — pre-populated Thai AI-startup workspace. */
export function buildDemoStore(): EachStore {
  return {
    onboarded: true,
    company: {
      legalName: 'AXIOM DECISION SYSTEMS CO., LTD.',
      reg: '0105566000000',
      name: 'Axiom Decision Systems',
      country: 'Thailand',
      industry: 'Decision systems / AI consulting',
      founded: '2024-09-01',
      address: '88 Silom Rd, Bang Rak, Bangkok 10500',
    },
    companyName: 'Axiom Decision Systems',
    currency: 'THB',
    asOf: '2026-06-27',
    foundingCapital: [
      {
        id: 'fc1',
        source: 'Registration paperwork',
        taxId: '0105566000000',
        amount: 1000000,
        currency: 'THB',
        date: '2024-09-01',
        note: 'Paid-up capital',
      },
    ],
    expenses: [
      { id: 'e1', date: '2026-06-01', vendor: 'AWS', category: 'Cloud', type: 'opex', amount: 12000, currency: 'THB', source: 'Gmail', owner: 'Founder' },
      { id: 'e2', date: '2026-06-02', vendor: 'Figma', category: 'Design', type: 'opex', amount: 1600, currency: 'THB', source: 'Gmail', owner: 'Founder' },
      { id: 'e3', date: '2026-06-04', vendor: 'Linear', category: 'Productivity', type: 'opex', amount: 1150, currency: 'THB', source: 'Gmail', owner: 'Founder' },
      { id: 'e4', date: '2026-06-09', vendor: 'Apple', category: 'Hardware', type: 'capex', amount: 89000, currency: 'THB', source: 'Gmail', owner: 'Founder' },
      { id: 'e5', date: '2026-06-15', vendor: 'WeWork', category: 'Office', type: 'opex', amount: 22000, currency: 'THB', source: 'Gmail', owner: 'Founder' },
    ],
    gmailConnected: true,
    gmailImported: 5,
    employees: [],
    aiEmployees: [
      { id: 'ai-1', name: 'Claude', vendor: 'Anthropic', role: 'Reasoning & writing', plan: 'Max 5x', cost: 7000, currency: 'THB', efficiency: 92, started: '2025-01-12' },
      { id: 'ai-2', name: 'Cursor', vendor: 'Anysphere', role: 'Engineering pair', plan: 'Pro', cost: 700, currency: 'THB', efficiency: 88, started: '2025-02-03' },
      { id: 'ai-3', name: 'OpenAI', vendor: 'OpenAI', role: 'General & vision', plan: 'Plus/Team', cost: 5000, currency: 'THB', efficiency: 85, started: '2025-01-20' },
      { id: 'ai-4', name: 'Gemini', vendor: 'Google', role: 'Long-context research', plan: 'Advanced', cost: 700, currency: 'THB', efficiency: 79, started: '2025-03-15' },
      { id: 'ai-5', name: 'Zed AI', vendor: 'Zed', role: 'Inline edits', plan: 'Pro', cost: 350, currency: 'THB', efficiency: 74, started: '2025-04-01' },
      { id: 'ai-6', name: 'Kimi', vendor: 'Moonshot', role: 'Long-doc & CN market', plan: 'Pro', cost: 500, currency: 'THB', efficiency: 70, started: '2025-05-09' },
    ],
    projects: [
      { id: 'proj_1', title: 'TKCx New Chapter', clientId: 'TKC', client: 'Turnkey Communications PCL', totalValue: 1000000, received: 97000, taxDeducted: 3000, receivedDate: '2026-06-15', status: 'doing', dealStatus: 'commissioned', scenarioTier: 1, currency: 'THB', owner: 'Founder', checklist: [{ k: 'Kickoff with TKC', done: true }, { k: 'Discovery & scope', done: true }, { k: 'Build phase', done: false }, { k: 'Deploy & handoff', done: false }], notes: [{ t: 'First tranche received. 3% withholding tax recorded against revenue.', at: '2026-06-15' }], files: ['tkcx-sow.pdf'] },
      { id: 'proj_2', title: 'Horizon Assessment', clientId: 'EDA', client: 'EDA (Thailand) Co., Ltd.', totalValue: 500000, received: 0, taxDeducted: 0, receivedDate: '', status: 'doing', dealStatus: 'commissioned', scenarioTier: 1, currency: 'THB', owner: 'Founder', checklist: [{ k: 'Stakeholder interviews', done: false }, { k: 'Assessment report draft', done: false }], notes: [], files: [] },
      { id: 'proj_3', title: 'Bundle: AI Sovereignty, SME Platform, Zuno', clientId: 'EDA', client: 'EDA (Thailand) Co., Ltd.', totalValue: 1000000, received: 0, taxDeducted: 0, receivedDate: '', status: 'backlog', dealStatus: 'pipeline', scenarioTier: 2, currency: 'THB', owner: 'Founder', checklist: [{ k: 'Proposal submitted', done: true }, { k: 'Awaiting EDA decision', done: false }], notes: [], files: [] },
      { id: 'proj_4', title: 'Chula Super Dashboard', clientId: 'Chula', client: 'Chulalongkorn University', totalValue: 1000000, received: 0, taxDeducted: 0, receivedDate: '', status: 'backlog', dealStatus: 'pipeline', scenarioTier: 2, currency: 'THB', owner: 'Founder', checklist: [{ k: 'Scoping workshop', done: false }], notes: [], files: [] },
      { id: 'proj_5', title: 'Praram 9 AI Readiness', clientId: 'PR9', client: 'Praram 9 Hospital', totalValue: 2000000, received: 0, taxDeducted: 0, receivedDate: '', status: 'backlog', dealStatus: 'pipeline', scenarioTier: 2, currency: 'THB', owner: 'Founder', checklist: [{ k: 'RFP response sent', done: true }], notes: [], files: [] },
      { id: 'proj_6', title: 'TKC AI Pilot', clientId: 'TKC', client: 'Turnkey Communications PCL', totalValue: 5000000, received: 0, taxDeducted: 0, receivedDate: '', status: 'backlog', dealStatus: 'pipeline', scenarioTier: 3, currency: 'THB', owner: 'Founder', checklist: [{ k: 'Qualify opportunity', done: false }], notes: [{ t: 'Stretch deal. Would 5x the book if it lands.', at: '2026-06-20' }], files: [] },
    ],
    objectives: [
      { id: 'o1', objective: 'Close 2 of 4 pipeline deals this quarter', keyResults: [{ k: 'EDA bundle signed', done: false }, { k: 'Chula scoped', done: false }, { k: 'PR9 shortlisted', done: true }] },
      { id: 'o2', objective: 'Keep monthly burn under 60,000 THB', keyResults: [{ k: 'Burn under cap', done: true }, { k: 'Runway over 12 mo', done: true }] },
    ],
    actions: [],
    loans: [
      {
        id: 'l1',
        lender: 'SCB SME Loan',
        principal: 300000,
        rate: 6.5,
        termMonths: 24,
        installment: 13350,
        currency: 'THB',
        startDate: '2026-01-15',
        note: 'MacBook fleet + working capital',
      },
    ],
  }
}
