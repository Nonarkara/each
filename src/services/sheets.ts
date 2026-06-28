import type { EachStore } from '../lib/types'
import { seedStore } from '../lib/store'

const WEB_APP_URL = import.meta.env.VITE_SHEETS_WEB_APP_URL as string | undefined
const URL_STORAGE_KEY = 'each-sheets-web-app-url'

type SyncStatus = 'local' | 'loading' | 'saving' | 'saved' | 'error'

export type { SyncStatus }

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
  if (trimmed) localStorage.setItem(URL_STORAGE_KEY, trimmed)
  else localStorage.removeItem(URL_STORAGE_KEY)
}

export function isSheetsSyncEnabled(): boolean {
  return Boolean(getSheetsWebAppUrl())
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
      return 'Local only'
    case 'loading':
      return 'Loading from Sheet…'
    case 'saving':
      return 'Saving to Sheet…'
    case 'saved':
      return 'Synced to Sheet'
    case 'error':
      return 'Sheet sync error'
    default:
      return ''
  }
}

function csvEscape(cell: unknown): string {
  if (cell === null || cell === undefined) return ''
  const s = String(cell)
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

  const scalarRows: unknown[][] = [
    ['key', 'value'],
    ['onboarded', store.onboarded],
    ['companyName', store.companyName],
    ['currency', store.currency],
    ['asOf', store.asOf],
    ['gmailConnected', store.gmailConnected],
    ['gmailImported', store.gmailImported],
    ['company', JSON.stringify(store.company)],
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
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const obj = JSON.parse(String(reader.result)) as EachStore
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

export async function loadFromSheets(): Promise<EachStore | null> {
  const url = getSheetsWebAppUrl()
  if (!url) return null
  setStatus('loading')
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(res.status + ' ' + res.statusText)
    const data = (await res.json()) as EachStore & { error?: string }
    if (data.error) throw new Error(data.error)
    if (!data || Object.keys(data).length === 0) {
      setStatus('local')
      return null
    }
    setStatus('saved')
    return normalizeStore(data)
  } catch (e) {
    console.error('Sheets load failed:', e)
    setStatus('error')
    return null
  }
}

export async function saveToSheets(store: EachStore): Promise<void> {
  const url = getSheetsWebAppUrl()
  if (!url) return
  setStatus('saving')
  try {
    await fetch(url, {
      method: 'POST',
      body: JSON.stringify(store),
      mode: 'no-cors',
    })
    setStatus('saved')
  } catch (e) {
    console.error('Sheets save failed:', e)
    setStatus('error')
  }
}

export function scheduleSheetsSave(store: EachStore): void {
  if (!getSheetsWebAppUrl()) return
  if (saveTimer) clearTimeout(saveTimer)
  setStatus('saving')
  saveTimer = setTimeout(() => {
    void saveToSheets(store)
  }, 1200)
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
