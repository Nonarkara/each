import { useEffect, type ReactNode } from 'react'

/**
 * EACH's components.
 *
 * The rule they all obey: a box is sized by what is inside it. No min-height,
 * no fixed height, no padding that leaves a void under short text. Padding
 * follows the type — 8px around an 11px label, 12px around a 14px value — and
 * a block that says one thing sits in a block that is one thing tall.
 *
 * The second rule: nothing is stretched to fill a row. Where blocks sit side
 * by side they are top-aligned and each keeps its own height, so the space a
 * short block leaves is the page's space, not a hole inside a box.
 */

interface StationProps {
  disc: string
  kicker?: string
  title: string
  meta?: string
}

/**
 * The page head. One line, one rule: the title carries the page, and the
 * supporting facts ride beside it on one baseline — never stacked as a column
 * of lone lines, and never pushed to the opposite margin.
 *
 * The facts are ONE string, so the head wraps as text rather than as a row of
 * items that can break and strand one of them on a line of its own. On a
 * phone the title takes its own line and the facts sit under it, attached to
 * the thing they describe.
 */
export function Station({ disc, kicker, title, meta }: StationProps) {
  const facts = [kicker, meta].filter(Boolean).join(' · ')
  return (
    <header className="mb-4 border-b-2 border-ink pb-2">
      <span className="sr-only">{disc}</span>
      <div className="grid gap-y-1 sm:grid-cols-[auto_1fr] sm:items-baseline sm:gap-x-3">
        <h1 className="font-display text-[32px] font-bold leading-tight">{title}</h1>
        {facts ? <p className="text-[11px] text-ink-2">{facts}</p> : null}
      </div>
    </header>
  )
}

interface FigureProps {
  label: string
  value: string
  note?: string
  /** The field the figure stands on. "ink" is the deep shade of the palette:
      the voice inverts, and the figure is the only thing on the page that
      wins the first look. */
  tone?: 'paper' | 'ink'
  children?: ReactNode
}

/**
 * The one bold move: a number that answers the question the page exists to
 * answer, with the evidence it stands on directly beneath it.
 *
 * On the ink field the labels are the palette's own light — there is no
 * lighter grey to mute them with, and a grey on black would be a lie about
 * contrast. Hierarchy comes from size and from the amber, which is the only
 * thing in the system that points.
 */
export function Figure({ label, value, note, tone = 'paper', children }: FigureProps) {
  const dark = tone === 'ink'
  return (
    <div className={dark ? 'bg-ink p-5 text-paper sm:p-6' : ''}>
      <p className={`text-[11px] ${dark ? 'text-paper' : 'text-ink-2'}`}>{label}</p>
      <p className={`mt-1 font-display text-[32px] font-bold leading-none ${dark ? 'text-paper' : 'text-ink'}`}>
        {value}
      </p>
      {note ? (
        <p className={`mt-2 font-mono text-[14px] ${dark ? 'text-paper' : 'text-ink-2'}`}>{note}</p>
      ) : null}
      {children}
    </div>
  )
}

interface StatProps {
  label: string
  value: string
  /** The colour this fact's share of the bar above it wears. */
  swatch?: 'ink' | 'amber' | 'muted' | 'paper'
  /** "ink" puts the fact on the deep shade. There is no lighter grey to mute
      a label with there — a grey on the deep shade would be a lie about
      contrast — so the label is the palette's own light, and the rule that
      separates two facts is that light at a fifth of its strength. */
  tone?: 'paper' | 'ink'
}

const SWATCH_CLASS: Record<string, string> = {
  ink: 'bg-ink',
  amber: 'bg-amber',
  muted: 'bg-ink-2',
  paper: 'bg-paper',
}

/**
 * A fact on one line: the label at the left, the number at the right, and
 * nothing around them. A fact that needs a box of its own is a fact that
 * was given a box it did not ask for.
 */
export function Stat({ label, value, swatch, tone = 'paper' }: StatProps) {
  const dark = tone === 'ink'
  return (
    <div
      className={`flex items-baseline justify-between gap-3 border-b py-1.5 last:border-b-0 ${
        dark ? 'border-paper/20' : 'border-hairline'
      }`}
    >
      <dt className={`flex items-center gap-2 text-[11px] ${dark ? 'text-paper' : 'text-ink-2'}`}>
        {swatch ? <span className={`inline-block h-2 w-2 ${SWATCH_CLASS[swatch]}`} aria-hidden /> : null}
        {label}
      </dt>
      <dd className={`font-mono text-[14px] ${dark ? 'text-paper' : 'text-ink'}`}>{value}</dd>
    </div>
  )
}

interface MeterSegment {
  label: string
  value: string
  pct: number
  variant: 'ink' | 'amber' | 'muted'
}

interface MeterProps {
  segments: MeterSegment[]
  /** The share of the bar each segment wears, when it differs from the
      segment's own share of the whole (revenue is a share of the funnel). */
  pctOf?: (segment: MeterSegment) => number
}

/**
 * A composition, read as one thing: the bar, and the rows that name its
 * pieces. The bar and its legend are one block, never a bar above and a list
 * below with a gap between them.
 */
export function Meter({ segments, pctOf }: MeterProps) {
  const total = segments.reduce((n, s) => n + Math.max(0, s.pct), 0) || 1
  return (
    <div>
      <div className="flex w-full overflow-hidden bg-hairline" style={{ height: 10 }}>
        {segments.map((s) => (
          <div
            key={s.label}
            className={s.variant === 'ink' ? 'bg-ink' : s.variant === 'muted' ? 'bg-ink-2' : 'bg-amber'}
            style={{ width: `${Math.max(0, Math.min(100, pctOf ? pctOf(s) : (s.pct / total) * 100))}%` }}
          />
        ))}
      </div>
      <dl className="mt-2">
        {segments.map((s) => (
          <Stat key={s.label} label={s.label} value={s.value} swatch={s.variant} />
        ))}
      </dl>
    </div>
  )
}

interface SectionHeadProps {
  label: string
  meta?: string
  action?: ReactNode
}
/**
 * A section's title row. The meta is the count, and the action belongs to the
 * section it sits in — a button stranded under the table is a scattered action.
 */
export function SectionHead({ label, meta, action }: SectionHeadProps) {
  return (
    <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="text-[14px] font-semibold text-ink">{label}</h3>
        {meta ? <p className="text-[11px] text-ink-2">{meta}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
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
  /** "paper" is the ground's own light: a bar that stands on the deep shade
      needs a segment the deep shade can be read against. */
  segments: { pct: number; variant: 'ink' | 'amber' | 'muted' | 'paper' }[]
  tall?: boolean
}

export function StackBar({ segments, tall }: StackBarProps) {
  return (
    <div className={`flex w-full overflow-hidden bg-hairline ${tall ? 'h-3' : 'h-1'}`}>
      {segments.map((s, i) => (
        <div
          key={i}
          className={`h-full ${s.variant === 'ink' ? 'bg-ink' : s.variant === 'muted' ? 'bg-ink-2' : s.variant === 'paper' ? 'bg-paper' : 'bg-amber'}`}
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
    <span className={`inline-flex items-center border px-2 py-0.5 text-[11px] ${tones[tone]}`}>
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
      className={`inline-flex min-h-[44px] items-center border px-3 text-[14px] font-semibold disabled:opacity-50 ${styles[variant]} ${className}`}
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

export function DataTable({ children, minWidth = 480 }: { children: ReactNode; minWidth?: number }) {
  return (
    <div className="overflow-x-auto border border-hairline">
      <table className="w-full border-collapse text-left text-[14px]" style={{ minWidth }}>
        {children}
      </table>
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-4 text-[14px] text-ink-2">{children}</p>
}

export function LiveDot() {
  return <span className="inline-block h-2 w-2 bg-amber" aria-hidden />
}
