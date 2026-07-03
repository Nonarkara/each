import { useEffect, useState } from 'react'
import { Btn, Input, Modal } from './ui/Axiom'
import {
  getSheetsAppsScript,
  getSheetsWebAppUrl,
  isSheetsSyncEnabled,
  lastSheetsSavedAt,
  loadFromSheets,
  saveToSheets,
  setSheetsWebAppUrl,
  sheetsSyncLabel,
  subscribeSheetsSyncStatus,
  testSheetsUrl,
} from '../services/sheets'
import type { EachStore } from '../lib/types'
import type { SyncStatus } from '../services/sheets'

interface SheetsSettingsModalProps {
  open: boolean
  onClose: () => void
  store: EachStore
  onPull: (remote: EachStore) => void
}

/** Sheets connect / pull / disconnect modal. Mirrors CRM2's cockpit affordance pass. */
export function SheetsSettingsModal({ open, onClose, store, onPull }: SheetsSettingsModalProps) {
  const [url, setUrl] = useState('')
  const [testing, setTesting] = useState(false)
  const [pulling, setPulling] = useState(false)
  const [result, setResult] = useState<{ tone: 'ok' | 'err'; message: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('local')

  useEffect(() => {
    if (!open) return
    setUrl(getSheetsWebAppUrl())
    setResult(null)
    return subscribeSheetsSyncStatus(setSyncStatus)
  }, [open])

  const configured = isSheetsSyncEnabled()
  const lastSaved = lastSheetsSavedAt()
  const lastSavedText = lastSaved
    ? 'Last successful save ' + new Date(lastSaved).toLocaleString()
    : 'Never saved to Sheet yet'

  async function runTest() {
    const target = url.trim()
    setTesting(true)
    setResult(null)
    const out = await testSheetsUrl(target)
    setTesting(false)
    if (!out.ok) {
      setResult({ tone: 'err', message: '✕ ' + out.message })
      return
    }
    setSheetsWebAppUrl(target)
    setResult({ tone: 'ok', message: '✓ Connected — first sync kicked off.' })
    try {
      await saveToSheets(store)
    } catch {
      /* error already logged inside saveToSheets */
    }
  }

  async function runPull() {
    if (!window.confirm('Pull the latest data from your Google Sheet? Any local changes since the last sync will be lost.')) return
    setPulling(true)
    setResult(null)
    const remote = await loadFromSheets()
    setPulling(false)
    if (remote) {
      onPull(remote)
      onClose()
      return
    }
    setResult({ tone: 'err', message: '✕ Could not reach the Sheet. Open the URL in a browser to confirm it returns JSON.' })
  }

  function runDisconnect() {
    if (!window.confirm('Disconnect from this Sheet? Your data will still be cached locally.')) return
    setSheetsWebAppUrl('')
    try {
      localStorage.removeItem('each-sheets-last-saved')
    } catch {
      /* ignore */
    }
    setResult({ tone: 'ok', message: '✓ Disconnected. Working locally only.' })
  }

  async function copyScript() {
    const code = getSheetsAppsScript()
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      window.alert('Clipboard blocked. Select the snippet below and copy manually.')
    }
  }

  return (
    <Modal
      title="Connect to Google Sheet"
      open={open}
      onClose={onClose}
      actions={
        <>
          <Btn variant="link" onClick={onClose}>
            Close
          </Btn>
          {configured ? (
            <>
              <Btn variant="ghost" onClick={runPull} disabled={pulling || testing}>
                {pulling ? 'Pulling…' : 'Pull from Sheet'}
              </Btn>
              <Btn variant="ghost" onClick={runDisconnect}>
                Disconnect
              </Btn>
            </>
          ) : null}
          <Btn onClick={runTest} disabled={testing || pulling}>
            {testing ? 'Testing…' : 'Test & Connect'}
          </Btn>
        </>
      }
    >
      <div className="space-y-5">
        <div className="space-y-2">
          <label className="block">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-3">Sheet Web App URL</span>
            <Input
              type="url"
              autoFocus
              spellCheck={false}
              autoComplete="off"
              placeholder="https://script.google.com/macros/s/AKfyc.../exec"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void runTest()
                }
              }}
              className="mt-2 font-mono"
            />
          </label>
          <p className="font-mono text-[11px] text-ink-3">Stored locally. Never sent anywhere except script.google.com.</p>
        </div>

        {result ? (
          <div
            className={
              'border-l-2 px-3 py-2 text-[14px] ' +
              (result.tone === 'ok'
                ? 'border-amber bg-paper text-ink'
                : 'border-red-600 bg-paper text-ink')
            }
          >
            {result.message}
          </div>
        ) : null}

        <div className="border-t border-line pt-4">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-3">Status</p>
          <div className="mt-2 flex flex-wrap items-baseline gap-3 text-[14px]">
            <span className="font-mono text-[11px] uppercase text-ink-3">
              {configured ? 'Sheet connected' : 'Not connected'}
            </span>
            <span className="text-ink-2">{sheetsSyncLabel(syncStatus)}</span>
            <span className="font-mono text-[11px] text-ink-3">{lastSavedText}</span>
          </div>
        </div>

        <div className="space-y-2 border-t border-line pt-4">
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-3">Apps Script</p>
            <Btn variant="ghost" className="!min-h-[36px] !px-3" onClick={copyScript}>
              {copied ? 'Copied ✓' : 'Copy full script'}
            </Btn>
          </div>
          <pre className="max-h-40 overflow-auto border border-line bg-paper p-3 font-mono text-[11px] leading-snug text-ink-2">
{getSheetsAppsScript().slice(0, 1200) + '\n\n/* (snippet — full code copied via the button above) */'}
          </pre>
        </div>

        <div className="space-y-4 border-t border-line pt-4">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-3">Setup — three steps</p>

          <div className="flex items-start gap-3">
            <span
              className={
                'flex h-11 w-11 shrink-0 items-center justify-center border font-display text-[16px] font-bold ' +
                (configured ? 'border-amber bg-amber text-ink' : 'border-line text-ink-2')
              }
              aria-hidden
            >
              {configured ? '✓' : '1'}
            </span>
            <div className="space-y-1">
              <p className="font-display text-[16px] font-semibold">Create a fresh Sheet</p>
              <p className="text-[14px] text-ink-2">
                <a
                  href="https://sheets.new"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="underline-offset-2 hover:underline"
                >
                  Open a new Google Sheet ↗
                </a>{' '}
                (sheets.new works). Name it "EACH — [Your Company]".
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-line font-display text-[16px] font-bold text-ink-2" aria-hidden>
              2
            </span>
            <div className="space-y-1">
              <p className="font-display text-[16px] font-semibold">Install the script</p>
              <p className="text-[14px] text-ink-2">
                Extensions → Apps Script → delete any starter code → paste the script (Copy full script above) → Save.
                Run <span className="font-mono">setupWorkbook</span> once (Run menu → function: setupWorkbook → Run). Authorize on first run.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-line font-display text-[16px] font-bold text-ink-2" aria-hidden>
              3
            </span>
            <div className="space-y-1">
              <p className="font-display text-[16px] font-semibold">Deploy as Web App</p>
              <p className="text-[14px] text-ink-2">
                Deploy → New deployment → type "Web app" → Execute as "Me" → Who has access "Anyone" → Deploy → copy the URL.
              </p>
            </div>
          </div>
        </div>

        <div className="border-l-2 border-amber bg-paper px-3 py-3">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-3">
            Sheets is the engine. EACH is the lens.
          </p>
          <p className="mt-2 text-[14px] text-ink-2">
            Every change in EACH writes to this Sheet within ~1.2s. You can edit tabs directly — click "Pull from Sheet" to overwrite local state with your manual edits.
          </p>
        </div>
      </div>
    </Modal>
  )
}