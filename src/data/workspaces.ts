// workspaces.ts
// ---------------------------------------------------------------------------
// The context dimensions the operator sets before (or while) asking.
// The five workspaces are the business, per the design brief §2 — they are
// CANONICAL and closed. "Product" is not a sixth workspace; where the design
// heads a scorecard "Product engagement", that's `Recipe.displayLabel` doing
// the talking while the workspace stays Activation.
// ---------------------------------------------------------------------------

export const WORKSPACES = [
  'Acquisition',
  'Activation',
  'Retention',
  'Expansion',
  'Monetisation',
] as const
export type Workspace = (typeof WORKSPACES)[number]

/** Altitude. The brief's riskiest element — "be ready to let it recede." */
export const LEVELS = ['company', 'workspace'] as const
export type Level = (typeof LEVELS)[number]

/**
 * The shape of the answer.
 *
 * SOURCE DISCREPANCY: the design's Entry chip reads "Output: Report", while its
 * picker lists "quick answer · review · readout". Both strings are in the same
 * file. All four are kept here and the default is 'Report' so the rendered chip
 * matches the design exactly. Worth settling when the Output selector goes live.
 */
export const OUTPUTS = ['Report', 'Quick answer', 'Review', 'Readout'] as const
export type Output = (typeof OUTPUTS)[number]

export const PERIODS = ['week', 'month', 'quarter', 'year'] as const
export type Period = (typeof PERIODS)[number]

/**
 * How a period reads in a title or context label. One table so the wording lives
 * in a single place — `quarter` and `month` match the two examples in the design
 * ("Activation — last quarter", "Product engagement — this month"), which is why
 * they don't share one determiner.
 *
 * Beat questions use the bare period noun instead (`{period}` → "the quarter"),
 * so these labels are display-only.
 */
export const PERIOD_LABELS: Record<Period, string> = {
  week: 'this week',
  month: 'this month',
  quarter: 'last quarter',
  year: 'this year',
}

/** What the picker shows on the right of each non-workspace row. */
export const PICKER_HINTS = {
  Level: LEVELS.join(' · '),
  Output: 'quick answer · review · readout',
  Period: PERIODS.join(' · '),
} as const

/** Entry defaults — these are what the design's chips render at rest. */
export const DEFAULT_WORKSPACE: Workspace = 'Activation'
export const DEFAULT_LEVEL: Level = 'workspace'
export const DEFAULT_OUTPUT: Output = 'Report'
export const DEFAULT_PERIOD: Period = 'quarter'
