import type { EachStore } from './types'
import { validateStore } from './validation'
export const mirrorCollections = ['foundingCapital', 'expenses', 'employees', 'aiEmployees', 'projects', 'loans', 'objectives', 'actions', 'recurringExpenses', 'intakeReceipts'] as const
export const mirrorHeaders: Record<string, string[]> = {
  foundingCapital: ['id', 'source', 'taxId', 'amount', 'currency', 'date', 'note'],
  expenses: ['id', 'date', 'vendor', 'category', 'type', 'amount', 'currency', 'source', 'owner'],
  employees: ['id', 'name', 'role', 'salary', 'currency', 'started'],
  aiEmployees: ['id', 'name', 'vendor', 'role', 'plan', 'cost', 'currency', 'efficiency', 'started'],
  projects: ['id', 'title', 'status', 'owner', 'client', 'clientId', 'totalValue', 'received', 'taxDeducted', 'receivedDate', 'dealStatus', 'scenarioTier', 'currency', 'checklist', 'notes', 'files'],
  loans: ['id', 'lender', 'principal', 'rate', 'termMonths', 'installment', 'currency', 'startDate', 'note'],
  objectives: ['id', 'objective', 'keyResults', 'quarter'], actions: ['id', 'priority', 'label', 'module', 'done'],
  recurringExpenses: ['id', 'name', 'amount', 'currency'], intakeReceipts: ['id', 'name', 'sha256', 'approvedAt', 'provider', 'summary', 'records'],
}
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']'
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().filter(k => (value as Record<string, unknown>)[k] !== undefined).map(k => JSON.stringify(k) + ':' + canonical((value as Record<string, unknown>)[k])).join(',') + '}'
  return JSON.stringify(value)
}
/** Blank optional spreadsheet cells and omitted JSON fields carry the same value. */
export function canonicalMirror(value: unknown): string {
  function normalize(v: unknown): unknown {
    if (Array.isArray(v)) return v.map(normalize)
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).filter(([, child]) => child !== '' && child !== undefined).map(([k, child]) => [k, normalize(child)]))
    return v
  }
  return canonical(normalize(value))
}
export function mirrorChanges(local: EachStore, remote: EachStore) {
  validateStore(remote)
  const changes: { collection: string; added: number; changed: number; removed: number }[] = []
  for (const key of mirrorCollections) {
    const a = new Map((local[key] || []).map(r => [r.id, r]))
    const b = new Map((remote[key] || []).map(r => [r.id, r]))
    changes.push({ collection: key, added: [...b.keys()].filter(id => !a.has(id)).length, changed: [...b.keys()].filter(id => a.has(id) && canonicalMirror(a.get(id)) !== canonicalMirror(b.get(id))).length, removed: [...a.keys()].filter(id => !b.has(id)).length })
  }
  const metadata = Object.fromEntries(Object.entries(remote).filter(([k]) => !mirrorCollections.includes(k as typeof mirrorCollections[number])))
  const before = Object.fromEntries(Object.entries(local).filter(([k]) => !mirrorCollections.includes(k as typeof mirrorCollections[number])))
  return { changes, metadataChanged: canonical(before) !== canonical(metadata) }
}
export function applyReviewedMirror(current: EachStore, reviewedLocal: EachStore, remote: EachStore): EachStore {
  if (canonical(current) !== canonical(reviewedLocal)) throw new Error('Workspace changed during review. Review again. / ข้อมูลเปลี่ยนระหว่างตรวจ กรุณาตรวจใหม่')
  if (current.dataTenant !== remote.dataTenant || current.companyName !== remote.companyName) throw new Error('Workbook belongs to a different workspace / เวิร์กบุ๊กเป็นของพื้นที่ทำงานอื่น')
  return validateStore(structuredClone(remote))
}
export function safeCell(value: unknown): string | number | boolean {
  if (value === undefined || value === null) return ''
  if (typeof value === 'number' || typeof value === 'boolean') return value
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value)
  return /^\s*[=+@-]/.test(text) ? "'" + text : text
}
export function decodeCell(raw: unknown): unknown {
  if (raw === null || raw === undefined) return ''
  if (typeof raw === 'object') throw new Error('Formula and rich-text cells are unsupported. Paste values first. / วางเป็นค่าก่อนนำเข้า')
  if (typeof raw !== 'string') return raw
  const s = raw.startsWith("'") && /^\s*[=+@-]/.test(raw.slice(1)) ? raw.slice(1) : raw
  if (s.startsWith('{') || s.startsWith('[') || s === 'null') return JSON.parse(s)
  return s
}
