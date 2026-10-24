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
  Figure,
  Input,
  Meter,
  Modal,
  ProgressBar,
  SectionHead,
  Stat,
  Station,
} from '../../components/ui/Axiom'

interface ErpModuleProps {
  store: EachStore
  api: typeof storeApi
}

/**
 * The money room.
 *
 * One thing wins: the runway. It stands on the deep shade of the palette,
 * with the curve that produced it directly beneath the number, and the amber
 * pointing at the only sentence on the page that asks something of the
 * reader.
 *
 * Everything after it is a fact and the evidence for a fact. No cell is
 * stretched to fill a row, and no number is said twice: the cash and the
 * runway live here, on this page, and nowhere else in the workspace.
 */
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

      {/* THE ONE BOLD MOVE. The runway, the evidence for it, and the one
          sentence that asks the reader to do something. */}
      <div className="mb-6 grid items-start gap-6 lg:grid-cols-[1.618fr_1fr]">
        <div className="min-w-0">
          <Figure
            tone="ink"
            label={copy("Runway at current burn")}
            value={Number.isFinite(f.runwayMonths) ? f.runwayMonths + ' ' + t('mo', 'เดือน') : '∞'}
            note={
              f.monthlyBurn > 0
                ? money(f.monthlyBurn, f.cur) + ' / ' + t('month', 'เดือน')
                : t('No burn recorded', 'ยังไม่มีรายจ่าย')
            }
          >
          {f.proj.length >= 3 && f.monthlyBurn > 0 ? (
            <div className="mt-4">
              <div className="flex h-[72px] items-end gap-[3px]">
                {f.proj.slice(0, 24).map((bal, i) => {
                  const max = f.proj[0] || 1
                  const h = Math.max(2, Math.round((bal / max) * 72))
                  const last = i === f.proj.length - 1
                  return (
                    <div
                      key={i}
                      title={'M' + i + ': ' + money(Math.max(0, bal), f.cur)}
                      className={`w-[10px] ${last ? 'bg-amber' : 'bg-paper'}`}
                      style={{ height: h + 'px', opacity: last ? 1 : Math.max(0.35, 1 - i / 30) }}
                    />
                  )
                })}
              </div>
              <div className="mt-1.5 flex justify-between font-mono text-[11px] text-paper">
                <span>{copy("Now")}</span>
                <span>{copy("Cash hits zero")}</span>
              </div>
            </div>
          ) : null}
          {!safe ? (
            <p className="mt-4 border-l-2 border-amber pl-3 text-[14px] font-semibold text-paper">
              {t(
                'Under six months. Collect or cut before the next close.',
                'ต่ำกว่า 6 เดือน เก็บเงินหรือลดรายจ่ายก่อนรอบปิดถัดไป',
              )}
            </p>
          ) : null}
          </Figure>

          {/* What the workspace is worth and what it owes. These two facts
              are the inputs of the runway above, so they stand under it: the
              column is not left with a hole under a short field, and a fact
              is never far from the number it explains. */}
          <div className="mt-4 grid gap-x-6 sm:grid-cols-2">
            <dl>
              <Stat label={copy("Called capital")} value={money(f.founding, f.cur)} />
            </dl>
            <dl>
              <Stat label={copy("Debt owed")} value={money(f.totalDebt, f.cur)} />
            </dl>
          </div>
        </div>

        {/* What the burn is made of, and what is coming in. Two compositions,
            each a bar with the rows that name its pieces. */}
        <div className="grid gap-6">
          <div>
            <h3 className="mb-2 text-[14px] font-semibold text-ink">{copy("Where the burn goes")}</h3>
            <Meter
              segments={[
                { label: copy("CapEx this month"), value: money(f.monthCapex, f.cur), pct: capexPct, variant: 'ink' },
                { label: copy("OpEx this month"), value: money(f.recurring + f.monthOpex, f.cur), pct: opexPct, variant: 'amber' },
                { label: copy("Debt service"), value: money(f.monthlyDebtService, f.cur), pct: debtPct, variant: 'muted' },
              ]}
            />
          </div>
          <div>
            <h3 className="mb-2 flex items-baseline justify-between gap-3 text-[14px] font-semibold text-ink">
              {copy("Revenue")}
              <span className="font-mono text-[11px] font-normal text-ink-2">
                {store.projects.length + t(' recorded projects', ' โครงการที่บันทึก')}
              </span>
            </h3>
            <Meter
              segments={[
                { label: t('Received', 'รับแล้ว'), value: money(f.receivedRevenue, f.cur), pct: rPct, variant: 'ink' },
                { label: t('Outstanding', 'ลูกหนี้ค้าง'), value: money(f.outstanding, f.cur), pct: oPct, variant: 'amber' },
                { label: t('Expected pipeline', 'รายได้ที่คาดหวัง'), value: money(f.expectedPipeline, f.cur), pct: pPct, variant: 'muted' },
              ]}
            />
          </div>
        </div>
      </div>

      <div className="mb-6">
        <SectionHead
          label={copy("Credit & installments")}
          meta={(store.loans?.length || 0) + t(' loans', ' รายการ')}
          action={<Btn variant="ghost" onClick={() => setLoanOpen(true)}>{copy("+ Add loan")}</Btn>}
        />
        <DataTable>
          <thead>
            <tr className="border-b border-hairline font-body text-[11px] text-ink-2">
              <th className="py-2 pr-3 text-left">{copy("Lender")}</th>
              <th className="py-2 pr-3 text-right">{copy("Principal")}</th>
              <th className="py-2 pr-3 text-right">{copy("Rate")}</th>
              <th className="py-2 pr-3 text-right">{copy("Term")}</th>
              <th className="py-2 pr-3 text-right">{copy("Installment")}</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {(store.loans || []).length ? (
              store.loans.map((l) => (
                <tr key={l.id} className="border-b border-hairline">
                  <td className="py-2 pr-3 text-[14px]">{l.lender}</td>
                  <td className="py-2 pr-3 text-right font-mono text-[14px]">{money(l.principal, l.currency || f.cur)}</td>
                  <td className="py-2 pr-3 text-right font-mono text-[14px]">{l.rate}%</td>
                  <td className="py-2 pr-3 text-right font-mono text-[14px]">{l.termMonths} {t('mo', 'เดือน')}</td>
                  <td className="py-2 pr-3 text-right font-mono text-[14px]">{money(l.installment, l.currency || f.cur)}</td>
                  <td className="py-2 text-right">
                    <Btn variant="ghost" onClick={() => removeLoan(l.id)}>{copy("Remove")}</Btn>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-4 text-[14px] text-ink-2">
                  {t('No loans recorded.', 'ยังไม่มีสินเชื่อที่บันทึก')}
                </td>
              </tr>
            )}
          </tbody>
        </DataTable>
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
            <Input value={lender} onChange={(e) => setLender(e.target.value)} className="mt-1" />
          </label>
          <label className="block">
            <span className="font-body text-[11px] text-ink-2">Remaining principal ({store.currency})</span>
            <Input type="number" value={principal} onChange={(e) => setPrincipal(e.target.value)} className="mt-1" />
          </label>
          <label className="block">
            <span className="font-body text-[11px] text-ink-2">Annual rate (%)</span>
            <Input type="number" value={rate} onChange={(e) => setRate(e.target.value)} className="mt-1" />
          </label>
          <label className="block">
            <span className="font-body text-[11px] text-ink-2">Term (months)</span>
            <Input type="number" value={termMonths} onChange={(e) => setTermMonths(e.target.value)} className="mt-1" />
          </label>
          <label className="block">
            <span className="font-body text-[11px] text-ink-2">Monthly installment ({store.currency})</span>
            <Input type="number" value={installment} onChange={(e) => setInstallment(e.target.value)} className="mt-1" />
          </label>
        </div>
      </Modal>

      {objectives.length ? (
        <div className="mb-6">
          <SectionHead label={copy("Objectives & key results")} />
          <div className="grid gap-6">
            {objectives.map((o) => {
              const kr = o.keyResults || []
              const done = kr.filter((k) => k.done).length
              const pct = kr.length ? (done / kr.length) * 100 : 0
              return (
                <div key={o.id}>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <p className="text-[14px] font-semibold">{o.objective}</p>
                    <p className="font-mono text-[11px] text-ink-2">
                      {done + ' / ' + kr.length + t(' done', ' เสร็จ')}
                    </p>
                  </div>
                  <div className="mt-2 max-w-[520px]">
                    <ProgressBar pct={pct} variant="amber" />
                  </div>
                  <ul className="mt-1">
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
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}
