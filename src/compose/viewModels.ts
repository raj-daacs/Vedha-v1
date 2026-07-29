// compose/viewModels.ts
// ---------------------------------------------------------------------------
// The Insight View's presentation contract — the atom data shapes, the panel
// union, and the ViewModel a screen renders.
//
// Kept beside models.ts rather than inside it because these are the *atom* types:
// the fixtures write them, the atoms read them, and the view only ever passes them
// through. Nothing here mentions a family. Every difference between the funnel view
// and the scorecard view is a different value in these same structures.
//
// Where the reference states a derived figure — a pass rate, an average, a
// headline — the type carries the SERIES and the atom (or the fixture helper)
// computes it. No figure is written down twice, so none can drift.
// ---------------------------------------------------------------------------

import type { SpineNode } from './models'

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

export interface SeriesPoint {
  label: string
  value: number
}

export type Unit = '%' | ''

/**
 * How a cohort matrix colours its cells.
 *
 * `sequential` — more is better, one hue ramp (activation maturation: 25 → 55%).
 * `divergent`  — a midpoint is neutral and both directions mean something
 *                (retention NRR: 100% holds, below contracts, above expands).
 */
export type ColorScale =
  | { kind: 'sequential'; min: number; max: number }
  | { kind: 'divergent'; min: number; midpoint: number; max: number }

// ---------------------------------------------------------------------------
// Atom data
// ---------------------------------------------------------------------------

export interface TrendData {
  points: SeriesPoint[]
  yTicks: number[]
  /** The line to beat. Drawn coral and dashed — a target you're under is news. */
  target?: { value: number; label: string }
  unit: Unit
}

export interface FunnelData {
  /** `reach` = share of the input population still present at this step. */
  steps: Array<{ label: string; reach: number }>
  /** Appended to the last step's pass note, e.g. "activated". */
  finalNote?: string
}

export interface RankedBarsData {
  bars: SeriesPoint[]
  /** Label template for the computed average line; "avg" if omitted. */
  averageLabel?: string
  unit: Unit
}

export interface ScorecardTile {
  value: string
  label: string
  delta?: { text: string; direction: 'up' | 'down' }
  /** The bar this tile is judged against, and whether it clears it. */
  benchmark?: { text: string; clears: boolean }
  /** Ratio tiles carry the family accent; levels stay neutral. */
  emphasis?: boolean
}

export interface ScorecardData {
  groups: Array<{ label: string; tiles: ScorecardTile[] }>
}

export interface StickinessTrendData {
  points: SeriesPoint[]
  /** The bar, drawn flat and neutral — it's a floor, not a goal. */
  benchmark: { value: number; label: string }
  yTicks: number[]
  startNote: string
  endNote: string
  unit: Unit
}

export interface NrrCurveData {
  points: SeriesPoint[]
  /** The 100% line: hold above it and the base is growing without new sales. */
  baseline: { value: number; label: string }
  yTicks: number[]
  annotations?: Array<{ pointIndex: number; text: string }>
  unit: Unit
}

export interface CohortMatrixData {
  /** One row per cohort. `null` = that period hasn't happened yet for this cohort. */
  rows: Array<{ label: string; values: Array<number | null> }>
  columnLabels: string[]
  /** "weeks since signup →" | "months since start →" */
  columnAxisLabel: string
  /** "signup wk ↓" | "cohort ↓" */
  rowAxisLabel?: string
  scale: ColorScale
  unit: Unit
  legend: { lowLabel: string; highLabel: string; unobservedLabel: string }
}

// ---------------------------------------------------------------------------
// Panels
// ---------------------------------------------------------------------------

/**
 * One rendered thing inside a section. The `atom` tag is what `<Panel>` dispatches
 * on — a renderer lookup, not a shape decision. A fixture names the atom it wants,
 * so there is never ambiguity about which component draws which data.
 */
export type PanelSpec =
  | { atom: 'trend'; label?: string; data: TrendData }
  | { atom: 'cohortMatrix'; label?: string; data: CohortMatrixData }
  | { atom: 'funnel'; label?: string; data: FunnelData }
  | { atom: 'rankedBars'; label?: string; data: RankedBarsData }
  | { atom: 'scorecard'; label?: string; data: ScorecardData }
  | { atom: 'stickinessTrend'; label?: string; data: StickinessTrendData }
  | { atom: 'nrrCurve'; label?: string; data: NrrCurveData }

export interface LegendItem {
  /** A colour swatch, or 'unobserved' for the dashed outline. */
  swatch: string | 'unobserved'
  label: string
}

/**
 * What one beat renders. Written by the fixtures, keyed by beat id.
 *
 * A beat with no BeatView doesn't appear in the view at all — which is how the
 * scorecard's two thin optional beats stay out of it without anyone asking what
 * family they belong to.
 */
export interface BeatView {
  /**
   * How the measure is defined, in the operator's words — "Activated ÷ New, per
   * weekly cohort · vs 55% target".
   *
   * Deliberately NOT `Beat.builds`. That field describes the artefact to whoever is
   * assembling it ("Trend line + headline number vs target"), which is builder's
   * language on a surface the operator reads. Brief §5.8: a recipe's business words
   * are fine, its plumbing is not.
   */
  subtitle?: string
  /**
   * The big number. Belongs to the beat, not to a chart, so it isn't an atom.
   *
   * `delta.tone` is stated rather than inferred from the sign: "8 pts below target"
   * is bad news and "5 pts above the 100% line" is good news, but plenty of metrics
   * invert that (churn, time-to-value), so the direction of a number can't decide
   * how it should read.
   */
  headline?: {
    value: string
    delta?: { text: string; tone: 'good' | 'bad' }
    note?: string
  }
  /** 1 panel → full width. 2 → split grid. Layout follows the count. */
  panels: PanelSpec[]
  legend?: LegendItem[]
  takeaway: string
}

// ---------------------------------------------------------------------------
// The view
// ---------------------------------------------------------------------------

export interface ViewSection {
  id: string
  /** "① Where we stand" · "② Why — what's driving it" */
  category: string
  question: string
  subtitle?: string
  beatView: BeatView
  /**
   * Promoted from a follow-up rather than composed from a beat. Rendered as a normal
   * section — it IS part of the view now — but says where it came from.
   */
  promoted?: boolean
}

// ---------------------------------------------------------------------------
// Deepening
// ---------------------------------------------------------------------------

/**
 * A scoped, deeper pass on one section — or on the whole view (`'root'`).
 *
 * Written by the fixtures. The real dialogue is a later skill; this phase builds the
 * container and the behaviour, so the answers are scripted.
 */
export interface DeepenAnswer {
  /** "deepen · where we stand" — business words, never the beat id. */
  scopeLabel: string
  title: string
  body: string[]
  /**
   * What promoting this answer adds to the view. Absent means it can't be promoted —
   * the root scope's answer explains how to ask, which would be nonsense as a
   * section, so it offers no "＋ Add to view".
   */
  promotedSection?: { question: string; takeaway: string }
}

export interface DeepenModel {
  scope: string
  scopeLabel: string
  title: string
  body: string[]
  /** Already on the view. Flips the tag and retires the button. */
  promoted: boolean
  canPromote: boolean
  /** "ephemeral · not in the view" | "added to the view ✓" */
  tag: string
  /** "＋ Add to view" | "Added to view ✓" */
  addLabel: string
}

export interface ViewModel {
  /** "Product engagement — this month" — from resolveTitle, same as the thread. */
  title: string
  subtitle: string
  /** "Activation workspace · funnel + cohort · last 13 weeks" */
  meta: string
  /** Computed from the rendered beats' confidence, never asserted. */
  confidence: string
  /** Empty for a state shape — the spine strip simply isn't rendered. */
  spine: SpineNode[]
  sections: ViewSection[]
}
