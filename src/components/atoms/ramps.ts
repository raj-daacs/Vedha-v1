// atoms/ramps.ts
// ---------------------------------------------------------------------------
// Colour interpolation for the cohort matrix.
//
// WHY THESE HEX VALUES ARE DUPLICATED HERE: an SVG `fill` cannot interpolate a CSS
// custom property, and a heat cell's colour has to be computed per value. So the
// ramp endpoints are the only place in the app that restates token values. They are
// mirrored from `src/styles/tokens.css` — if a token changes, change it here too.
//
// Nothing else in the codebase should hardcode a colour.
// ---------------------------------------------------------------------------

import type { ColorScale } from '../../compose/viewModels'

type Rgb = readonly [number, number, number]

/** --accent-tint #E6F2EC */
const ACCENT_TINT: Rgb = [230, 242, 236]
/** --accent #1D9E75 */
const ACCENT: Rgb = [29, 158, 117]
/** --paper #FBFAF7 — the neutral midpoint of a divergent scale */
const PAPER: Rgb = [251, 250, 247]
/** --coral #C0483F */
const CORAL: Rgb = [192, 72, 63]

function clamp01(t: number): number {
  return Math.max(0, Math.min(1, t))
}

function lerp(from: Rgb, to: Rgb, t: number): string {
  const mix = (a: number, b: number) => Math.round(a + (b - a) * clamp01(t))
  return `rgb(${mix(from[0], to[0])},${mix(from[1], to[1])},${mix(from[2], to[2])})`
}

/**
 * The fill for one cell value.
 *
 * `sequential` runs pale accent → full accent: more is more, one direction only.
 * `divergent` runs coral → paper → accent around the midpoint, so a value sitting
 * exactly on the benchmark reads as neutral rather than as mediocre — which is the
 * whole point of an NRR matrix, where 100% is "held" and not "average".
 */
export function cellFill(value: number, scale: ColorScale): string {
  if (scale.kind === 'sequential') {
    return lerp(ACCENT_TINT, ACCENT, (value - scale.min) / (scale.max - scale.min))
  }
  if (value <= scale.midpoint) {
    return lerp(CORAL, PAPER, (value - scale.min) / (scale.midpoint - scale.min))
  }
  return lerp(PAPER, ACCENT, (value - scale.midpoint) / (scale.max - scale.midpoint))
}

/**
 * Readable text on top of a computed fill. Perceived luminance, not a threshold on
 * one channel — the coral end is dark at full saturation while the paper midpoint
 * is nearly white, and both have to stay legible.
 */
export function cellInk(fill: string): string {
  const match = fill.match(/(\d+),(\d+),(\d+)/)
  if (!match) return 'var(--ink)'
  const [r, g, b] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b
  return luminance < 150 ? 'var(--white)' : 'var(--ink-muted)'
}

/** Swatches for a legend, sampled across the scale. */
export function rampSwatches(scale: ColorScale, count = 3): string[] {
  const lo = scale.min
  const hi = scale.max
  return Array.from({ length: count }, (_, i) => cellFill(lo + ((hi - lo) * i) / (count - 1), scale))
}
