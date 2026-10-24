import { useLanguage } from '../../lib/languageContext'
import { useCopy } from "../../lib/copy"
import { useState } from 'react'
import { money, uid } from '../../lib/format'
import { sumMoney } from '../../lib/money'
import type { EachStore } from '../../lib/types'
import type { storeApi } from '../../lib/store'
import {
  Btn,
  DataTable,
  Figure,
  Input,
  Modal,
  ProgressBar,
  SectionHead,
  StackBar,
  Stat,
  Station,
} from '../../components/ui/Axiom'

interface HrModuleProps {
  store: EachStore
  api: typeof storeApi
}

export function HrModule({ store, api }: HrModuleProps) {
  const copy = useCopy()
  const { t } = useLanguage()
  const ai = store.aiEmployees || []
  const hum = store.employees || []
  const aiCost = sumMoney(ai, 'cost', store)
  const humCost = sumMoney(hum, 'salary', store)
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

  const byValue = ai.filter((a) => a.efficiency > 0 && a.cost > 0).sort((a, b) => b.efficiency / b.cost - a.efficiency / a.cost)
  const best = byValue[0]
  const worst = byValue[byValue.length - 1]

  function addAi() {
    if (!aiName.trim() || !Number.isFinite(Number(aiCostIn)) || Number(aiCostIn) < 0 || Number(aiEff) < 0 || Number(aiEff) > 100) return
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
    if (!humName.trim() || !Number.isFinite(Number(humSal)) || Number(humSal) < 0) return
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
      <Station disc="H" title={copy("People")} />

      {/* The one number people cost, and the split of it. The roster counts live
          with their own sections, so nothing is stated twice. */}
      <div className="mb-6 grid items-start gap-x-8 gap-y-6 lg:grid-cols-[1.618fr_1fr]">
        <Figure
          tone="ink"
          label={copy("Monthly people cost")}
          value={money(total, store.currency)}
          note={copy("Feeds ERP OpEx directly")}
        >
          {/* The split, read on the deep shade: amber for the operators, the
              ground's own light for the people. */}
          <div className="mt-4">
            <StackBar
              tall
              segments={[
                { pct: aiShare * 100, variant: 'amber' },
                { pct: (1 - aiShare) * 100, variant: 'paper' },
              ]}
            />
            <div className="mt-1.5 flex justify-between font-mono text-[11px] text-paper">
              <span>{t('AI', 'AI')} {Math.round(aiShare * 100)}%</span>
              <span>{t('Human', 'คน')} {Math.round((1 - aiShare) * 100)}%</span>
            </div>
          </div>
        </Figure>
        <div>
          <SectionHead label={copy("What it pays for")} />
          <dl>
            <Stat label={t('AI operators', 'AI') } value={money(aiCost, store.currency)} swatch="amber" />
            <Stat label={t('Human staff', 'คน')} value={money(humCost, store.currency)} swatch="muted" />
          </dl>
        </div>
      </div>

      {ai.length ? (
      <div className="mb-6">
        <SectionHead
          label={copy("AI operators")}
          meta={ai.length + t(' active', ' คน')}
          action={<Btn variant="ghost" onClick={() => setAiOpen(true)}>{copy("+ Add operator")}</Btn>}
        />
        {/* A roster, not a set of cards. Every operator is a line with the
            same parts in the same places, so the eye can compare them down
            the column instead of comparing boxes of different heights. */}
        <div className="border-t border-hairline">
          {ai.map((a) => (
            <div
              key={a.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-hairline py-2"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-ink font-display text-[14px] font-bold">
                  {a.name.charAt(0)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-semibold">{a.name}</span>
                  <span className="block font-mono text-[11px] text-ink-2">
                    {a.vendor} · {a.role}
                  </span>
                </span>
              </div>
              <div className="w-[140px]">
                <div className="flex justify-between font-mono text-[11px]">
                  <span className="text-ink-2">{copy("Efficiency")}</span>
                  <span>{a.efficiency > 0 ? a.efficiency + '%' : t('Not rated', 'ยังไม่ประเมิน')}</span>
                </div>
                <ProgressBar pct={a.efficiency} variant="amber" />
              </div>
              <span className="w-[110px] text-right font-mono text-[14px]">
                {money(a.cost, a.currency)}
              </span>
            </div>
          ))}
        </div>
        {best ? (
          <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[11px] text-ink-2">
            <span>{copy("Best per cost")}</span>
            <span className="font-mono text-[14px] text-ink">{best.name}</span>
            <span className="ml-4">{copy("Lowest per cost")}</span>
            <span className="font-mono text-[14px] text-ink">{worst.name}</span>
          </div>
        ) : null}
      </div>
      ) : (
        /* The roster is empty, and it says so. A heading over nothing is a
           hole; a heading over a fact is a section. */
        <div className="mb-6">
          <SectionHead
            label={copy("AI operators")}
            action={<Btn variant="ghost" onClick={() => setAiOpen(true)}>{copy("+ Add operator")}</Btn>}
          />
          <p className="border-b border-hairline pb-2 text-[14px] text-ink-2">
            {copy("None yet — the team is all human.")}
          </p>
        </div>
      )}

      <div>
        <SectionHead
          label={copy("Human staff")}
          meta={hum.length + ' on payroll'}
          action={<Btn variant="ghost" onClick={() => setHumOpen(true)}>{copy("+ Add employee")}</Btn>}
        />
        <DataTable>
          <thead>
            <tr className="border-b border-hairline bg-paper">
              <th className="px-3 py-2 font-body text-[11px] text-ink-2">{copy("Name")}</th>
              <th className="px-3 py-2 font-body text-[11px] text-ink-2">{copy("Role")}</th>
              <th className="px-3 py-2 font-body text-[11px] text-ink-2">{copy("Started")}</th>
              <th className="px-3 py-2 text-right font-body text-[11px] text-ink-2">{copy("Salary / mo")}</th>
            </tr>
          </thead>
          <tbody>
            {hum.length ? hum.map((h) => (
              /* No type column: every row of the human roster is human, and a
                 column that says the same thing nine times is noise. */
              <tr key={h.id} className="border-b border-hairline">
                <td className="px-3 py-2">{h.name}</td>
                <td className="px-3 py-2">{h.role}</td>
                <td className="px-3 py-2">{h.started}</td>
                <td className="px-3 py-2 text-right font-mono">{money(h.salary, h.currency || store.currency)}</td>
              </tr>
            )) : (
              <tr><td colSpan={4} className="px-3 py-4 text-[14px] text-ink-2">{copy("No human employees yet.")}</td></tr>
            )}
          </tbody>
        </DataTable>
      </div>

      <Modal title={copy("Add AI operator")} open={aiOpen} onClose={() => setAiOpen(false)} actions={<><Btn variant="ghost" onClick={() => setAiOpen(false)}>{copy("Cancel")}</Btn><Btn onClick={addAi}>{copy("Add")}</Btn></>}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block"><span className="font-body text-[11px] text-ink-2">{copy("Name")}</span><Input value={aiName} onChange={(e) => setAiName(e.target.value)} className="mt-2" /></label>
          <label className="block"><span className="font-body text-[11px] text-ink-2">{copy("Vendor")}</span><Input value={aiVendor} onChange={(e) => setAiVendor(e.target.value)} className="mt-2" /></label>
          <label className="block"><span className="font-body text-[11px] text-ink-2">{copy("Monthly cost")}</span><Input type="number" value={aiCostIn} onChange={(e) => setAiCostIn(e.target.value)} className="mt-2" /></label>
          <label className="block"><span className="font-body text-[11px] text-ink-2">{copy("Efficiency %")}</span><Input type="number" value={aiEff} onChange={(e) => setAiEff(e.target.value)} className="mt-2" /></label>
        </div>
      </Modal>

      <Modal title={copy("Add human employee")} open={humOpen} onClose={() => setHumOpen(false)} actions={<><Btn variant="ghost" onClick={() => setHumOpen(false)}>{copy("Cancel")}</Btn><Btn onClick={addHuman}>{copy("Add")}</Btn></>}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block"><span className="font-body text-[11px] text-ink-2">{copy("Name")}</span><Input value={humName} onChange={(e) => setHumName(e.target.value)} className="mt-2" /></label>
          <label className="block"><span className="font-body text-[11px] text-ink-2">{copy("Role")}</span><Input value={humRole} onChange={(e) => setHumRole(e.target.value)} className="mt-2" /></label>
          <label className="block sm:col-span-2"><span className="font-body text-[11px] text-ink-2">{copy("Monthly salary")}</span><Input type="number" value={humSal} onChange={(e) => setHumSal(e.target.value)} className="mt-2" /></label>
        </div>
      </Modal>
    </div>
  )
}
