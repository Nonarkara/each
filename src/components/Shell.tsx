import type { ReactNode } from 'react'
import { MODULES } from '../lib/types'
import { Btn } from './ui/Axiom'

interface ShellProps {
  companyName?: string
  activeModule?: string
  onNavigate?: (id: string) => void
  onReset?: () => void
  onDossier?: () => void
  onExport?: () => void
  onSheets?: () => void
  onImport?: () => void
  onSheetsSetup?: () => void
  syncLabel?: string
  syncStatus?: 'local' | 'loading' | 'saving' | 'saved' | 'error'
  vitals?: { cash: string; runway: string; runwayRisk?: boolean }
  children: ReactNode
}

export function Shell({
  companyName,
  activeModule,
  onNavigate,
  onReset,
  onDossier,
  onExport,
  onSheets,
  onImport,
  onSheetsSetup,
  syncLabel,
  syncStatus = 'local',
  vitals,
  children,
}: ShellProps) {
  const dotClass =
    syncStatus === 'saved'
      ? 'bg-amber'
      : syncStatus === 'error'
        ? 'bg-red-600'
        : syncStatus === 'saving' || syncStatus === 'loading'
          ? 'bg-ink-3'
          : 'bg-ink-3'
  return (
    <div>
      <header className="sticky top-0 z-50 border-b border-line-2 bg-paper">
        <div className="mx-auto flex max-w-[1360px] flex-col gap-3 px-4 py-3 lg:px-[22px]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <span
                className="flex h-11 w-11 items-center justify-center border border-amber font-display text-lg font-bold text-amber"
                aria-hidden
              >
                E
              </span>
              <div>
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-ink">EACH</p>
                <p className="font-mono text-[11px] uppercase tracking-[0.11em] text-ink-3">
                  {companyName || 'Startup / SME'}
                </p>
              </div>
            </div>

            {vitals ? (
              <div className="flex flex-wrap items-center gap-4 sm:ml-6">
                <div>
                  <p className="font-mono text-[11px] uppercase text-ink-3">Cash</p>
                  <p className="font-mono text-[14px] font-medium">{vitals.cash}</p>
                </div>
                <div>
                  <p className="font-mono text-[11px] uppercase text-ink-3">Runway</p>
                  <p className={`font-mono text-[14px] font-medium ${vitals.runwayRisk ? 'text-amber' : ''}`}>{vitals.runway}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-block h-2 w-2 ${dotClass}`} aria-hidden />
                  <span className="font-mono text-[11px] uppercase text-ink-3">{syncLabel || 'Local only'}</span>
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2 sm:ml-auto">
              {onExport ? (
                <Btn variant="ghost" onClick={onExport}>Export</Btn>
              ) : null}
              {onSheets ? (
                <Btn variant="ghost" onClick={onSheets}>Sheets</Btn>
              ) : null}
              {onImport ? (
                <Btn variant="ghost" onClick={onImport}>Import</Btn>
              ) : null}
              {onSheetsSetup ? (
                <Btn variant="ghost" onClick={onSheetsSetup}>Sheet URL</Btn>
              ) : null}
              {onDossier ? (
                <Btn variant="ghost" onClick={onDossier}>Dossier</Btn>
              ) : null}
              {onReset ? (
                <Btn variant="ghost" onClick={onReset}>Reset</Btn>
              ) : null}
            </div>
          </div>

          <nav className="flex flex-wrap gap-1" aria-label="Modules">
            {MODULES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => onNavigate?.(m.id)}
                className={[
                  'inline-flex min-h-[44px] min-w-[44px] items-center gap-2 border px-3 font-body text-[14px] font-semibold',
                  activeModule === m.id
                    ? 'border-amber bg-panel text-ink'
                    : 'border-transparent text-ink-2 hover:border-line hover:bg-panel',
                ].join(' ')}
              >
                <span className="font-mono text-[11px]">{m.letter}</span>
                <span className="hidden sm:inline">{m.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1360px] px-4 py-5 sm:px-[22px] sm:py-[22px]">
        {children}
      </main>
    </div>
  )
}
