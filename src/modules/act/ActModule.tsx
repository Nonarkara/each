import { useLanguage } from '../../lib/languageContext'
import { useCopy } from "../../lib/copy"
import { useMemo, useState } from 'react'
import { calcFinance } from '../../lib/calc'
import { money, today, uid } from '../../lib/format'
import type { ActionItem, EachStore } from '../../lib/types'
import type { storeApi } from '../../lib/store'
import {
  Btn,
  DataTable,
  Empty,
  Input,
  Modal,
  SectionHead,
  Select,
  Station,
  TagChip,
} from '../../components/ui/Axiom'

interface ActModuleProps {
  store: EachStore
  api: typeof storeApi
}

function deriveActions(store: EachStore): ActionItem[] {
  const items: ActionItem[] = []
  store.projects.forEach((p) => {
    if (p.dealStatus === 'commissioned' && p.totalValue && (p.received || 0) < p.totalValue) {
      items.push({
        id: 'inv-' + p.id,
        priority: 'high',
        label: 'Invoice ' + p.client + ' — ' + money(p.totalValue - (p.received || 0), store.currency) + ' outstanding on ' + p.title,
        module: 'act',
        done: false,
      })
    }
    if (p.dealStatus === 'pipeline' && p.scenarioTier === 2) {
      items.push({
        id: 'pipe-' + p.id,
        priority: 'medium',
        label: 'Follow up pipeline deal: ' + p.title,
        module: 'crm',
        done: false,
      })
    }
  })
  store.objectives.forEach((o) => {
    o.keyResults.filter((k) => !k.done).forEach((k, i) => {
      items.push({
        id: 'okr-' + o.id + '-' + i,
        priority: 'medium',
        label: 'OKR: ' + k.k,
        module: 'erp',
        done: false,
      })
    })
  })
  if (calcFinance(store).runwayMonths < 6) {
    items.push({
      id: 'runway-risk',
      priority: 'high',
      label: 'Runway below 6 months — review burn or raise',
      module: 'erp',
      done: false,
    })
  }
  return items
}

export function ActModule({ store, api }: ActModuleProps) {
  const copy = useCopy()
  const { t } = useLanguage()
  const f = calcFinance(store)
  const [expenseError, setExpenseError] = useState('')
  const [expenseOpen, setExpenseOpen] = useState(false)
  const [vendor, setVendor] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [expType, setExpType] = useState<'opex' | 'capex'>('opex')

  const actions = useMemo(() => {
    const derived = deriveActions(store)
    const manual = store.actions || []
    const derivedIds = new Set(derived.map((d) => d.id))
    return [...derived, ...manual.filter((m) => !derivedIds.has(m.id))]
  }, [store])

  const invoices = store.projects.filter(
    (p) => p.dealStatus === 'commissioned' && p.totalValue && (p.received || 0) < p.totalValue,
  )

  function addExpense() {
    if (!vendor.trim() || !Number.isFinite(Number(amount)) || Number(amount) <= 0) { setExpenseError(t('Enter a vendor and an amount above zero.', 'กรอกผู้ขายและจำนวนเงินมากกว่าศูนย์')); return }
    api.update((s) => {
      s.expenses.push({
        id: uid(),
        date: today(),
        vendor,
        category: category || '—',
        type: expType,
        amount: Number(amount),
        currency: s.currency,
        source: 'Manual',
        owner: 'Founder',
      })
      return s
    })
    setExpenseOpen(false)
    setVendor('')
    setAmount('')
    setCategory('')
  }

  function recordPayment(projectId: string) {
    api.update((s) => {
      const p = s.projects.find((x) => x.id === projectId)
      if (p && p.totalValue) {
        p.received = p.totalValue
        p.receivedDate = today()
      }
      return s
    })
  }

  function toggleAction(id: string) {
    api.update((s) => {
      const existing = s.actions.find((a) => a.id === id)
      if (existing) {
        existing.done = !existing.done
      } else {
        const derived = deriveActions(s).find((a) => a.id === id)
        if (derived) s.actions.push({ ...derived, done: true })
      }
      return s
    })
  }

  const openActions = actions.filter((a) => !a.done)

  return (
    <div>
      <Station
        disc="A"
        title={copy("Accounting & actions")}
        meta={openActions.length + t(' open · ', ' งานค้าง ') + money(f.outstanding, f.cur) + t(' outstanding', ' ลูกหนี้ค้าง')}
      />

      <div className="mb-6">
        <SectionHead label={copy("Action queue")} />
        <div className="grid gap-px border border-hairline bg-hairline">
          {openActions.length ? openActions.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center gap-3 bg-panel px-4 py-2">
              <label className="-ml-2 flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center">
                <input type="checkbox" checked={a.done} onChange={() => toggleAction(a.id)} className="h-[20px] w-[20px] accent-amber" />
              </label>
              <p className="min-w-0 flex-1 text-[14px]">{a.label}</p>
              <TagChip tone="default">{a.module.toUpperCase()}</TagChip>
              <TagChip tone={a.priority === 'high' ? 'amber' : 'default'}>{a.priority}</TagChip>
            </div>
          )) : <div className="bg-panel"><Empty>{copy("Queue clear.")}</Empty></div>}
        </div>
      </div>

      <div className="mb-6">
        <SectionHead label={copy("Invoices & receivables")} meta={invoices.length + t(' open invoices', ' ใบแจ้งหนี้ค้าง')} />
        <DataTable>
          <thead>
            <tr className="border-b border-hairline bg-paper">
              <th className="p-3 font-body text-[11px] text-ink-2">{copy("Project")}</th>
              <th className="p-3 font-body text-[11px] text-ink-2">{copy("Client")}</th>
              <th className="p-3 text-right font-body text-[11px] text-ink-2">{copy("Outstanding")}</th>
              <th className="p-3 font-body text-[11px] text-ink-2">{copy("Action")}</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length ? invoices.map((p) => (
              <tr key={p.id} className="border-b border-hairline">
                <td className="p-3">{p.title}</td>
                <td className="p-3">{p.client || '—'}</td>
                <td className="p-3 text-right font-mono">{money((p.totalValue || 0) - (p.received || 0), store.currency)}</td>
                <td className="p-3">
                  <Btn variant="ghost" onClick={() => recordPayment(p.id)}>{copy("Mark paid")}</Btn>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={4} className="p-6 text-center text-ink-2">{copy("No outstanding invoices.")}</td></tr>
            )}
          </tbody>
        </DataTable>
      </div>

      <div>
        <SectionHead
          label={copy("Expense ledger")}
          meta={store.expenses.length + t(' entries', ' รายการ')}
          action={<Btn variant="ghost" onClick={() => setExpenseOpen(true)}>{copy("+ Add expense")}</Btn>}
        />
        <DataTable>
          <thead>
            <tr className="border-b border-hairline bg-paper">
              <th className="p-3 font-body text-[11px] text-ink-2">{copy("Date")}</th>
              <th className="p-3 font-body text-[11px] text-ink-2">{copy("Vendor")}</th>
              <th className="p-3 font-body text-[11px] text-ink-2">{copy("Category")}</th>
              <th className="p-3 font-body text-[11px] text-ink-2">{copy("Type")}</th>
              <th className="p-3 font-body text-[11px] text-ink-2">{copy("Owner")}</th>
              <th className="p-3 text-right font-body text-[11px] text-ink-2">{copy("Amount")}</th>
            </tr>
          </thead>
          <tbody>
            {store.expenses.length ? store.expenses.slice().reverse().map((e) => (
              <tr key={e.id} className="border-b border-hairline">
                <td className="p-3">{e.date}</td>
                <td className="p-3">{e.vendor}</td>
                <td className="p-3">{e.category}</td>
                <td className="p-3"><TagChip tone={e.type === 'capex' ? 'capex' : 'opex'}>{e.type.toUpperCase()}</TagChip></td>
                <td className="p-3">{e.owner}</td>
                <td className="p-3 text-right font-mono">{money(e.amount, e.currency)}</td>
              </tr>
            )) : (
              <tr><td colSpan={6} className="p-6 text-center text-ink-2">{copy("No expenses yet. Connect Gmail or add manually.")}</td></tr>
            )}
          </tbody>
        </DataTable>
      </div>

      {expenseError ? <p role="alert" className="border-l-2 border-amber p-3">{expenseError}</p> : null}
      <Modal title={copy("Add expense")} open={expenseOpen} onClose={() => setExpenseOpen(false)} actions={<><Btn variant="ghost" onClick={() => setExpenseOpen(false)}>{copy("Cancel")}</Btn><Btn onClick={addExpense}>{copy("Record")}</Btn></>}>
        <div className="grid gap-4">
          <label className="block"><span className="font-body text-[11px] text-ink-2">{copy("Vendor")}</span><Input value={vendor} onChange={(e) => setVendor(e.target.value)} className="mt-2" /></label>
          <label className="block"><span className="font-body text-[11px] text-ink-2">{copy("Amount")}</span><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-2" /></label>
          <label className="block"><span className="font-body text-[11px] text-ink-2">{copy("Category")}</span><Input value={category} onChange={(e) => setCategory(e.target.value)} className="mt-2" /></label>
          <label className="block"><span className="font-body text-[11px] text-ink-2">{copy("Type")}</span><Select value={expType} onChange={(e) => setExpType(e.target.value as 'opex' | 'capex')} className="mt-2"><option value="opex">OpEx</option><option value="capex">CapEx</option></Select></label>
        </div>
      </Modal>
    </div>
  )
}
