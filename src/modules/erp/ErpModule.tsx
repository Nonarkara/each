import { useState } from 'react'
import { calcFinance } from '../../lib/calc'
import { money, today, uid } from '../../lib/format'
import type { EachStore } from '../../lib/types'
import type { storeApi } from '../../lib/store'
import {
  Btn,
  DataTable,
  Empty,
  Input,
  Modal,
  ProgressBar,
  SectionHead,
  StackBar,
  StatCell,
  Station,
  TagChip,
} from '../../components/ui/Axiom'

interface ErpModuleProps {
  store: EachStore
  api: typeof storeApi
}

export function ErpModule({ store, api }: ErpModuleProps) {
  const f = calcFinance(store)
  const safe = f.runwayMonths >= 6
  const [loanOpen, setLoanOpen] = useState(false)
  const [lender, setLender] = useState('')
  const [principal, setPrincipal] = useState('')
  const [rate, setRate] = useState('')
  const [termMonths, setTermMonths] = useState('')
  const [installment, setInstallment] = useState('')

  let objectives = store.objectives
  if (!objectives.length) {
    objectives = [
      { id: 'o1', objective: 'Reach capital-efficient product-market fit', keyResults: [{ k: 'First paying pilot', done: false }, { k: 'Burn under $4k/mo', done: true }, { k: 'Runway > 18 mo', done: true }] },
      { id: 'o2', objective: 'Ship the Frappe migration', keyResults: [{ k: 'ERPNext live', done: false }, { k: 'Chart of accounts mapped', done: false }] },
    ]
    api.set({ objectives })
  }

  const funnel = f.receivedRevenue + f.outstanding + f.pipelineRevenue
  const rPct = funnel ? (f.receivedRevenue / funnel) * 100 : 0
  const oPct = funnel ? (f.outstanding / funnel) * 100 : 0
  const pPct = funnel ? (f.pipelineRevenue / funnel) * 100 : 0

  function toggleKr(objId: string, krIndex: number, done: boolean) {
    api.update((s) => {
      const obj = s.objectives.find((x) => x.id === objId)
      if (obj) obj.keyResults[krIndex].done = done
      return s
    })
  }

  function addLoan() {
    const prin = Number(principal)
    const inst = Number(installment)
    if (!lender.trim() || prin <= 0 || inst <= 0) return
    api.update((s) => {
      if (!s.loans) s.loans = []
      s.loans.push({
        id: uid(),
        lender: lender.trim(),
        principal: prin,
        rate: Number(rate) || 0,
        termMonths: Number(termMonths) || 0,
        installment: inst,
        currency: s.currency,
        startDate: today(),
        note: '',
      })
      return s
    })
    setLoanOpen(false)
    setLender('')
    setPrincipal('')
    setRate('')
    setTermMonths('')
    setInstallment('')
  }

  function removeLoan(id: string) {
    if (!window.confirm('Remove this loan from your books?')) return
    api.update((s) => {
      s.loans = (s.loans || []).filter((l) => l.id !== id)
      return s
    })
  }

  const burnSub = f.monthlyDebtService
    ? 'Recurring + debt + this month'
    : 'Recurring + this month'

  return (
    <div>
      <Station disc="E" kicker="MODULE 01 · FINANCES" title="Finances" meta={'As of ' + store.asOf} />

      <div className="mb-6 grid gap-px border border-line bg-line lg:grid-cols-[1.618fr_1fr]">
        <div className="bg-panel p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.11em] text-ink-3">Runway at current burn</p>
          <p className={`mt-2 font-display text-[32px] font-bold leading-none ${safe ? 'text-ink' : 'text-amber'}`}>
            {Number.isFinite(f.runwayMonths) ? f.runwayMonths + ' mo' : '∞'}
          </p>
          <p className="mt-2 text-[14px] text-ink-2">
            {f.monthlyBurn > 0 ? money(f.monthlyBurn, f.cur) + ' / month' : 'No burn recorded'}
          </p>
          {f.monthlyDebtService > 0 ? (
            <p className="mt-1 font-mono text-[11px] text-ink-3">
              Includes {money(f.monthlyDebtService, f.cur)} debt service
            </p>
          ) : null}
        </div>
        <div className="bg-panel p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.11em] text-ink-3">Status</p>
          <TagChip tone={safe ? 'amber' : 'default'}>{safe ? 'ON TRACK' : 'AT RISK'}</TagChip>
          <p className="mt-3 text-[14px] font-semibold text-ink">
            {safe ? 'Spend within the safe line.' : 'Burn exceeds the safe line.'}
          </p>
          <p className="mt-1 text-[14px] text-ink-2">
            {safe ? 'The absence of red is the good news.' : 'Raise or cut. Silence is not a plan.'}
          </p>
        </div>
      </div>

      <div className="mb-6 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        <StatCell label="Cash on hand" value={money(f.cash, f.cur)} sub={'After ' + store.expenses.length + ' transactions'} />
        <StatCell label="Founding capital" value={money(f.founding, f.cur)} sub={store.foundingCapital.length + ' entries'} />
        <StatCell label="Monthly burn" value={money(f.monthlyBurn, f.cur)} sub={burnSub} />
        <StatCell label="Recurring OpEx" value={money(f.recurring, f.cur)} sub={store.aiEmployees.length + ' AI · ' + store.employees.length + ' human'} />
      </div>

      <div className="mb-6">
        <SectionHead
          label="Credit & installments"
          meta={(store.loans?.length || 0) + ' loans · ' + money(f.totalDebt, f.cur) + ' owed · ' + money(f.monthlyDebtService, f.cur) + ' / mo'}
        />
        <DataTable>
          <thead>
            <tr className="border-b border-line font-mono text-[11px] uppercase text-ink-3">
              <th className="p-3 text-left">Lender</th>
              <th className="p-3 text-right">Principal</th>
              <th className="p-3 text-right">Rate</th>
              <th className="p-3 text-right">Term</th>
              <th className="p-3 text-right">Installment</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {(store.loans || []).length ? (
              store.loans.map((l) => (
                <tr key={l.id} className="border-b border-line">
                  <td className="p-3 text-[14px]">{l.lender}</td>
                  <td className="p-3 text-right font-mono text-[14px]">{money(l.principal, l.currency || f.cur)}</td>
                  <td className="p-3 text-right font-mono text-[14px]">{l.rate}%</td>
                  <td className="p-3 text-right font-mono text-[14px]">{l.termMonths} mo</td>
                  <td className="p-3 text-right font-mono text-[14px]">{money(l.installment, l.currency || f.cur)}</td>
                  <td className="p-3 text-right">
                    <Btn variant="ghost" onClick={() => removeLoan(l.id)}>Remove</Btn>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="p-6 text-center text-[14px] text-ink-3">
                  No loans. Borrowed blocks appear here — and in your monthly burn.
                </td>
              </tr>
            )}
          </tbody>
        </DataTable>
        <Btn variant="ghost" className="mt-3" onClick={() => setLoanOpen(true)}>+ Add loan</Btn>
      </div>

      <Modal
        title="Add loan / credit line"
        open={loanOpen}
        onClose={() => setLoanOpen(false)}
        actions={
          <>
            <Btn variant="ghost" onClick={() => setLoanOpen(false)}>Cancel</Btn>
            <Btn onClick={addLoan}>Record</Btn>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="font-mono text-[11px] uppercase text-ink-3">Lender</span>
            <Input value={lender} onChange={(e) => setLender(e.target.value)} className="mt-2" />
          </label>
          <label className="block">
            <span className="font-mono text-[11px] uppercase text-ink-3">Remaining principal ({store.currency})</span>
            <Input type="number" value={principal} onChange={(e) => setPrincipal(e.target.value)} className="mt-2" />
          </label>
          <label className="block">
            <span className="font-mono text-[11px] uppercase text-ink-3">Annual rate (%)</span>
            <Input type="number" value={rate} onChange={(e) => setRate(e.target.value)} className="mt-2" />
          </label>
          <label className="block">
            <span className="font-mono text-[11px] uppercase text-ink-3">Term (months)</span>
            <Input type="number" value={termMonths} onChange={(e) => setTermMonths(e.target.value)} className="mt-2" />
          </label>
          <label className="block">
            <span className="font-mono text-[11px] uppercase text-ink-3">Monthly installment ({store.currency})</span>
            <Input type="number" value={installment} onChange={(e) => setInstallment(e.target.value)} className="mt-2" />
          </label>
        </div>
      </Modal>

      <div className="mb-6">
        <SectionHead label="Revenue pipeline" meta={'Ikigai book · ' + store.projects.length + ' projects'} />
        <div className="grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          <StatCell label="Received to date" value={money(f.receivedRevenue, f.cur)} sub="Cash in" />
          <StatCell label="Contracted" value={money(f.contractedRevenue, f.cur)} sub={f.commissionedCount + ' commissioned'} />
          <StatCell label="Outstanding" value={money(f.outstanding, f.cur)} sub="Contracted, unbilled" />
          <StatCell label="Expected pipeline" value={money(f.expectedPipeline, f.cur)} sub="Tier-weighted" />
        </div>
        <div className="mt-3">
          <StackBar tall segments={[{ pct: rPct, variant: 'ink' }, { pct: oPct, variant: 'amber' }, { pct: pPct, variant: 'muted' }]} />
          <div className="mt-2 flex justify-between font-mono text-[11px] text-ink-3">
            <span>Received {Math.round(rPct)}%</span>
            <span>Outstanding {Math.round(oPct)}%</span>
            <span>Pipeline {Math.round(pPct)}%</span>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <SectionHead label="Spend allocation this month" meta="CapEx vs OpEx" />
        <StackBar tall segments={[{ pct: f.capexShare * 100, variant: 'ink' }, { pct: f.opexShare * 100, variant: 'amber' }]} />
        <div className="mt-2 flex justify-between font-mono text-[11px] text-ink-3">
          <span>CapEx {money(f.monthCapex, f.cur)} · {Math.round(f.capexShare * 100)}%</span>
          <span>OpEx {money(f.recurring + f.monthOpex, f.cur)} · {Math.round(f.opexShare * 100)}%</span>
        </div>
      </div>

      <div className="mb-6">
        <SectionHead label="Runway projection" meta={f.proj.length ? f.proj.length + ' months to depletion' : 'No burn'} />
        {!f.proj.length || f.monthlyBurn <= 0 ? (
          <Empty>Record expenses to see the projection.</Empty>
        ) : (
          <>
            <div className="flex h-[90px] items-end gap-[3px]">
              {f.proj.slice(0, 24).map((bal, i) => {
                const max = f.proj[0] || 1
                const h = Math.max(2, (bal / max) * 90)
                const last = i === f.proj.length - 1
                return (
                  <div
                    key={i}
                    title={'M' + i + ': ' + money(Math.max(0, bal), f.cur)}
                    className={`w-[10px] ${last ? 'bg-amber' : 'bg-ink'}`}
                    style={{ height: h + 'px', opacity: last ? 1 : Math.max(0.3, 1 - i / 30) }}
                  />
                )
              })}
            </div>
            <div className="mt-2 flex justify-between font-mono text-[11px] text-ink-3">
              <span>Now</span>
              <span>Cash hits zero</span>
            </div>
          </>
        )}
      </div>

      <div className="mb-6">
        <SectionHead label="Benchmarks" meta="You vs seed-stage median" />
        <div className="grid gap-px border border-line bg-line">
          {[
            ['Monthly burn', f.monthlyBurn, 35000, f.cur],
            ['AI operator spend', f.aiMonthly, 300, f.cur],
            ['Human headcount', store.employees.length, 8, ''],
          ].map(([label, you, med, cur]) => {
            const y = Number(you)
            const m = Number(med)
            const mx = Math.max(y, m, 1)
            return (
              <div key={String(label)} className="flex flex-wrap items-center justify-between gap-3 bg-panel p-4">
                <span className="text-[14px]">{label}</span>
                <div className="flex items-center gap-3">
                  <div className="w-[90px]">
                    <ProgressBar pct={(y / mx) * 100} />
                  </div>
                  <span className="font-mono text-[14px]">{cur ? money(y, String(cur)) : y}</span>
                  <span className="font-mono text-[11px] text-ink-3">med {cur ? money(m, String(cur)) : m}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="mb-6">
        <SectionHead label="Objectives & key results" meta="OKR · not KPI" />
        <div className="grid gap-px border border-line bg-line">
          {objectives.map((o) => {
            const kr = o.keyResults || []
            const done = kr.filter((k) => k.done).length
            const pct = kr.length ? (done / kr.length) * 100 : 0
            return (
              <div key={o.id} className="grid gap-px bg-line lg:grid-cols-[1.618fr_1fr]">
                <div className="bg-panel p-4">
                  <p className="font-mono text-[11px] uppercase text-ink-3">Objective</p>
                  <p className="mt-1 text-[14px] font-semibold">{o.objective}</p>
                  <div className="mt-3 w-4/5">
                    <ProgressBar pct={pct} variant="amber" />
                  </div>
                </div>
                <div className="bg-panel p-4">
                  <ul className="space-y-2">
                    {kr.map((k, i) => (
                      <li key={i} className="flex min-h-[44px] items-center gap-3">
                        <input
                          type="checkbox"
                          checked={k.done}
                          onChange={(e) => toggleKr(o.id, i, e.target.checked)}
                          className="h-[18px] w-[18px] accent-amber"
                        />
                        <span className={`text-[14px] ${k.done ? 'text-ink-3 line-through' : ''}`}>{k.k}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}

export { calcFinance }
