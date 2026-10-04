import { useCopy } from "../lib/copy"
import { MirrorReview } from './MirrorReview'
import { applyReviewedMirror } from '../lib/mirror'
import { storeApi } from '../lib/store'
import { useLanguage } from '../lib/languageContext'
import { useEffect, useState } from 'react'
import { Btn, Input, Modal } from './ui/Axiom'
import {
  getSheetsAppsScript,
  getSheetsWebAppUrl,
  hasSheetsExfilAck,
  isSheetsSyncEnabled,
  lastSheetsSavedAt,
  loadFromSheets,
  saveToSheets,
  setSheetsExfilAck,
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
  const copy = useCopy()
  const { t } = useLanguage()
  const [review, setReview] = useState<{ before: EachStore; after: EachStore } | null>(null)
  const [url, setUrl] = useState('')
  const [testing, setTesting] = useState(false)
  const [pulling, setPulling] = useState(false)
  const [result, setResult] = useState<{ tone: 'ok' | 'err'; message: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('local')
  const [ack, setAck] = useState(false)

  useEffect(() => {
    if (!open) return
    setUrl(getSheetsWebAppUrl())
    setAck(hasSheetsExfilAck())
    setResult(null)
    setReview(null)
    return subscribeSheetsSyncStatus(setSyncStatus)
  }, [open])

  const configured = isSheetsSyncEnabled()
  const lastSaved = lastSheetsSavedAt()
  const lastSavedText = lastSaved
    ? 'Last verified save ' + new Date(lastSaved).toLocaleString()
    : 'Never saved to Sheet yet'

  async function runTest() {
    const target = url.trim()
    if (!ack) {
      setResult({
        tone: 'err',
        message:
          '✕ Acknowledge the security notice below before connecting. Connecting Sheets triggers manual upload of unencrypted payroll/tax IDs to Google when you press Send local copy.',
      })
      return
    }
    setTesting(true)
    setResult(null)
    const out = await testSheetsUrl(target)
    setTesting(false)
    if (!out.ok) {
      setResult({ tone: 'err', message: '✕ ' + out.message })
      return
    }
    setSheetsWebAppUrl(target)
    setSheetsExfilAck(true)
    setResult({ tone: 'ok', message: t('Connected. Pull and review existing Sheet data, or send your local copy to an empty Sheet.', 'เชื่อมต่อแล้ว ดึงข้อมูลมาตรวจก่อน หรือส่งข้อมูลในเครื่องไปยังชีตว่าง') })
    try {
      /* Sending is a separate, explicit action. */
    } catch {
      /* error already logged inside saveToSheets */
    }
  }

  async function runPull() {
    const before = structuredClone(storeApi.get())
    setPulling(true)
    setResult(null)
    const remote = await loadFromSheets()
    setPulling(false)
    if (remote) {
      setReview({ before, after: remote })
      return
    }
    setResult({ tone: 'err', message: '✕ Could not reach the Sheet. Open the URL in a browser to confirm it returns JSON.' })
  }

  function runDisconnect() {
    if (!window.confirm('Disconnect from this Sheet? Your data will still be cached locally.')) return
    setSheetsWebAppUrl('')
    setSheetsExfilAck(false)
    setAck(false)
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
      title={copy("Connect to Google Sheet")}
      open={open}
      onClose={onClose}
      actions={
        <>
          <Btn variant="link" onClick={onClose}>{copy("Close")}</Btn>
          {configured ? (
            <>
              <Btn variant="ghost" onClick={runPull} disabled={pulling || testing}>
                {pulling ? t('Pulling…', 'กำลังดึง…') : t('Pull from Sheet', 'ดึงข้อมูลจากชีต')}
              </Btn>
              <Btn variant="ghost" onClick={runDisconnect}>{copy("Disconnect")}</Btn>
            </>
          ) : null}
          <Btn onClick={runTest} disabled={testing || pulling || !ack}>
            {testing ? t('Testing…', 'กำลังทดสอบ…') : t('Test & Connect', 'ทดสอบและเชื่อมต่อ')}
          </Btn>
        </>
      }
    >
      <div className="space-y-5">
        {review ? <MirrorReview {...review} onCancel={() => setReview(null)} onApprove={() => { try { onPull(applyReviewedMirror(storeApi.get(), review.before, review.after)); setReview(null); onClose() } catch (e) { setResult({ tone: 'err', message: e instanceof Error ? e.message : 'Import failed' }) } }} /> : null}
        {configured ? <Btn disabled={testing || pulling} onClick={() => { setTesting(true); void saveToSheets(store).then(ok => { setTesting(false); setResult({ tone: ok ? 'ok' : 'err', message: ok ? t('Saved and verified by reading the Sheet back.', 'บันทึกและอ่านกลับมาตรวจแล้ว') : t('Could not verify the save. Pull and review changes, and check the Apps Script deployment.', 'ตรวจการบันทึกไม่สำเร็จ ดึงข้อมูลมาตรวจและตรวจการติดตั้ง Apps Script') }) }) }}>{t('Send local copy to Sheet', 'ส่งสำเนาในเครื่องไปยังชีต')}</Btn> : null}
        <div className="space-y-2">
          <label className="block">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-3">{copy("Sheet Web App URL")}</span>
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
          <p className="font-mono text-[11px] text-ink-3">{t("The connection URL is stored in this browser. Transfers use your Google Apps Script deployment.", "ที่อยู่การเชื่อมต่อเก็บในเบราว์เซอร์ การรับส่งใช้ Apps Script ของคุณ")}</p>
        </div>

        {result ? (
          <div
            className={
              'border-l-2 px-3 py-2 text-[14px] ' +
              (result.tone === 'ok'
                ? 'border-amber bg-paper text-ink'
                : 'border-amber bg-paper text-ink')
            }
          >
            {result.message}
          </div>
        ) : null}

        <div className="border-t border-line pt-4">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-3">{copy("Status")}</p>
          <div className="mt-2 flex flex-wrap items-baseline gap-3 text-[14px]">
            <span className="font-mono text-[11px] uppercase text-ink-3">
              {configured ? t('Sheet connected', 'เชื่อมต่อชีตแล้ว') : t('Not connected', 'ยังไม่เชื่อมต่อ')}
            </span>
            <span className="text-ink-2">{sheetsSyncLabel(syncStatus)}</span>
            <span className="font-mono text-[11px] text-ink-3">{lastSavedText}</span>
          </div>
        </div>

        <div className="space-y-2 border-t border-line pt-4">
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-3">{copy("Apps Script")}</p>
            <Btn variant="ghost" className="!min-h-[44px] !px-3" onClick={copyScript}>
              {copied ? t('Copied ✓', 'คัดลอกแล้ว ✓') : t('Copy full script', 'คัดลอกสคริปต์ทั้งหมด')}
            </Btn>
          </div>
          <pre className="max-h-40 overflow-auto border border-line bg-paper p-3 font-mono text-[11px] leading-snug text-ink-2">
{getSheetsAppsScript()}
          </pre>
        </div>

        <div className="space-y-4 border-t border-line pt-4">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-3">{copy("Setup — three steps")}</p>

          <div className="flex items-start gap-3">
            <span
              className={
                'flex h-11 w-11 shrink-0 items-center justify-center border font-display text-[14px] font-bold ' +
                (configured ? 'border-amber bg-amber text-ink' : 'border-line text-ink-2')
              }
              aria-hidden
            >
              {configured ? '✓' : '1'}
            </span>
            <div className="space-y-1">
              <p className="font-display text-[14px] font-bold">{copy("Create a fresh Sheet")}</p>
              <p className="text-[14px] text-ink-2">
                <a
                  href="https://sheets.new"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="underline-offset-2 hover:underline"
                >
                  {t("Open a new Google Sheet ↗", "เปิด Google Sheet ใหม่ ↗")}
                </a>{' '}
                {t("Name it “EACH — [Your Company]”.", "ตั้งชื่อ “EACH — [ชื่อบริษัท]”")}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-line font-display text-[14px] font-bold text-ink-2" aria-hidden>
              2
            </span>
            <div className="space-y-1">
              <p className="font-display text-[14px] font-bold">{copy("Install the script")}</p>
              <p className="text-[14px] text-ink-2">
                Extensions → Apps Script → delete any starter code → paste the script (Copy full script above) → Save.
                Run <span className="font-mono">setupWorkbook</span> once (Run menu → function: setupWorkbook → Run). Authorize on first run.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-line font-display text-[14px] font-bold text-ink-2" aria-hidden>
              3
            </span>
            <div className="space-y-1">
              <p className="font-display text-[14px] font-bold">{copy("Deploy as Web App")}</p>
              <p className="text-[14px] text-ink-2">
                {t("Set Script Property EACH_ALLOWED_EMAILS to your Google email. Deploy as the accessing user, restrict access to your account, and copy the URL. Anonymous deployments are rejected.", "ตั้ง Script Property EACH_ALLOWED_EMAILS เป็นอีเมล Google ของคุณ ติดตั้งให้ทำงานในนามผู้เข้าถึง จำกัดสิทธิ์เฉพาะบัญชีคุณ แล้วคัดลอก URL ระบบไม่รับการติดตั้งแบบไม่ระบุตัวตน")}
              </p>
            </div>
          </div>
        </div>

        <div className="border-l-2 border-amber bg-paper px-3 py-3">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink">{copy("Security Notice")}</p>
          <p className="mt-2 text-[14px] text-ink-2">
            {t("Pressing Send local copy transfers the full workspace, including salary and tax-ID fields, to your Google deployment. Review access permissions before connecting.", "เมื่อกดส่งสำเนาในเครื่อง ระบบส่งข้อมูลทั้งพื้นที่ รวมเงินเดือนและเลขประจำตัวผู้เสียภาษีไปยัง Google ของคุณ ตรวจสิทธิ์เข้าถึงก่อนเชื่อมต่อ")}
          </p>
          <label className="mt-3 flex min-h-[44px] cursor-pointer items-start gap-3 border-t border-line pt-3">
            <input
              type="checkbox"
              checked={ack}
              onChange={(e) => setAck(e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 border border-line accent-amber"
              aria-describedby="exfil-ack-desc"
            />
            <span id="exfil-ack-desc" className="text-[14px] leading-relaxed text-ink-2">
              <strong className="font-semibold text-ink">{copy("I understand")}</strong>{' '}{t('and authorize manual transfer of this workspace to my Google deployment when I press Send local copy.', 'และอนุญาตให้ส่งข้อมูลพื้นที่ทำงานไปยัง Google ของฉันเมื่อกดส่งสำเนาในเครื่อง')}
            </span>
          </label>
        </div>

        <div className="border-l-2 border-amber bg-paper px-3 py-3">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-3">{copy("Sheets is the engine. EACH is the lens.")}</p>
          <p className="mt-2 text-[14px] text-ink-2">
            {t("Send your local copy when ready. After editing the Sheet, pull and review additions, changes and deletions. EACH checks the remote revision and reads back each write to confirm it.", "ส่งสำเนาในเครื่องเมื่อพร้อม หลังแก้ไขชีตให้ดึงข้อมูลมาตรวจรายการเพิ่ม แก้ไข และลบ EACH ตรวจรุ่นข้อมูลปลายทางและอ่านกลับหลังบันทึกเพื่อยืนยัน")}
          </p>
        </div>
      </div>
    </Modal>
  )
}
