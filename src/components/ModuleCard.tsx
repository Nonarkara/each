import type { ModuleMeta } from '../lib/types'

interface ModuleCardProps {
  module: ModuleMeta
  active?: boolean
  onSelect?: () => void
}

export function ModuleCard({ module, active, onSelect }: ModuleCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        'min-h-[44px] w-full border border-line bg-panel p-4 text-left transition-colors',
        active ? 'border-amber' : 'hover:border-line-2',
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        <span
          className={[
            'flex h-11 w-11 shrink-0 items-center justify-center border font-display text-lg font-semibold',
            active ? 'border-amber text-amber' : 'border-line-2 text-ink',
          ].join(' ')}
          aria-hidden
        >
          {module.letter}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-ink-3">
            {module.kicker}
          </p>
          <h3 className="font-display text-[18px] font-semibold leading-tight text-ink">
            {module.label}
          </h3>
          <p className="mt-1 text-[14px] text-ink-2">{module.tagline}</p>
          <p className="mt-2 text-[14px] leading-snug text-ink-2">{module.summary}</p>
        </div>
      </div>
    </button>
  )
}
