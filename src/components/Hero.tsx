interface HeroProps {
  onEnter?: () => void
}

export function Hero({ onEnter }: HeroProps) {
  return (
    <section className="grid gap-6 lg:grid-cols-[1.618fr_1fr] lg:gap-[22px]">
      <div className="border border-hairline bg-panel p-5 sm:p-6">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-2">
          Dr Non&apos;s No-Brainer Complete Startup / SME Management Tool
        </p>
        <h1 className="mt-3 font-display text-[32px] font-bold leading-[1.05] tracking-tight text-ink">
          Every piece of your startup, unified.
        </h1>
        <p className="mt-4 max-w-[52ch] text-[14px] leading-relaxed text-ink-2">
          EACH rearranges ERP, ACT, CRM, and HR into one word founders can spell, share, and
          remember. One login. One spine. Every metric that matters — without the four-app chaos.
        </p>
        <p className="mt-3 font-display text-[14px] font-bold text-ink">
          One system. Every metric. Zero chaos.
        </p>
        {onEnter ? (
          <button
            type="button"
            onClick={onEnter}
            className="mt-6 inline-flex min-h-[44px] items-center border border-amber bg-amber px-5 font-body text-[14px] font-semibold text-ink hover:brightness-95"
          >
            Create your workspace
          </button>
        ) : null}
      </div>

      {/* The four modules as lines, the same grammar the sign-in uses: a
          letter, a name, a line. Four big letters would be four heroes
          competing with the statement that is supposed to win. */}
      <div className="border-t border-hairline">
        {[
          { letter: 'E', name: 'ERP', desc: 'Finance · inventory · operations' },
          { letter: 'A', name: 'ACT', desc: 'Accounting · invoicing · actions' },
          { letter: 'C', name: 'CRM', desc: 'Customers · pipeline · deals' },
          { letter: 'H', name: 'HR', desc: 'People · payroll · leave' },
        ].map((item) => (
          <div key={item.letter} className="flex items-baseline gap-4 border-b border-hairline py-3">
            <span className="font-display text-[14px] font-bold text-ink-2">{item.letter}</span>
            <span className="font-display text-[14px] font-bold">{item.name}</span>
            <span className="text-[14px] text-ink-2">{item.desc}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
