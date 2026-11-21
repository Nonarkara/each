/**
 * COLOUR MATHS.
 *
 * The palette is a closed set of seven role tokens. The system still has to
 * be able to grow — a shade of a neutral, a light of the accent — without
 * becoming a different palette. That growth is only safe if it is MEASURED
 * rather than asserted, so the arithmetic lives here: what a tone is made of,
 * and what contrast it earns on each ground.
 *
 * Nothing in this file decides anything. It only computes, so that the
 * design screen can show a number instead of an opinion.
 */

export interface Rgb {
  r: number
  g: number
  b: number
}

/** #rrggbb → {r,g,b} in 0–255. */
export function hexToRgb(hex: string): Rgb {
  const h = hex.trim().replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(h)) {
    throw new Error(`not a six-digit hex colour: ${hex}`)
  }
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  }
}

const toHex = (n: number) =>
  Math.round(Math.max(0, Math.min(255, n)))
    .toString(16)
    .padStart(2, '0')

/**
 * Mix one colour toward another.
 *
 * amount = 0 keeps `from`, amount = 1 gives `to`. A SHADE of a colour is a
 * mix toward ink; a LIGHT of a colour is a mix toward paper. That is the
 * whole grammar of growth in this palette: value moves, hue does not.
 */
export function mix(from: string, to: string, amount: number): string {
  const a = hexToRgb(from)
  const b = hexToRgb(to)
  const t = Math.max(0, Math.min(1, amount))
  return (
    '#' +
    toHex(a.r + (b.r - a.r) * t) +
    toHex(a.g + (b.g - a.g) * t) +
    toHex(a.b + (b.b - a.b) * t)
  )
}

/** The relative luminance of a colour, as WCAG defines it. */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex)
  const channel = (v: number) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/** The contrast ratio between two colours, from 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const light = Math.max(la, lb)
  const dark = Math.min(la, lb)
  return (light + 0.05) / (dark + 0.05)
}

/**
 * What a measured contrast earns a tone the right to do.
 *
 * body    — text at any size (4.5:1)
 * large   — a number at 32px, a rule, an edge (3:1)
 * fill    — a ground or a wash, never text (1.5:1)
 * none    — nothing: the tone is not admitted on this ground
 */
export type Admission = 'body' | 'large' | 'fill' | 'none'

export function admit(ratio: number): Admission {
  if (ratio >= 4.5) return 'body'
  if (ratio >= 3) return 'large'
  if (ratio >= 1.5) return 'fill'
  return 'none'
}

/** A ratio, written the way a reader reads it: one decimal, or two when it
 *  is close to a threshold and the difference matters. */
export function formatRatio(ratio: number): string {
  return ratio.toFixed(ratio >= 10 ? 1 : 2) + ':1'
}
