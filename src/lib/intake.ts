import type { EachStore, Expense, FoundingCapital, Employee, Project } from './types'
import { validateStore } from './validation'

export type IntakeKind = 'expenses' | 'foundingCapital' | 'employees' | 'projects'
export interface Proposal { kind: IntakeKind; record: Record<string, unknown>; evidence: string; page?: number }
export interface IntakeDraft { summary: string; warnings: string[]; proposals: Proposal[] }
export interface IntakeReceipt { id: string; name: string; sha256: string; approvedAt: string; provider: string; summary: string; records: { kind: IntakeKind; id: string; evidence: string; page?: number }[] }
const kinds = new Set<IntakeKind>(['expenses', 'foundingCapital', 'employees', 'projects'])
const required: Record<IntakeKind, string[]> = {
  expenses: ['date', 'vendor', 'category', 'type', 'amount', 'currency', 'owner'],
  foundingCapital: ['source', 'taxId', 'amount', 'currency', 'date'],
  employees: ['name', 'role', 'salary', 'currency', 'started'],
  projects: ['title', 'owner', 'client', 'totalValue', 'currency'],
}
export function parseDraft(value: unknown): IntakeDraft {
  if (!value || typeof value !== 'object') throw new Error('AI response must be an object / AI ต้องส่งข้อมูลเป็นออบเจ็กต์')
  const d = value as IntakeDraft
  if (typeof d.summary !== 'string' || !Array.isArray(d.warnings) || d.warnings.some(x => typeof x !== 'string') || !Array.isArray(d.proposals) || d.proposals.length > 100) throw new Error('Invalid AI proposal / รูปแบบข้อเสนอไม่ถูกต้อง')
  for (const p of d.proposals) {
    if (!kinds.has(p.kind) || !p.record || typeof p.record !== 'object' || Array.isArray(p.record) || typeof p.evidence !== 'string' || !p.evidence.trim()) throw new Error('Every record needs source evidence / ทุกรายการต้องมีข้อความอ้างอิง')
    if (p.page !== undefined && (!Number.isInteger(p.page) || p.page < 1)) throw new Error('Invalid source page')
    for (const key of required[p.kind]) if (p.record[key] === undefined || p.record[key] === '') throw new Error(`Missing ${p.kind}.${key} / ข้อมูลไม่ครบ`)
    for (const key of Object.keys(p.record)) if (['__proto__', 'prototype', 'constructor'].includes(key)) throw new Error('Unsafe record')
    const amount = p.record.amount ?? p.record.salary ?? p.record.totalValue
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) throw new Error('Amount must be a nonnegative number / จำนวนเงินต้องไม่ติดลบ')
    if (typeof p.record.currency !== 'string' || !/^[A-Z]{3}$/.test(p.record.currency)) throw new Error('Invalid currency')
    for (const field of required[p.kind].filter(k => !['amount', 'salary', 'totalValue'].includes(k))) if (typeof p.record[field] !== 'string') throw new Error(`Invalid ${field}`)
    const date = p.record.date ?? p.record.started
    if (date !== undefined && (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)) throw new Error('Use a valid ISO date / วันที่ต้องเป็น YYYY-MM-DD')
    if (p.kind === 'expenses' && !['opex', 'capex'].includes(String(p.record.type))) throw new Error('Expense type must be opex or capex')
  }
  return d
}
/** Pure transaction: validation failure cannot partially file a document. */
export function approveDraft(current: EachStore, draft: IntakeDraft, selected: number[], source: Omit<IntakeReceipt, 'id' | 'approvedAt' | 'records'>): EachStore {
  parseDraft(draft)
  if (!selected.length || new Set(selected).size !== selected.length) throw new Error('Select records to approve / เลือกรายการที่ต้องการบันทึก')
  if (current.intakeReceipts?.some(r => r.sha256 === source.sha256)) throw new Error('This document was already filed / เอกสารนี้บันทึกแล้ว')
  const next: EachStore = structuredClone(current)
  const receipt: IntakeReceipt = { ...source, id: crypto.randomUUID(), approvedAt: new Date().toISOString(), records: [] }
  for (const i of selected) {
    const p = draft.proposals[i]
    if (!p) throw new Error('Unknown proposal')
    const id = crypto.randomUUID()
    const r = p.record
    if (p.kind === 'expenses') next.expenses.push({ id, date: String(r.date), vendor: String(r.vendor), category: String(r.category), type: r.type as Expense['type'], amount: Number(r.amount), currency: String(r.currency), owner: String(r.owner), source: source.name })
    if (p.kind === 'foundingCapital') next.foundingCapital.push({ id, source: source.name, taxId: String(r.taxId), amount: Number(r.amount), currency: String(r.currency), date: String(r.date), note: p.evidence } as FoundingCapital)
    if (p.kind === 'employees') next.employees.push({ id, name: String(r.name), role: String(r.role), salary: Number(r.salary), currency: String(r.currency), started: String(r.started) } as Employee)
    if (p.kind === 'projects') next.projects.push({ id, title: String(r.title), owner: String(r.owner), client: String(r.client), totalValue: Number(r.totalValue), currency: String(r.currency), status: 'backlog', dealStatus: 'pipeline', received: 0, checklist: [], notes: [{ t: p.evidence, at: receipt.approvedAt }], files: [source.name] } as Project)
    receipt.records.push({ kind: p.kind, id, evidence: p.evidence, ...(p.page ? { page: p.page } : {}) })
  }
  if (next.company?.legalName) next.companyName = next.company.legalName
  next.intakeReceipts = [...(next.intakeReceipts || []), receipt]
  return validateStore(next)
}
