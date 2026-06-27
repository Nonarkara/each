import type { ModuleId } from '../lib/types'

interface ModulePlaceholderProps {
  moduleId: ModuleId
  title: string
  kicker: string
  body: string
}

export function ModulePlaceholder({ moduleId, title, kicker, body }: ModulePlaceholderProps) {
  return (
    <section aria-labelledby={`${moduleId}-heading`}>
      <header className="mb-5 flex flex-col gap-2 border-b border-ink pb-2 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-3">
            {kicker}
          </p>
          <h2 id={`${moduleId}-heading`} className="font-display text-[32px] font-bold leading-tight">
            {title}
          </h2>
        </div>
        <p className="font-mono text-[11px] uppercase tracking-[0.11em] text-ink-3">
          Phase 0 shell · data shim
        </p>
      </header>

      <div className="grid gap-px border border-line bg-line lg:grid-cols-3">
        <div className="bg-panel p-4 lg:col-span-2">
          <p className="text-[14px] leading-relaxed text-ink-2">{body}</p>
          <p className="mt-4 text-[14px] text-ink-3">
            Carried forward from CRM2 prototype: local persistence, hairline grids, cockpit routing,
            and a Frappe-ready data shim. Module UI lands in Phase 0.5.
          </p>
        </div>
        <div className="bg-panel p-4">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-3">
            Status
          </p>
          <p className="mt-2 font-mono text-[20px] font-medium text-amber">Scaffolded</p>
          <p className="mt-2 text-[14px] text-ink-2">Awaiting port from CRM2/{moduleId} logic.</p>
        </div>
      </div>
    </section>
  )
}
