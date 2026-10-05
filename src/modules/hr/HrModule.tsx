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
      <Station disc="H" kicker="HR" title={copy("People")} meta={ai.length + ' AI / ' + hum.length + t(' people', ' คน')} />
      <p className="mb-5 max-w-3xl text-[14px] leading-relaxed text-ink-2">{t("Add the people and AI subscriptions you actually pay for. Monthly salaries and subscription costs flow into ERP burn. Efficiency scores are your own assessments, and an unrated operator is shown without a score.", "เพิ่มพนักงานและบริการ AI ที่จ่ายจริง เงินเดือนและค่าสมัครต่อเดือนรวมอยู่ในรายจ่ายของ ERP คะแนนประสิทธิภาพเป็นการประเมินของคุณเอง ผู้ช่วยที่ยังไม่ได้ประเมินจะแสดงว่าไม่มีคะแนน")}</p>

      <div className="mb-6 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        <StatCell label={copy("Monthly people cost")} value={money(total, store.currency)} sub={copy("Feeds ERP OpEx directly")} />
        <StatCell label={copy("AI operators")} value={String(ai.length)} sub={money(aiCost, store.currency) + ' / mo'} />
        <StatCell label={copy("Human staff")} value={String(hum.length)} sub={money(humCost, store.currency) + ' / mo'} />
        <StatCell label={copy("Avg AI efficiency")} value={ai.some((a) => a.efficiency > 0) ? avgEff(ai) + '%' : '—'} sub={copy("Self-reported / rated")} />
      </div>

      <div className="mb-6">
        <SectionHead label={copy("People OpEx split")} meta={copy("Reflects into ERP monthly burn")} />
        <StackBar tall segments={[{ pct: aiShare * 100, variant: 'amber' }, { pct: (1 - aiShare) * 100, variant: 'ink' }]} />
        <div className="mt-2 flex justify-between font-mono text-[11px] text-ink-3">
          <span>AI {money(aiCost, store.currency)} · {Math.round(aiShare * 100)}%</span>
          <span>{copy("Human")}{money(humCost, store.currency)} · {Math.round((1 - aiShare) * 100)}%</span>
        </div>
      </div>

      <div className="mb-6">
        <SectionHead label={copy("AI operators")} meta={ai.length + ' active · framed as employees'} />
        <div className="grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {ai.map((a) => (
            <div key={a.id} className="bg-panel p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center border border-ink font-display text-[14px] font-bold">
                  {a.name.charAt(0)}
                </span>
                <div>
                  <p className="text-[14px] font-semibold">{a.name}</p>
                  <p className="font-mono text-[11px] text-ink-3">{a.vendor} · {a.plan}</p>
                </div>
              </div>
              <p className="mt-2 text-[14px] text-ink-2">{a.role}</p>
              <div className="mt-3 flex justify-between font-mono text-[11px]">
                <span className="text-ink-3">{copy("Efficiency")}</span>
                <span>{a.efficiency > 0 ? a.efficiency + '%' : t('Not rated', 'ยังไม่ประเมิน')}</span>
              </div>
              <ProgressBar pct={a.efficiency} variant="amber" />
              <div className="mt-3 flex justify-between">
                <span className="font-mono text-[11px] text-ink-3">{copy("Monthly cost")}</span>
                <span className="font-mono text-[14px]">{money(a.cost, a.currency)}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <TagChip tone="ai">AI · OpEx</TagChip>
                {a.started ? <span className="font-mono text-[11px] text-ink-3">since {a.started}</span> : null}
              </div>
            </div>
          ))}
        </div>
        {best ? (
          <div className="mt-4 border border-line bg-paper p-4">
            <p className="font-body text-[11px] text-ink-3">{copy("Operator read")}</p>
            <p className="mt-2 text-[14px] text-ink-2">
              {t(`${best.name} has the highest self-reported efficiency per cost; ${worst.name} has the lowest. These scores are estimates you entered.`, `${best.name} มีคะแนนประสิทธิภาพต่อค่าใช้จ่ายสูงสุด ส่วน ${worst.name} ต่ำสุด คะแนนเหล่านี้เป็นค่าประเมินที่คุณกรอก`)}
            </p>
          </div>
        ) : null}
        <Btn variant="ghost" className="mt-4" onClick={() => setAiOpen(true)}>{copy("+ Add operator")}</Btn>
      </div>

      <div>
        <SectionHead label={copy("Human staff")} meta={hum.length + ' on payroll'} />
        <DataTable>
          <thead>
            <tr className="border-b border-line bg-paper">
              <th className="p-3 font-body text-[11px] text-ink-3">{copy("Name")}</th>
              <th className="p-3 font-body text-[11px] text-ink-3">{copy("Role")}</th>
              <th className="p-3 font-body text-[11px] text-ink-3">{copy("Type")}</th>
              <th className="p-3 font-body text-[11px] text-ink-3">{copy("Started")}</th>
              <th className="p-3 text-right font-body text-[11px] text-ink-3">{copy("Salary / mo")}</th>
            </tr>
          </thead>
          <tbody>
            {hum.length ? hum.map((h) => (
              <tr key={h.id} className="border-b border-line">
                <td className="p-3">{h.name}</td>
                <td className="p-3">{h.role}</td>
                <td className="p-3"><TagChip tone="human">{copy("Human")}</TagChip></td>
                <td className="p-3">{h.started}</td>
                <td className="p-3 text-right font-mono">{money(h.salary, h.currency || store.currency)}</td>
              </tr>
            )) : (
              <tr><td colSpan={5} className="p-6 text-center text-ink-3">{copy("No human employees yet.")}</td></tr>
            )}
          </tbody>
        </DataTable>
        <Btn variant="ghost" className="mt-4" onClick={() => setHumOpen(true)}>{copy("+ Add employee")}</Btn>
      </div>

      <Modal title={copy("Add AI operator")} open={aiOpen} onClose={() => setAiOpen(false)} actions={<><Btn variant="ghost" onClick={() => setAiOpen(false)}>{copy("Cancel")}</Btn><Btn onClick={addAi}>{copy("Add")}</Btn></>}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block"><span className="font-body text-[11px] text-ink-3">{copy("Name")}</span><Input value={aiName} onChange={(e) => setAiName(e.target.value)} className="mt-2" /></label>
          <label className="block"><span className="font-body text-[11px] text-ink-3">{copy("Vendor")}</span><Input value={aiVendor} onChange={(e) => setAiVendor(e.target.value)} className="mt-2" /></label>
          <label className="block"><span className="font-body text-[11px] text-ink-3">{copy("Monthly cost")}</span><Input type="number" value={aiCostIn} onChange={(e) => setAiCostIn(e.target.value)} className="mt-2" /></label>
          <label className="block"><span className="font-body text-[11px] text-ink-3">{copy("Efficiency %")}</span><Input type="number" value={aiEff} onChange={(e) => setAiEff(e.target.value)} className="mt-2" /></label>
        </div>
      </Modal>

      <Modal title={copy("Add human employee")} open={humOpen} onClose={() => setHumOpen(false)} actions={<><Btn variant="ghost" onClick={() => setHumOpen(false)}>{copy("Cancel")}</Btn><Btn onClick={addHuman}>{copy("Add")}</Btn></>}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block"><span className="font-body text-[11px] text-ink-3">{copy("Name")}</span><Input value={humName} onChange={(e) => setHumName(e.target.value)} className="mt-2" /></label>
          <label className="block"><span className="font-body text-[11px] text-ink-3">{copy("Role")}</span><Input value={humRole} onChange={(e) => setHumRole(e.target.value)} className="mt-2" /></label>
          <label className="block sm:col-span-2"><span className="font-body text-[11px] text-ink-3">{copy("Monthly salary")}</span><Input type="number" value={humSal} onChange={(e) => setHumSal(e.target.value)} className="mt-2" /></label>
        </div>
      </Modal>
    </div>
  )
}
