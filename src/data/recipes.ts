// recipes.ts
// ---------------------------------------------------------------------------
// The recipe book — four composition recipes, derived from report validation
// (board rows 1–4). Transcribed field-for-field from `vedha_recipes.yaml`.
//
// A recipe = the plan skeleton; routing (fills_from -> RS nodes) = the flesh.
//
// TRANSCRIPTION RULE: this file is data, not design. If it disagrees with the
// YAML, the YAML wins. Anything invented for the prototype lives BELOW the
// recipe array (see WORKSPACE_RECIPES) so the port stays auditable.
// The one exception is `displayLabel`, an explicit extension — see recipeTypes.ts.
// ---------------------------------------------------------------------------

import type { Recipe, RecipeBook } from './recipeTypes'
import type { Workspace } from './workspaces'

export const RECIPES: RecipeBook = [
  {
    id: 'funnel_conversion',
    name: 'Funnel (conversion)',
    family: 'flow',
    spine: {
      family: 'flow',
      rendered_as: 'funnel',
      input: 'new users / leads / visitors',
      work: 'the onboarding or acquisition funnel steps',
      output: 'activated users / new customers',
    },
    trigger: {
      shape: ['funnel'],
      goal_metric_kind: 'rate',
      intent_signals: [
        'where are we losing people',
        'conversion / drop-off',
        'onboarding / activation trend',
        'which step',
        'funnel',
        // ADDED — not yet in vedha_recipes.yaml; sync back when it's next edited.
        // Disambiguation signals, needed now that Activation offers a choice
        // between the funnel and the cohort shape. Some overlap alternates inside
        // the compound signals above ('conversion', 'drop-off', 'onboarding');
        // overlapping hits only add score to this same recipe, so they can't
        // skew a comparison against another one.
        'conversion',
        'losing people',
        'where we lose',
        'drop-off',
        'activate',
        'onboarding',
      ],
    },
    four_question_fit: 'hold',
    narration_note:
      'Four questions hold cleanly — the funnel is a flow and each question maps to a stage of it. This is the reference case for the flow family.',
    beats: [
      {
        id: 'stand_trend',
        category: 'stand',
        question: '{goal_metric} across the {period}',
        reads: ['{goal_metric}', 'cohort / period', 'target'],
        builds: 'Trend line + headline number vs target',
        atoms: ['trend', 'headline_vs_target'],
        fills_from: ['RS1_orient', 'RS4_temporal'],
        confidence: 'from_data',
        optional: false,
      },
      {
        id: 'why_step',
        category: 'why',
        question: 'Which step is leaking?',
        reads: ['funnel steps', 'step conversions'],
        builds: 'Full funnel, worst step marked',
        atoms: ['funnel', 'step_conversion'],
        fills_from: ['RS8_shape_native', 'RS2_structural'],
        confidence: 'from_data',
        optional: false,
      },
      {
        id: 'why_segment',
        category: 'why',
        question: 'Which segment is worst at that step?',
        reads: ['the leaking step', 'ICP / segment dimension'],
        builds: 'Ranked bars vs the average',
        atoms: ['ranked_comparison'],
        // RS3/RS5 = the dimensional route CF-1 says orient can't reach.
        // The recipe hard-composes this beat, so it's reachable here.
        fills_from: ['RS3_dimensional', 'RS5_dimensional_compare'],
        confidence: 'from_data',
        optional: false,
      },
      {
        id: 'ahead_projection',
        category: 'ahead',
        question: 'Projected lift if the worst step is fixed',
        reads: ['worst-step conversion', '{goal_metric}'],
        builds: 'Projection of the goal metric under a fixed-step scenario',
        atoms: ['projection'],
        fills_from: ['RS7_forecast'],
        confidence: 'directional',
        optional: true,
        include_when: 'user asks what-if / forecast, or the leak is actionable',
      },
    ],
    producibility: 'yes',
    requires: [],
    validated_by: 'Row 2 · Top of Funnel (+ Activation)',
  },

  {
    id: 'movement_bridge',
    name: 'Movement (bridge / waterfall)',
    family: 'flow',
    spine: {
      family: 'flow',
      rendered_as: 'bridge',
      input: 'opening balance (ARR / MRR / seats)',
      work: 'new + expansion − contraction − churn',
      output: 'closing balance',
    },
    trigger: {
      shape: ['bridge'],
      goal_metric_kind: 'movement',
      intent_signals: [
        'ARR build / MRR movement',
        'what moved / net new',
        'bridge / waterfall',
        'opening to closing',
        'between two periods',
      ],
    },
    four_question_fit: 'bend',
    narration_note:
      'Four questions ride ON the bridge rather than replace it: stand = closing, why = which component moved, ahead = forecast off the build, do = which lever.',
    beats: [
      {
        id: 'stand_movement',
        category: 'stand',
        question: 'How {balance} moved from opening to closing',
        reads: ['opening / closing balance', 'the ± components'],
        builds: 'Waterfall (opening → +adds − losses → closing) + net + NRR/GRR',
        atoms: ['waterfall', 'component_ratio', 'nrr_grr'],
        fills_from: ['RS1_orient', 'RS2_structural'],
        confidence: 'from_data',
        optional: false,
      },
      {
        id: 'why_component',
        category: 'why',
        question: 'Which component moved the balance most?',
        reads: ['the ± components', 'prior-period components'],
        builds: 'Component decomposition + which lever improved or worsened',
        atoms: ['component_ratio', 'trend'],
        fills_from: ['RS2_structural', 'RS4_temporal'],
        confidence: 'from_data',
        optional: false,
      },
      {
        id: 'ahead_forecast',
        category: 'ahead',
        question: 'Projected closing next {period} on current run-rate',
        reads: ['component run-rates', 'opening balance'],
        builds: 'Forecast closing from the build components',
        atoms: ['projection'],
        fills_from: ['RS7_forecast'],
        confidence: 'directional',
        optional: true,
        include_when: "leadership / board ritual, or user asks what's ahead",
      },
      {
        id: 'do_lever',
        category: 'do',
        question: 'Which lever to pull',
        reads: ['worst-moving component', 'its owning space'],
        builds: 'The binding component and where it routes (space handoff)',
        atoms: ['narration'],
        fills_from: ['RS9_focus'],
        confidence: 'from_data',
        optional: true,
        include_when: 'a component is clearly binding',
      },
    ],
    producibility: 'needs_atom',
    requires: [
      'GAP-A1 bridge / waterfall atom',
      'GAP-A2 component-ratio & NRR/GRR',
      'GAP-J1 cross-space join',
    ],
    validated_by: 'Row 1 · ARR Build',
  },

  {
    id: 'cohort_longitudinal',
    name: 'Cohort (longitudinal)',
    family: 'flow',
    spine: {
      family: 'flow',
      rendered_as: 'cohort',
      input: "each cohort's starting base",
      work: 'retain + expand − contract − churn over time',
      output: 'base at month N',
    },
    trigger: {
      shape: ['cohort'],
      goal_metric_kind: 'retention',
      intent_signals: [
        'retention / NRR',
        'cohort / by signup month',
        'are cohorts improving',
        'decay / churn over time',
        // ADDED — not yet in vedha_recipes.yaml; sync back when it's next edited.
        // The cohort shape is now selectable from Activation as well as Retention,
        // so it needs signals that name it directly rather than only via retention.
        'cohort',
        'by signup week',
        'maturing',
        'retention curve',
        'nrr by age',
        'decay',
      ],
    },
    four_question_fit: 'bend',
    narration_note:
      'Four questions ride on the matrix: stand = current NRR curve, why = which cohorts / where decay, ahead = project the curve, do = intervene at steepest decay.',
    beats: [
      {
        id: 'stand_curve',
        category: 'stand',
        question: 'Where net revenue retention stands over cohort age',
        reads: ['revenue retention / NRR', 'cohort age'],
        builds: 'Net-retention curve vs the 100% line',
        atoms: ['retention_curve'],
        fills_from: ['RS1_orient', 'RS4_temporal'],
        confidence: 'from_data',
        optional: false,
      },
      {
        id: 'why_matrix',
        category: 'why',
        question: 'Which cohorts decay, and where?',
        reads: ['cohort × age matrix', 'segment / plan'],
        builds: 'Cohort matrix (left-adjusted; right-adjusted for business-wide shifts)',
        atoms: ['cohort_matrix', 'cohort_matrix_right_adjusted'],
        fills_from: ['RS8_shape_native', 'RS3_dimensional'],
        confidence: 'from_data',
        optional: false,
      },
      {
        id: 'ahead_projection',
        category: 'ahead',
        question: 'Projected retention for immature cohorts',
        reads: ['mature-cohort curve', 'immature cohort ages'],
        builds: 'Projection of immature cohorts along the mature curve',
        atoms: ['projection'],
        fills_from: ['RS7_forecast'],
        confidence: 'directional',
        optional: true,
        include_when: "recent cohorts are immature, or user asks what's ahead",
      },
      {
        id: 'do_intervene',
        category: 'do',
        question: 'Where to intervene',
        reads: ['steepest-decay age / segment'],
        builds: 'The age / segment with the steepest decay',
        atoms: ['narration'],
        fills_from: ['RS9_focus'],
        confidence: 'from_data',
        optional: true,
        include_when: 'a decay point is clearly worst',
      },
    ],
    producibility: 'needs_orientation',
    requires: [
      'GAP-A3 right-adjusted cohort orientation',
      'GAP-A4 net-retention curve (partial)',
    ],
    validated_by: 'Row 3 · Cohort Analysis',
  },

  {
    id: 'state_scorecard',
    name: 'State scorecard (ratio / stickiness)',
    family: 'state',
    // EXTENSION: the operator's word for this subject, and the one workspace where
    // that word is true. Listed in WORKSPACE_RECIPES under Retention only, so the
    // label can never render somewhere it would contradict the context pill.
    displayLabel: 'Product engagement',
    displayLabelWorkspace: 'Retention',
    spine: {
      family: 'state',
      rendered_as: 'scorecard',
      state: 'engagement — levels (DAU/WAU/MAU) and stickiness ratios',
      benchmark: 'DAU/MAU ≥ 20% (B2B) and other per-ratio benchmarks',
    },
    trigger: {
      shape: ['scorecard'],
      goal_metric_kind: 'ratio',
      intent_signals: [
        'engagement / stickiness',
        'DAU/MAU / MAU WAU DAU',
        'how active / are we sticky',
        'product health',
        // ADDED — not yet in vedha_recipes.yaml; sync back when the YAML is next edited.
        //
        // A vague "where do we stand" is a STATE question: the operator wants levels
        // against a bar, not a specific analysis. Without these, such asks fell
        // through to whichever recipe an incidental word happened to brush — "this
        // month status" resolved to the cohort shape on the strength of "month"
        // alone. The state family is the right home for the generic reading, since
        // its four questions already collapse toward "where do we stand".
        // The bare terms matter: 'are we sticky' only fires on that exact word
        // order, so "how sticky are we" used to match nothing at all.
        'sticky',
        'stickiness',
        'engagement',
        'health',
        'how are we doing',
        'where do we stand',
        'status',
      ],
    },
    four_question_fit: 'collapse',
    narration_note:
      'No input→work→output. The four questions collapse toward "where do we stand vs benchmark"; why/ahead/do go thin, and "ahead" is special — the state PREDICTS a downstream flow (retention) rather than being forecast itself.',
    beats: [
      {
        id: 'stand_scorecard',
        category: 'stand',
        question: 'Where engagement stands vs benchmark',
        reads: ['levels (DAU/WAU/MAU)', 'stickiness ratios', 'benchmarks'],
        builds: 'Scorecard of levels + ratios, each flagged vs its benchmark',
        atoms: ['scorecard', 'ratio_vs_benchmark'],
        fills_from: ['RS1_orient', 'A4_silence'],
        confidence: 'from_data',
        optional: false,
      },
      {
        id: 'stand_trend',
        category: 'stand',
        question: 'Is stickiness holding, improving, or drifting?',
        reads: ['stickiness ratio over time', 'benchmark line'],
        builds: 'Ratio trend vs the benchmark line',
        atoms: ['trend', 'ratio_vs_benchmark'],
        fills_from: ['RS4_temporal'],
        confidence: 'from_data',
        optional: false,
      },
      {
        id: 'why_decompose',
        category: 'why',
        question: "What's moving the ratio?",
        reads: ['ratio by segment / feature'],
        builds: 'Ranked contribution by segment or feature',
        atoms: ['ranked_comparison'],
        fills_from: ['RS3_dimensional'],
        confidence: 'from_data',
        optional: true,
        include_when: 'the ratio has meaningfully moved',
      },
      {
        id: 'ahead_leading',
        category: 'ahead',
        question: 'What this predicts for retention',
        reads: ['stickiness now', 'historical stickiness → retention link'],
        builds: 'Leading-indicator read: engagement now → retention later',
        atoms: ['leading_indicator_link'],
        // F = leading-indicator route CF-7 says orient can't reach; recipe composes it.
        fills_from: ['RS7_forecast', 'F_leading_indicator'],
        confidence: 'directional',
        optional: true,
        include_when: 'a stickiness → retention relationship exists in the data',
      },
    ],
    producibility: 'needs_atom',
    requires: ['GAP-A5 ratio-vs-benchmark scorecard atom', 'GAP-F1 leading-indicator link'],
    validated_by: 'Row 4 · Product Engagement',
  },
]

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

export type RecipeId = (typeof RECIPES)[number]['id']

export const RECIPES_BY_ID: Record<string, Recipe> = Object.fromEntries(
  RECIPES.map((r) => [r.id, r]),
)

export function getRecipe(id: string): Recipe | undefined {
  return RECIPES_BY_ID[id]
}

/** The label to show an operator: the recipe's own word for its subject. */
export function recipeSubject(recipe: Recipe): string {
  return recipe.displayLabel ?? recipe.name
}

// ---------------------------------------------------------------------------
// PROTOTYPE ADDITION — not from the YAML.
//
// WHICH RECIPES A WORKSPACE CAN PRODUCE. This is a HARD CONSTRAINT, not a nudge:
// the operator picks a workspace before they ask, and that choice is
// authoritative. Free text refines *within* this set; it cannot escape it.
//
// Why it has to be hard. When workspace was only a scoring bonus, "show me this
// month status" on Acquisition could resolve to the Product-engagement scorecard —
// leaving the header saying "Product engagement", the context pill saying
// "Acquisition", and the plan describing engagement. Three things disagreeing
// about what the operator was looking at. A plan that contradicts its own context
// label is worse than no plan, so an ask that names a shape this workspace doesn't
// produce is a no-match (and `selectRecipe` reports where it *would* have matched).
//
// `RecipeTrigger` has no workspace field — the schema selects on report SHAPE — so
// this lives outside the ported recipe objects and the transcription above stays
// faithful.
//
// ORDER IS MEANINGFUL. First entry is the workspace's native shape and earns the
// larger prior; later entries are plausible-but-secondary.
//
// NOTE ON `displayLabel`: `state_scorecard` carries `displayLabel: 'Product
// engagement'`, so it is listed under Activation ONLY. That keeps the label
// truthful by construction — the recipe can never be selected somewhere its own
// name would contradict the context pill. If a future recipe carries a
// displayLabel AND spans workspaces, that guarantee breaks and `subjectOf()` in
// the compose layer will need to gate the label on the workspace matching.
// ---------------------------------------------------------------------------

export const WORKSPACE_RECIPES: Record<Workspace, string[]> = {
  // Leads in, qualified out. One shape, so an on-domain ask here resolves to it.
  Acquisition: ['funnel_conversion'],
  // Onboarding is a funnel; signup cohorts maturing over time is a cohort. Two
  // shapes, so the text has to say which — hence the disambiguation signals above.
  Activation: ['funnel_conversion', 'cohort_longitudinal'],
  // Retention is longitudinal first, and it's where engagement is monitored as a
  // state. This is the scorecard's home — see the displayLabel note above.
  Retention: ['cohort_longitudinal', 'state_scorecard'],
  // Expansion opens and closes on a balance; that's a bridge.
  Expansion: ['movement_bridge'],
  // So does revenue.
  Monetisation: ['movement_bridge'],
}
