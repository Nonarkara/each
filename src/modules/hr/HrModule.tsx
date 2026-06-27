import { useState } from 'react'
import { money, uid } from '../../lib/format'
import type { EachStore } from '../../lib/types'
import type { storeApi } from '../../lib/store'
import {
  Btn,
  DataTable,
  Input,
  Modal,
  ProgressBar,
  SectionHead,
  StackBar,
  StatCell,
  Station,
  TagChip,
} from '../../components/ui/Axiom'

interface HrModuleProps {
  store: EachStore
  api: typeof storeApi
}

function avgEff(ai: EachStore['aiEmployees']) {
  if (!ai.length) return 0
  return Math.round(ai.reduce((a, b) => a + (Number(b.efficiency) || 0), 0) / ai.length)
}

export function HrModule({ store, api }: HrModuleProps) {
  const ai = store.aiEmployees || []
  const hum = store.employees || []
  const aiCost = ai.reduce((a, b) => a + (Number(b.cost) || 0), 0)
  const humCost = hum.reduce((a, b) => a + (Number(b.salary) || 0), 0)
  const total = aiCost + humCost
  const aiShare = total ? aiCost / total : 0

  const [aiOpen, setAiOpen] = useState(false)
  const [humOpen, setHumOpen] = useState(false)
  const [aiName, setAiName] = useState('')
  const [aiVendor, setAiVendor] = useState('')
  const [aiCostIn, setAiCostIn] = useState('')
  const [aiEff, setAiEff] = useState('')
  const [humName, setHumName] = useState('')
  const [humRole, setHumRole] = useState('')
  const [humSal, setHumSal] = useState('')

  const byValue = ai.slice().sort((a, b) => b.efficiency / b.cost - a.efficiency / a.cost)
  const best = byValue[0]
  const worst = byValue[byValue.length - 1]

  function addAi() {
    if (!aiName) return
    api.update((s) => {
      s.aiEmployees.push({
        id: uid(),
        name: aiName,
        vendor: aiVendor || '—',
        role: 'General',
        plan: '—',
        cost: Number(aiCostIn) || 0,
        currency: s.currency,
        efficiency: Number(aiEff) || 0,
        started: new Date().toISOString().slice(0, 10),
      })
      return s
    })
    setAiOpen(false)
    setAiName('')
    setAiVendor('')
    setAiCostIn('')
    setAiEff('')
  }

  function addHuman() {
    if (!humName) return
    api.update((s) => {
      s.employees.push({
        id: uid(),
        name: humName,
        role: humRole || '—',
        salary: Number(humSal) || 0,
        currency: s.currency,
        started: new Date().toISOString().slice(0, 10),
      })
      return s
    })
    setHumOpen(false)
    setHumName('')
    setHumRole('')
    setHumSal('')
  }

  return (
    <div>
      <Station disc="H" kicker="MODULE 04 · PEOPLE" title="People" meta={ai.length + ' AI · ' + hum.length + ' human'} />

      <div className="mb-6 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        <StatCell label="Monthly people cost" value={money(total, store.currency)} sub="Feeds ERP OpEx directly" />
        <StatCell label="AI operators" value={String(ai.length)} sub={money(aiCost, store.currency) + ' / mo'} />
        <StatCell label="Human staff" value={String(hum.length)} sub={money(humCost, store.currency) + ' / mo'} />
        <StatCell label="Avg AI efficiency" value={avgEff(ai) + '%'} sub="Self-reported / rated" />
      </div>

      <div className="mb-6">
        <SectionHead label="People OpEx split" meta="Reflects into ERP monthly burn" />
        <StackBar tall segments={[{ pct: aiShare * 100, variant: 'amber' }, { pct: (1 - aiShare) * 100, variant: 'ink' }]} />
        <div className="mt-2 flex justify-between font-mono text-[11px] text-ink-3">
          <span>AI {money(aiCost, store.currency)} · {Math.round(aiShare * 100)}%</span>
          <span>Human {money(humCost, store.currency)} · {Math.round((1 - aiShare) * 100)}%</span>
        </div>
      </div>

      <div className="mb-6">
        <SectionHead label="AI operators" meta={ai.length + ' active · framed as employees'} />
        <div className="grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {ai.map((a) => (
            <div key={a.id} className="bg-panel p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center border border-ink font-display text-[18px] font-bold">
                  {a.name.charAt(0)}
                </span>
                <div>
                  <p className="text-[14px] font-semibold">{a.name}</p>
                  <p className="font-mono text-[11px] text-ink-3">{a.vendor} · {a.plan}</p>
                </div>
              </div>
              <p className="mt-2 text-[14px] text-ink-2">{a.role}</p>
              <div className="mt-3 flex justify-between font-mono text-[11px]">
                <span className="text-ink-3">Efficiency</span>
                <span>{a.efficiency}%</span>
              </div>
              <ProgressBar pct={a.efficiency} variant="amber" />
              <div className="mt-3 flex justify-between">
                <span className="font-mono text-[11px] text-ink-3">Monthly cost</span>
                <span className="font-mono text-[14px]">{money(a.cost, store.currency)}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <TagChip tone="ai">AI · OpEx</TagChip>
                <span className="font-mono text-[11px] text-ink-3">since {a.started}</span>
              </div>
            </div>
          ))}
        </div>
        {best ? (
          <div className="mt-4 border border-line bg-paper p-4">
            <p className="font-mono text-[11px] uppercase text-ink-3">Operator read</p>
            <p className="mt-2 text-[14px] text-ink-2">
              {best.name} returns the most efficiency per dollar. {worst.name} the least. Consolidate before adding the seventh.
            </p>
          </div>
        ) : null}
        <Btn variant="ghost" className="mt-4" onClick={() => setAiOpen(true)}>+ Add operator</Btn>
      </div>

      <div>
        <SectionHead label="Human staff" meta={hum.length + ' on payroll'} />
        <DataTable>
          <thead>
            <tr className="border-b border-line bg-paper">
              <th className="p-3 font-mono text-[11px] uppercase text-ink-3">Name</th>
              <th className="p-3 font-mono text-[11px] uppercase text-ink-3">Role</th>
              <th className="p-3 font-mono text-[11px] uppercase text-ink-3">Type</th>
              <th className="p-3 font-mono text-[11px] uppercase text-ink-3">Started</th>
              <th className="p-3 text-right font-mono text-[11px] uppercase text-ink-3">Salary / mo</th>
            </tr>
          </thead>
          <tbody>
            {hum.length ? hum.map((h) => (
              <tr key={h.id} className="border-b border-line">
                <td className="p-3">{h.name}</td>
                <td className="p-3">{h.role}</td>
                <td className="p-3"><TagChip tone="human">Human</TagChip></td>
                <td className="p-3">{h.started}</td>
                <td className="p-3 text-right font-mono">{money(h.salary, h.currency || store.currency)}</td>
              </tr>
            )) : (
              <tr><td colSpan={5} className="p-6 text-center text-ink-3">No human employees yet.</td></tr>
            )}
          </tbody>
        </DataTable>
        <Btn variant="ghost" className="mt-4" onClick={() => setHumOpen(true)}>+ Add employee</Btn>
      </div>

      <Modal title="Add AI operator" open={aiOpen} onClose={() => setAiOpen(false)} actions={<><Btn variant="ghost" onClick={() => setAiOpen(false)}>Cancel</Btn><Btn onClick={addAi}>Add</Btn></>}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block"><span className="font-mono text-[11px] uppercase text-ink-3">Name</span><Input value={aiName} onChange={(e) => setAiName(e.target.value)} className="mt-2" /></label>
          <label className="block"><span className="font-mono text-[11px] uppercase text-ink-3">Vendor</span><Input value={aiVendor} onChange={(e) => setAiVendor(e.target.value)} className="mt-2" /></label>
          <label className="block"><span className="font-mono text-[11px] uppercase text-ink-3">Monthly cost</span><Input type="number" value={aiCostIn} onChange={(e) => setAiCostIn(e.target.value)} className="mt-2" /></label>
          <label className="block"><span className="font-mono text-[11px] uppercase text-ink-3">Efficiency %</span><Input type="number" value={aiEff} onChange={(e) => setAiEff(e.target.value)} className="mt-2" /></label>
        </div>
      </Modal>

      <Modal title="Add human employee" open={humOpen} onClose={() => setHumOpen(false)} actions={<><Btn variant="ghost" onClick={() => setHumOpen(false)}>Cancel</Btn><Btn onClick={addHuman}>Add</Btn></>}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block"><span className="font-mono text-[11px] uppercase text-ink-3">Name</span><Input value={humName} onChange={(e) => setHumName(e.target.value)} className="mt-2" /></label>
          <label className="block"><span className="font-mono text-[11px] uppercase text-ink-3">Role</span><Input value={humRole} onChange={(e) => setHumRole(e.target.value)} className="mt-2" /></label>
          <label className="block sm:col-span-2"><span className="font-mono text-[11px] uppercase text-ink-3">Monthly salary</span><Input type="number" value={humSal} onChange={(e) => setHumSal(e.target.value)} className="mt-2" /></label>
        </div>
      </Modal>
    </div>
  )
}
