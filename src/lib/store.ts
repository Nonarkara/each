import type { EachStore, Expense, RegistryHit } from './types'
import { buildDemoStore } from './demo'
import { today, uid } from './format'

const KEY = 'each-store-v1'
const listeners = new Set<(s: EachStore) => void>()

function seedAIEmployees() {
  return [
    { id: 'ai-1', name: 'Claude', vendor: 'Anthropic', role: 'Reasoning & writing', plan: 'Max 5x', cost: 200, currency: 'USD', efficiency: 92, started: '2025-01-12' },
    { id: 'ai-2', name: 'Cursor', vendor: 'Anysphere', role: 'Engineering pair', plan: 'Pro', cost: 20, currency: 'USD', efficiency: 88, started: '2025-02-03' },
    { id: 'ai-3', name: 'OpenAI', vendor: 'OpenAI', role: 'General & vision', plan: 'Plus/Team', cost: 150, currency: 'USD', efficiency: 85, started: '2025-01-20' },
    { id: 'ai-4', name: 'Gemini', vendor: 'Google', role: 'Long-context research', plan: 'Advanced', cost: 20, currency: 'USD', efficiency: 79, started: '2025-03-15' },
    { id: 'ai-5', name: 'Zed AI', vendor: 'Zed', role: 'Inline edits', plan: 'Pro', cost: 10, currency: 'USD', efficiency: 74, started: '2025-04-01' },
    { id: 'ai-6', name: 'Kimi', vendor: 'Moonshot', role: 'Long-doc & CN market', plan: 'Pro', cost: 15, currency: 'USD', efficiency: 70, started: '2025-05-09' },
  ]
}

function seedProjects() {
  const d = today()
  return [
    { id: 'p1', title: 'Investor dossier Q1', status: 'doing' as const, owner: 'Founder', checklist: [{ k: 'Compile runway model', done: true }, { k: 'Write narrative', done: false }, { k: 'Export PDF', done: false }], notes: [{ t: 'Pitch angle: capital efficiency, not headcount.', at: d }], files: ['runway-model.xlsx'] },
    { id: 'p2', title: 'Migrate ERP to Frappe', status: 'doing' as const, owner: 'Founder', checklist: [{ k: 'Provision MariaDB', done: true }, { k: 'Install ERPNext', done: false }, { k: 'Map chart of accounts', done: false }], notes: [], files: [] },
    { id: 'p3', title: 'First customer pilot', status: 'backlog' as const, owner: 'Founder', checklist: [], notes: [], files: [] },
    { id: 'p4', title: 'Brand mark final', status: 'review' as const, owner: 'Founder', checklist: [{ k: 'Disc construction on phi grid', done: true }], notes: [], files: [] },
    { id: 'p5', title: 'Gmail receipt ingestion', status: 'done' as const, owner: 'Founder', checklist: [], notes: [], files: [] },
  ]
}

export function seedStore(): EachStore {
  return {
    onboarded: false,
    company: null,
    companyName: '',
    currency: 'THB',
    asOf: today(),
    foundingCapital: [],
    expenses: [],
    gmailConnected: false,
    gmailImported: 0,
    employees: [],
    aiEmployees: seedAIEmployees(),
    projects: seedProjects(),
    objectives: [],
    actions: [],
    loans: [],
  }
}

let state: EachStore = load()

function load(): EachStore {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<EachStore>
      return { ...seedStore(), ...parsed, loans: parsed.loans ?? [] }
    }
  } catch {
    /* ignore */
  }
  return seedStore()
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* ignore */
  }
  void import('../services/sheets').then((m) => m.scheduleSheetsSave(state))
  listeners.forEach((fn) => fn(state))
}

/** Phase 2 swap point — replace read/write with Frappe REST client. */
export const storeApi = {
  get: (): EachStore => state,
  set: (patch: Partial<EachStore>): EachStore => {
    state = { ...state, ...patch }
    if (patch.company?.legalName) state.companyName = patch.company.legalName
    else if (patch.company?.name) state.companyName = patch.company.name
    persist()
    return state
  },
  update: (fn: (s: EachStore) => EachStore): EachStore => {
    state = fn(JSON.parse(JSON.stringify(state)))
    if (state.company?.legalName) state.companyName = state.company.legalName
    persist()
    return state
  },
  load: (obj: EachStore): EachStore => {
    state = obj
    if (state.company?.legalName) state.companyName = state.company.legalName
    persist()
    return state
  },
  reset: (): EachStore => {
    state = seedStore()
    persist()
    return state
  },
  subscribe: (fn: (s: EachStore) => void): (() => void) => {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },
}

export function readStore(): EachStore {
  return storeApi.get()
}

export function writeStore(next: Partial<EachStore>): EachStore {
  return storeApi.set(next)
}

export function updateStore(fn: (s: EachStore) => EachStore): EachStore {
  return storeApi.update(fn)
}

export function resetStore(): void {
  storeApi.reset()
}

export function loadDemoStore(): EachStore {
  return storeApi.load(buildDemoStore())
}

const REGISTRY: Record<string, Omit<RegistryHit, 'found'>> = {
  '0105569099335': {
    source: 'Public business registry (DBD)',
    legalName: 'AXIOM X CO., LTD.',
    address: '16 Soi Phahonyothin 59 Yak 1, Anusawari, Bang Khen, Bangkok',
    country: 'Thailand',
    industry: 'Technology · AI · Innovation consulting',
    founded: '2026-05-28',
    capitalHint: 800000,
    currency: 'THB',
  },
  '0105566000000': {
    source: 'Public business registry',
    legalName: 'AXIOM DECISION SYSTEMS CO., LTD.',
    address: '88 Silom Rd, Bang Rak, Bangkok 10500',
    country: 'Thailand',
    industry: 'Decision systems / software',
    founded: '2024-09-01',
    capitalHint: 1000000,
    currency: 'THB',
  },
  '0011223344': {
    source: 'Public business registry',
    legalName: 'AXIOM SYSTEMS INC.',
    address: '1 Market St, San Francisco, CA 94105',
    country: 'United States',
    industry: 'Software / SaaS',
    founded: '2024-09-01',
    capitalHint: 50000,
    currency: 'USD',
  },
}

/** Stub — Phase 1 wires LLM + registrar API. */
export function registryLookup(regNumber: string, nameHint?: string): Promise<RegistryHit> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const hit = REGISTRY[String(regNumber).trim()]
      if (hit) {
        resolve({ found: true, ...hit })
        return
      }
      const guess = (nameHint || '').trim()
      resolve({
        found: guess.length > 1,
        source: guess ? 'Inferred from public web (low confidence)' : 'No match',
        legalName: guess ? guess.toUpperCase() : '',
        address: '',
        country: '',
        industry: '',
        founded: '',
        capitalHint: 0,
        currency: 'USD',
      })
    }, 1100 + Math.random() * 900)
  })
}

/** Stub — Phase 1 wires Gmail OAuth + receipt parser. */
export function gmailReceipts(): Omit<Expense, 'id' | 'source'>[] {
  const ym = new Date().toISOString().slice(0, 7)
  const mk = (d: number) => ym + '-' + String(d).padStart(2, '0')
  return [
    { date: mk(1), vendor: 'AWS', category: 'Cloud', type: 'opex', amount: 340, currency: 'USD', owner: 'Founder' },
    { date: mk(2), vendor: 'Figma', category: 'Design', type: 'opex', amount: 45, currency: 'USD', owner: 'Founder' },
    { date: mk(4), vendor: 'Linear', category: 'Productivity', type: 'opex', amount: 32, currency: 'USD', owner: 'Founder' },
    { date: mk(9), vendor: 'Apple', category: 'Hardware', type: 'capex', amount: 2499, currency: 'USD', owner: 'Founder' },
    { date: mk(15), vendor: 'WeWork', category: 'Office', type: 'opex', amount: 620, currency: 'USD', owner: 'Founder' },
  ]
}

export function importGmailReceipts(): EachStore {
  const recs = gmailReceipts()
  return storeApi.update((s) => {
    recs.forEach((r) =>
      s.expenses.push({ ...r, id: uid(), source: 'Gmail' }),
    )
    s.gmailConnected = true
    s.gmailImported = recs.length
    return s
  })
}

export { uid, today, money, compact } from './format'
