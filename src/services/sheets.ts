import { canonicalMirror } from '../lib/mirror'
import type { EachStore } from '../lib/types'
import { buildAxiomMockStore } from '../data/axiom-mock'
import { seedStore } from '../lib/store'
import { validateStore } from '../lib/validation'
import APPS_SCRIPT_SOURCE from '../../sheets/apps-script.gs?raw'

const WEB_APP_URL = import.meta.env.VITE_SHEETS_WEB_APP_URL as string | undefined
const URL_STORAGE_KEY = 'each-sheets-web-app-url'
const LAST_SAVE_KEY = 'each-sheets-last-saved'
/** Explicit consent for manual full-workspace transfer to the configured Google deployment. */
const ACK_STORAGE_KEY = 'each-sheets-exfil-ack-v1'
const ACK_VERSION = 1

type SyncStatus = 'local' | 'loading' | 'saving' | 'saved' | 'error'

export type { SyncStatus }

let remoteRevision: string | null = null
let saveInFlight = false
let status: SyncStatus = 'local'
let saveTimer: ReturnType<typeof setTimeout> | null = null
const statusListeners = new Set<(s: SyncStatus) => void>()

function setStatus(next: SyncStatus) {
  status = next
  statusListeners.forEach((fn) => fn(next))
}

export function getSheetsWebAppUrl(): string {
  return WEB_APP_URL || localStorage.getItem(URL_STORAGE_KEY) || ''
}

export function setSheetsWebAppUrl(url: string): void {
  const trimmed = url.trim()
  if (trimmed && !/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(trimmed)) throw new Error('Use a Google Apps Script /exec URL')
  if (saveTimer) clearTimeout(saveTimer)
  remoteRevision = null
  if (trimmed) localStorage.setItem(URL_STORAGE_KEY, trimmed)
  else localStorage.removeItem(URL_STORAGE_KEY)
}

/** Returns the saved URL only if the user has acknowledged the plaintext-exfil risk. */
export function isSheetsSyncEnabled(): boolean {
  return Boolean(getSheetsWebAppUrl()) && hasSheetsExfilAck()
}

export function hasSheetsExfilAck(): boolean {
  try {
    return localStorage.getItem(ACK_STORAGE_KEY) === String(ACK_VERSION)
  } catch {
    return false
  }
}

export function setSheetsExfilAck(ack: boolean): void {
  try {
    if (ack) localStorage.setItem(ACK_STORAGE_KEY, String(ACK_VERSION))
    else localStorage.removeItem(ACK_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

export function lastSheetsSavedAt(): number {
  try {
    return parseInt(localStorage.getItem(LAST_SAVE_KEY) || '0', 10) || 0
  } catch {
    return 0
  }
}

/** Pinned Apps Script body — single source of truth in /sheets/apps-script.gs, bundled at build. */
export function getSheetsAppsScript(): string {
  return APPS_SCRIPT_SOURCE
}

/** Pre-save validation: shape check + GET probe. The Apps Script doGet returns JSON. */
export async function testSheetsUrl(url: string): Promise<{ ok: boolean; message: string }> {
  const target = (url || '').trim()
  if (!target) return { ok: false, message: 'No URL configured.' }
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(target)) {
    return {
      ok: false,
      message: 'That does not look like an Apps Script Web App URL. Expected https://script.google.com/.../exec',
    }
  }
  try {
    const res = await fetch(target, { method: 'GET', redirect: 'follow', credentials: 'include', signal: AbortSignal.timeout(15000) })
    const text = await res.text()
    let data: { error?: string } | null = null
    try {
      data = JSON.parse(text)
    } catch {
      return { ok: false, message: 'Sign in to your Google account or check the authorized deployment.' }
    }
    if (data && data.error) return { ok: false, message: 'Apps Script error: ' + data.error }
    if (res.ok) return { ok: true, message: 'Connected.' }
    return { ok: false, message: 'HTTP ' + res.status + ' ' + res.statusText }
  } catch (e) {
    return { ok: false, message: 'Network error: ' + ((e as Error)?.message || String(e)) }
  }
}

export function getSheetsSyncStatus(): SyncStatus {
  return status
}

export function subscribeSheetsSyncStatus(fn: (s: SyncStatus) => void): () => void {
  statusListeners.add(fn)
  fn(status)
  return () => statusListeners.delete(fn)
}

export function sheetsSyncLabel(s: SyncStatus = status): string {
  switch (s) {
    case 'local':
      return 'Local copy / สำเนาในเครื่อง'
    case 'loading':
      return 'Loading from Sheet…'
    case 'saving':
      return 'Saving to Sheet…'
    case 'saved':
      return 'Sheet verified / ตรวจสำเนาแล้ว'
    case 'error':
      return 'Sheet needs attention / ตรวจการเชื่อมต่อ'
    default:
      return ''
  }
}

function csvEscape(cell: unknown): string {
  if (cell === null || cell === undefined) return ''
  const raw = String(cell)
  const s = typeof cell === 'string' && /^[\s]*[=+@-]/.test(raw) ? "'" + raw : raw
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

function toCsv(rows: unknown[][]): string {
  return rows.map((r) => r.map(csvEscape).join(',')).join('\n')
}

function download(filename: string, content: string, mime = 'text/csv;charset=utf-8;') {
  const blob = new Blob([content], { type: mime })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

function filePrefix(store: EachStore): string {
  const name = store.company?.legalName || store.companyName || 'each'
  return name.replace(/\s+/g, '-') + '-' + new Date().toISOString().slice(0, 10)
}

/** Full JSON backup — restore with importJsonBackup. */
export function exportJsonBackup(store: EachStore): void {
  download(
    'each-backup-' + new Date().toISOString().slice(0, 10) + '.json',
    JSON.stringify(store, null, 2),
    'application/json;charset=utf-8;',
  )
}

/** One CSV per workbook tab — import into Google Sheets or merge into template. */
export function exportSheetCsvBundle(store: EachStore): void {
  const prefix = filePrefix(store)
  download(prefix + '-intakeReceipts.csv', toCsv([['id', 'name', 'sha256', 'approvedAt', 'provider', 'summary', 'records'], ...(store.intakeReceipts || []).map(r => [r.id, r.name, r.sha256, r.approvedAt, r.provider, r.summary, JSON.stringify(r.records)])]))
  download(prefix + '-recurringExpenses.csv', toCsv([
    ['id', 'name', 'amount', 'currency'],
    ...(store.recurringExpenses || []).map((row) => [row.id, row.name, row.amount, row.currency]),
  ]))

  const scalarRows: unknown[][] = [
    ['key', 'value'],
    ['onboarded', store.onboarded],
    ['companyName', store.companyName],
    ['currency', store.currency],
    ['asOf', store.asOf],
    ['gmailConnected', store.gmailConnected],
    ['gmailImported', store.gmailImported],
    ['company', JSON.stringify(store.company)],
    ['dataTenant', store.dataTenant || 'custom'],
    ['schemaVersion', store.schemaVersion || 0],
    ['fxRates', JSON.stringify(store.fxRates || {})],
  ]

  download(prefix + '-Metadata.csv', toCsv(scalarRows))
  download(
    prefix + '-foundingCapital.csv',
    toCsv([
      ['id', 'source', 'taxId', 'amount', 'currency', 'date', 'note'],
      ...store.foundingCapital.map((r) => [
        r.id,
        r.source,
        r.taxId,
        r.amount,
        r.currency,
        r.date,
        r.note || '',
      ]),
    ]),
  )
  download(
    prefix + '-expenses.csv',
    toCsv([
      ['id', 'date', 'vendor', 'category', 'type', 'amount', 'currency', 'source', 'owner'],
      ...store.expenses.map((e) => [
        e.id,
        e.date,
        e.vendor,
        e.category,
        e.type,
        e.amount,
        e.currency,
        e.source,
        e.owner,
      ]),
    ]),
  )
  download(
    prefix + '-employees.csv',
    toCsv([
      ['id', 'name', 'role', 'salary', 'currency', 'started'],
      ...store.employees.map((e) => [e.id, e.name, e.role, e.salary, e.currency, e.started]),
    ]),
  )
  download(
    prefix + '-aiEmployees.csv',
    toCsv([
      ['id', 'name', 'vendor', 'role', 'plan', 'cost', 'currency', 'efficiency', 'started'],
      ...store.aiEmployees.map((e) => [
        e.id,
        e.name,
        e.vendor,
        e.role,
        e.plan,
        e.cost,
        e.currency,
        e.efficiency,
        e.started,
      ]),
    ]),
  )
  download(
    prefix + '-projects.csv',
    toCsv([
      [
        'id',
        'title',
        'status',
        'owner',
        'client',
        'clientId',
        'totalValue',
        'received',
        'taxDeducted',
        'receivedDate',
        'dealStatus',
        'scenarioTier',
        'currency',
        'checklist',
        'notes',
        'files',
      ],
      ...store.projects.map((p) => [
        p.id,
        p.title,
        p.status,
        p.owner,
        p.client || '',
        p.clientId || '',
        p.totalValue || '',
        p.received || '',
        p.taxDeducted || '',
        p.receivedDate || '',
        p.dealStatus || '',
        p.scenarioTier || '',
        p.currency || store.currency,
        JSON.stringify(p.checklist || []),
        JSON.stringify(p.notes || []),
        JSON.stringify(p.files || []),
      ]),
    ]),
  )
  download(
    prefix + '-loans.csv',
    toCsv([
      ['id', 'lender', 'principal', 'rate', 'termMonths', 'installment', 'currency', 'startDate', 'note'],
      ...(store.loans || []).map((l) => [
        l.id,
        l.lender,
        l.principal,
        l.rate,
        l.termMonths,
        l.installment,
        l.currency,
        l.startDate,
        l.note || '',
      ]),
    ]),
  )
  download(
    prefix + '-objectives.csv',
    toCsv([
      ['id', 'objective', 'keyResults', 'quarter'],
      ...store.objectives.map((o) => [
        o.id,
        o.objective,
        JSON.stringify(o.keyResults || []),
        o.quarter || '',
      ]),
    ]),
  )
  download(
    prefix + '-actions.csv',
    toCsv([
      ['id', 'priority', 'label', 'module', 'done'],
      ...store.actions.map((a) => [a.id, a.priority, a.label, a.module, a.done]),
    ]),
  )
}

export function importJsonBackup(onLoad: (store: EachStore) => void): void {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'application/json,.json'
  input.onchange = () => {
    const file = input.files?.[0]
    if (!file) return
    if (file.size > 2_000_000) { window.alert('Backup exceeds the 2 MB limit.'); return }
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const obj = validateStore(JSON.parse(String(reader.result)))
        if (!window.confirm('Replace current data with this backup? This cannot be undone.')) return
        onLoad(obj)
      } catch {
        window.alert('Invalid backup file.')
      }
    }
    reader.readAsText(file)
  }
  input.click()
}

const TAB_SUFFIXES = [
  'Metadata',
  'foundingCapital',
  'expenses',
  'employees',
  'aiEmployees',
  'projects',
  'loans',
  'objectives',
  'actions',
  'recurringExpenses',
  'intakeReceipts',
] as const

type TabSuffix = (typeof TAB_SUFFIXES)[number]

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    const next = text[i + 1]
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        cell += ch
      }
      continue
    }
    if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      row.push(cell)
      cell = ''
    } else if (ch === '\n' || (ch === '\r' && next === '\n')) {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
      if (ch === '\r') i++
    } else if (ch !== '\r') {
      cell += ch
    }
  }
  if (cell.length || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''))
}

function tabFromFilename(name: string): TabSuffix | null {
  const base = name.replace(/\.csv$/i, '')
  for (const tab of TAB_SUFFIXES) {
    if (base === tab || base.endsWith('-' + tab)) return tab
  }
  return null
}

function rowsToObjects(rows: string[][]): Record<string, unknown>[] {
  if (rows.length < 2) return []
  const headers = rows[0]
  if (headers.some((h) => ['__proto__', 'prototype', 'constructor'].includes(h))) throw new Error('Unsafe CSV header')
  const out: Record<string, unknown>[] = []
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    const obj: Record<string, unknown> = {}
    let empty = true
    headers.forEach((h, j) => {
      if (!h) return
      let val: unknown = row[j] ?? ''
      if (h === 'done') val = val === 'true'
      if (typeof val === 'string' && val.startsWith("'") && /^[\s]*[=+@-]/.test(val.slice(1))) val = val.slice(1)
      if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
        try {
          val = JSON.parse(val)
        } catch {
          /* keep string */
        }
      } else if (typeof val === 'string' && val !== '' && !Number.isNaN(Number(val)) && h !== 'id' && !h.includes('Date') && h !== 'title' && h !== 'objective' && h !== 'label' && h !== 'note' && h !== 'source' && h !== 'vendor' && h !== 'lender' && h !== 'name' && h !== 'client' && h !== 'clientId' && h !== 'owner' && h !== 'category' && h !== 'type' && h !== 'module' && h !== 'priority' && h !== 'plan' && h !== 'role' && h !== 'taxId' && h !== 'quarter' && h !== 'currency') {
        val = Number(val)
      }
      if (val !== '') empty = false
      obj[h] = val
    })
    if (!empty) out.push(obj)
  }
  return out
}

function applyMetadata(store: EachStore, rows: string[][]): void {
  rows.slice(1).forEach((r) => {
    const key = r[0]
    let val: unknown = r[1] ?? ''
    if (key === 'onboarded' || key === 'gmailConnected') val = val === 'true' || val === true
    else if (key === 'gmailImported' || key === 'schemaVersion') val = Number(val) || 0
    else if ((key === 'company' || key === 'fxRates') && typeof val === 'string' && val.startsWith('{')) {
      try {
        val = JSON.parse(val)
      } catch {
        /* keep */
      }
    }
    if (key === 'company') store.company = val as EachStore['company']
    else if (['onboarded', 'companyName', 'currency', 'asOf', 'gmailConnected', 'gmailImported', 'dataTenant', 'schemaVersion', 'fxRates'].includes(key)) (store as unknown as Record<string, unknown>)[key] = val
  })
}

/** Import a CSV bundle (select all tab CSVs at once). Merges into one store. */
export function importCsvBundle(onLoad: (store: EachStore) => void): void {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.csv,text/csv'
  input.multiple = true
  input.onchange = async () => {
    const files = input.files
    if (!files?.length) return
    if (!window.confirm('Replace current data with these CSV files? This cannot be undone.')) return

    const store = normalizeStore({})
    const unmatched: string[] = []

    try { await Promise.all(
      Array.from(files).map(
        (file) =>
          new Promise<void>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => {
              try {
              const tab = tabFromFilename(file.name)
              const rows = parseCsv(String(reader.result))
              if (!tab) {
                unmatched.push(file.name)
                resolve()
                return
              }
              if (tab === 'Metadata') {
                applyMetadata(store, rows)
              } else {
                const arr = rowsToObjects(rows)
                ;(store as unknown as Record<string, unknown>)[tab] = arr
              }
              resolve()
              } catch (e) { reject(e) }
            }
            reader.onerror = () => reject(new Error('Unable to read CSV file'))
            reader.readAsText(file)
          }),
      ),
    ) } catch (e) { window.alert(e instanceof Error ? e.message : 'Invalid CSV file.'); return }

    store.onboarded = true
    if (store.company?.legalName) store.companyName = store.company.legalName
    else if (store.company?.name) store.companyName = store.company.name

    if (unmatched.length) {
      window.alert('Skipped unrecognized files: ' + unmatched.join(', '))
    }
    try { onLoad(validateStore(store)) } catch (e) { window.alert(e instanceof Error ? e.message : 'Invalid CSV workspace.') }
  }
  input.click()
}

/** Load Axiom demo and download sheet-ready CSV bundle in one step. */
export function exportAxiomDemoCsvBundle(): void {
  exportSheetCsvBundle(buildAxiomMockStore())
}

export async function loadFromSheets(): Promise<EachStore | null> {
  const url = getSheetsWebAppUrl()
  if (!url) return null
  if (!hasSheetsExfilAck()) {
    setStatus('local')
    return null
  }
  setStatus('loading')
  try {
    const res = await fetch(url, { credentials: 'include', signal: AbortSignal.timeout(15000) })
    if (!res.ok) throw new Error(res.status + ' ' + res.statusText)
    const envelope = await res.json() as { state?: EachStore; revision?: string; error?: string }
    const data = (envelope.state || envelope) as EachStore & { error?: string }
    if (envelope.error) throw new Error(envelope.error)
    if (data.error) throw new Error(data.error)
    if (!data || Object.keys(data).length === 0) {
      setStatus('local')
      return null
    }
    const validated = validateStore(normalizeStore(data))
    remoteRevision = envelope.revision || null
    setStatus('local')
    return validated
  } catch (e) {
    console.error('Sheets load failed:', e)
    setStatus('error')
    return null
  }
}

/** Conditional write plus read-back: opaque responses are never called successful. */
export async function saveToSheets(store: EachStore): Promise<boolean> {
  const url = getSheetsWebAppUrl()
  if (!url || !hasSheetsExfilAck() || saveInFlight) return false
  saveInFlight = true
  setStatus('saving')
  try {
    validateStore(store)
    const preflight = await fetch(url, { credentials: 'include', signal: AbortSignal.timeout(15000) })
    if (!preflight.ok) throw new Error('Unable to read the Sheet before saving')
    const existing = await preflight.json() as { state?: EachStore; revision?: string; error?: string }
    if (existing.error || !existing.revision || !existing.state) throw new Error('Update the Apps Script bridge before saving')
    if (remoteRevision !== null && existing.revision !== remoteRevision) throw new Error('Sheet changed: pull and review its changes first')
    if (remoteRevision === null && existing.state.onboarded && canonicalMirror(existing.state) !== canonicalMirror(store)) throw new Error('Sheet already contains data: pull and review first')
    await fetch(url, { method: 'POST', body: JSON.stringify({ state: store, expectedRevision: existing.revision }), mode: 'no-cors', credentials: 'include', signal: AbortSignal.timeout(15000) })
    const check = await fetch(url, { credentials: 'include', cache: 'no-store', signal: AbortSignal.timeout(15000) })
    if (!check.ok) throw new Error('Write could not be verified')
    const confirmed = await check.json() as { state?: EachStore; revision?: string; error?: string }
    if (confirmed.error || !confirmed.state || !confirmed.revision || canonicalMirror(validateStore(normalizeStore(confirmed.state))) !== canonicalMirror(store)) throw new Error('Sheet write is unconfirmed or a conflict was detected')
    remoteRevision = confirmed.revision
    localStorage.setItem(LAST_SAVE_KEY, String(Date.now()))
    setStatus('saved')
    return true
  } catch {
    setStatus('error')
    return false
  } finally { saveInFlight = false }
}

/** Edits mark the mirror stale. Sending requires an explicit user action. */
export function scheduleSheetsSave(_store: EachStore): void {
  if (saveTimer) clearTimeout(saveTimer)
  if (isSheetsSyncEnabled()) setStatus('local')
}

function normalizeStore(raw: Partial<EachStore>): EachStore {
  const base = seedStore()
  return {
    ...base,
    ...raw,
    foundingCapital: raw.foundingCapital ?? base.foundingCapital,
    expenses: raw.expenses ?? base.expenses,
    employees: raw.employees ?? base.employees,
    aiEmployees: raw.aiEmployees ?? base.aiEmployees,
    projects: raw.projects ?? base.projects,
    loans: raw.loans ?? base.loans ?? [],
    objectives: raw.objectives ?? base.objectives,
    actions: raw.actions ?? base.actions,
  }
}
