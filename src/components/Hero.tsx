interface HeroProps {
  onEnter?: () => void
}

export function Hero({ onEnter }: HeroProps) {
  return (
    <section className="grid gap-6 lg:grid-cols-[1.618fr_1fr] lg:gap-[22px]">
      <div className="border border-line bg-panel p-5 sm:p-6">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-3">
          Dr Non&apos;s No-Brainer Complete Startup / SME Management Tool
        </p>
        <h1 className="mt-3 font-display text-[32px] font-bold leading-[1.05] tracking-tight text-ink sm:text-[36px]">
          Every piece of your startup, unified.
        </h1>
        <p className="mt-4 max-w-[52ch] text-[14px] leading-relaxed text-ink-2">
          EACH rearranges ERP, ACT, CRM, and HR into one word founders can spell, share, and
          remember. One login. One spine. Every metric that matters — without the four-app chaos.
        </p>
        <p className="mt-3 font-display text-[18px] font-semibold text-amber">
          One system. Every metric. Zero chaos.
        </p>
        {onEnter ? (
          <button
            type="button"
            onClick={onEnter}
            className="mt-6 inline-flex min-h-[44px] items-center border border-amber bg-amber px-5 font-body text-[14px] font-semibold text-ink hover:brightness-95"
          >
            Enter prototype
          </button>
        ) : null}
      </div>

      <div className="grid gap-px border border-line bg-line sm:grid-cols-2">
        {[
          { letter: 'E', name: 'ERP', desc: 'Finance · inventory · operations' },
          { letter: 'A', name: 'ACT', desc: 'Accounting · invoicing · actions' },
          { letter: 'C', name: 'CRM', desc: 'Customers · pipeline · deals' },
          { letter: 'H', name: 'HR', desc: 'People · payroll · leave' },
        ].map((item) => (
          <div key={item.letter} className="bg-panel p-4">
            <span className="font-display text-[24px] font-bold text-amber">{item.letter}</span>
            <p className="mt-2 font-display text-[18px] font-semibold">{item.name}</p>
            <p className="mt-1 text-[14px] text-ink-2">{item.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
