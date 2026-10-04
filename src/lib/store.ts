import type { EachStore, Expense, RegistryHit } from './types'
import { buildAbcDemoStore, buildAxiomDemoStore } from './demo'
import { today, uid } from './format'
import { scheduleSheetsSave } from '../services/sheets'
import { migrateStore, validateStore } from './validation'

const KEY = 'each-store-v1'
const listeners = new Set<(s: EachStore) => void>()

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
    aiEmployees: [],
    projects: [],
    recurringExpenses: [],
    objectives: [],
    actions: [],
    loans: [],
  }
}

let recoveryError = ''
let state: EachStore = load()
export function getStoreRecoveryError(): string { return recoveryError }
export function preservedWorkspaceJson(): string { return localStorage.getItem(KEY) || '' }

function load(): EachStore {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      return migrateStore(validateStore(JSON.parse(raw)))
    }
  } catch {
    recoveryError = 'Saved workspace could not be validated. The original data has been preserved. / ตรวจข้อมูลที่บันทึกไม่สำเร็จ ระบบเก็บข้อมูลเดิมไว้แล้ว'
  }
  return seedStore()
}

function persist(previous: EachStore, reviewedReplacement = false) {
  if (recoveryError && !reviewedReplacement) { state = previous; throw new Error(recoveryError) }
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    state = previous
    throw new Error('Unable to save in this browser. Free storage or export a backup. / บันทึกในเบราว์เซอร์ไม่สำเร็จ กรุณาเพิ่มพื้นที่หรือสำรองข้อมูล')
  }
  recoveryError = ''
  scheduleSheetsSave(state)
  listeners.forEach((fn) => fn(state))
}

/** Phase 2 swap point — replace read/write with Frappe REST client. */
export const storeApi = {
  get: (): EachStore => state,
  set: (patch: Partial<EachStore>): EachStore => {
    const previous = state
    state = validateStore({ ...state, ...patch })
    if (patch.company?.legalName) state.companyName = patch.company.legalName
    else if (patch.company?.name) state.companyName = patch.company.name
    persist(previous)
    return state
  },
  update: (fn: (s: EachStore) => EachStore): EachStore => {
    const previous = state
    state = validateStore(fn(JSON.parse(JSON.stringify(state))))
    if (state.company?.legalName) state.companyName = state.company.legalName
    persist(previous)
    return state
  },
  load: (obj: EachStore): EachStore => {
    const previous = state
    state = migrateStore(validateStore(obj))
    if (state.company?.legalName) state.companyName = state.company.legalName
    persist(previous, true)
    return state
  },
  reset: (): EachStore => {
    const previous = state
    state = seedStore()
    persist(previous, true)
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

export function loadAxiomStore(): EachStore {
  return storeApi.load(buildAxiomDemoStore())
}

export function loadAbcStore(): EachStore {
  return storeApi.load(buildAbcDemoStore())
}

/** @deprecated Use loadAxiomStore */
export function loadDemoStore(): EachStore {
  return loadAxiomStore()
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
