import { useLanguage } from '../../lib/languageContext'
import { useCopy } from "../../lib/copy"
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
  MetricRow,
} from '../../components/ui/Axiom'

interface ErpModuleProps {
  store: EachStore
  api: typeof storeApi
}

export function ErpModule({ store, api }: ErpModuleProps) {
  const copy = useCopy()
  const { t } = useLanguage()
  const f = calcFinance(store)
  const safe = f.runwayMonths >= 6
  const [loanOpen, setLoanOpen] = useState(false)
  const [lender, setLender] = useState('')
  const [principal, setPrincipal] = useState('')
  const [rate, setRate] = useState('')
  const [termMonths, setTermMonths] = useState('')
  const [installment, setInstallment] = useState('')

  // No invented objectives: the founder's workspace shows only what they recorded.
  const objectives = store.objectives

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

  const spendTotal = f.monthCapex + f.recurring + f.monthOpex + f.monthlyDebtService || 1
  const capexPct = (f.monthCapex / spendTotal) * 100
  const opexPct = ((f.recurring + f.monthOpex) / spendTotal) * 100
  const debtPct = (f.monthlyDebtService / spendTotal) * 100

  return (
    <div>
      <Station disc="E" title={copy("Finances")} meta={t('As of ', 'ข้อมูล ณ ') + store.asOf} />

      {/* The one bold move: how long the cash lasts, and the spend behind it. */}
      <div className="mb-6 grid gap-px border border-hairline bg-hairline lg:grid-cols-[1.618fr_1fr]">
        <div className="flex flex-col bg-panel p-5">
          <p className="text-[11px] text-ink-2">{copy("Runway at current burn")}</p>
          <p className="mt-2 font-display text-[32px] font-bold leading-none text-ink">
            {Number.isFinite(f.runwayMonths) ? f.runwayMonths + ' ' + t('mo', 'เดือน') : '∞'}
          </p>
          <p className="mt-3 font-mono text-[14px] text-ink-2">
            {f.monthlyBurn > 0
              ? money(f.monthlyBurn, f.cur) + ' / ' + t('month', 'เดือน')
              : t('No burn recorded', 'ยังไม่มีรายจ่าย')}
          </p>
          {!safe ? (
            <p className="mt-4 border-l-2 border-amber pl-3 text-[14px] font-semibold text-ink lg:mt-auto lg:pt-4">
              {t(
                'Under six months. Collect or cut before the next close.',
                'ต่ำกว่า 6 เดือน เก็บเงินหรือลดรายจ่ายก่อนรอบปิดถัดไป',
              )}
            </p>
          ) : null}
        </div>
        <div className="bg-panel p-5">
          <p className="text-[11px] text-ink-2">{copy("Where the burn goes")}</p>
          <div className="mt-3">
            <StackBar
              tall
              segments={[
                { pct: capexPct, variant: 'ink' },
                { pct: opexPct, variant: 'amber' },
                { pct: debtPct, variant: 'muted' },
              ]}
            />
          </div>
          <dl className="mt-3">
            <MetricRow label={copy("CapEx this month")} value={money(f.monthCapex, f.cur)} />
            <MetricRow label={copy("OpEx this month")} value={money(f.recurring + f.monthOpex, f.cur)} />
            <MetricRow label={copy("Debt service")} value={money(f.monthlyDebtService, f.cur)} />
          </dl>
        </div>
      </div>

      <div className="mb-6 grid gap-px border border-hairline bg-hairline sm:grid-cols-3">
        <StatCell label={copy("Called capital")} value={money(f.founding, f.cur)} />
        <StatCell label={copy("Monthly burn")} value={money(f.monthlyBurn, f.cur)} />
        <StatCell label={copy("Recurring")} value={money(f.recurring, f.cur)} />
      </div>

      <div className="mb-6">
        <SectionHead
          label={copy("Revenue")}
          meta={store.projects.length + t(' recorded projects', ' โครงการที่บันทึก')}
        />
        <div className="grid gap-px border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-4">
          <StatCell label={copy("Received")} value={money(f.receivedRevenue, f.cur)} />
          <StatCell label={copy("Contracted")} value={money(f.contractedRevenue, f.cur)} />
          <StatCell label={copy("Outstanding")} value={money(f.outstanding, f.cur)} />
          <StatCell label={copy("Expected pipeline")} value={money(f.expectedPipeline, f.cur)} />
        </div>
        <div className="mt-3">
          <StackBar tall segments={[{ pct: rPct, variant: 'ink' }, { pct: oPct, variant: 'amber' }, { pct: pPct, variant: 'muted' }]} />
          <div className="mt-2 flex flex-wrap gap-x-6 font-mono text-[11px] text-ink-2">
            <span className="inline-flex items-center gap-2">
              <span className="inline-block h-2 w-2 bg-ink" aria-hidden />
              {t('Received', 'รับแล้ว')} {Math.round(rPct)}%
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="inline-block h-2 w-2 bg-amber" aria-hidden />
              {copy("Outstanding")} {Math.round(oPct)}%
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="inline-block h-2 w-2 bg-ink-2" aria-hidden />
              {t('Pipeline', 'โอกาสรายได้')} {Math.round(pPct)}%
            </span>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <SectionHead
          label={copy("Runway projection")}
          meta={f.proj.length ? f.proj.length + t(' months to depletion', ' เดือนจนเงินหมด') : t('No burn', 'ยังไม่มีรายจ่าย')}
        />
        {!f.proj.length || f.monthlyBurn <= 0 ? (
          <Empty>{copy("Record expenses to see the projection.")}</Empty>
        ) : f.proj.length < 3 ? (
          <p className="border border-hairline bg-panel p-4 text-[14px] text-ink-2">
            {t('Cash reaches zero next month at the recorded burn.', 'เงินสดหมดเดือนหน้าที่รายจ่ายที่บันทึกไว้')}
          </p>
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
            <div className="mt-2 flex justify-between font-mono text-[11px] text-ink-2">
              <span>{copy("Now")}</span>
              <span>{copy("Cash hits zero")}</span>
            </div>
          </>
        )}
      </div>

      <div className="mb-6">
        <SectionHead
          label={copy("Credit & installments")}
          meta={(store.loans?.length || 0) + t(' loans / ', ' รายการ / ') + money(f.totalDebt, f.cur) + t(' owed / ', ' ยอดหนี้ / ') + money(f.monthlyDebtService, f.cur) + t(' per month', ' ต่อเดือน')}
        />
        <DataTable>
          <thead>
            <tr className="border-b border-hairline font-body text-[11px] text-ink-2">
              <th className="p-3 text-left">{copy("Lender")}</th>
              <th className="p-3 text-right">{copy("Principal")}</th>
              <th className="p-3 text-right">{copy("Rate")}</th>
              <th className="p-3 text-right">{copy("Term")}</th>
              <th className="p-3 text-right">{copy("Installment")}</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {(store.loans || []).length ? (
              store.loans.map((l) => (
                <tr key={l.id} className="border-b border-hairline">
                  <td className="p-3 text-[14px]">{l.lender}</td>
                  <td className="p-3 text-right font-mono text-[14px]">{money(l.principal, l.currency || f.cur)}</td>
                  <td className="p-3 text-right font-mono text-[14px]">{l.rate}%</td>
                  <td className="p-3 text-right font-mono text-[14px]">{l.termMonths} {t('mo', 'เดือน')}</td>
                  <td className="p-3 text-right font-mono text-[14px]">{money(l.installment, l.currency || f.cur)}</td>
                  <td className="p-3 text-right">
                    <Btn variant="ghost" onClick={() => removeLoan(l.id)}>{copy("Remove")}</Btn>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="p-6 text-center text-[14px] text-ink-2">
                  {t('No loans recorded.', 'ยังไม่มีสินเชื่อที่บันทึก')}
                </td>
              </tr>
            )}
          </tbody>
        </DataTable>
        <Btn variant="ghost" className="mt-3" onClick={() => setLoanOpen(true)}>{copy("+ Add loan")}</Btn>
      </div>

      <Modal
        title={copy("Add loan / credit line")}
        open={loanOpen}
        onClose={() => setLoanOpen(false)}
        actions={
          <>
            <Btn variant="ghost" onClick={() => setLoanOpen(false)}>{copy("Cancel")}</Btn>
            <Btn onClick={addLoan}>{copy("Record")}</Btn>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="font-body text-[11px] text-ink-2">{copy("Lender")}</span>
            <Input value={lender} onChange={(e) => setLender(e.target.value)} className="mt-2" />
          </label>
          <label className="block">
            <span className="font-body text-[11px] text-ink-2">Remaining principal ({store.currency})</span>
            <Input type="number" value={principal} onChange={(e) => setPrincipal(e.target.value)} className="mt-2" />
          </label>
          <label className="block">
            <span className="font-body text-[11px] text-ink-2">Annual rate (%)</span>
            <Input type="number" value={rate} onChange={(e) => setRate(e.target.value)} className="mt-2" />
          </label>
          <label className="block">
            <span className="font-body text-[11px] text-ink-2">Term (months)</span>
            <Input type="number" value={termMonths} onChange={(e) => setTermMonths(e.target.value)} className="mt-2" />
          </label>
          <label className="block">
            <span className="font-body text-[11px] text-ink-2">Monthly installment ({store.currency})</span>
            <Input type="number" value={installment} onChange={(e) => setInstallment(e.target.value)} className="mt-2" />
          </label>
        </div>
      </Modal>

      {objectives.length ? (
        <div className="mb-6">
          <SectionHead label={copy("Objectives & key results")} />
          <div className="grid gap-px border border-hairline bg-hairline">
            {objectives.map((o) => {
              const kr = o.keyResults || []
              const done = kr.filter((k) => k.done).length
              const pct = kr.length ? (done / kr.length) * 100 : 0
              return (
                <div key={o.id} className="grid gap-px bg-hairline lg:grid-cols-[1.618fr_1fr]">
                  <div className="bg-panel p-4">
                    <p className="text-[14px] font-semibold">{o.objective}</p>
                    <div className="mt-3 w-4/5">
                      <ProgressBar pct={pct} variant="amber" />
                    </div>
                  </div>
                  <div className="bg-panel p-4">
                    <ul>
                      {kr.map((k, i) => (
                        <li key={i} className="flex min-h-[44px] items-center gap-3">
                          <label className="-ml-2 flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center">
                            <input
                              type="checkbox"
                              checked={k.done}
                              onChange={(e) => toggleKr(o.id, i, e.target.checked)}
                              className="h-[20px] w-[20px] accent-amber"
                            />
                          </label>
                          <span className={`text-[14px] ${k.done ? 'text-ink-2 line-through' : ''}`}>{k.k}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}
