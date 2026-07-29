// atoms/svgScale.ts
// ---------------------------------------------------------------------------
// The small amount of maths every line chart needs. Shared by Trend,
// StickinessTrend and NrrCurve so the three don't each grow their own copy.
//
// All charts here are hand-rolled SVG on a fixed viewBox and scale with the
// container, so everything below works in viewBox units.
// ---------------------------------------------------------------------------

import type { SeriesPoint, Unit } from '../../compose/viewModels'

export interface VerticalScale {
  /** Value → y in viewBox units. */
  y: (value: number) => number
  min: number
  max: number
}

/**
 * Build a value→y mapping from the tick labels the fixture chose.
 *
 * Taking the domain from the ticks rather than from the data means the axis is
 * always fully labelled and the series never runs off the top — the fixture author
 * decides the frame, which is what makes two charts comparable.
 * `pad` leaves room below the lowest tick so a line sitting on the floor is visible.
 */
export function verticalScale(
  yTicks: number[],
  top: number,
  bottom: number,
  extraDomain: number[] = [],
): VerticalScale {
  const values = [...yTicks, ...extraDomain]
  const max = Math.max(...values)
  const min = Math.min(...values)
  const span = max - min || 1
  return {
    min,
    max,
    y: (value: number) => bottom - ((value - min) / span) * (bottom - top),
  }
}

/** Evenly spaced x positions for a series, first point on `left`, last on `right`. */
export function horizontalPositions(count: number, left: number, right: number): number[] {
  if (count <= 1) return [left]
  const step = (right - left) / (count - 1)
  return Array.from({ length: count }, (_, i) => left + i * step)
}

export function polylinePoints(xs: number[], ys: number[]): string {
  return xs.map((x, i) => `${round(x)},${round(ys[i])}`).join(' ')
}

/** A closed path under the line, for an area fill. */
export function areaPath(xs: number[], ys: number[], floor: number): string {
  const line = xs.map((x, i) => `${round(x)},${round(ys[i])}`).join(' L')
  return `M${line} L${round(xs[xs.length - 1])},${floor} L${round(xs[0])},${floor} Z`
}

export function formatValue(value: number, unit: Unit): string {
  // One decimal only when the value actually has one — "24%" beats "24.0%".
  const shown = Number.isInteger(value) ? String(value) : value.toFixed(1)
  return `${shown}${unit}`
}

/** First, middle and last labels — enough to orient a series without crowding it. */
export function edgeLabels(points: SeriesPoint[]): Array<{ index: number; label: string }> {
  if (points.length === 0) return []
  if (points.length <= 2) return points.map((p, index) => ({ index, label: p.label }))
  const middle = Math.floor((points.length - 1) / 2)
  return [
    { index: 0, label: points[0].label },
    { index: middle, label: points[middle].label },
    { index: points.length - 1, label: points[points.length - 1].label },
  ]
}

export function mean(values: number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length
}

function round(n: number): number {
  return Math.round(n * 10) / 10
}
