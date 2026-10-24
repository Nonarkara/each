import { useCopy } from "../../lib/copy"
import { calcFinance } from '../../lib/calc'
import { money } from '../../lib/format'
import type { EachStore } from '../../lib/types'
import { Btn, Meter, SectionHead, Stat, Station } from '../../components/ui/Axiom'

interface DossierViewProps {
  store: EachStore
}

/**
 * The investor dossier is a document, so it is laid out like one: a masthead,
 * a rule, the facts in two columns of lines, and the reading matter capped to
 * a measure a human can read. It is the one surface that says the money facts
 * in full — so the workspace band does not repeat them here.
 */
export function DossierView({ store }: DossierViewProps) {
  const copy = useCopy()
  const fin = calcFinance(store)
  const company = store.company

  const order: Record<string, number> = { backlog: 0, doing: 1, review: 2, done: 3 }
  const rows = store.projects.slice().sort((a, b) => order[a.status] - order[b.status])

  return (
    /* A document has a measure and a margin. The whole dossier is held to
       one width so its letterhead, its facts, its reading matter and its
       table all end on the same line. */
    <div className="max-w-[1200px]">
      <Station
        disc="I"
        kicker={'EXPORT · FY' + new Date().getFullYear()}
        title={copy("Investor dossier")}
        meta={'As of ' + store.asOf}
      />

      {/* The letterhead: the name, and the two facts that place it. No box —
          a document's masthead is its type, not its container. */}
      <div className="mb-6 border-b-2 border-ink pb-3">
        <p className="font-display text-[32px] font-semibold leading-tight">
          {company?.legalName || store.companyName || '—'}
        </p>
        <p className="mt-1 text-[11px] text-ink-2">
          {(company?.industry ? company.industry + ' · ' : '') + (company?.country || '')}
        </p>
      </div>

      {/* Four facts, one row of columns. A number on a line, with the
          evidence it rests on beside it — not four boxes of the same size. */}
      <div className="mb-6 grid gap-x-6 sm:grid-cols-2 lg:grid-cols-4">
        <dl>
          <Stat label={copy("Cash on hand")} value={money(fin.cash, fin.cur)} />
        </dl>
        <dl>
          <Stat label={copy("Founding capital")} value={money(fin.founding, fin.cur)} />
        </dl>
        <dl>
          <Stat label={copy("Contracted revenue")} value={money(fin.contractedRevenue, fin.cur)} />
        </dl>
        <dl>
          <Stat label={copy("Runway")} value={fin.runwayMonths + ' months'} />
        </dl>
      </div>

      {/* The reading matter, and the one composition it rests on. The prose
          column is sized to the measure a human reads at, so the column is
          not left with a hole under a paragraph that stops short. */}
      <div className="mb-6 grid items-start gap-x-8 gap-y-6 lg:grid-cols-[minmax(0,62ch)_minmax(0,1fr)]">
        <div className="space-y-3 text-[14px] leading-relaxed text-ink-2">
          <p>The company holds {money(fin.cash, fin.cur)} against a monthly burn of {money(fin.monthlyBurn, fin.cur)}. Runway reads {fin.runwayMonths} months at current spend.</p>
          <p>Revenue: {money(fin.contractedRevenue, fin.cur)} contracted ({money(fin.receivedRevenue, fin.cur)} received), {money(fin.expectedPipeline, fin.cur)} expected pipeline. The book stands at {money(fin.contractedRevenue + fin.pipelineRevenue, fin.cur)}.</p>
          <p>Capital efficiency over headcount. {store.aiEmployees.length} AI operators and {store.employees.length} human staff. OpEx {Math.round(fin.opexShare * 100)}% of spend, CapEx {Math.round(fin.capexShare * 100)}%.</p>
          <p>{fin.runwayMonths < 6 ? 'Burn exceeds the safe line. Raise or cut. Silence is not a plan.' : 'Spend is disciplined. The absence of red is the good news.'}</p>
        </div>
        <div>
          <SectionHead label={copy("Spend allocation")} />
          <Meter
            segments={[
              { label: copy("CapEx"), value: Math.round(fin.capexShare * 100) + '%', pct: fin.capexShare * 100, variant: 'ink' },
              { label: copy("OpEx"), value: Math.round(fin.opexShare * 100) + '%', pct: fin.opexShare * 100, variant: 'amber' },
            ]}
          />
        </div>
      </div>

      <SectionHead label={copy("Projects in flight")} meta={store.projects.length + ' total'} />
      <div className="overflow-x-auto border border-hairline">
        <table className="w-full min-w-[480px] text-left text-[14px]">
          <thead>
            <tr className="border-b border-hairline bg-paper">
              <th className="px-3 py-2 font-body text-[11px] text-ink-2">{copy("Project")}</th>
              <th className="px-3 py-2 font-body text-[11px] text-ink-2">{copy("Status")}</th>
              <th className="px-3 py-2 font-body text-[11px] text-ink-2">{copy("Owner")}</th>
              <th className="px-3 py-2 text-right font-body text-[11px] text-ink-2">{copy("Tasks")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const done = (p.checklist || []).filter((c) => c.done).length
              const tot = (p.checklist || []).length
              return (
                <tr key={p.id} className="border-b border-hairline">
                  <td className="px-3 py-2">{p.title}</td>
                  <td className="px-3 py-2">{p.status.toUpperCase()}</td>
                  <td className="px-3 py-2">{p.owner}</td>
                  <td className="px-3 py-2 text-right font-mono">{done}/{tot}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Btn onClick={() => window.print()}>{copy("Print dossier")}</Btn>
        <span className="text-[11px] text-ink-2">Provenance: prototype state, {store.asOf}</span>
      </div>
    </div>
  )
}
