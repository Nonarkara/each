import type { EachStore } from './types'
import { axiomRoster, AXIOM_FX, AXIOM_SCHEMA_VERSION } from '../data/axiom-roster'

const collections = ['foundingCapital', 'expenses', 'employees', 'aiEmployees', 'projects', 'objectives', 'actions', 'loans', 'recurringExpenses', 'intakeReceipts'] as const
const forbidden = new Set(['__proto__', 'prototype', 'constructor'])

function checkTree(value: unknown, depth = 0): void {
  if (depth > 20) throw new Error('Workspace data is nested too deeply')
  if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('Invalid numeric value')
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      if (forbidden.has(key)) throw new Error('Unsafe data key')
      checkTree(child, depth + 1)
    }
  }
}

/** All imports are untrusted, including browser caches and database responses. */
export function validateStore(value: unknown): EachStore {
  checkTree(value)
  if (JSON.stringify(value).length > 2_000_000) throw new Error('Workspace exceeds the 2 MB limit')
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected a workspace object')
  const s = value as EachStore
  if (typeof s.onboarded !== 'boolean' || typeof s.companyName !== 'string' || !/^[A-Z]{3}$/.test(s.currency || '') || !/^\d{4}-\d{2}-\d{2}$/.test(s.asOf || '')) throw new Error('Invalid workspace metadata')
  if (s.dataTenant !== undefined && !['axiom', 'abc', 'custom'].includes(s.dataTenant)) throw new Error('Invalid workspace tenant')
  if (s.fxRates && (typeof s.fxRates !== 'object' || Array.isArray(s.fxRates) || Object.values(s.fxRates).some(v => typeof v !== 'number' || !Number.isFinite(v) || v <= 0))) throw new Error('Invalid exchange rate')
  if (s.company !== null && (typeof s.company !== 'object' || Array.isArray(s.company))) throw new Error('Invalid company')
  if (typeof s.gmailConnected !== 'boolean' || !Number.isFinite(s.gmailImported)) throw new Error('Invalid Gmail metadata')
  for (const key of collections) {
    const rows = s[key] ?? (key === 'loans' || key === 'recurringExpenses' || key === 'intakeReceipts' ? [] : undefined)
    if (!Array.isArray(rows) || rows.length > 10000) throw new Error(`Invalid ${key} collection`)
    const ids = new Set<string>()
    for (const row of rows) {
      if (!row || typeof row !== 'object' || typeof row.id !== 'string' || !row.id || ids.has(row.id)) throw new Error(`Invalid or duplicate ${key} ID`)
      ids.add(row.id)
      const record = row as unknown as Record<string, unknown>
      const required: Record<string, string[]> = { expenses: ['vendor', 'date', 'category', 'owner', 'source'], foundingCapital: ['date', 'source', 'taxId'], employees: ['name', 'role', 'started'], aiEmployees: ['name', 'vendor', 'role', 'plan', 'started'], loans: ['lender', 'startDate'], recurringExpenses: ['name'], objectives: ['objective'], actions: ['label', 'module', 'priority'] }
      for (const field of required[key] || []) if (typeof record[field] !== 'string') throw new Error(`Invalid ${key}.${field}`)
      const monetary: Record<string, string[]> = { expenses: ['amount'], foundingCapital: ['amount'], employees: ['salary'], aiEmployees: ['cost', 'efficiency'], loans: ['principal', 'rate', 'termMonths', 'installment'], recurringExpenses: ['amount'] }
      for (const field of monetary[key] || []) if (typeof record[field] !== 'number' || !Number.isFinite(record[field])) throw new Error(`Missing or invalid ${key}.${field}`)
      if (key === 'expenses' && !['capex', 'opex'].includes(String(record.type))) throw new Error('Invalid expense type')
      if (key === 'aiEmployees' && (Number(record.efficiency) < 0 || Number(record.efficiency) > 100)) throw new Error('Invalid AI efficiency')
      if ((monetary[key]?.length || key === 'projects') && record.currency !== undefined && (typeof record.currency !== 'string' || !/^[A-Z]{3}$/.test(record.currency))) throw new Error('Invalid record currency')
      if (monetary[key]?.length && !record.currency) throw new Error('Missing record currency')
      for (const dateField of ['date', 'started', 'startDate', 'receivedDate']) {
        const date = record[dateField]
        if (date !== undefined && date !== '' && (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)) throw new Error(`Invalid ${key}.${dateField}`)
      }
      for (const field of ['amount', 'cost', 'salary', 'principal', 'installment', 'totalValue', 'received', 'taxDeducted', 'rate', 'termMonths']) {
        const n = (row as unknown as Record<string, unknown>)[field]
        if (n !== undefined && (typeof n !== 'number' || !Number.isFinite(n) || n < 0)) throw new Error(`Invalid ${key}.${field}`)
      }
      const currency = (row as { currency?: string }).currency
      if (currency && currency !== s.currency && !((s.fxRates?.[currency] ?? 0) > 0)) throw new Error(`Missing ${currency} exchange rate`)
      if (key === 'projects') {
        const p = row as EachStore['projects'][number]
        if (typeof p.title !== 'string' || !['backlog', 'doing', 'review', 'done'].includes(p.status) || !Array.isArray(p.checklist) || !Array.isArray(p.notes) || !Array.isArray(p.files)) throw new Error('Invalid project')
      }
      if (key === 'aiEmployees' || key === 'employees') {
        if (typeof (row as { name?: unknown }).name !== 'string') throw new Error('Invalid employee name')
      }
      if (key === 'actions' && (typeof record.done !== 'boolean' || !['high', 'medium', 'low'].includes(String(record.priority)) || !['erp', 'act', 'crm', 'hr', 'dossier'].includes(String(record.module)))) throw new Error('Invalid action status')
      if (key === 'objectives' && (!Array.isArray(record.keyResults) || record.keyResults.some(r => !r || typeof r.k !== 'string' || typeof r.done !== 'boolean'))) throw new Error('Invalid objective key results')
      if (key === 'projects') {
        const p = row as EachStore['projects'][number]
        if (p.checklist.some(r => !r || typeof r.k !== 'string' || typeof r.done !== 'boolean') || p.notes.some(r => !r || typeof r.t !== 'string' || typeof r.at !== 'string') || p.files.some(f => typeof f !== 'string')) throw new Error('Invalid project details')
      }
      if (key === 'intakeReceipts') {
        const r = row as NonNullable<EachStore['intakeReceipts']>[number]
        if (typeof r.name !== 'string' || !/^[a-f0-9]{64}$/.test(r.sha256) || typeof r.approvedAt !== 'string' || !Number.isFinite(Date.parse(r.approvedAt)) || typeof r.provider !== 'string' || typeof r.summary !== 'string' || !Array.isArray(r.records) || !r.records.length || r.records.length > 100 || r.records.some(x => !x || !['expenses', 'foundingCapital', 'employees', 'projects'].includes(x.kind) || typeof x.id !== 'string' || typeof x.evidence !== 'string' || !x.evidence || (x.page !== undefined && (!Number.isInteger(x.page) || x.page < 1)))) throw new Error('Invalid intake source receipt')
      }
    }
  }
  return { ...s, loans: s.loans ?? [], recurringExpenses: s.recurringExpenses ?? [] }
}

/** Migrate only the untouched legacy roster; preserve user-edited roster rows. */
export function migrateStore(value: EachStore): EachStore {
  if (value.dataTenant !== 'axiom' || (value.schemaVersion ?? 0) >= AXIOM_SCHEMA_VERSION) return value
  const legacyCosts: Record<string, number> = { 'ai-1': 7000, 'ai-2': 2100, 'ai-3': 700, 'ai-4': 700, 'ai-5': 3500, 'ai-6': 2100, 'ai-7': 3500 }
  const untouched = value.aiEmployees.length === 7 && value.aiEmployees.every((row) => row.currency === 'THB' && legacyCosts[row.id] === row.cost)
  return {
    ...value, schemaVersion: AXIOM_SCHEMA_VERSION, fxRates: { USD: AXIOM_FX, ...value.fxRates },
    ...(untouched ? { aiEmployees: axiomRoster(), recurringExpenses: [...(value.recurringExpenses || []), { id: 'opex_llm_tokens', name: 'Variable LLM API token allowance', amount: 3500, currency: 'THB' }] } : {}),
  }
}
