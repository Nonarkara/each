import { useEffect, type ReactNode } from 'react'

interface StationProps {
  disc: string
  kicker?: string
  title: string
  meta?: string
}

/**
 * The page head. One line, one rule: the title carries the page, the optional
 * kicker and meta sit on the same baseline beside it. Nothing is pushed to a
 * far edge — an orphan "as of" on the opposite margin is spatial waste.
 */
export function Station({ disc, kicker, title, meta }: StationProps) {
  return (
    <header className="mb-5 border-b-2 border-ink pb-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="sr-only">{disc}</span>
        <h2 className="font-display text-[32px] font-bold leading-tight">{title}</h2>
        {kicker ? <span className="text-[11px] text-ink-2">{kicker}</span> : null}
        {meta ? <span className="text-[11px] text-ink-2">{meta}</span> : null}
      </div>
    </header>
  )
}

interface StatCellProps {
  label: string
  value: string
  sub?: string
}

export function StatCell({ label, value, sub }: StatCellProps) {
  return (
    <dl className="bg-panel p-4">
      <dt className="text-[14px] text-ink-2">{label}</dt>
      <dd className="mt-2 font-mono text-[14px] font-medium text-ink">{value}</dd>
      {sub ? <dd className="mt-1 text-[11px] text-ink-2">{sub}</dd> : null}
    </dl>
  )
}

interface MetricRowProps {
  label: string
  value: string
}

/** A dense label/value line: the readout of a composition, not a card. */
export function MetricRow({ label, value }: MetricRowProps) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-hairline py-1 last:border-b-0">
      <dt className="text-[11px] text-ink-2">{label}</dt>
      <dd className="font-mono text-[14px] text-ink">{value}</dd>
    </div>
  )
}

interface SectionHeadProps {
  label: string
  meta?: string
}
export function SectionHead({ label, meta }: SectionHeadProps) {
  return (
    <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
      <h3 className="text-[14px] font-semibold text-ink">{label}</h3>
      {meta ? <p className="text-[11px] text-ink-2">{meta}</p> : null}
    </div>
  )
}

interface ProgressBarProps {
  pct: number
  tall?: boolean
  variant?: 'ink' | 'amber' | 'muted'
}

export function ProgressBar({ pct, tall, variant = 'amber' }: ProgressBarProps) {
  const bg = variant === 'ink' ? 'bg-ink' : variant === 'muted' ? 'bg-ink-2' : 'bg-amber'
  return (
    <div className={`w-full bg-hairline ${tall ? 'h-3' : 'h-1'}`}>
      <div className={`${bg} h-full`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  )
}

interface StackBarProps {
  segments: { pct: number; variant: 'ink' | 'amber' | 'muted' }[]
  tall?: boolean
}

export function StackBar({ segments, tall }: StackBarProps) {
  return (
    <div className={`flex w-full overflow-hidden bg-hairline ${tall ? 'h-3' : 'h-1'}`}>
      {segments.map((s, i) => (
        <div
          key={i}
          className={`h-full ${s.variant === 'ink' ? 'bg-ink' : s.variant === 'muted' ? 'bg-ink-2' : 'bg-amber'}`}
          style={{ width: `${s.pct}%` }}
        />
      ))}
    </div>
  )
}

interface TagChipProps {
  children: ReactNode
  tone?: 'default' | 'amber' | 'human' | 'ai' | 'capex' | 'opex'
}

export function TagChip({ children, tone = 'default' }: TagChipProps) {
  const tones = {
    default: 'border-hairline text-ink-2',
    amber: 'border-amber text-ink',
    human: 'border-ink text-ink',
    ai: 'border-amber bg-paper text-ink',
    capex: 'border-ink text-ink',
    opex: 'border-amber text-ink',
  }
  return (
    <span className={`inline-flex min-h-[28px] items-center border px-2 text-[11px] ${tones[tone]}`}>
      {children}
    </span>
  )
}

interface ModalProps {
  title: string
  open: boolean
  onClose: () => void
  children: ReactNode
  actions?: ReactNode
}

export function Modal({ title, open, onClose, children, actions }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const scrollY = window.scrollY
    const prevOverflow = document.body.style.overflow
    const prevPosition = document.body.style.position
    const prevTop = document.body.style.top
    const prevWidth = document.body.style.width
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = '100%'
    return () => {
      document.body.style.overflow = prevOverflow
      document.body.style.position = prevPosition
      document.body.style.top = prevTop
      document.body.style.width = prevWidth
      window.scrollTo(0, scrollY)
    }
  }, [open])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center overflow-y-auto overscroll-contain bg-ink/40 p-4 sm:items-center" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-lg overflow-auto border border-rule bg-panel">
        <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
          <h3 className="font-display text-[14px] font-bold">{title}</h3>
          <button type="button" onClick={onClose} className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center border border-hairline px-3 text-[14px]">
            Close
          </button>
        </div>
        <div className="p-4">{children}</div>
        {actions ? <div className="flex flex-wrap gap-2 border-t border-hairline p-4">{actions}</div> : null}
      </div>
    </div>
  )
}

export function Btn({
  children,
  onClick,
  variant = 'primary',
  disabled,
  className = '',
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'ghost' | 'link'
  disabled?: boolean
  className?: string
}) {
  const styles = {
    primary: 'border-amber bg-amber text-ink hover:brightness-95',
    ghost: 'border-hairline bg-panel text-ink-2 hover:border-rule',
    link: 'border-transparent text-ink-2 underline-offset-2 hover:underline',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-[44px] items-center border px-4 text-[14px] font-semibold disabled:opacity-50 ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

export function Input({
  className = '',
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`min-h-[44px] w-full border border-hairline bg-panel px-3 text-[14px] text-ink outline-none focus:border-amber ${className}`}
      {...props}
    />
  )
}

export function Select({
  className = '',
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`min-h-[44px] w-full border border-hairline bg-panel px-3 text-[14px] text-ink outline-none focus:border-amber ${className}`}
      {...props}
    >
      {children}
    </select>
  )
}

export function DataTable({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto border border-hairline">
      <table className="w-full min-w-[480px] border-collapse text-left text-[14px]">{children}</table>
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-[14px] text-ink-2">{children}</p>
}

export function LiveDot() {
  return <span className="inline-block h-2 w-2 bg-amber" aria-hidden />
}
