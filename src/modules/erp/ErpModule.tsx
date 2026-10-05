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
  TagChip,
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

  let objectives = store.objectives
  if (!objectives.length) {
    objectives = [
      { id: 'o1', objective: 'Reach capital-efficient product-market fit', keyResults: [{ k: 'First paying pilot', done: false }, { k: 'Burn under $4k/mo', done: true }, { k: 'Runway > 18 mo', done: true }] },
      { id: 'o2', objective: 'Ship the Frappe migration', keyResults: [{ k: 'ERPNext live', done: false }, { k: 'Chart of accounts mapped', done: false }] },
    ]
    // Example objectives are displayed only; opening a module never saves invented progress.
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
      <Station disc="E" kicker="ERP" title={copy("Finances")} meta={t('As of ', 'ข้อมูล ณ ') + store.asOf} />
      <p className="mb-5 max-w-3xl text-[14px] leading-relaxed text-ink-2">{t("Cash is money already received minus recorded spending. Burn is monthly payroll, AI, recurring costs, debt service and this month\u2019s operating expenses. Runway estimates how long that cash lasts; unsigned deals do not count as cash.", "เงินสดคือเงินที่ได้รับแล้วหักรายจ่ายที่บันทึก รายจ่ายต่อเดือนรวมเงินเดือน AI ค่าใช้จ่ายประจำ เงินผ่อน และรายจ่ายดำเนินงานเดือนนี้ ระยะเวลาที่เงินพอใช้เป็นประมาณการ โครงการที่ยังไม่เซ็นสัญญาไม่ใช่เงินสด")}</p>

      <div className="mb-6 grid gap-px border border-line bg-line lg:grid-cols-[1.618fr_1fr]">
        <div className="bg-panel p-5">
          <p className="text-[14px] font-semibold text-ink">{copy("Runway at current burn")}</p>
          <p className={`mt-2 font-display text-[32px] font-bold leading-none text-ink`}>
            {Number.isFinite(f.runwayMonths) ? f.runwayMonths + ' ' + t('mo', 'เดือน') : '∞'}
          </p>
          <p className="mt-2 text-[14px] text-ink-2">
            {f.monthlyBurn > 0 ? money(f.monthlyBurn, f.cur) + ' / ' + t('month', 'เดือน') : t('No burn recorded', 'ยังไม่มีรายจ่าย')}
          </p>
          {f.monthlyDebtService > 0 ? (
            <p className="mt-1 font-mono text-[11px] text-ink-3">
              {t('Includes', 'รวมเงินผ่อน')} {money(f.monthlyDebtService, f.cur)}
            </p>
          ) : null}
        </div>
        <div className="bg-panel p-5">
          <p className="text-[14px] font-semibold text-ink">{copy("Status")}</p>
          <TagChip tone={safe ? 'amber' : 'default'}>{safe ? t('At least 6 months', 'อย่างน้อย 6 เดือน') : t('Below 6 months', 'ต่ำกว่า 6 เดือน')}</TagChip>
          <p className="mt-3 text-[14px] font-semibold text-ink">
            {safe ? t('Cash lasts at least six months at the recorded burn.', 'เงินสดพอใช้อย่างน้อยหกเดือนตามรายจ่ายที่บันทึก') : t('Review collections and spending this week.', 'ตรวจยอดรับเงินและรายจ่ายในสัปดาห์นี้')}
          </p>
          <p className="mt-1 text-[14px] text-ink-2">
            {t('This is a cash estimate, not a guarantee. Update your records before deciding.', 'นี่เป็นประมาณการเงินสด ไม่ใช่การรับประกัน อัปเดตข้อมูลก่อนตัดสินใจ')}
          </p>
        </div>
      </div>

      <div className="mb-6 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        <StatCell label={copy("Cash on hand")} value={money(f.cash, f.cur)} sub={t('After ', 'หลังบันทึก ') + store.expenses.length + t(' transactions', ' รายการ')} />
        <StatCell label={copy("Founding capital")} value={money(f.founding, f.cur)} sub={store.foundingCapital.length + t(' entries', ' รายการ')} />
        <StatCell label={copy("Monthly burn")} value={money(f.monthlyBurn, f.cur)} sub={t(burnSub, f.monthlyDebtService ? 'ค่าใช้จ่ายประจำ + เงินผ่อน + เดือนนี้' : 'ค่าใช้จ่ายประจำ + เดือนนี้')} />
        <StatCell label={copy("Recurring OpEx")} value={money(f.recurring, f.cur)} sub={store.aiEmployees.length + ' AI / ' + store.employees.length + t(' people', ' คน')} />
      </div>

      <div className="mb-6">
        <SectionHead
          label={copy("Credit & installments")}
          meta={(store.loans?.length || 0) + t(' loans / ', ' รายการ / ') + money(f.totalDebt, f.cur) + t(' owed / ', ' ยอดหนี้ / ') + money(f.monthlyDebtService, f.cur) + t(' per month', ' ต่อเดือน')}
        />
        <DataTable>
          <thead>
            <tr className="border-b border-line font-body text-[11px] text-ink-3">
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
                <tr key={l.id} className="border-b border-line">
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
                <td colSpan={6} className="p-6 text-center text-[14px] text-ink-3">
                  {t('No loans recorded. Loan installments also contribute to monthly burn.', 'ยังไม่มีสินเชื่อที่บันทึก เงินผ่อนจะรวมอยู่ในรายจ่ายต่อเดือนด้วย')}
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
            <span className="font-body text-[11px] text-ink-3">{copy("Lender")}</span>
            <Input value={lender} onChange={(e) => setLender(e.target.value)} className="mt-2" />
          </label>
          <label className="block">
            <span className="font-body text-[11px] text-ink-3">Remaining principal ({store.currency})</span>
            <Input type="number" value={principal} onChange={(e) => setPrincipal(e.target.value)} className="mt-2" />
          </label>
          <label className="block">
            <span className="font-body text-[11px] text-ink-3">{copy("Annual rate (%)")}</span>
            <Input type="number" value={rate} onChange={(e) => setRate(e.target.value)} className="mt-2" />
          </label>
          <label className="block">
            <span className="font-body text-[11px] text-ink-3">{copy("Term (months)")}</span>
            <Input type="number" value={termMonths} onChange={(e) => setTermMonths(e.target.value)} className="mt-2" />
          </label>
          <label className="block">
            <span className="font-body text-[11px] text-ink-3">Monthly installment ({store.currency})</span>
            <Input type="number" value={installment} onChange={(e) => setInstallment(e.target.value)} className="mt-2" />
          </label>
        </div>
      </Modal>

      <div className="mb-6">
        <SectionHead label={copy("Revenue pipeline")} meta={store.projects.length + t(' recorded projects', ' โครงการที่บันทึก')} />
        <div className="grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          <StatCell label={copy("Received to date")} value={money(f.receivedRevenue, f.cur)} sub={copy("Cash in")} />
          <StatCell label={copy("Contracted")} value={money(f.contractedRevenue, f.cur)} sub={f.commissionedCount + t(' commissioned', ' โครงการที่ตกลงแล้ว')} />
          <StatCell label={copy("Outstanding")} value={money(f.outstanding, f.cur)} sub={copy("Contracted, unbilled")} />
          <StatCell label={copy("Expected pipeline")} value={money(f.expectedPipeline, f.cur)} sub={copy("Tier-weighted")} />
        </div>
        <div className="mt-3">
          <StackBar tall segments={[{ pct: rPct, variant: 'ink' }, { pct: oPct, variant: 'amber' }, { pct: pPct, variant: 'muted' }]} />
          <div className="mt-2 flex justify-between font-mono text-[11px] text-ink-3">
            <span>{t('Received', 'รับแล้ว')} {Math.round(rPct)}%</span>
            <span>{copy("Outstanding")} {Math.round(oPct)}%</span>
            <span>{t('Pipeline', 'โอกาสรายได้')} {Math.round(pPct)}%</span>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <SectionHead label={copy("Spend allocation this month")} meta={copy("CapEx vs OpEx")} />
        <StackBar tall segments={[{ pct: f.capexShare * 100, variant: 'ink' }, { pct: f.opexShare * 100, variant: 'amber' }]} />
        <div className="mt-2 flex justify-between font-mono text-[11px] text-ink-3">
          <span>CapEx {money(f.monthCapex, f.cur)} · {Math.round(f.capexShare * 100)}%</span>
          <span>OpEx {money(f.recurring + f.monthOpex, f.cur)} · {Math.round(f.opexShare * 100)}%</span>
        </div>
      </div>

      <div className="mb-6">
        <SectionHead label={copy("Runway projection")} meta={f.proj.length ? f.proj.length + t(' months to depletion', ' เดือนจนเงินหมด') : t('No burn', 'ยังไม่มีรายจ่าย')} />
        {!f.proj.length || f.monthlyBurn <= 0 ? (
          <Empty>{copy("Record expenses to see the projection.")}</Empty>
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
              <span>{copy("Now")}</span>
              <span>{copy("Cash hits zero")}</span>
            </div>
          </>
        )}
      </div>

      <div className="mb-6">
        <SectionHead label={copy("Benchmarks")} meta={t('Illustrative reference values · source unverified', 'ค่าอ้างอิงตัวอย่าง · ยังไม่ยืนยันแหล่งข้อมูล')} />
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
                <span className="text-[14px]">{copy(String(label))}</span>
                <div className="flex items-center gap-3">
                  <div className="w-[90px]">
                    <ProgressBar pct={(y / mx) * 100} />
                  </div>
                  <span className="font-mono text-[14px]">{cur ? money(y, String(cur)) : y}</span>
                  <span className="font-mono text-[11px] text-ink-3">{t('example', 'ตัวอย่าง')} {cur ? money(m, String(cur)) : m}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="mb-6">
        <SectionHead label={copy("Objectives & key results")} meta={t('Example objectives until you create your own', 'เป้าหมายตัวอย่างจนกว่าจะเพิ่มของคุณเอง')} />
        <div className="grid gap-px border border-line bg-line">
          {objectives.map((o) => {
            const kr = o.keyResults || []
            const done = kr.filter((k) => k.done).length
            const pct = kr.length ? (done / kr.length) * 100 : 0
            return (
              <div key={o.id} className="grid gap-px bg-line lg:grid-cols-[1.618fr_1fr]">
                <div className="bg-panel p-4">
                  <p className="font-body text-[11px] text-ink-3">{copy("Objective")}</p>
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
