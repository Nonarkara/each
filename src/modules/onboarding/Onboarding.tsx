import { useState } from 'react'
import { companyLookup } from '../../services/companyLookup'
import { gmailService } from '../../services/gmail'
import { ocrService } from '../../services/ocr'
import { buildAxiomMockStore } from '../../data/axiom-mock'
import { loadDemoStore, readStore } from '../../lib/store'
import { exportSheetCsvBundle } from '../../services/sheets'
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
  const labels = ['Company', 'Founding capital', 'Connect Gmail']

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
    ocrService.recordCapital(result, company.founded)
    bump((n) => n + 1)
    setScanBusy(false)
    setScanMsg('Extracted Tax ID ' + result.taxId + ' and paid-in capital ' + money(result.amount, result.currency) + '.')
  }

  async function connectGmail() {
    setGmailBusy(true)
    await gmailService.connect()
    setGmailBusy(false)
    finish()
  }

  function finish() {
    api.set({
      company: { ...company },
      companyName: company.legalName || company.name || 'Startup',
      currency: company.currency || cur,
      onboarded: true,
    })
    onDone()
  }

  function loadDemo() {
    loadDemoStore()
    onDone()
  }

  function loadDemoAndExportSheets() {
    const demo = buildAxiomMockStore()
    api.load(demo)
    exportSheetCsvBundle(demo)
    onDone()
  }

  function addManualCapital() {
    if (!manualTax || !manualAmt) return
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
    <div className="min-h-screen overflow-y-auto">
    <div className="mx-auto max-w-[760px] px-4 py-8 sm:px-[22px]">
      <div className="mb-7 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center border border-amber font-display text-lg font-bold text-amber">E</span>
        <div>
          <p className="font-display text-[32px] font-bold leading-none">EACH</p>
          <p className="font-mono text-[11px] uppercase tracking-[0.11em] text-ink-3">ERP + ACT + CRM + HR · for the startup</p>
        </div>
      </div>

      {step === 0 ? (
        <div className="mb-7 grid gap-px border border-line bg-line lg:grid-cols-[1.618fr_1fr]">
          <div className="bg-panel p-4">
            <p className="font-mono text-[11px] uppercase text-ink-3">Demo workspace</p>
            <p className="mt-2 text-[14px] text-ink-2">Axiom X Co., Ltd. — Ikigai Finance Engine mock-up. 6 projects, real clients, 10.5M THB book, ฿800K called capital.</p>
          </div>
          <div className="flex flex-col justify-center gap-3 bg-panel p-4">
            <Btn onClick={loadDemo}>Load Axiom demo</Btn>
            <Btn variant="ghost" onClick={loadDemoAndExportSheets}>Load demo + export Sheets CSV</Btn>
            <span className="text-[14px] text-ink-3">or onboard your own below</span>
          </div>
        </div>
      ) : null}

      <div className="mb-8 flex flex-wrap gap-4">
        {labels.map((l, idx) => (
          <div key={l} className="flex items-center gap-2">
            <span className={`flex h-8 w-8 items-center justify-center border font-mono text-[11px] ${idx <= step ? 'border-amber text-ink' : 'border-line text-ink-3'}`}>
              {idx + 1}
            </span>
            <span className={`font-mono text-[11px] uppercase ${idx === step ? 'text-ink' : 'text-ink-3'}`}>{l}</span>
          </div>
        ))}
      </div>

      {step === 0 ? (
        <>
          <Station disc="1" kicker="STEP 01" title="Register your company" meta="Put in a little. The system finds the rest." />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="font-mono text-[11px] uppercase text-ink-3">Company name</span>
              <Input value={company.name || ''} onChange={(e) => setCompany((c) => ({ ...c, name: e.target.value }))} placeholder="e.g. Axiom Systems" className="mt-2" />
            </label>
            <label className="block">
              <span className="font-mono text-[11px] uppercase text-ink-3">Registration number</span>
              <Input value={company.reg || ''} onChange={(e) => setCompany((c) => ({ ...c, reg: e.target.value }))} placeholder="Try 0105569099335" className="mt-2" />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Btn onClick={doLookup} disabled={lookupBusy}>Search public records</Btn>
            <span className="text-[14px] text-ink-2">{lookupStatus}</span>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block"><span className="font-mono text-[11px] uppercase text-ink-3">Legal name</span><Input value={company.legalName || ''} onChange={(e) => setCompany((c) => ({ ...c, legalName: e.target.value }))} className="mt-2" /></label>
            <label className="block"><span className="font-mono text-[11px] uppercase text-ink-3">Country</span><Input value={company.country || ''} onChange={(e) => setCompany((c) => ({ ...c, country: e.target.value }))} className="mt-2" /></label>
            <label className="block"><span className="font-mono text-[11px] uppercase text-ink-3">Industry</span><Input value={company.industry || ''} onChange={(e) => setCompany((c) => ({ ...c, industry: e.target.value }))} className="mt-2" /></label>
            <label className="block"><span className="font-mono text-[11px] uppercase text-ink-3">Founded</span><Input value={company.founded || ''} onChange={(e) => setCompany((c) => ({ ...c, founded: e.target.value }))} className="mt-2" /></label>
            <label className="block sm:col-span-2"><span className="font-mono text-[11px] uppercase text-ink-3">Registered address</span><Input value={company.address || ''} onChange={(e) => setCompany((c) => ({ ...c, address: e.target.value }))} className="mt-2" /></label>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <span className="text-[14px] text-ink-3">Tip: registration number 0105569099335 returns Axiom X from the registry stub.</span>
            <Btn onClick={() => setStep(1)}>Continue</Btn>
          </div>
        </>
      ) : null}

      {step === 1 ? (
        <>
          <Station disc="2" kicker="STEP 02" title="Founding capital" meta="Scan the registration paperwork. Tax ID and funds enter the ledger." />
          <button
            type="button"
            onClick={doScan}
            disabled={scanBusy}
            className="mb-4 w-full border border-dashed border-line-2 bg-panel p-6 text-left hover:border-amber disabled:opacity-60"
          >
            {scanBusy ? (
              <span className="flex items-center gap-2"><LiveDot /><span className="font-mono text-[11px] uppercase">OCRing document…</span></span>
            ) : (
              <>
                <p className="font-mono text-[11px] uppercase text-ink-3">Scan or drop registration paperwork</p>
                <p className="mt-2 text-[14px] text-ink-2">PDF or image · OCR reads Tax ID and paid-in capital</p>
              </>
            )}
          </button>
          {scanMsg ? <p className="mb-4 text-[14px] text-amber">{scanMsg}</p> : null}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span className="text-[14px] text-ink-3">or enter manually</span>
            <Btn variant="ghost" onClick={addManualCapital}>Add entry</Btn>
          </div>
          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <label className="block"><span className="font-mono text-[11px] uppercase text-ink-3">Tax ID</span><Input value={manualTax} onChange={(e) => setManualTax(e.target.value)} className="mt-2" /></label>
            <label className="block"><span className="font-mono text-[11px] uppercase text-ink-3">Capital amount</span><Input type="number" value={manualAmt} onChange={(e) => setManualAmt(e.target.value)} className="mt-2" /></label>
          </div>
          <SectionHead label="Recorded capital" />
          <DataTable>
            <thead>
              <tr className="border-b border-line bg-paper">
                <th className="p-3 font-mono text-[11px] uppercase text-ink-3">Source</th>
                <th className="p-3 font-mono text-[11px] uppercase text-ink-3">Tax ID</th>
                <th className="p-3 text-right font-mono text-[11px] uppercase text-ink-3">Amount</th>
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
                <tr><td colSpan={3} className="p-6 text-center text-ink-3">No capital recorded yet.</td></tr>
              )}
            </tbody>
          </DataTable>
          <div className="mt-6 flex justify-between">
            <Btn variant="link" onClick={() => setStep(0)}>Back</Btn>
            <Btn onClick={() => setStep(2)}>Continue</Btn>
          </div>
        </>
      ) : null}

      {step === 2 ? (
        <>
          <Station disc="3" kicker="STEP 03" title="Connect Gmail" meta="Receipts flow into expenses automatically." />
          <div className="mb-4 border border-line bg-panel p-4">
            <TagChip tone="amber">GMAIL</TagChip>
            <p className="mt-3 text-[14px] font-semibold">Connect your business inbox</p>
            <p className="mt-1 text-[14px] text-ink-2">Receipts and invoices are detected and categorized.</p>
            {!gmailService.isConfigured() ? (
              <p className="mt-2 font-mono text-[11px] text-ink-3">Stub mode — simulated import until VITE_GOOGLE_CLIENT_ID is set.</p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-3">
            <Btn onClick={connectGmail} disabled={gmailBusy}>{gmailBusy ? 'Connecting…' : 'Connect Gmail'}</Btn>
            <Btn variant="link" onClick={finish}>Skip for now</Btn>
          </div>
        </>
      ) : null}
    </div>
    </div>
  )
}
