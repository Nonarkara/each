import { useEffect, type ReactNode } from 'react'

interface StationProps {
  disc: string
  kicker: string
  title: string
  meta?: string
}

export function Station({ disc, kicker, title, meta }: StationProps) {
  return (
    <header className="mb-5 flex flex-col gap-2 border-b border-ink pb-2 sm:flex-row sm:items-baseline sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-ink font-display text-[18px] font-bold">
          {disc}
        </span>
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-3">{kicker}</p>
          <h2 className="font-display text-[32px] font-bold leading-tight">{title}</h2>
        </div>
      </div>
      {meta ? (
        <p className="font-mono text-[11px] uppercase tracking-[0.11em] text-ink-3">{meta}</p>
      ) : null}
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
    <div className="border border-line bg-panel p-4">
      <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.11em] text-ink-3">{label}</p>
      <p className="mt-2 font-mono text-[20px] font-medium text-ink">{value}</p>
      {sub ? <p className="mt-1 text-[14px] text-ink-2">{sub}</p> : null}
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
      <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.11em] text-ink-3">{label}</p>
      {meta ? <p className="font-mono text-[11px] text-ink-3">{meta}</p> : null}
    </div>
  )
}

interface ProgressBarProps {
  pct: number
  tall?: boolean
  variant?: 'ink' | 'amber' | 'muted'
}

export function ProgressBar({ pct, tall, variant = 'amber' }: ProgressBarProps) {
  const bg = variant === 'ink' ? 'bg-ink' : variant === 'muted' ? 'bg-ink-3' : 'bg-amber'
  return (
    <div className={`w-full bg-line ${tall ? 'h-3' : 'h-1'}`}>
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
    <div className={`flex w-full overflow-hidden bg-line ${tall ? 'h-3' : 'h-1'}`}>
      {segments.map((s, i) => (
        <div
          key={i}
          className={`h-full ${s.variant === 'ink' ? 'bg-ink' : s.variant === 'muted' ? 'bg-ink-3' : 'bg-amber'}`}
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
    default: 'border-line text-ink-2',
    amber: 'border-amber text-ink',
    human: 'border-ink text-ink',
    ai: 'border-amber bg-paper text-ink',
    capex: 'border-ink text-ink',
    opex: 'border-amber text-ink',
  }
  return (
    <span className={`inline-flex min-h-[28px] items-center border px-2 font-mono text-[11px] uppercase ${tones[tone]}`}>
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
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center overflow-y-auto overscroll-contain bg-ink/40 p-4 sm:items-center" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-lg overflow-auto border border-line-2 bg-panel">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h3 className="font-display text-[18px] font-semibold">{title}</h3>
          <button type="button" onClick={onClose} className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center border border-line px-3 text-[14px]">
            Close
          </button>
        </div>
        <div className="p-4">{children}</div>
        {actions ? <div className="flex flex-wrap gap-2 border-t border-line p-4">{actions}</div> : null}
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
    ghost: 'border-line bg-panel text-ink-2 hover:border-line-2',
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
      className={`min-h-[44px] w-full border border-line bg-panel px-3 text-[14px] text-ink outline-none focus:border-amber ${className}`}
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
      className={`min-h-[44px] w-full border border-line bg-panel px-3 text-[14px] text-ink outline-none focus:border-amber ${className}`}
      {...props}
    >
      {children}
    </select>
  )
}

export function DataTable({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto border border-line">
      <table className="w-full min-w-[480px] border-collapse text-left text-[14px]">{children}</table>
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-[14px] text-ink-3">{children}</p>
}

export function LiveDot() {
  return <span className="inline-block h-2 w-2 bg-amber" aria-hidden />
}
