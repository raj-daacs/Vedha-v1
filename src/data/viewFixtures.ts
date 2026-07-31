// data/viewFixtures.ts
// ---------------------------------------------------------------------------
// The illustrative data behind the rendered Insight Views.
//
// Keyed by `${workflow}:${recipeId}` — the same pair the header, the context pill
// and the family colour all derive from. That's deliberate: a recipe can be a full
// view in one workflow and plan-deep in another (the cohort shape renders on
// Retention, but not yet on Activation), and one key expresses that without a flag.
//
// NO KEY ⇒ PLAN-DEEP. A missing entry is how a recipe gets the honest "full view
// rolling out" placeholder. There is no list of built views to keep in sync.
//
// FIGURES ARE COMPUTED, NOT RESTATED. Everything the reference presents as derived —
// pass rates, averages, the headline, the DAU/MAU ratio, the trough — is calculated
// here from a single series, so no two numbers in a view can disagree. Where the
// reference and the arithmetic differed, the arithmetic won.
// ---------------------------------------------------------------------------

import type {
  BeatView,
  BridgeData,
  CohortMatrixData,
  DeepenAnswer,
  SeriesPoint,
} from '../compose/viewModels'
import type { RecipeId, WorkflowName } from './recipe_schema'

/** What each beat of a (workflow, recipe) renders, keyed by beat id. */
export interface ViewFixture {
  subtitle: string
  meta: string
  beats: Record<string, BeatView>
  /**
   * Scoped deeper answers, keyed by beat id — plus `'root'` for the whole view.
   * Colocated with the view because a deepen answer belongs to its section.
   */
  deepen: Record<string, DeepenAnswer>
}

// ---------------------------------------------------------------------------
// Small helpers. Kept local — these are about this data, not general utilities.
// ---------------------------------------------------------------------------

const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length
const round = (value: number) => Math.round(value)
const series = (values: number[], label: (index: number) => string): SeriesPoint[] =>
  values.map((value, index) => ({ label: label(index), value }))

// ===========================================================================
// ACTIVATION · funnel_conversion — the flow reference view
// ===========================================================================

/**
 * Each signup week's settled activation rate. ONE series, used twice: the trend
 * shows where each week landed, the maturation matrix shows how it got there. They
 * cannot drift apart because there is nothing to keep in sync.
 */
const WEEKLY_ACTIVATION = [46, 48, 45, 47, 44, 49, 46, 48, 47, 49, 48, 47, 47]

/** Share of a cohort's final rate reached by week N since signup. */
const MATURATION_CURVE = [0.3, 0.55, 0.72, 0.85, 0.93, 0.98, 1.0, 1.0]

const ACTIVATION_TARGET = 55
const activationAverage = round(mean(WEEKLY_ACTIVATION))
const activationGap = ACTIVATION_TARGET - activationAverage
const matureRange = (() => {
  // "Mature" = cohorts old enough to have finished maturing (>= curve length weeks).
  const mature = WEEKLY_ACTIVATION.slice(0, WEEKLY_ACTIVATION.length - MATURATION_CURVE.length + 1)
  return { low: Math.min(...mature), high: Math.max(...mature) }
})()

/**
 * The maturation matrix. Row i is the cohort that signed up in week i+1, so it has
 * had `n - i` weeks to mature — anything beyond that hasn't happened yet and is
 * `null`, which is what draws the empty triangle top-right.
 */
const maturationMatrix: CohortMatrixData = {
  rows: WEEKLY_ACTIVATION.map((finalRate, i) => {
    const weeksElapsed = WEEKLY_ACTIVATION.length - i
    return {
      label: `wk ${i + 1}`,
      values: MATURATION_CURVE.map((share, age) =>
        age < weeksElapsed ? round(finalRate * share) : null,
      ),
    }
  }),
  columnLabels: MATURATION_CURVE.map((_, age) => String(age)),
  columnAxisLabel: 'weeks since signup →',
  rowAxisLabel: 'signup wk ↓',
  scale: { kind: 'sequential', min: 25, max: 55 },
  unit: '',
  legend: {
    lowLabel: 'lower rate',
    highLabel: 'higher rate',
    unobservedLabel: 'not observed yet (still maturing)',
  },
}

/** Reach at each onboarding step. Pass rates and the worst step are derived. */
const ONBOARDING_STEPS = [
  { label: 'New signup', reach: 100 },
  { label: 'Setup', reach: 88 },
  { label: 'Connect data', reach: 61 },
  { label: 'First object', reach: 56 },
  { label: 'Invite team', reach: 51 },
  { label: 'Value moment', reach: 47 },
]

const CONNECT_DATA_BY_SEGMENT = [
  { label: 'Enterprise', value: 66 },
  { label: 'Mid-market', value: 52 },
  { label: 'SMB', value: 41 },
]

const segmentAverage = round(mean(CONNECT_DATA_BY_SEGMENT.map((s) => s.value)))
const worstSegment = CONNECT_DATA_BY_SEGMENT.reduce((worst, s) =>
  s.value < worst.value ? s : worst,
)
const bestSegment = CONNECT_DATA_BY_SEGMENT.reduce((best, s) => (s.value > best.value ? s : best))

const connectDataPass = round(
  (ONBOARDING_STEPS[2].reach / ONBOARDING_STEPS[1].reach) * 100,
)
const lostAtConnectData = ONBOARDING_STEPS[1].reach - ONBOARDING_STEPS[2].reach

const ACTIVATION_FUNNEL: ViewFixture = {
  subtitle: "where we're losing people",
  meta: `Activation workflow · funnel + cohort · last ${WEEKLY_ACTIVATION.length} weeks`,
  beats: {
    fc_stand: {
      subtitle: `Activated ÷ New, per weekly cohort · vs the ${ACTIVATION_TARGET}% target`,
      headline: {
        value: `${activationAverage}%`,
        delta: {
          text: `▼ ${activationGap} pts below the ${ACTIVATION_TARGET}% target`,
          tone: 'bad',
        },
        note: 'quarter average · flat all quarter',
      },
      panels: [
        {
          atom: 'trend',
          label: 'Weekly trend',
          data: {
            points: series(WEEKLY_ACTIVATION, (i) => `wk ${i + 1}`),
            yTicks: [55, 50, 45, 40],
            target: { value: ACTIVATION_TARGET, label: `target ${ACTIVATION_TARGET}%` },
            unit: '%',
          },
        },
        {
          atom: 'cohortMatrix',
          label: 'Cohort maturation — how far each signup week has activated',
          data: maturationMatrix,
        },
      ],
      takeaway: `Mature cohorts settle at ${matureRange.low}–${matureRange.high}%, short of the ${ACTIVATION_TARGET}% goal, and the rate is flat across the quarter — no drift up or down. The newest cohorts (the unfilled cells running down to the lower right) are still climbing.`,
    },

    fc_why_step: {
      subtitle: 'Share of new users reaching each step · New → value moment',
      panels: [{ atom: 'funnel', data: { steps: ONBOARDING_STEPS, finalNote: 'activated' } }],
      takeaway: `The single biggest drop is at Connect data — only ${connectDataPass}% of users who finish Setup get through it, versus 88–92% at every other step. Roughly ${lostAtConnectData} of every 100 signups are lost right here. Fix this one step and the whole funnel lifts.`,
    },

    fc_why_seg: {
      subtitle: `Connect-data completion by ICP / segment · vs the ${segmentAverage}% average`,
      panels: [
        {
          atom: 'rankedBars',
          data: { bars: CONNECT_DATA_BY_SEGMENT, averageLabel: 'avg', unit: '%' },
        },
      ],
      takeaway: `The leak is concentrated in ${worstSegment.label} self-serve — ${worstSegment.value}% clear Connect data, versus ${bestSegment.value}% for ${bestSegment.label} (who get CS-guided onboarding). ${worstSegment.label} sits ${segmentAverage - worstSegment.value} points below average and is what pulls the whole activation rate down. The fix and the segment point to the same place: guided setup at Connect data for ${worstSegment.label}.`,
    },
  },

  deepen: {
    root: {
      scopeLabel: 'deepen · whole view',
      title: 'Ask about this view',
      body: [
        'Ask anything across all three sections at once, or select a single section to scope the question to it.',
        'A scoped question re-runs the same reasoning from that section’s standpoint, which is usually a sharper answer than asking across everything.',
      ],
    },
    fc_stand: {
      scopeLabel: 'deepen · where we stand',
      title: 'Activation rate — deeper',
      body: [
        `The newest cohorts are still maturing, so the settled rate is closer to ${activationAverage}–${activationAverage + 1}% than to the raw quarter average.`,
        'The flatness matters: there is no seasonal dip and no drift. A gap that holds steady across thirteen weeks is structural, which means it will not close on its own.',
      ],
      promotedSection: {
        question: 'Is the gap structural or seasonal?',
        takeaway: `Flat across all ${WEEKLY_ACTIVATION.length} weeks with no seasonal shape — the ${activationGap}-point gap to ${ACTIVATION_TARGET}% is structural, so it needs a fix rather than patience.`,
      },
    },
    fc_why_step: {
      scopeLabel: 'deepen · connect data',
      title: 'Connect data — deeper',
      body: [
        `Only ${connectDataPass}% of users who finish Setup clear this step.`,
        'Split by onboarding path rather than by segment: CS-guided runs 71%, self-serve 48%. The path someone is on predicts this step better than who they are.',
      ],
      promotedSection: {
        question: 'Does the onboarding path explain the leak?',
        takeaway:
          'At Connect data, CS-guided converts 71% against self-serve’s 48% — a 23-point spread. Path explains more of the leak than segment does, which makes guided setup the lever.',
      },
    },
    fc_why_seg: {
      scopeLabel: `deepen · ${worstSegment.label.toLowerCase()}`,
      title: `${worstSegment.label} — deeper`,
      body: [
        `${worstSegment.label} runs ${worstSegment.value}%, flat across the quarter, and is almost entirely self-serve.`,
        `That is why it trails ${bestSegment.label}, who are onboarded with a CS lead. The lever is the onboarding path, not the segment itself — ${worstSegment.label} accounts that do get guided setup behave like ${bestSegment.label}.`,
      ],
      promotedSection: {
        question: `Why does ${worstSegment.label} trail?`,
        takeaway: `${worstSegment.label} is mostly self-serve, and self-serve is where Connect data breaks. Guided setup for ${worstSegment.label} closes most of the ${segmentAverage - worstSegment.value}-point gap to average without touching the product.`,
      },
    },
  },
}

// ===========================================================================
// RETENTION · state_scorecard — the state reference view ("Product engagement")
// ===========================================================================

/** Raw counts. The stickiness ratio is computed from them, never typed separately. */
const ENGAGEMENT_LEVELS = { mau: 48_200, wau: 22_400, dau: 11_600 }
const DAU_MAU_BAR = 20

const dauMau = round((ENGAGEMENT_LEVELS.dau / ENGAGEMENT_LEVELS.mau) * 100)
const thousands = (value: number) => `${(value / 1000).toFixed(1)}k`

/** DAU/MAU over 12 weeks. The last value is the ratio on the scorecard above. */
const STICKINESS_WEEKS = [26, 25.7, 25.4, 25.1, 24.8, 24.6, 24.4, 24.3, 24.2, 24.1, 24, 24]
const stickinessNow = STICKINESS_WEEKS[STICKINESS_WEEKS.length - 1]
const stickinessThen = STICKINESS_WEEKS[0]

const RETENTION_SCORECARD: ViewFixture = {
  subtitle: 'stickiness vs benchmark',
  meta: `Retention workflow · scorecard · last ${STICKINESS_WEEKS.length} weeks`,
  beats: {
    ss_stand_level: {
      subtitle: 'Levels & stickiness ratios · each flagged against its own bar',
      panels: [
        {
          atom: 'scorecard',
          data: {
            groups: [
              {
                label: 'Levels',
                tiles: [
                  {
                    value: thousands(ENGAGEMENT_LEVELS.mau),
                    label: 'MAU',
                    delta: { text: '3%', direction: 'up' },
                  },
                  {
                    value: thousands(ENGAGEMENT_LEVELS.wau),
                    label: 'WAU',
                    delta: { text: '1%', direction: 'up' },
                  },
                  {
                    value: thousands(ENGAGEMENT_LEVELS.dau),
                    label: 'DAU',
                    delta: { text: '2%', direction: 'down' },
                  },
                ],
              },
              {
                label: 'Stickiness ratios vs benchmark',
                tiles: [
                  {
                    value: `${dauMau}%`,
                    label: 'DAU/MAU',
                    benchmark: {
                      text: `clears the ${DAU_MAU_BAR}% B2B bar`,
                      clears: dauMau >= DAU_MAU_BAR,
                    },
                    emphasis: true,
                  },
                  { value: '38%', label: 'A3×7 habit rate' },
                ],
              },
            ],
          },
        },
      ],
      takeaway: `Stickiness sits at ${dauMau}% — it clears the ${DAU_MAU_BAR}% B2B bar, but it is drifting down. Levels are steady overall, with DAU the one soft spot.`,
    },

    ss_stand_trend: {
      subtitle: `DAU/MAU over ${STICKINESS_WEEKS.length} weeks · vs the ${DAU_MAU_BAR}% benchmark line`,
      panels: [
        {
          atom: 'stickinessTrend',
          data: {
            points: series(STICKINESS_WEEKS, (i) => `wk ${i + 1}`),
            benchmark: { value: DAU_MAU_BAR, label: `benchmark ${DAU_MAU_BAR}%` },
            yTicks: [28, 24, 20],
            startNote: `${STICKINESS_WEEKS.length} wks ago · ${stickinessThen}%`,
            endNote: `now · ${stickinessNow}%`,
            unit: '%',
          },
        },
      ],
      takeaway: `A slow decline from ${stickinessThen}% → ${stickinessNow}% over ${STICKINESS_WEEKS.length} weeks. Still above the bar, but as a leading indicator of retention, the direction is worth watching.`,
    },
  },

  deepen: {
    root: {
      scopeLabel: 'deepen · whole view',
      title: 'Ask about this view',
      body: [
        'Ask across the whole scorecard, or select a single tile or trend to scope the question to it.',
        'Engagement is a state, so most useful questions here are comparative: against the bar, against last quarter, or against a segment.',
      ],
    },
    ss_stand_level: {
      scopeLabel: 'deepen · stickiness',
      title: 'Stickiness — deeper',
      body: [
        `DAU/MAU sits at ${dauMau}% against the ${DAU_MAU_BAR}% B2B bar — healthy on the level.`,
        'The level is not the story though. Levels are steady, and the ratio is where the softening shows: the three-month slope is negative while MAU is still growing, which means daily habit is thinning even as the base widens.',
      ],
      promotedSection: {
        question: 'Is the ratio softening while the base grows?',
        takeaway: `MAU is up 3% while DAU is down 2%, so the base is widening faster than habit is forming. That is what pushes DAU/MAU down from ${stickinessThen}% to ${dauMau}% despite healthy top-line growth.`,
      },
    },
    ss_stand_trend: {
      scopeLabel: 'deepen · trend',
      title: 'Trend — deeper',
      body: [
        `Down ${stickinessThen}% → ${stickinessNow}% over ${STICKINESS_WEEKS.length} weeks, roughly a tenth of a point a week.`,
        'Read as a leading indicator, that slope points to softer retention next quarter if nothing changes — it is early warning rather than damage.',
      ],
      promotedSection: {
        question: 'What does this predict for retention?',
        takeaway: `Holding this slope for another quarter takes stickiness to roughly ${(stickinessNow - 1).toFixed(1)}% — below the point where engagement has historically preceded churn. Directional, not measured.`,
      },
    },
  },
}

// ===========================================================================
// RETENTION · cohort_longitudinal — the NRR smile
// ===========================================================================

/**
 * Net revenue retention by cohort age, for a reference cohort. The shape is the
 * story: churn and contraction pull it under 100, expansion pulls it back.
 */
const NRR_BY_AGE = [100, 93, 90, 88, 87, 87, 88, 90, 93, 96, 99, 102, 105]

/**
 * Per-cohort multiplier on that curve, oldest first — later cohorts retain a little
 * better. The oldest cohort sits at exactly 1.0 ON PURPOSE: it is the only one with
 * a full 12 months observed, so it *is* the mature curve. Anything else and the
 * headline ("mature cohorts reach N%") would disagree with the one row of the matrix
 * that actually runs to the end.
 */
const COHORT_QUALITY = [1.0, 1.0, 1.005, 1.01, 1.01, 1.015, 1.02, 1.02, 1.025, 1.03, 1.035, 1.04]
const COHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const NRR_BASELINE = 100

const nrrTroughIndex = NRR_BY_AGE.indexOf(Math.min(...NRR_BY_AGE))
const nrrRecoveryIndex = NRR_BY_AGE.findIndex(
  (value, age) => age > nrrTroughIndex && value > NRR_BASELINE,
)
const nrrMature = NRR_BY_AGE[NRR_BY_AGE.length - 1]

/**
 * The NRR matrix. Month 0 is 100% for every cohort by definition — it's the base
 * being indexed — so quality only applies from month 1. Cohort i has had
 * `n - i` months, and later months are `null`.
 */
const nrrMatrix: CohortMatrixData = {
  rows: COHORT_QUALITY.map((quality, i) => {
    // Observed months are counted against the AGE axis, not the cohort count — the
    // oldest cohort has to reach the last column, or the headline's "mature cohorts
    // at month N" would name a month the matrix never shows.
    const monthsElapsed = NRR_BY_AGE.length - i
    return {
      label: `${COHORT_MONTHS[i]} 25`,
      values: NRR_BY_AGE.map((base, age) =>
        age >= monthsElapsed ? null : age === 0 ? NRR_BASELINE : round(base * quality),
      ),
    }
  }),
  columnLabels: NRR_BY_AGE.map((_, age) => `m${age}`),
  columnAxisLabel: 'months since start →',
  rowAxisLabel: 'cohort ↓',
  scale: { kind: 'divergent', min: 80, midpoint: NRR_BASELINE, max: 120 },
  unit: '',
  legend: {
    lowLabel: 'contracting',
    highLabel: 'expanding',
    unobservedLabel: 'not reached yet',
  },
}

const RETENTION_COHORT: ViewFixture = {
  subtitle: 'is net revenue retention holding by cohort age?',
  meta: `Retention workflow · cohort matrix · ${COHORT_QUALITY.length} cohorts × ${NRR_BY_AGE.length} months`,
  beats: {
    co_stand: {
      subtitle: `Net revenue retention by cohort age · vs the ${NRR_BASELINE}% line`,
      headline: {
        value: `${nrrMature}%`,
        delta: {
          text: `▲ ${nrrMature - NRR_BASELINE} pts above the ${NRR_BASELINE}% line`,
          tone: 'good',
        },
        note: `mature cohorts at month ${NRR_BY_AGE.length - 1}`,
      },
      panels: [
        {
          atom: 'nrrCurve',
          label: 'Net revenue retention across cohort age',
          data: {
            points: series(NRR_BY_AGE, (age) => `m${age}`),
            baseline: { value: NRR_BASELINE, label: `${NRR_BASELINE}% line` },
            yTicks: [110, 100, 90, 80],
            // Both derived from the series, so the split can't drift from the data.
            troughIndex: nrrTroughIndex,
            crossIndex: nrrRecoveryIndex,
            // The endpoint gets its enlarged marker from the atom, but no annotation:
            // at 13 points across this width it would sit ~38px from the crossing
            // label and collide with it. The headline already states where the curve
            // ends, so the text would be a third telling of the same number.
            annotations: [
              { pointIndex: nrrTroughIndex, text: `trough ${NRR_BY_AGE[nrrTroughIndex]}%` },
              { pointIndex: nrrRecoveryIndex, text: `crosses ${NRR_BASELINE}% · m${nrrRecoveryIndex}` },
            ],
            unit: '%',
          },
        },
      ],
      takeaway: `The curve dips to ${NRR_BY_AGE[nrrTroughIndex]}% by month ${nrrTroughIndex}, then expansion pulls it back above ${NRR_BASELINE}% at month ${nrrRecoveryIndex} and on to ${nrrMature}% by month ${NRR_BY_AGE.length - 1}. The base grows without new sales — but only after the early contraction is absorbed.`,
    },

    co_why: {
      subtitle: 'Each signup cohort × months since start · every cohort’s NRR path',
      panels: [{ atom: 'cohortMatrix', data: nrrMatrix }],
      takeaway: `Every cohort follows the same smile, and the later ones sit higher throughout — ${COHORT_MONTHS[COHORT_QUALITY.length - 1]} is running above ${COHORT_MONTHS[0]} at the same age. The early dip is structural rather than a bad quarter; what's improving is how much of it gets recovered.`,
    },
  },

  deepen: {
    root: {
      scopeLabel: 'deepen · whole view',
      title: 'Ask about this view',
      body: [
        'Ask across the curve and the matrix together, or select one to scope the question to it.',
        'Cohort questions are usually about which cohorts, or which age — selecting the matrix scopes to the first, the curve to the second.',
      ],
    },
    co_stand: {
      scopeLabel: 'deepen · the curve',
      title: 'The NRR smile — deeper',
      body: [
        `The trough is ${NRR_BY_AGE[nrrTroughIndex]}% at month ${nrrTroughIndex}, and the crossing back above ${NRR_BASELINE}% happens at month ${nrrRecoveryIndex}.`,
        `The depth of the dip is contraction and churn; the climb out is expansion. Reaching ${nrrMature}% by month ${NRR_BY_AGE.length - 1} means a cohort is worth more at the end of its first year than at the start — but only for cohorts that survive the first five months.`,
      ],
      promotedSection: {
        question: 'How long until a cohort pays back its contraction?',
        takeaway: `${nrrRecoveryIndex} months. The dip bottoms at ${NRR_BY_AGE[nrrTroughIndex]}% in month ${nrrTroughIndex} and expansion carries it back over ${NRR_BASELINE}% by month ${nrrRecoveryIndex}, reaching ${nrrMature}% by month ${NRR_BY_AGE.length - 1}.`,
      },
    },
    co_why: {
      scopeLabel: 'deepen · cohort quality',
      title: 'Which cohorts, and where — deeper',
      body: [
        `Read down a column to compare cohorts at the same age. At month 1, ${COHORT_MONTHS[0]} sits at 93% while ${COHORT_MONTHS[COHORT_MONTHS.length - 1]} is at 97%.`,
        'The dip arrives at the same age for every cohort, so its timing is a property of the lifecycle rather than of any quarter. What is improving is depth — later cohorts lose less on the way down.',
      ],
      promotedSection: {
        question: 'Are later cohorts actually better, or just younger?',
        takeaway: `Better. Compared at equal age rather than equal date, ${COHORT_MONTHS[COHORT_MONTHS.length - 1]} runs about 4 points above ${COHORT_MONTHS[0]} through the dip. The improvement is real, not an artefact of immaturity.`,
      },
    },
  },
}

// ===========================================================================
// THE THREE BRIDGES — one atom, three balances
//
// Every bridge states an opening and the signed movements, and lets the closing be
// COMPUTED. Typing the closing separately is how a waterfall ends up with bars that
// don't land on their own anchor; here that cannot happen, and `check:recipes`
// section G asserts the reconciliation anyway in case someone later hardcodes one.
// ===========================================================================

interface BridgeSpec {
  opening: { label: string; value: number }
  closingLabel: string
  movements: Array<{ label: string; delta: number }>
  yTicks: number[]
  prefix?: string
  suffix?: string
}

/** Close the bridge from its own movements, rounded to the display precision. */
function bridge(spec: BridgeSpec): BridgeData {
  const closing = spec.movements.reduce((total, m) => total + m.delta, spec.opening.value)
  return {
    opening: spec.opening,
    // Rounded to two decimals — the precision the chart prints — so the arithmetic and
    // the label agree exactly rather than to within a float epsilon.
    closing: { label: spec.closingLabel, value: Math.round(closing * 100) / 100 },
    movements: spec.movements,
    yTicks: spec.yTicks,
    prefix: spec.prefix,
    suffix: spec.suffix,
  }
}

const money = (value: number) => `$${value.toFixed(2)}M`
const sumOf = (movements: BridgeData['movements'], sign: 1 | -1) =>
  Math.round(movements.filter((m) => Math.sign(m.delta) === sign).reduce((t, m) => t + m.delta, 0) * 100) / 100

/** The largest movement on one side, for a takeaway that names it. */
function largest(movements: BridgeData['movements'], sign: 1 | -1) {
  const side = movements.filter((m) => Math.sign(m.delta) === sign)
  return side.reduce((best, m) => (Math.abs(m.delta) > Math.abs(best.delta) ? m : best), side[0])
}

// ---- Company · Revenue engine — the ARR build ------------------------------
// Reconciled with the $4.20M → $4.98M figures the design sketches use.

const ARR_BRIDGE = bridge({
  opening: { label: 'Opening', value: 4.2 },
  closingLabel: 'Closing',
  movements: [
    { label: 'New', delta: 0.85 },
    { label: 'Expansion', delta: 0.42 },
    { label: 'Contraction', delta: -0.18 },
    { label: 'Churn', delta: -0.31 },
  ],
  yTicks: [5.2, 4.6, 4.0, 3.4],
  prefix: '$',
  suffix: 'M',
})

const arrGross = sumOf(ARR_BRIDGE.movements, 1)
const arrLost = Math.abs(sumOf(ARR_BRIDGE.movements, -1))
const arrNet = Math.round((ARR_BRIDGE.closing.value - ARR_BRIDGE.opening.value) * 100) / 100
const arrKept = Math.round((1 - arrLost / arrGross) * 100)
const arrExpansion = ARR_BRIDGE.movements[1].delta
const arrBiggestCut = largest(ARR_BRIDGE.movements, -1)
const arrProjected = Math.round((ARR_BRIDGE.closing.value + arrNet) * 100) / 100

/**
 * Churn — the biggest drag on the ARR bridge — split by segment. THE DIMENSIONAL WHY.
 *
 * Not a second waterfall: the waterfall already answered "which component", so
 * repeating it would be the same chart twice. This asks the next question down, which
 * needs a different shape.
 *
 * The bars sum to the component they decompose, so the two sections reconcile: read
 * `Churn −0.31` off the bridge, then read where the 0.31 went.
 */
const ARR_CHURN_BY_SEGMENT = [
  { label: 'SMB', value: 0.17 },
  { label: 'Mid-market', value: 0.09 },
  { label: 'Enterprise', value: 0.05 },
]
const arrChurnSplitTotal =
  Math.round(ARR_CHURN_BY_SEGMENT.reduce((t, b) => t + b.value, 0) * 100) / 100
const arrWorstChurn = ARR_CHURN_BY_SEGMENT[0]
const arrWorstChurnShare = Math.round((arrWorstChurn.value / arrChurnSplitTotal) * 100)

const REVENUE_ARR_BUILD: ViewFixture = {
  subtitle: 'how ARR moved, opening to closing',
  meta: 'Revenue engine workflow · ARR bridge · opening → closing',
  beats: {
    // THE WATERFALL, ONCE. It answers "where we stand" and the top-level "why" in the
    // same picture — the net move and the components that made it — so there is no
    // second bridge anywhere in this view.
    mb_move: {
      subtitle: 'Opening ARR → movements → closing ARR · the net move and its components',
      headline: {
        value: money(ARR_BRIDGE.closing.value),
        delta: { text: `▲ ${money(arrNet)} net new`, tone: 'good' },
        note: `from ${money(ARR_BRIDGE.opening.value)} opening`,
      },
      panels: [{ atom: 'bridge', label: 'ARR build', data: ARR_BRIDGE }],
      takeaway: `ARR closed at ${money(ARR_BRIDGE.closing.value)}, up ${money(arrNet)}. Gross additions of ${money(arrGross)} did the work and ${money(arrLost)} leaked back out, so about ${arrKept}% of what was won was kept. Within that, ${arrBiggestCut.label} is the largest single drag at ${money(Math.abs(arrBiggestCut.delta))} — more than Expansion adds at ${money(arrExpansion)}.`,
    },

    // THE DIMENSIONAL WHY — one step down, not the same chart again. The waterfall
    // already said which component; this says which segment inside that component.
    mb_why_dim: {
      subtitle: `${arrBiggestCut.label} by segment · where the ${money(Math.abs(arrBiggestCut.delta))} went`,
      panels: [
        {
          atom: 'rankedBars',
          label: `${arrBiggestCut.label} split by segment`,
          data: { bars: ARR_CHURN_BY_SEGMENT, averageLabel: 'avg', unit: '' },
        },
      ],
      takeaway: `${arrWorstChurn.label} accounts for ${money(arrWorstChurn.value)} of the ${money(arrChurnSplitTotal)} churned — ${arrWorstChurnShare}% of the loss from the smallest accounts. The churn line on the bridge is really an SMB retention problem, which is a different fix from an enterprise one.`,
    },

    // THE PROJECTION — the same waterfall with a projected closing bar added. Its own
    // beat, because a forecast is a different claim from a measurement and carries a
    // different confidence stamp.
    mb_ahead: {
      subtitle: 'Same bridge, carried forward one period at this quarter’s run-rate',
      panels: [
        {
          atom: 'bridge',
          label: 'Projected next close',
          data: { ...ARR_BRIDGE, projected: { label: 'Next close', value: arrProjected } },
        },
      ],
      takeaway: `Holding this quarter's mix puts the next close near ${money(arrProjected)}. Directional, not measured: it assumes New, Expansion, Contraction and Churn all repeat at the same size, which is exactly what the ${arrBiggestCut.label} split suggests is worth changing.`,
    },
  },

  deepen: {
    root: {
      scopeLabel: 'deepen · whole view',
      title: 'Ask about this view',
      body: [
        'Ask across the whole bridge, or select a section to scope the question to it.',
        'The waterfall answers which component; the ranked split answers which segment inside it. Most follow-ups are one of those two levels.',
      ],
    },
    mb_move: {
      scopeLabel: 'deepen · the move',
      title: 'The move and its components — deeper',
      body: [
        `${money(ARR_BRIDGE.opening.value)} opening to ${money(ARR_BRIDGE.closing.value)} closing, a net ${money(arrNet)}.`,
        `The net is small next to the gross: ${money(arrGross)} in, ${money(arrLost)} out. A bridge is the only shape that shows both at once — a trend line would show the ${money(arrNet)} and hide the rest.`,
      ],
      promotedSection: {
        question: 'How much of what we won did we keep?',
        takeaway: `About ${arrKept}%. Gross additions of ${money(arrGross)} against ${money(arrLost)} of contraction and churn, leaving ${money(arrNet)} net.`,
      },
    },
    mb_why_dim: {
      scopeLabel: 'deepen · segment split',
      title: `Which segment drove ${arrBiggestCut.label} — deeper`,
      body: [
        `${arrWorstChurn.label} is ${arrWorstChurnShare}% of the churn at ${money(arrWorstChurn.value)}, against ${money(ARR_CHURN_BY_SEGMENT[2].value)} from Enterprise.`,
        'The bars sum to the churn bar on the bridge above, so the two sections are the same fact at two depths rather than two measurements that might disagree.',
      ],
      promotedSection: {
        question: 'Is churn a product problem or a segment problem?',
        takeaway: `A segment problem. ${arrWorstChurn.label} contributes ${arrWorstChurnShare}% of churn while Enterprise contributes ${Math.round((ARR_CHURN_BY_SEGMENT[2].value / arrChurnSplitTotal) * 100)}% — the same product, very different retention.`,
      },
    },
    mb_ahead: {
      scopeLabel: 'deepen · the projection',
      title: 'The projected close — deeper',
      body: [
        `${money(arrProjected)} next period, from ${money(ARR_BRIDGE.closing.value)} plus another ${money(arrNet)} of net new.`,
        `The projection assumes the mix repeats. It is the weakest claim in the view, which is why it is stamped directional — and the ${arrWorstChurn.label} concentration is the reason to expect the mix to change rather than repeat.`,
      ],
      promotedSection: {
        question: 'What would fixing SMB churn do to the projection?',
        takeaway: `Halving ${arrWorstChurn.label} churn would add roughly ${money(Math.round((arrWorstChurn.value / 2) * 100) / 100)} a quarter, taking the next close nearer ${money(Math.round((arrProjected + arrWorstChurn.value / 2) * 100) / 100)}. Directional.`,
      },
    },
  },
}

// ---- Financial · P&L — profit, quarter to quarter --------------------------
// Movements are effects ON profit, so a cost that grew carries a negative sign.

const PL_BRIDGE = bridge({
  opening: { label: 'Opening', value: 0.62 },
  closingLabel: 'Closing',
  movements: [
    { label: 'Revenue', delta: 0.48 },
    { label: 'COGS', delta: -0.11 },
    { label: 'S&M', delta: -0.19 },
    { label: 'R&D', delta: -0.09 },
  ],
  yTicks: [1.2, 0.9, 0.6, 0.3],
  prefix: '$',
  suffix: 'M',
})

const plRevenue = PL_BRIDGE.movements[0].delta
const plCosts = Math.abs(sumOf(PL_BRIDGE.movements, -1))
const plNet = Math.round((PL_BRIDGE.closing.value - PL_BRIDGE.opening.value) * 100) / 100
const plConversion = Math.round((plNet / plRevenue) * 100)
const plBiggestCut = largest(PL_BRIDGE.movements, -1)
const plCutShare = Math.round((Math.abs(plBiggestCut.delta) / plCosts) * 100)

const PL_BUILD: ViewFixture = {
  subtitle: 'how net profit moved, quarter to quarter',
  meta: 'P&L workflow · profit bridge · opening → closing',
  // ONE WATERFALL, AND NOTHING ELSE. No `mb_why_dim` fixture on purpose: the P&L
  // bridge's components already ARE the functions (revenue, COGS, S&M, R&D), so
  // "which dimension drove the biggest component" has no answer that the waterfall
  // hasn't given. The recipe offers the beat; this workflow declines it, which is
  // exactly what an optional beat with no fixture expresses.
  beats: {
    mb_move: {
      subtitle: 'Opening net profit → movements → closing net profit · the move and its lines',
      headline: {
        value: money(PL_BRIDGE.closing.value),
        delta: { text: `▲ ${money(plNet)} vs last quarter`, tone: 'good' },
        note: `from ${money(PL_BRIDGE.opening.value)} opening`,
      },
      panels: [{ atom: 'bridge', label: 'Net profit bridge', data: PL_BRIDGE }],
      takeaway: `Net profit closed at ${money(PL_BRIDGE.closing.value)}, up ${money(plNet)}. Revenue added ${money(plRevenue)} and cost growth took back ${money(plCosts)}, so the quarter converted about ${plConversion}% of its revenue gain into profit. ${plBiggestCut.label} is the largest single drag at ${money(Math.abs(plBiggestCut.delta))} — roughly ${plCutShare}% of all cost growth, more than COGS and R&D together.`,
    },
  },

  deepen: {
    root: {
      scopeLabel: 'deepen · whole view',
      title: 'Ask about this view',
      body: [
        'Ask across the whole bridge, or select the section to scope the question to it.',
        'On a profit bridge the useful questions are about conversion: how much of the revenue gain reached the bottom line, and what consumed the rest.',
      ],
    },
    mb_move: {
      scopeLabel: 'deepen · the move',
      title: 'The move, quarter to quarter — deeper',
      body: [
        `${money(PL_BRIDGE.opening.value)} to ${money(PL_BRIDGE.closing.value)}, a net ${money(plNet)}. ${plBiggestCut.label} grew ${money(Math.abs(plBiggestCut.delta))}, against ${money(0.11)} in COGS and ${money(0.09)} in R&D.`,
        `Revenue is the only positive movement; every other line is a cost that grew. That is why the closing balance sits much closer to the opening than the ${money(plRevenue)} revenue gain alone would suggest — and why the incremental spend going to go-to-market is the decision worth examining, in Acquisition rather than here.`,
      ],
      promotedSection: {
        question: 'How much of the revenue gain reached profit?',
        takeaway: `${plConversion}% — ${money(plNet)} of the ${money(plRevenue)} increase, with ${money(plCosts)} absorbed by cost growth, roughly ${plCutShare}% of it in ${plBiggestCut.label}.`,
      },
    },
  },
}

// ---- Functional · Expansion — net expansion MRR ----------------------------

const EXPANSION_BRIDGE = bridge({
  opening: { label: 'Opening', value: 0.31 },
  closingLabel: 'Closing',
  movements: [
    { label: 'Upsell', delta: 0.14 },
    { label: 'Cross-sell', delta: 0.06 },
    { label: 'Downgrade', delta: -0.05 },
    { label: 'Churn', delta: -0.08 },
  ],
  yTicks: [0.5, 0.4, 0.3, 0.2],
  prefix: '$',
  suffix: 'M',
})

const expUpsell = EXPANSION_BRIDGE.movements[0].delta
const expCross = EXPANSION_BRIDGE.movements[1].delta
const expGross = sumOf(EXPANSION_BRIDGE.movements, 1)
const expLost = Math.abs(sumOf(EXPANSION_BRIDGE.movements, -1))
const expNet = Math.round((EXPANSION_BRIDGE.closing.value - EXPANSION_BRIDGE.opening.value) * 100) / 100
const expGivenBack = Math.round((expLost / expGross) * 100)
const crossVsUp = Math.round((expCross / expUpsell) * 100)
const expBiggestAdd = largest(EXPANSION_BRIDGE.movements, 1)

/**
 * Upsell — the biggest ADD on this bridge — split by segment. The dimensional why.
 *
 * Sums to the upsell bar, so the split and the bridge reconcile. Note this decomposes
 * the largest ADDITION rather than the largest reduction: on an expansion bridge the
 * interesting question is where the growth came from, not where the leak was.
 */
const EXP_UPSELL_BY_SEGMENT = [
  { label: 'Enterprise', value: 0.08 },
  { label: 'Mid-market', value: 0.04 },
  { label: 'SMB', value: 0.02 },
]
const expUpsellSplitTotal =
  Math.round(EXP_UPSELL_BY_SEGMENT.reduce((t, b) => t + b.value, 0) * 100) / 100
const expBestUpsell = EXP_UPSELL_BY_SEGMENT[0]
const expBestUpsellShare = Math.round((expBestUpsell.value / expUpsellSplitTotal) * 100)

const EXPANSION_BUILD: ViewFixture = {
  subtitle: 'how net expansion MRR moved this quarter',
  meta: 'Expansion workflow · expansion bridge · opening → closing',
  beats: {
    // The waterfall, once — net move and components together.
    mb_move: {
      subtitle: 'Opening expansion MRR → movements → closing · the move and its motions',
      headline: {
        value: money(EXPANSION_BRIDGE.closing.value),
        delta: { text: `▲ ${money(expNet)} net`, tone: 'good' },
        note: `from ${money(EXPANSION_BRIDGE.opening.value)} opening`,
      },
      panels: [{ atom: 'bridge', label: 'Net expansion MRR', data: EXPANSION_BRIDGE }],
      takeaway: `Expansion MRR closed at ${money(EXPANSION_BRIDGE.closing.value)}, up ${money(expNet)}. Upsell and cross-sell added ${money(expGross)}; downgrades and churn took back ${money(expLost)}, which is ${expGivenBack}% of everything the motion won. Upsell is doing most of the work at ${money(expUpsell)} — more than twice cross-sell's ${money(expCross)}.`,
    },

    // The dimensional why: the largest ADD split by segment. On an expansion bridge the
    // question worth one more level is where the growth came from.
    mb_why_dim: {
      subtitle: `${expBiggestAdd.label} by segment · where the ${money(expBiggestAdd.delta)} came from`,
      panels: [
        {
          atom: 'rankedBars',
          label: `${expBiggestAdd.label} split by segment`,
          data: { bars: EXP_UPSELL_BY_SEGMENT, averageLabel: 'avg', unit: '' },
        },
      ],
      takeaway: `${expBestUpsell.label} is ${expBestUpsellShare}% of upsell at ${money(expBestUpsell.value)}, against ${money(EXP_UPSELL_BY_SEGMENT[2].value)} from SMB. Expansion is an enterprise motion here — which is the opposite end of the book from where churn concentrates.`,
    },
  },

  deepen: {
    root: {
      scopeLabel: 'deepen · whole view',
      title: 'Ask about this view',
      body: [
        'Ask across the whole bridge, or select a section to scope the question to it.',
        'The waterfall answers which motion; the ranked split answers which segment inside it.',
      ],
    },
    mb_move: {
      scopeLabel: 'deepen · the move',
      title: 'The move and its motions — deeper',
      body: [
        `${money(EXPANSION_BRIDGE.opening.value)} to ${money(EXPANSION_BRIDGE.closing.value)}, a net ${money(expNet)}. Upsell ${money(expUpsell)}, cross-sell ${money(expCross)}.`,
        `Gross expansion of ${money(expGross)} against ${money(expLost)} of downgrade and churn — the retention side is consuming ${expGivenBack}% of the motion's output. The mix matters for where to invest: upsell scales with the existing motion, cross-sell needs a second product to land.`,
      ],
      promotedSection: {
        question: 'Upsell or cross-sell — which is under-worked?',
        takeaway: `Cross-sell. It contributes ${money(expCross)} against upsell's ${money(expUpsell)} — about ${crossVsUp}% as much, into a comparable installed base.`,
      },
    },
    mb_why_dim: {
      scopeLabel: 'deepen · segment split',
      title: `Which segment drove ${expBiggestAdd.label} — deeper`,
      body: [
        `${expBestUpsell.label} is ${expBestUpsellShare}% of upsell at ${money(expBestUpsell.value)}; SMB contributes ${money(EXP_UPSELL_BY_SEGMENT[2].value)}.`,
        'The bars sum to the upsell bar on the bridge above, so the two sections are the same fact at two depths. Read together with the ARR bridge, the picture is that the top of the book expands and the bottom of it churns.',
      ],
      promotedSection: {
        question: 'Does expansion come from the same segments that churn?',
        takeaway: `No — the opposite. ${expBestUpsell.label} drives ${expBestUpsellShare}% of upsell while SMB drives most of the churn. The book is growing at the top and leaking at the bottom.`,
      },
    },
  },
}

// ===========================================================================
// COMPANY · Cost & Burn — the scorecard, reused
//
// NO NEW ATOM. A state shape watches levels and ratios against a bar, and that is as
// true of burn as it is of engagement — so `Scorecard` and `StickinessTrend` take
// this data unchanged. Only the fixture is new, which is the clearest evidence that
// the atoms are parameterised by data rather than by subject.
// ===========================================================================

const BURN = { netBurn: 0.74, cash: 14.1 }
const BURN_MULTIPLE_BAR = 1.5
/** Burn multiple over six months. The last value is the ratio on the scorecard above. */
const BURN_MULTIPLE_MONTHS = [1.7, 1.62, 1.55, 1.44, 1.36, 1.3]
const burnNow = BURN_MULTIPLE_MONTHS[BURN_MULTIPLE_MONTHS.length - 1]
const burnThen = BURN_MULTIPLE_MONTHS[0]
/** Derived, never typed: runway must follow from cash ÷ burn or the tiles contradict. */
const runwayMonths = round(BURN.cash / BURN.netBurn)
/** Which month it crossed under the bar — read off the series, not asserted in prose. */
const burnCrossMonth = BURN_MULTIPLE_MONTHS.findIndex((value) => value <= BURN_MULTIPLE_BAR) + 1
const burnMonthsSinceCross = BURN_MULTIPLE_MONTHS.length - burnCrossMonth

const COST_BURN_SCORECARD: ViewFixture = {
  subtitle: 'where burn stands against plan',
  meta: `Cost & Burn workflow · scorecard · last ${BURN_MULTIPLE_MONTHS.length} months`,
  beats: {
    ss_stand_level: {
      subtitle: 'Levels & efficiency ratios · each flagged against its own bar',
      panels: [
        {
          atom: 'scorecard',
          data: {
            groups: [
              {
                label: 'Levels',
                tiles: [
                  {
                    value: money(BURN.netBurn),
                    label: 'Net burn / mo',
                    delta: { text: '6%', direction: 'down' },
                  },
                  { value: `$${BURN.cash.toFixed(1)}M`, label: 'Cash' },
                  { value: `${runwayMonths} mo`, label: 'Runway' },
                ],
              },
              {
                label: 'Efficiency vs benchmark',
                tiles: [
                  {
                    value: `${burnNow.toFixed(1)}×`,
                    label: 'Burn multiple',
                    benchmark: {
                      text: `clears the ${BURN_MULTIPLE_BAR}× bar`,
                      clears: burnNow <= BURN_MULTIPLE_BAR,
                    },
                    emphasis: true,
                  },
                  { value: '22%', label: 'Cost to serve · % of ARR' },
                ],
              },
            ],
          },
        },
      ],
      takeaway: `Burn multiple is ${burnNow.toFixed(1)}×, inside the ${BURN_MULTIPLE_BAR}× bar, and net burn is down 6%. The ${runwayMonths}-month runway is a consequence of burning ${money(BURN.netBurn)} a month rather than a separate fact — bring burn down and it extends.`,
    },

    ss_stand_trend: {
      subtitle: `Burn multiple over ${BURN_MULTIPLE_MONTHS.length} months · vs the ${BURN_MULTIPLE_BAR}× bar`,
      panels: [
        {
          atom: 'stickinessTrend',
          data: {
            points: series(BURN_MULTIPLE_MONTHS, (i) => `m${i + 1}`),
            benchmark: { value: BURN_MULTIPLE_BAR, label: `bar ${BURN_MULTIPLE_BAR}×` },
            yTicks: [1.8, 1.5, 1.2],
            startNote: `${BURN_MULTIPLE_MONTHS.length} mo ago · ${burnThen}×`,
            endNote: `now · ${burnNow}×`,
            unit: '',
          },
        },
      ],
      takeaway: `Improving steadily, ${burnThen}× → ${burnNow}× over ${BURN_MULTIPLE_MONTHS.length} months, and under the ${BURN_MULTIPLE_BAR}× bar for the last ${burnMonthsSinceCross}. Efficiency is trending the right way rather than sitting still inside the bar.`,
    },
  },

  deepen: {
    root: {
      scopeLabel: 'deepen · whole view',
      title: 'Ask about this view',
      body: [
        'Ask across the whole scorecard, or select a tile or the trend to scope the question to it.',
        'Burn is a state, so the useful questions are comparative: against plan, against the bar, or against what the spend bought.',
      ],
    },
    ss_stand_level: {
      scopeLabel: 'deepen · burn',
      title: 'Where burn stands — deeper',
      body: [
        `Net burn ${money(BURN.netBurn)} a month against $${BURN.cash.toFixed(1)}M cash, so ${runwayMonths} months of runway.`,
        `The burn multiple of ${burnNow.toFixed(1)}× matters more than the absolute: it says how much is spent to add a dollar of ARR, and inside ${BURN_MULTIPLE_BAR}× is efficient growth rather than bought growth.`,
      ],
      promotedSection: {
        question: 'Is the runway a burn problem or a cash problem?',
        takeaway: `A burn problem, and a mild one. $${BURN.cash.toFixed(1)}M of cash is healthy; ${runwayMonths} months follows arithmetically from spending ${money(BURN.netBurn)} a month. Burn is already down 6%, which extends runway without raising.`,
      },
    },
    ss_stand_trend: {
      scopeLabel: 'deepen · trend',
      title: 'The efficiency trend — deeper',
      body: [
        `${burnThen}× → ${burnNow}× over ${BURN_MULTIPLE_MONTHS.length} months, crossing under the bar at month ${burnCrossMonth}.`,
        'A falling burn multiple while ARR grows is the healthy combination: it means growth is getting cheaper, not that growth has stopped.',
      ],
      promotedSection: {
        question: 'Is growth getting cheaper or just slower?',
        takeaway: `Cheaper. The multiple fell from ${burnThen}× to ${burnNow}× while net burn also came down 6% — if growth had merely slowed, the multiple would have held or risen.`,
      },
    },
  },
}

// ===========================================================================
// FUNCTIONAL · Monetisation — price_sensitivity, the response family
//
// The third family's only view. Its shape is different in kind from the other two:
// a flow reports what happened, a state reports where things sit, and this one asks
// what a lever would do if you pulled it. Hence the two atoms nothing else uses —
// a curve of an outcome against a lever, and a card that states a call.
//
// The revenue curve is GENERATED from an elasticity assumption rather than typed
// point by point, so its peak is a real consequence of the model instead of a number
// someone chose and then drew a hump around. Change the elasticity and the peak
// moves; the recommendation follows it, because everything below reads the peak off
// the curve rather than restating it.
// ===========================================================================

const CURRENT_PRICE = 40
const SEATS_AT_CURRENT = 49_000

/**
 * Seats retained at a given price. Demand softens gently while buyers absorb a rise,
 * then falls away past the willingness-to-pay knee faster than the extra list price
 * makes up for — which is what puts a PEAK in the revenue curve instead of a line
 * that climbs forever.
 *
 * Illustrative and deliberately simple: a stand-in for the elasticity the semantic
 * layer will supply, not a model anyone should trust. What matters is that the curve
 * is GENERATED rather than drawn, so its peak is a consequence of the assumption and
 * every figure downstream reads off it.
 */
const WTP_KNEE = 54
function seatsAt(price: number): number {
  const gentle = 0.009 // below the knee, buyers mostly absorb the rise
  const steep = 0.055 // past it, they start leaving
  const belowKnee = Math.max(Math.min(price, WTP_KNEE) - CURRENT_PRICE, 0)
  const aboveKnee = Math.max(price - WTP_KNEE, 0)
  return Math.max(SEATS_AT_CURRENT * (1 - gentle * belowKnee - steep * aboveKnee), 0)
}

/**
 * Monthly revenue in $M at each candidate price.
 *
 * Stops at $64 rather than running further: past there the model's seat count clamps
 * at zero and the curve would drop flat onto the axis, which reads as a rendering
 * fault rather than as a forecast. The shape only has to carry far enough past the
 * peak to show that it IS a peak.
 */
const PRICE_CURVE = Array.from({ length: 10 }, (_, i) => {
  const price = 28 + i * 4 // $28 → $64
  return { price, revenue: Math.round((price * seatsAt(price)) / 1000) / 1000 }
})

const priceePeak = PRICE_CURVE.reduce((best, p) => (p.revenue > best.revenue ? p : best))
const priceNow = PRICE_CURVE.reduce((closest, p) =>
  Math.abs(p.price - CURRENT_PRICE) < Math.abs(closest.price - CURRENT_PRICE) ? p : closest,
)
/** The upside IS the gap between the two markers — computed, never asserted. */
const priceUplift = Math.round((priceePeak.revenue - priceNow.revenue) * 1000) / 1000
const priceRisePct = Math.round(((priceePeak.price - priceNow.price) / priceNow.price) * 100)
const seatsLost = Math.round(seatsAt(priceNow.price) - seatsAt(priceePeak.price))
/** Churn risk, in points, from the seats the rise gives up. */
const churnRiskPts = Math.round((seatsLost / SEATS_AT_CURRENT) * 1000) / 10

const mRev = (value: number) => `$${value.toFixed(2)}M`
const LIST_PRICE = 49
const REALISATION_TARGET = 90
const REALISATION = Math.round((CURRENT_PRICE / LIST_PRICE) * 100)
const DISCOUNT_DEPTH = 11

/**
 * ARPU = MRR ÷ active paid seats. PER SEAT.
 *
 * Built up from its two components rather than typed, so the headline is the sum of
 * the tiles beneath it by construction:
 *
 *   realised tier price   $40.00 / seat
 * + add-on revenue        $ 3.08 / seat   (22% attach × $14)
 * = ARPU                  $43.08 / seat
 *
 * and MRR = ARPU × seats, so the definition holds rather than being asserted. Both
 * components are Monetisation drivers in the semantic model (price realisation,
 * add-on attach); nothing here is a per-account figure.
 */
const ADD_ON_ATTACH = 0.22
const ADD_ON_PRICE = 14
const addOnPerSeat = Math.round(ADD_ON_ATTACH * ADD_ON_PRICE * 100) / 100
const ARPU_NOW = Math.round((CURRENT_PRICE + addOnPerSeat) * 100) / 100
const MRR_NOW = Math.round((ARPU_NOW * SEATS_AT_CURRENT) / 1000) / 1000
/** What closing half the realisation gap is worth — per seat, then in total. */
const realisationGapPerSeat = Math.round(((LIST_PRICE - CURRENT_PRICE) / 2) * 100) / 100
const realisationGapValue =
  Math.round((realisationGapPerSeat * SEATS_AT_CURRENT) / 1000) / 1000

const MONETISATION_PRICE: ViewFixture = {
  subtitle: 'what the Business tier price is worth moving',
  meta: `Monetisation workflow · price response · ${PRICE_CURVE.length} candidate points`,
  beats: {
    ps_stand: {
      subtitle: 'ARPU & price realisation · what is actually being charged per seat',
      headline: {
        // The goal metric, per seat, matching what the beat asks about. The two tiles
        // below sum to exactly this.
        value: `$${ARPU_NOW.toFixed(2)}`,
        delta: {
          text: `▼ ${100 - REALISATION}% of list discounted away`,
          tone: 'bad',
        },
        note: `ARPU · MRR ${mRev(MRR_NOW)} ÷ ${(SEATS_AT_CURRENT / 1000).toFixed(1)}k paid seats`,
      },
      panels: [
        {
          atom: 'scorecard',
          data: {
            groups: [
              {
                // Every tile is per seat or a seat count — the same denominator as the
                // goal metric, so the group reads as one arithmetic.
                label: 'ARPU components · per seat',
                tiles: [
                  { value: `$${CURRENT_PRICE.toFixed(2)}`, label: 'Realised price / seat' },
                  {
                    value: `$${addOnPerSeat.toFixed(2)}`,
                    label: `Add-on revenue / seat · ${Math.round(ADD_ON_ATTACH * 100)}% attach`,
                  },
                  {
                    value: `${(SEATS_AT_CURRENT / 1000).toFixed(1)}k`,
                    label: 'Paid seats · the ARPU denominator',
                  },
                ],
              },
              {
                label: 'Realisation vs list',
                tiles: [
                  {
                    value: `${REALISATION}%`,
                    label: 'Price realisation',
                    benchmark: {
                      text: `below the ${REALISATION_TARGET}% target`,
                      clears: REALISATION >= REALISATION_TARGET,
                    },
                    emphasis: true,
                  },
                  { value: `${DISCOUNT_DEPTH}%`, label: 'Average discount depth' },
                ],
              },
            ],
          },
        },
      ],
      takeaway: `ARPU is $${ARPU_NOW.toFixed(2)} a seat — $${CURRENT_PRICE.toFixed(2)} of realised tier price plus $${addOnPerSeat.toFixed(2)} from add-ons, across ${(SEATS_AT_CURRENT / 1000).toFixed(1)}k paid seats. The tier lists at $${LIST_PRICE}, so realisation is ${REALISATION}% against the ${REALISATION_TARGET}% target: ${100 - REALISATION}% of the list price is discounted away before any question of raising it.`,
    },

    // ONE CURVE. The shape answers "why revenue responds this way" and every point on
    // it answers "what would that move yield" — the same chart, annotated, not two.
    ps_curve: {
      subtitle: `Revenue at each candidate price · now $${CURRENT_PRICE}, revenue-max $${priceePeak.price}`,
      panels: [
        {
          atom: 'responseCurve',
          label: 'Revenue response to price',
          data: {
            curve: PRICE_CURVE,
            currentPrice: CURRENT_PRICE,
            yTicks: [2.4, 2.0, 1.6, 1.2],
            prefix: '$',
            xAxisLabel: 'price / seat →',
            yAxisLabel: 'revenue / mo',
            riskNote: 'churn risk ↑',
          },
        },
      ],
      takeaway: `Revenue peaks at $${priceePeak.price}, ${priceRisePct}% above today's $${priceNow.price} — worth ${mRev(priceUplift)} a month. Past the peak each extra dollar of list price costs more in churn than it earns, which is the shaded region: the curve is not an argument for pricing as high as possible.`,
    },

    // THE CALL. The response family's native output, and the only place in the app
    // that recommends rather than reports.
    ps_do: {
      subtitle: 'The move, its expected effect, and what it costs',
      panels: [
        {
          atom: 'recommendation',
          data: {
            move: `Raise Business tier $${priceNow.price} → $${priceePeak.price}`,
            deltaRevenue: `+${mRev(priceUplift)} / mo`,
            riskLabel: 'Churn risk',
            riskValue: `+${churnRiskPts.toFixed(1)} pts`,
            // Always directional — see RecommendationData.confidence, and section H.
            confidence: 'directional',
            note: 'at the rev-max',
          },
        },
      ],
      takeaway: `Move to $${priceePeak.price} and expect ${mRev(priceUplift)} a month more, giving up roughly ${seatsLost.toLocaleString()} seats — about ${churnRiskPts.toFixed(1)} points of churn. Directional: it assumes the elasticity holds, and the ${100 - REALISATION}% already lost to discounting says the realised price is the easier lever to pull first.`,
    },
  },

  deepen: {
    root: {
      scopeLabel: 'deepen · whole view',
      title: 'Ask about this view',
      body: [
        'Ask across the whole view, or select a section to scope the question to it.',
        'A price question has three levels: what is charged now, what the curve says a change would do, and whether to make the move. The three sections are those three.',
      ],
    },
    ps_stand: {
      scopeLabel: 'deepen · realisation',
      title: 'What is actually being charged — deeper',
      body: [
        `ARPU $${ARPU_NOW.toFixed(2)} a seat: $${CURRENT_PRICE.toFixed(2)} realised against a $${LIST_PRICE} list, plus $${addOnPerSeat.toFixed(2)} of add-on revenue, across ${(SEATS_AT_CURRENT / 1000).toFixed(1)}k paid seats.`,
        'Realisation and list price are different levers with different costs. Raising list exposes every seat to a price rise; recovering discount touches only the seats actually discounted, which is a far smaller blast radius for the same money.',
      ],
      promotedSection: {
        question: 'Is the cheaper move to raise list or to discount less?',
        takeaway: `Discount less. Closing half the ${100 - REALISATION}-point realisation gap is worth $${realisationGapPerSeat.toFixed(2)} a seat — about ${mRev(realisationGapValue)} a month — without changing the list price at all, and it touches only discounted seats.`,
      },
    },
    ps_curve: {
      scopeLabel: 'deepen · the response',
      title: 'How revenue responds to price — deeper',
      body: [
        `The peak is $${priceePeak.price} at ${mRev(priceePeak.revenue)} a month, against ${mRev(priceNow.revenue)} today.`,
        `The curve bends where willingness to pay runs out, around $${WTP_KNEE}. Below that buyers mostly absorb a rise; above it they leave fast enough that revenue falls away rather than flattening. The peak sits just under that knee, which is what makes it a peak at all.`,
      ],
      promotedSection: {
        question: 'How much of the upside comes before the knee?',
        takeaway: `All of it. The peak at $${priceePeak.price} is below the $${WTP_KNEE} knee, so the whole gain comes from the gentle part of the demand curve. Past $${WTP_KNEE} revenue does not merely grow more slowly — it falls.`,
      },
    },
    ps_do: {
      scopeLabel: 'deepen · the recommendation',
      title: 'The recommended move — deeper',
      body: [
        `$${priceNow.price} → $${priceePeak.price} for ${mRev(priceUplift)} a month, at about ${churnRiskPts.toFixed(1)} points of churn.`,
        'This is the weakest claim in the view and is stamped accordingly. It rests on an elasticity nobody has tested at this price, so the honest reading is a direction to try rather than a number to commit to a plan.',
      ],
      promotedSection: {
        question: 'What would make this recommendation safe to act on?',
        takeaway: `A test at one price point between $${priceNow.price} and $${priceePeak.price}, on a cohort large enough to measure churn. The curve is directional until a real price has been charged against it.`,
      },
    },
  },
}

// ===========================================================================
// The registry
// ===========================================================================

export function fixtureKey(workflow: WorkflowName, recipeId: RecipeId): string {
  return `${workflow}:${recipeId}`
}

export const VIEW_FIXTURES: Record<string, ViewFixture> = {
  'Activation:funnel_conversion': ACTIVATION_FUNNEL,
  'Retention:state_scorecard': RETENTION_SCORECARD,
  'Retention:cohort_longitudinal': RETENTION_COHORT,

  // One recipe, three balances. `movement_bridge` renders in three workflows and each
  // gets its own fixture — which is exactly why the key is the PAIR and not the
  // recipe: the shape is shared, the subject isn't.
  'Revenue engine:movement_bridge': REVENUE_ARR_BUILD,
  'P&L:movement_bridge': PL_BUILD,
  'Expansion:movement_bridge': EXPANSION_BUILD,

  // The scorecard's second home — no new atom. See the fixture's note.
  'Cost & Burn:state_scorecard': COST_BURN_SCORECARD,

  // The response family's only view, and the last plan-deep pair to land.
  'Monetisation:price_sensitivity': MONETISATION_PRICE,
}
