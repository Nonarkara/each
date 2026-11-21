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

  // The book, split three ways. The shares are of the whole book, so a fat
  // collected bar and a fat expected bar cannot both be true.
  const bookTotal = Math.max(1, fin.receivedRevenue + fin.outstanding + fin.expectedPipeline)
  const bookPct = {
    collected: (fin.receivedRevenue / bookTotal) * 100,
    owed: (fin.outstanding / bookTotal) * 100,
    expected: (fin.expectedPipeline / bookTotal) * 100,
  }

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

      {/* The letterhead: the name, the two facts that place it, and the one
          action the document is read for. No box — a document's masthead is
          its type, not its container. The export action stands on the
          letterhead, so a reader on a phone is not a screen away from it. */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b-2 border-ink pb-3">
        <div className="min-w-0">
          <p className="font-display text-[32px] font-semibold leading-tight">
            {company?.legalName || store.companyName || '—'}
          </p>
          <p className="mt-1 text-[11px] text-ink-2">
            {(company?.industry ? company.industry + ' · ' : '') + (company?.country || '')}
          </p>
        </div>
        <Btn onClick={() => window.print()}>{copy("Print dossier")}</Btn>
      </div>

      {/* The verdict of the document, on its own line across the measure. It
          is the one sentence that asks the reader to do something, so it is
          the one thing on the page that points. */}
      <p className="mb-6 border-l-2 border-amber pl-3 text-[14px] font-semibold">
        {fin.runwayMonths < 6
          ? 'Burn exceeds the safe line. Raise or cut. Silence is not a plan.'
          : 'Spend is disciplined. No line here needs attention.'}
      </p>

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

      {/* The reading matter, and the two compositions it rests on. The prose
          column is sized to the measure a human reads at, so the column is
          not left with a hole under a paragraph that stops short; the two
          compositions fill the column beside it, so neither side of the page
          is a column with a hole at its foot. */}
      <div className="mb-6 grid items-start gap-x-8 gap-y-6 lg:grid-cols-[minmax(0,52ch)_minmax(0,1fr)]">
        <div className="space-y-3 text-[14px] leading-relaxed text-ink-2">
          <p>
            Monthly burn runs at {money(fin.monthlyBurn, fin.cur)}. Every figure in this dossier is measured
            from the books, not modelled from a plan.
          </p>
          <p>
            Revenue is contracted rather than hoped for. The pipeline beyond it is weighted by tier — a
            tier-one prospect counts whole, a tier-three a quarter — and the split of the book is measured
            at right.
          </p>
          <p>
            Capital efficiency over headcount: the cost line is people, and the tools they work with.
          </p>
        </div>
        <div className="min-w-0">
          <SectionHead label={copy("Spend allocation")} />
          <Meter
            segments={[
              { label: copy("CapEx"), value: Math.round(fin.capexShare * 100) + '%', pct: fin.capexShare * 100, variant: 'ink' },
              { label: copy("OpEx"), value: Math.round(fin.opexShare * 100) + '%', pct: fin.opexShare * 100, variant: 'amber' },
            ]}
          />
          <div className="mt-6">
            <SectionHead label={copy("The book")} />
            <Meter
              segments={[
                { label: copy("Collected"), value: money(fin.receivedRevenue, fin.cur), pct: bookPct.collected, variant: 'ink' },
                { label: copy("Owed"), value: money(fin.outstanding, fin.cur), pct: bookPct.owed, variant: 'amber' },
                { label: copy("Expected"), value: money(fin.expectedPipeline, fin.cur), pct: bookPct.expected, variant: 'muted' },
              ]}
            />
          </div>
          <div className="mt-6">
            <SectionHead label={copy("People")} />
            <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
              <span className="flex items-baseline gap-2">
                <span className="text-[11px] text-ink-2">{copy("AI operators")}</span>
                <span className="font-mono text-[14px]">{store.aiEmployees.length}</span>
              </span>
              <span className="flex items-baseline gap-2">
                <span className="text-[11px] text-ink-2">{copy("Human staff")}</span>
                <span className="font-mono text-[14px]">{store.employees.length}</span>
              </span>
            </div>
          </div>
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
        <span className="text-[11px] text-ink-2">Provenance: prototype state, {store.asOf}</span>
      </div>
    </div>
  )
}
