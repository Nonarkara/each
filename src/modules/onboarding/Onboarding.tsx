import { useCopy } from "../../lib/copy"
import { useLanguage } from '../../lib/languageContext'
import { LanguageSwitch } from '../../lib/language'
import { useState } from 'react'
import { companyLookup } from '../../services/companyLookup'
import { gmailService } from '../../services/gmail'
import { ocrService } from '../../services/ocr'
import { readStore } from '../../lib/store'
import { money } from '../../lib/format'
import type { Company } from '../../lib/types'
import type { storeApi } from '../../lib/store'
import {
  Btn,
  DataTable,
  Input,
  LiveDot,
  SectionHead,
  Station,
  TagChip,
} from '../../components/ui/Axiom'

interface OnboardingProps {
  api: typeof storeApi
  onDone: () => void
}

export function Onboarding({ api, onDone }: OnboardingProps) {
  const copy = useCopy()
  const { t } = useLanguage()
  const [step, setStep] = useState(0)
  const [company, setCompany] = useState<Company>({})
  const [lookupStatus, setLookupStatus] = useState('')
  const [lookupBusy, setLookupBusy] = useState(false)
  const [scanBusy, setScanBusy] = useState(false)
  const [scanMsg, setScanMsg] = useState('')
  const [gmailBusy, setGmailBusy] = useState(false)
  const [manualTax, setManualTax] = useState('')
  const [manualAmt, setManualAmt] = useState('')

  const [, bump] = useState(0)
  const store = readStore()
  const cur = company.currency || 'THB'
  const labels = [t('Company', 'บริษัท'), t('Founding capital', 'เงินทุนเริ่มต้น'), t('Finish setup', 'เสร็จสิ้นการตั้งค่า')]

  async function doLookup() {
    setLookupBusy(true)
    setLookupStatus('Searching public business registry…')
    const res = await companyLookup.lookup(company.reg || '', company.name)
    setLookupBusy(false)
    if (!res.found) {
      setLookupStatus('No public match. Enter the details manually below.')
      setCompany((c) => ({ ...c, ...res }))
      return
    }
    setLookupStatus('Found. ' + res.source + '.')
    setCompany((c) => ({ ...c, ...res, currency: res.currency }))
  }

  async function doScan() {
    setScanBusy(true)
    setScanMsg('Reading document…')
    const result = await ocrService.scanRegistration({
      regNumber: company.reg,
      capitalHint: company.capitalHint,
      currency: cur,
      founded: company.founded,
    })
    setManualTax(result.taxId)
    setManualAmt(String(result.amount))
    setScanBusy(false)
    setScanMsg(t('Sample extraction only. Check and approve using Add entry. For your actual PDF, finish setup then use Add document.', 'นี่เป็นตัวอย่างการอ่านข้อมูล ตรวจแล้วกดเพิ่มรายการหากต้องการใช้ สำหรับ PDF จริง ให้ตั้งค่าเสร็จแล้วใช้เพิ่มเอกสาร'))
  }

  async function connectGmail() {
    setGmailBusy(true)
    try {
      if (!gmailService.isConfigured()) { setScanMsg(t('Gmail import is not connected. Use Add document for reviewed receipt intake.', 'ยังไม่เชื่อมต่อนำเข้า Gmail ใช้เพิ่มเอกสารเพื่อตรวจและบันทึกใบเสร็จ')); return }
      await gmailService.connect()
    } finally { setGmailBusy(false) }
  }

  function finish() {
    api.set({
      company: { ...company },
      companyName: company.legalName || company.name || 'Startup',
      currency: company.currency || cur,
      onboarded: true,
      dataTenant: 'custom',
    })
    onDone()
  }

  function addManualCapital() {
    if (!manualTax || !manualAmt || !Number.isFinite(Number(manualAmt)) || Number(manualAmt) <= 0) { setScanMsg(t('Enter a tax ID and a positive capital amount.', 'กรอกเลขผู้เสียภาษีและจำนวนเงินทุนมากกว่าศูนย์')); return }
    api.update((s) => {
      s.foundingCapital.push({
        id: 'fc-' + Math.random().toString(36).slice(2, 7),
        source: 'Manual entry',
        taxId: manualTax,
        amount: Number(manualAmt),
        currency: cur,
        date: company.founded || s.asOf,
        note: 'Manual',
      })
      return s
    })
    setManualTax('')
    setManualAmt('')
    bump((n) => n + 1)
  }

  return (
    <div className="mx-auto max-w-[760px] px-4 py-8 sm:px-[22px]">
      <div className="mb-4"><LanguageSwitch /></div>
      <div className="mb-7 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center border border-amber font-display text-[14px] font-bold text-amber">E</span>
        <div>
          <p className="font-display text-[32px] font-bold leading-none">EACH</p>
          <p className="font-body text-[11px] text-ink-3">ERP + ACT + CRM + HR · for the startup</p>
        </div>
      </div>

      <div className="mb-8 flex flex-wrap gap-4">
        {labels.map((l, idx) => (
          <div key={l} className="flex items-center gap-2">
            <span className={`flex h-8 w-8 items-center justify-center border font-mono text-[11px] ${idx <= step ? 'border-amber text-ink' : 'border-line text-ink-3'}`}>
              {idx + 1}
            </span>
            <span className={`font-body text-[11px] ${idx === step ? 'text-ink' : 'text-ink-3'}`}>{l}</span>
          </div>
        ))}
      </div>

      {step === 0 ? (
        <>
          <Station disc="1" kicker="STEP 01" title={copy("Register your company")} meta={copy("Enter verified company details. Lookup is a sample registry.")} />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="font-body text-[11px] text-ink-3">{copy("Company name")}</span>
              <Input value={company.name || ''} onChange={(e) => setCompany((c) => ({ ...c, name: e.target.value }))} placeholder="e.g. Axiom Systems" className="mt-2" />
            </label>
            <label className="block">
              <span className="font-body text-[11px] text-ink-3">{copy("Registration number")}</span>
              <Input value={company.reg || ''} onChange={(e) => setCompany((c) => ({ ...c, reg: e.target.value }))} placeholder="Try 0105569099335" className="mt-2" />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Btn onClick={doLookup} disabled={lookupBusy}>{copy("Preview sample registry")}</Btn>
            <span className="text-[14px] text-ink-2">{lookupStatus}</span>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block"><span className="font-body text-[11px] text-ink-3">{copy("Legal name")}</span><Input value={company.legalName || ''} onChange={(e) => setCompany((c) => ({ ...c, legalName: e.target.value }))} className="mt-2" /></label>
            <label className="block"><span className="font-body text-[11px] text-ink-3">{copy("Country")}</span><Input value={company.country || ''} onChange={(e) => setCompany((c) => ({ ...c, country: e.target.value }))} className="mt-2" /></label>
            <label className="block"><span className="font-body text-[11px] text-ink-3">{copy("Industry")}</span><Input value={company.industry || ''} onChange={(e) => setCompany((c) => ({ ...c, industry: e.target.value }))} className="mt-2" /></label>
            <label className="block"><span className="font-body text-[11px] text-ink-3">{copy("Founded")}</span><Input value={company.founded || ''} onChange={(e) => setCompany((c) => ({ ...c, founded: e.target.value }))} className="mt-2" /></label>
            <label className="block sm:col-span-2"><span className="font-body text-[11px] text-ink-3">{copy("Registered address")}</span><Input value={company.address || ''} onChange={(e) => setCompany((c) => ({ ...c, address: e.target.value }))} className="mt-2" /></label>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <span className="text-[14px] text-ink-3">Tip: registration number 0105569099335 returns Axiom X from the registry stub.</span>
            <Btn onClick={() => setStep(1)}>{copy("Continue")}</Btn>
          </div>
        </>
      ) : null}

      {step === 1 ? (
        <>
          <Station disc="2" kicker="STEP 02" title={copy("Founding capital")} meta={copy("Enter paid-in funds. Registered capital is not always paid-in capital.")} />
          <button
            type="button"
            onClick={doScan}
            disabled={scanBusy}
            className="mb-4 w-full border border-dashed border-line-2 bg-panel p-6 text-left hover:border-amber disabled:opacity-60"
          >
            {scanBusy ? (
              <span className="flex items-center gap-2"><LiveDot /><span className="font-body text-[11px]">OCRing document…</span></span>
            ) : (
              <>
                <p className="font-body text-[11px] text-ink-3">{copy("Preview sample extraction")}</p>
                <p className="mt-2 text-[14px] text-ink-2">{copy("Example only. Upload actual PDFs from Add document after setup.")}</p>
              </>
            )}
          </button>
          {scanMsg ? <p className="mb-4 text-[14px] text-amber">{scanMsg}</p> : null}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span className="text-[14px] text-ink-3">{copy("or enter manually")}</span>
            <Btn variant="ghost" onClick={addManualCapital}>{copy("Add entry")}</Btn>
          </div>
          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <label className="block"><span className="font-body text-[11px] text-ink-3">{copy("Tax ID")}</span><Input value={manualTax} onChange={(e) => setManualTax(e.target.value)} className="mt-2" /></label>
            <label className="block"><span className="font-body text-[11px] text-ink-3">{copy("Capital amount")}</span><Input type="number" value={manualAmt} onChange={(e) => setManualAmt(e.target.value)} className="mt-2" /></label>
          </div>
          <SectionHead label={copy("Recorded capital")} />
          <DataTable>
            <thead>
              <tr className="border-b border-line bg-paper">
                <th className="p-3 font-body text-[11px] text-ink-3">{copy("Source")}</th>
                <th className="p-3 font-body text-[11px] text-ink-3">{copy("Tax ID")}</th>
                <th className="p-3 text-right font-body text-[11px] text-ink-3">{copy("Amount")}</th>
              </tr>
            </thead>
            <tbody>
              {store.foundingCapital.length ? store.foundingCapital.map((x) => (
                <tr key={x.id} className="border-b border-line">
                  <td className="p-3">{x.source}</td>
                  <td className="p-3">{x.taxId}</td>
                  <td className="p-3 text-right font-mono">{money(x.amount, x.currency)}</td>
                </tr>
              )) : (
                <tr><td colSpan={3} className="p-6 text-center text-ink-3">{copy("No capital recorded yet.")}</td></tr>
              )}
            </tbody>
          </DataTable>
          <div className="mt-6 flex justify-between">
            <Btn variant="link" onClick={() => setStep(0)}>{copy("Back")}</Btn>
            <Btn onClick={() => setStep(2)}>{copy("Continue")}</Btn>
          </div>
        </>
      ) : null}

      {step === 2 ? (
        <>
          <Station disc="3" kicker="STEP 03" title={copy("Finish setup")} meta={copy("Your workspace starts with the entries you approved.")} />
          <div className="mb-4 border border-line bg-panel p-4">
            <TagChip tone="amber">GMAIL</TagChip>
            <p className="mt-3 text-[14px] font-semibold">{copy("Connect your business inbox")}</p>
            <p className="mt-1 text-[14px] text-ink-2">{copy("Import receipts through Add document, review AI proposals, then approve.")}</p>
            {!gmailService.isConfigured() ? (
              <p className="mt-2 font-mono text-[11px] text-ink-3">{copy("Gmail is not connected. No receipts will be imported.")}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-3">
            <Btn variant="ghost" onClick={connectGmail} disabled={gmailBusy || !gmailService.isConfigured()}>{gmailBusy ? 'Connecting…' : 'Connect Gmail'}</Btn>
            <Btn onClick={finish}>{t('Open my workspace', 'เปิดพื้นที่ทำงาน')}</Btn>
          </div>
        </>
      ) : null}
    </div>
  )
}
