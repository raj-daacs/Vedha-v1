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

const REVENUE_ARR_BUILD: ViewFixture = {
  subtitle: 'how ARR moved, opening to closing',
  meta: 'Revenue engine workflow · ARR bridge · opening → closing',
  beats: {
    mb_stand: {
      subtitle: 'Opening ARR → movements → closing ARR',
      headline: {
        value: money(ARR_BRIDGE.closing.value),
        delta: { text: `▲ ${money(arrNet)} net new`, tone: 'good' },
        note: `from ${money(ARR_BRIDGE.opening.value)} opening`,
      },
      panels: [{ atom: 'bridge', label: 'ARR build', data: ARR_BRIDGE }],
      takeaway: `ARR closed at ${money(ARR_BRIDGE.closing.value)}, up ${money(arrNet)}. Gross additions of ${money(arrGross)} did the work and ${money(arrLost)} leaked back out — so about ${arrKept}% of what was won was kept.`,
    },

    mb_why: {
      subtitle: 'Which components drove the move · same bridge, movements in focus',
      panels: [
        {
          atom: 'bridge',
          label: 'Components of the move',
          // The same walk, deliberately: "why" isn't a different chart, it's the same
          // bridge read one bar at a time. The projected close rides HERE rather than
          // as its own section — `mb_ahead` is optional on a bending recipe, so the
          // plan doesn't offer it and `beatsInPlan` won't let the view invent it.
          data: { ...ARR_BRIDGE, projected: { label: 'Next close', value: arrProjected } },
        },
      ],
      takeaway: `${arrBiggestCut.label} is the largest single drag at ${money(Math.abs(arrBiggestCut.delta))} — more than Expansion adds at ${money(arrExpansion)}. Holding this quarter's mix puts the next close near ${money(arrProjected)}, which is directional: it assumes the same mix repeats.`,
    },
  },

  deepen: {
    root: {
      scopeLabel: 'deepen · whole view',
      title: 'Ask about this view',
      body: [
        'Ask across the whole bridge, or select a section to scope the question to it.',
        'Bridge questions are usually about one component — which movement, and why it is that size next to the others.',
      ],
    },
    mb_stand: {
      scopeLabel: 'deepen · the balance',
      title: 'The move, start to end — deeper',
      body: [
        `${money(ARR_BRIDGE.opening.value)} opening to ${money(ARR_BRIDGE.closing.value)} closing, a net ${money(arrNet)}.`,
        `The net is small next to the gross: ${money(arrGross)} in, ${money(arrLost)} out. A bridge is the only shape that shows both at once — a trend line would show the ${money(arrNet)} and hide the rest.`,
      ],
      promotedSection: {
        question: 'How much of what we won did we keep?',
        takeaway: `About ${arrKept}%. Gross additions of ${money(arrGross)} against ${money(arrLost)} of contraction and churn, leaving ${money(arrNet)} net.`,
      },
    },
    mb_why: {
      scopeLabel: 'deepen · components',
      title: 'Which components drove it — deeper',
      body: [
        `${arrBiggestCut.label} at ${money(Math.abs(arrBiggestCut.delta))} is the largest reduction, and it outweighs Expansion's ${money(arrExpansion)}.`,
        'New business is carrying the quarter. That is the reading worth acting on: the installed base is not compounding on its own, because retention losses consume most of what expansion adds.',
      ],
      promotedSection: {
        question: 'Is the base compounding without new sales?',
        takeaway: `Not yet. Expansion adds ${money(arrExpansion)} while contraction and churn remove ${money(arrLost)}, so the base is net negative without New. Growth is acquisition-led this quarter.`,
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
  beats: {
    mb_stand: {
      subtitle: 'Opening net profit → movements → closing net profit',
      headline: {
        value: money(PL_BRIDGE.closing.value),
        delta: { text: `▲ ${money(plNet)} vs last quarter`, tone: 'good' },
        note: `from ${money(PL_BRIDGE.opening.value)} opening`,
      },
      panels: [{ atom: 'bridge', label: 'Net profit bridge', data: PL_BRIDGE }],
      takeaway: `Net profit closed at ${money(PL_BRIDGE.closing.value)}, up ${money(plNet)}. Revenue added ${money(plRevenue)} and cost growth took back ${money(plCosts)} of it — so the quarter converted about ${plConversion}% of its revenue gain into profit.`,
    },

    mb_why: {
      subtitle: 'Which lines drove the move · same bridge, components in focus',
      panels: [{ atom: 'bridge', label: 'Components of the move', data: PL_BRIDGE }],
      takeaway: `${plBiggestCut.label} is the largest single drag at ${money(Math.abs(plBiggestCut.delta))} — roughly ${plCutShare}% of all cost growth, more than COGS and R&D together. The increase is concentrated in go-to-market rather than spread across the P&L.`,
    },
  },

  deepen: {
    root: {
      scopeLabel: 'deepen · whole view',
      title: 'Ask about this view',
      body: [
        'Ask across the whole bridge, or select a section to scope the question to it.',
        'On a profit bridge the useful questions are about conversion: how much of the revenue gain reached the bottom line, and what consumed the rest.',
      ],
    },
    mb_stand: {
      scopeLabel: 'deepen · the balance',
      title: 'The move, quarter to quarter — deeper',
      body: [
        `${money(PL_BRIDGE.opening.value)} to ${money(PL_BRIDGE.closing.value)}, a net ${money(plNet)}.`,
        `Revenue is the only positive movement. Every other line is a cost that grew, which is why the closing balance sits much closer to the opening than the ${money(plRevenue)} revenue gain alone would suggest.`,
      ],
      promotedSection: {
        question: 'How much of the revenue gain reached profit?',
        takeaway: `${plConversion}% — ${money(plNet)} of the ${money(plRevenue)} increase, with ${money(plCosts)} absorbed by cost growth.`,
      },
    },
    mb_why: {
      scopeLabel: 'deepen · components',
      title: 'Which lines moved — deeper',
      body: [
        `${plBiggestCut.label} grew ${money(Math.abs(plBiggestCut.delta))}, against ${money(0.11)} in COGS and ${money(0.09)} in R&D.`,
        'Sales and marketing is where the incremental spend went. Whether that was the right call depends on what it bought — which is an Acquisition question, not a P&L one.',
      ],
      promotedSection: {
        question: 'Is cost growth broad or concentrated?',
        takeaway: `Concentrated. ${plBiggestCut.label} accounts for roughly ${plCutShare}% of all cost growth this quarter.`,
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

const EXPANSION_BUILD: ViewFixture = {
  subtitle: 'how net expansion MRR moved this quarter',
  meta: 'Expansion workflow · expansion bridge · opening → closing',
  beats: {
    mb_stand: {
      subtitle: 'Opening expansion MRR → movements → closing',
      headline: {
        value: money(EXPANSION_BRIDGE.closing.value),
        delta: { text: `▲ ${money(expNet)} net`, tone: 'good' },
        note: `from ${money(EXPANSION_BRIDGE.opening.value)} opening`,
      },
      panels: [{ atom: 'bridge', label: 'Net expansion MRR', data: EXPANSION_BRIDGE }],
      takeaway: `Expansion MRR closed at ${money(EXPANSION_BRIDGE.closing.value)}, up ${money(expNet)}. Upsell and cross-sell added ${money(expGross)}; downgrades and churn took back ${money(expLost)}, which is ${expGivenBack}% of everything the motion won.`,
    },

    mb_why: {
      subtitle: 'Which motions drove the move · same bridge, components in focus',
      panels: [{ atom: 'bridge', label: 'Components of the move', data: EXPANSION_BRIDGE }],
      takeaway: `Upsell is doing most of the work at ${money(expUpsell)} — more than twice cross-sell's ${money(expCross)}. Seats are growing faster than product attach, which says where the next motion has room.`,
    },
  },

  deepen: {
    root: {
      scopeLabel: 'deepen · whole view',
      title: 'Ask about this view',
      body: [
        'Ask across the whole bridge, or select a section to scope the question to it.',
        'Expansion questions usually compare the two directions: what the motion won against what the base gave back.',
      ],
    },
    mb_stand: {
      scopeLabel: 'deepen · the balance',
      title: 'The move — deeper',
      body: [
        `${money(EXPANSION_BRIDGE.opening.value)} to ${money(EXPANSION_BRIDGE.closing.value)}, a net ${money(expNet)}.`,
        `Gross expansion of ${money(expGross)} against ${money(expLost)} of downgrade and churn. The net is positive, but the retention side is consuming ${expGivenBack}% of the motion's output.`,
      ],
      promotedSection: {
        question: 'Is expansion outrunning contraction?',
        takeaway: `Yes, but not comfortably: ${money(expGross)} won against ${money(expLost)} lost, a net ${money(expNet)}.`,
      },
    },
    mb_why: {
      scopeLabel: 'deepen · motions',
      title: 'Which motions moved it — deeper',
      body: [
        `Upsell ${money(expUpsell)}, cross-sell ${money(expCross)} — seats are growing faster than product attach.`,
        'That mix matters for where to invest: upsell scales with the existing motion, while cross-sell needs a second product to land. The current split says the second one is under-worked.',
      ],
      promotedSection: {
        question: 'Upsell or cross-sell — which is under-worked?',
        takeaway: `Cross-sell. It contributes ${money(expCross)} against upsell's ${money(expUpsell)} — about ${crossVsUp}% as much, into a comparable installed base.`,
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
}
