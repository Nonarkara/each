import { calcFinance } from '../../lib/calc'
import { money } from '../../lib/format'
import type { EachStore } from '../../lib/types'
import { Btn, SectionHead, StackBar, StatCell, Station, TagChip } from '../../components/ui/Axiom'

interface DossierViewProps {
  store: EachStore
}

export function DossierView({ store }: DossierViewProps) {
  const fin = calcFinance(store)
  const company = store.company

  const order: Record<string, number> = { backlog: 0, doing: 1, review: 2, done: 3 }
  const rows = store.projects.slice().sort((a, b) => order[a.status] - order[b.status])

  return (
    <div>
      <Station disc="I" kicker={'EXPORT · FY' + new Date().getFullYear()} title="Investor dossier" meta={'As of ' + store.asOf} />

      <div className="mb-6 border border-line bg-panel p-5">
        <TagChip tone="amber">DOSSIER</TagChip>
        <p className="mt-3 font-display text-[24px] font-semibold">{company?.legalName || store.companyName || '—'}</p>
        <p className="mt-1 text-[14px] text-ink-2">
          {(company?.industry ? company.industry + ' · ' : '') + (company?.country || '')}
        </p>
      </div>

      <div className="mb-6 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        <StatCell label="Cash on hand" value={money(fin.cash, fin.cur)} sub={'After ' + store.expenses.length + ' txns'} />
        <StatCell label="Founding capital" value={money(fin.founding, fin.cur)} sub={store.foundingCapital.length + ' entries'} />
        <StatCell label="Contracted revenue" value={money(fin.contractedRevenue, fin.cur)} sub={fin.commissionedCount + ' commissioned'} />
        <StatCell label="Runway" value={fin.runwayMonths + ' months'} sub="At current burn" />
      </div>

      <div className="mb-6 grid gap-px border border-line bg-line lg:grid-cols-[1.618fr_1fr]">
        <div className="space-y-4 bg-panel p-5 text-[14px] leading-relaxed text-ink-2">
          <p>The company holds {money(fin.cash, fin.cur)} against a monthly burn of {money(fin.monthlyBurn, fin.cur)}. Runway reads {fin.runwayMonths} months at current spend.</p>
          <p>Revenue: {money(fin.contractedRevenue, fin.cur)} contracted ({money(fin.receivedRevenue, fin.cur)} received), {money(fin.expectedPipeline, fin.cur)} expected pipeline. The book stands at {money(fin.contractedRevenue + fin.pipelineRevenue, fin.cur)}.</p>
          <p>Capital efficiency over headcount. {store.aiEmployees.length} AI operators and {store.employees.length} human staff. OpEx {Math.round(fin.opexShare * 100)}% of spend, CapEx {Math.round(fin.capexShare * 100)}%.</p>
          <p>{fin.runwayMonths < 6 ? 'Burn exceeds the safe line. Raise or cut. Silence is not a plan.' : 'Spend is disciplined. The absence of red is the good news.'}</p>
        </div>
        <div className="bg-panel p-5">
          <SectionHead label="Spend allocation" />
          <StackBar segments={[{ pct: fin.capexShare * 100, variant: 'ink' }, { pct: fin.opexShare * 100, variant: 'amber' }]} />
          <div className="mt-2 flex justify-between font-mono text-[11px] text-ink-3">
            <span>CapEx {Math.round(fin.capexShare * 100)}%</span>
            <span>OpEx {Math.round(fin.opexShare * 100)}%</span>
          </div>
        </div>
      </div>

      <SectionHead label="Projects in flight" meta={store.projects.length + ' total'} />
      <div className="overflow-x-auto border border-line">
        <table className="w-full min-w-[480px] text-left text-[14px]">
          <thead>
            <tr className="border-b border-line bg-paper">
              <th className="p-3 font-mono text-[11px] uppercase text-ink-3">Project</th>
              <th className="p-3 font-mono text-[11px] uppercase text-ink-3">Status</th>
              <th className="p-3 font-mono text-[11px] uppercase text-ink-3">Owner</th>
              <th className="p-3 text-right font-mono text-[11px] uppercase text-ink-3">Tasks</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const done = (p.checklist || []).filter((c) => c.done).length
              const tot = (p.checklist || []).length
              return (
                <tr key={p.id} className="border-b border-line">
                  <td className="p-3">{p.title}</td>
                  <td className="p-3">{p.status.toUpperCase()}</td>
                  <td className="p-3">{p.owner}</td>
                  <td className="p-3 text-right font-mono">{done}/{tot}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Btn onClick={() => window.print()}>Print dossier</Btn>
        <span className="text-[14px] text-ink-3">Provenance: prototype state, {store.asOf}</span>
      </div>
    </div>
  )
}
