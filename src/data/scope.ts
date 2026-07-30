// scope.ts
// ---------------------------------------------------------------------------
// The display side of the scope model. `recipe_schema.ts` declares the scope
// TYPES (Altitude · WorkflowName · Output · Period) and `recipes.ts` declares the
// catalog — which workflows exist at each altitude, and each one's defaults. This
// file adds the two things a picker needs and neither of those provides:
//
//   1. the OPTION ARRAYS. `Output` and `Period` are unions in the schema with no
//      runtime value to iterate, and a picker has to render something.
//   2. the DISPLAY LABELS. The schema's ids are wire values — `quick_answer`, not
//      "Quick answer". Ids live in state; labels are the only form a screen shows.
//
// Kept out of the two handoff files on purpose: those are replaced wholesale on
// every drop from eng, so anything the prototype adds has to live beside them
// rather than inside them.
//
// This replaces the old `workspaces.ts`. What used to be here and is now gone:
// WORKSPACES / Workspace (→ the schema's WorkflowName, and the catalog's WORKFLOWS),
// LEVELS / Level (→ Altitude), and the global DEFAULT_OUTPUT / DEFAULT_PERIOD —
// those are per-workflow now (`outputDefault` / `periodDefault`), because a default
// only means anything relative to a standpoint.
// ---------------------------------------------------------------------------

import type { Altitude, Output, Period, WorkflowName } from './recipe_schema'

/** Every output, in the order the picker offers them. ALL FOUR ARE ALWAYS SELECTABLE. */
export const OUTPUTS: readonly Output[] = ['quick_answer', 'report', 'review', 'readout']

export const PERIODS: readonly Period[] = ['week', 'month', 'quarter', 'year']

/**
 * How an output reads to an operator. The schema's ids never reach a screen —
 * "never surface internal machinery" (brief §5.8) applies to `quick_answer` as much
 * as it does to a beat id.
 */
export const OUTPUT_LABELS: Record<Output, string> = {
  quick_answer: 'Quick answer',
  report: 'Report',
  review: 'Review',
  readout: 'Readout',
}

/**
 * How a period reads in a title or context label. One table so the wording lives in
 * a single place — `quarter` and `month` match the two examples in the design
 * ("Activation — last quarter", "Product engagement — this month"), which is why
 * they don't share one determiner.
 *
 * Beat questions use the bare period noun instead (`{period}` → "the quarter"), so
 * these labels are display-only.
 */
export const PERIOD_LABELS: Record<Period, string> = {
  week: 'this week',
  month: 'this month',
  quarter: 'last quarter',
  year: 'this year',
}

/**
 * Entry defaults — what the chips render before the operator touches anything.
 *
 * Only the two scope axes get a global default. Output and period are seeded from
 * whichever workflow is selected, so they are read from the catalog rather than
 * declared here; `Activation` at `Functional` reproduces the design's resting state.
 */
export const DEFAULT_ALTITUDE: Altitude = 'Functional'
export const DEFAULT_WORKFLOW: WorkflowName = 'Activation'
