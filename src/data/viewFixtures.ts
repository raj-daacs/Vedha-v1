// data/viewFixtures.ts
// ---------------------------------------------------------------------------
// The illustrative data behind the rendered Insight Views.
//
// Keyed by `${workspace}:${recipeId}` — the same pair the header, the context pill
// and the family colour all derive from. That's deliberate: a recipe can be a full
// view in one workspace and plan-deep in another (the cohort shape renders on
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
  CohortMatrixData,
  DeepenAnswer,
  SeriesPoint,
} from '../compose/viewModels'
import type { Workspace } from './workspaces'

/** What each beat of a (workspace, recipe) renders, keyed by beat id. */
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
  meta: `Activation workspace · funnel + cohort · last ${WEEKLY_ACTIVATION.length} weeks`,
  beats: {
    stand_trend: {
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

    why_step: {
      subtitle: 'Share of new users reaching each step · New → value moment',
      panels: [{ atom: 'funnel', data: { steps: ONBOARDING_STEPS, finalNote: 'activated' } }],
      takeaway: `The single biggest drop is at Connect data — only ${connectDataPass}% of users who finish Setup get through it, versus 88–92% at every other step. Roughly ${lostAtConnectData} of every 100 signups are lost right here. Fix this one step and the whole funnel lifts.`,
    },

    why_segment: {
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
    stand_trend: {
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
    why_step: {
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
    why_segment: {
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
  meta: `Retention workspace · scorecard · last ${STICKINESS_WEEKS.length} weeks`,
  beats: {
    stand_scorecard: {
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

    stand_trend: {
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
    stand_scorecard: {
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
    stand_trend: {
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
  meta: `Retention workspace · cohort matrix · ${COHORT_QUALITY.length} cohorts × ${NRR_BY_AGE.length} months`,
  beats: {
    stand_curve: {
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
            annotations: [
              { pointIndex: nrrTroughIndex, text: `trough ${NRR_BY_AGE[nrrTroughIndex]}%` },
              { pointIndex: nrrRecoveryIndex, text: `back above ${NRR_BASELINE}%` },
            ],
            unit: '%',
          },
        },
      ],
      takeaway: `The curve dips to ${NRR_BY_AGE[nrrTroughIndex]}% by month ${nrrTroughIndex}, then expansion pulls it back above ${NRR_BASELINE}% at month ${nrrRecoveryIndex} and on to ${nrrMature}% by month ${NRR_BY_AGE.length - 1}. The base grows without new sales — but only after the early contraction is absorbed.`,
    },

    why_matrix: {
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
    stand_curve: {
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
    why_matrix: {
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
// The registry
// ===========================================================================

export function fixtureKey(workspace: Workspace, recipeId: string): string {
  return `${workspace}:${recipeId}`
}

export const VIEW_FIXTURES: Record<string, ViewFixture> = {
  'Activation:funnel_conversion': ACTIVATION_FUNNEL,
  'Retention:state_scorecard': RETENTION_SCORECARD,
  'Retention:cohort_longitudinal': RETENTION_COHORT,
}
