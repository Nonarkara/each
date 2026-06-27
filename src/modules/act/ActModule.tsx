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
  StatCell,
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
        label: 'Invoice ' + p.client + ' — ' + money(p.totalValue - (p.received || 0), store.currency) + ' outstanding on "' + p.title + '"',
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
  const f = calcFinance(store)
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
    if (!vendor || !amount) return
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
      <Station disc="A" kicker="MODULE 02 · ACCOUNTING & ACTIONS" title="Accounting & actions" meta={openActions.length + ' open actions'} />

      <div className="mb-6 grid gap-px border border-line bg-line sm:grid-cols-3">
        <StatCell label="Outstanding AR" value={money(f.outstanding, f.cur)} sub={invoices.length + ' invoices due'} />
        <StatCell label="Expense ledger" value={String(store.expenses.length)} sub={money(f.totalExpenses, f.cur) + ' recorded'} />
        <StatCell label="Action queue" value={String(openActions.length)} sub="Derived + manual" />
      </div>

      <div className="mb-6">
        <SectionHead label="Action queue" meta="What must happen next" />
        <div className="grid gap-px border border-line bg-line">
          {openActions.length ? openActions.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 bg-panel p-4">
              <div className="flex items-start gap-3">
                <input type="checkbox" checked={a.done} onChange={() => toggleAction(a.id)} className="mt-1 h-[18px] w-[18px] accent-amber" />
                <div>
                  <TagChip tone={a.priority === 'high' ? 'amber' : 'default'}>{a.priority}</TagChip>
                  <p className="mt-2 text-[14px]">{a.label}</p>
                  <p className="mt-1 font-mono text-[11px] uppercase text-ink-3">{a.module}</p>
                </div>
              </div>
            </div>
          )) : <div className="bg-panel"><Empty>Queue clear.</Empty></div>}
        </div>
      </div>

      <div className="mb-6">
        <SectionHead label="Invoices & receivables" meta="Commissioned deals · tax-ready" />
        <DataTable>
          <thead>
            <tr className="border-b border-line bg-paper">
              <th className="p-3 font-mono text-[11px] uppercase text-ink-3">Project</th>
              <th className="p-3 font-mono text-[11px] uppercase text-ink-3">Client</th>
              <th className="p-3 text-right font-mono text-[11px] uppercase text-ink-3">Outstanding</th>
              <th className="p-3 font-mono text-[11px] uppercase text-ink-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length ? invoices.map((p) => (
              <tr key={p.id} className="border-b border-line">
                <td className="p-3">{p.title}</td>
                <td className="p-3">{p.client || '—'}</td>
                <td className="p-3 text-right font-mono">{money((p.totalValue || 0) - (p.received || 0), store.currency)}</td>
                <td className="p-3">
                  <Btn variant="ghost" onClick={() => recordPayment(p.id)}>Mark paid</Btn>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={4} className="p-6 text-center text-ink-3">No outstanding invoices.</td></tr>
            )}
          </tbody>
        </DataTable>
      </div>

      <div>
        <SectionHead label="Expense ledger" meta="Transparent — all members" />
        <DataTable>
          <thead>
            <tr className="border-b border-line bg-paper">
              <th className="p-3 font-mono text-[11px] uppercase text-ink-3">Date</th>
              <th className="p-3 font-mono text-[11px] uppercase text-ink-3">Vendor</th>
              <th className="p-3 font-mono text-[11px] uppercase text-ink-3">Category</th>
              <th className="p-3 font-mono text-[11px] uppercase text-ink-3">Type</th>
              <th className="p-3 font-mono text-[11px] uppercase text-ink-3">Owner</th>
              <th className="p-3 text-right font-mono text-[11px] uppercase text-ink-3">Amount</th>
            </tr>
          </thead>
          <tbody>
            {store.expenses.length ? store.expenses.slice().reverse().map((e) => (
              <tr key={e.id} className="border-b border-line">
                <td className="p-3">{e.date}</td>
                <td className="p-3">{e.vendor}</td>
                <td className="p-3">{e.category}</td>
                <td className="p-3"><TagChip tone={e.type === 'capex' ? 'capex' : 'opex'}>{e.type.toUpperCase()}</TagChip></td>
                <td className="p-3">{e.owner}</td>
                <td className="p-3 text-right font-mono">{money(e.amount, e.currency)}</td>
              </tr>
            )) : (
              <tr><td colSpan={6} className="p-6 text-center text-ink-3">No expenses yet. Connect Gmail or add manually.</td></tr>
            )}
          </tbody>
        </DataTable>
        <Btn variant="ghost" className="mt-4" onClick={() => setExpenseOpen(true)}>+ Add expense</Btn>
      </div>

      <Modal title="Add expense" open={expenseOpen} onClose={() => setExpenseOpen(false)} actions={<><Btn variant="ghost" onClick={() => setExpenseOpen(false)}>Cancel</Btn><Btn onClick={addExpense}>Record</Btn></>}>
        <div className="grid gap-4">
          <label className="block"><span className="font-mono text-[11px] uppercase text-ink-3">Vendor</span><Input value={vendor} onChange={(e) => setVendor(e.target.value)} className="mt-2" /></label>
          <label className="block"><span className="font-mono text-[11px] uppercase text-ink-3">Amount</span><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-2" /></label>
          <label className="block"><span className="font-mono text-[11px] uppercase text-ink-3">Category</span><Input value={category} onChange={(e) => setCategory(e.target.value)} className="mt-2" /></label>
          <label className="block"><span className="font-mono text-[11px] uppercase text-ink-3">Type</span><Select value={expType} onChange={(e) => setExpType(e.target.value as 'opex' | 'capex')} className="mt-2"><option value="opex">OpEx</option><option value="capex">CapEx</option></Select></label>
        </div>
      </Modal>
    </div>
  )
}
