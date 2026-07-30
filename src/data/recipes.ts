// recipes.ts — Vedha recipe layer · data. Consumes recipe_schema.ts.
// The single source of truth the prototype reads: the five recipes, the eight-workflow
// scope catalog (eligibility · primary · defaults · prompt chips), and resolver cue tables.

import type {
  Recipe, RecipeBook, RecipeId, WorkflowConfig, WorkflowName, Altitude, Output,
} from './recipe_schema';

// =====================================================================
// 1 · THE FIVE RECIPES
// =====================================================================
export const RECIPES: RecipeBook = [
  {
    id: 'funnel_conversion',
    name: 'Funnel (conversion)',
    family: 'flow',
    spine: { input: 'entrants', work: 'funnel steps', output: 'converted' },
    trigger: {
      shape: 'funnel',
      goal_metric_kind: 'rate / conversion',
      intent_signals: ['funnel', 'conversion', 'losing people', 'where we lose', 'drop-off', 'activate', 'onboarding', 'top of funnel'],
    },
    beats: [
      { id: 'fc_stand', category: 'stand', question: 'Where the rate stands vs target', reads: ['goal rate', 'target'], builds: 'trend + headline vs target', atoms: ['Trend'], confidence: 'from_data' },
      { id: 'fc_why_step', category: 'why', question: 'Which step leaks most?', reads: ['funnel steps'], builds: 'full funnel, worst step marked', atoms: ['Funnel'], confidence: 'from_data' },
      { id: 'fc_why_seg', category: 'why', question: 'Which segment is worst at that step?', reads: ['leak step', 'segment'], builds: 'ranked segment bars', atoms: ['RankedBars'], fills_from: ['RS3', 'RS5'], confidence: 'from_data' },
      { id: 'fc_ahead', category: 'ahead', question: 'Projected rate if the leak is fixed', reads: ['leak step', 'elasticity'], builds: 'projection', atoms: ['Trend'], confidence: 'directional', optional: true },
    ],
    four_question_fit: 'hold',
    narration_note: 'All four questions hold their own beat, in order.',
    producibility: 'yes',
    requires: [],
  },
  {
    id: 'cohort_longitudinal',
    name: 'Cohort (longitudinal)',
    family: 'flow',
    spine: { input: 'cohort base', work: 'retain +expand −contract −churn over age', output: 'base at age N' },
    trigger: {
      shape: 'cohort',
      goal_metric_kind: 'rate over cohort age',
      intent_signals: ['cohort', 'by signup week', 'maturing', 'retention curve', 'nrr by age', 'decay'],
    },
    beats: [
      { id: 'co_stand', category: 'stand', question: 'Where the metric stands over cohort age', reads: ['metric', 'cohort age'], builds: 'curve vs baseline', atoms: ['Trend', 'NrrCurve'], confidence: 'from_data' },
      { id: 'co_why', category: 'why', question: 'Which cohorts decay, and where?', reads: ['cohort × age matrix'], builds: 'cohort matrix', atoms: ['CohortMatrix'], confidence: 'from_data' },
      { id: 'co_ahead', category: 'ahead', question: 'Projected mature value', reads: ['immature cohorts'], builds: 'projection', atoms: ['NrrCurve'], confidence: 'directional', optional: true },
    ],
    four_question_fit: 'bend',
    narration_note: 'Questions bend to a stock shape — "why" becomes "which cohort".',
    producibility: 'needs_orientation',
    requires: ['GAP-A3', 'GAP-A4'],
  },
  {
    id: 'state_scorecard',
    name: 'State scorecard (ratio / stickiness)',
    family: 'state',
    spine: {}, // none — the collapse falls out of an absent spine
    trigger: {
      shape: 'scorecard',
      goal_metric_kind: 'ratio / level vs benchmark',
      intent_signals: ['sticky', 'stickiness', 'engagement', 'health', 'how are we doing', 'where do we stand', 'status', 'dau/mau', 'dau', 'wau', 'mau', 'active users', 'daily active'],
    },
    beats: [
      { id: 'ss_stand_level', category: 'stand', question: 'Where it stands vs benchmark', reads: ['levels', 'ratios', 'benchmark'], builds: 'scorecard of levels + ratios, each flagged', atoms: ['Scorecard'], confidence: 'from_data' },
      { id: 'ss_stand_trend', category: 'stand', question: 'Holding, improving, or drifting?', reads: ['ratio over time', 'benchmark line'], builds: 'ratio trend vs benchmark', atoms: ['StickinessTrend'], confidence: 'from_data' },
      { id: 'ss_why', category: 'why', question: "What's moving the ratio?", reads: ['drivers'], builds: 'thin — drivers of the ratio', atoms: [], confidence: 'directional', optional: true },
      { id: 'ss_ahead', category: 'ahead', question: 'What this predicts', reads: ['leading indicator'], builds: 'thin — leading-indicator read', atoms: [], confidence: 'directional', optional: true },
    ],
    four_question_fit: 'collapse',
    narration_note: 'Questions collapse toward "stand vs benchmark"; why/ahead go thin — the thinning is the finding.',
    producibility: 'needs_atom',
    requires: ['GAP-A5', 'GAP-F1'],
    displayLabel: 'Product engagement',
    displayLabelWorkspace: 'Retention',
  },
  {
    id: 'movement_bridge',
    name: 'Movement (bridge / waterfall)',
    family: 'flow',
    spine: { input: 'opening balance', work: '+adds −reductions', output: 'closing balance' },
    trigger: {
      shape: 'bridge',
      goal_metric_kind: 'balance movement',
      intent_signals: ['bridge', 'waterfall', 'arr build', 'mrr movement', 'net new', 'how did', 'move', 'expansion', 'contraction'],
    },
    beats: [
      // The waterfall FUSES stand + top-level why: it shows the net move AND its components at once.
      { id: 'mb_move', category: 'stand', question: 'How {metric} moved, opening to closing', reads: ['opening balance', 'closing balance', 'movement components'], builds: 'waterfall — net movement and its components in one view', atoms: ['Bridge'], confidence: 'from_data' },
      // The ADDITIONAL why is the dimensional split of the dominant component (not a second waterfall). Optional: only where a slicing dimension is meaningful.
      { id: 'mb_why_dim', category: 'why', question: 'Which {dimension} drove the biggest component?', reads: ['dominant component', 'segment'], builds: 'ranked breakdown of the dominant component by dimension', atoms: ['RankedBars'], fills_from: ['RS3', 'RS5'], confidence: 'from_data', optional: true },
      { id: 'mb_ahead', category: 'ahead', question: 'Projected next-period balance', reads: ['run-rate'], builds: 'waterfall with a projected closing bar', atoms: ['Bridge'], confidence: 'directional', optional: true },
    ],
    four_question_fit: 'bend',
    narration_note: 'The waterfall fuses "where we stand" and the top-level "why" (it shows the net move and its components at once), so it renders ONCE. The additional "why" is the dimensional split of the dominant component (ranked bars, optional). Never render the waterfall twice.',
    producibility: 'needs_atom',
    requires: ['GAP-A1', 'GAP-A2', 'GAP-J1'],
  },
  {
    id: 'price_sensitivity',
    name: 'Price sensitivity (elasticity / response)',
    family: 'response',
    spine: { lever: 'price / packaging', response: 'revenue under WTP', constraint: 'churn risk' },
    trigger: {
      shape: 'sensitivity',
      goal_metric_kind: 'lever / price',
      intent_signals: ['price', 'pricing', 'elasticity', 'willingness to pay', 'wtp', 'discount', 'raise price', 'packaging'],
    },
    beats: [
      { id: 'ps_stand', category: 'stand', question: 'Where ARPU & price realisation stand', reads: ['ARPU', 'list price', 'realized price'], builds: 'price scorecard', atoms: ['Scorecard'], confidence: 'from_data' },
      { id: 'ps_why', category: 'why', question: 'How does revenue respond to price?', reads: ['elasticity', 'WTP'], builds: 'response / elasticity curve', atoms: ['ResponseCurve'], confidence: 'directional' },
      { id: 'ps_ahead', category: 'ahead', question: 'Revenue at candidate price points', reads: ['response curve'], builds: 'projection at price points', atoms: ['ResponseCurve'], confidence: 'directional' },
      { id: 'ps_do', category: 'do', question: 'Recommended move + expected Δrevenue, churn risk', reads: ['optimum', 'constraint'], builds: 'recommendation', atoms: ['Recommendation'], confidence: 'directional' },
    ],
    four_question_fit: 'extend',
    narration_note: 'Questions extend toward "what do we do" — the recommendation is the native output.',
    producibility: 'needs_atom',
    requires: ['CF-10'],
  },
];

export const RECIPES_BY_ID = Object.fromEntries(
  RECIPES.map((r) => [r.id, r]),
) as Record<RecipeId, Recipe>;

export function getRecipe(id: RecipeId): Recipe {
  return RECIPES_BY_ID[id];
}

// =====================================================================
// 2 · THE SCOPE CATALOG — altitude -> workflow -> eligibility / primary / defaults
// =====================================================================
export const ALTITUDES: Altitude[] = ['Financial', 'Company', 'Functional'];

export const WORKFLOWS: WorkflowConfig[] = [
  {
    name: 'P&L', level: 'Financial',
    eligible: ['movement_bridge'], primary: 'movement_bridge',
    outputDefault: 'review', periodDefault: 'quarter',
    examplePrompts: ['Net profit this quarter', 'Board readout of the P&L'],
  },
  {
    name: 'Revenue engine', level: 'Company',
    eligible: ['movement_bridge'], primary: 'movement_bridge',
    outputDefault: 'review', periodDefault: 'month',
    examplePrompts: ['How did ARR move last quarter', 'MRR bridge, by segment'],
  },
  {
    name: 'Cost & Burn', level: 'Company',
    eligible: ['state_scorecard'], primary: 'state_scorecard',
    outputDefault: 'review', periodDefault: 'month',
    examplePrompts: ['Where does burn stand vs plan', 'Cost-to-serve this month'],
  },
  {
    name: 'Acquisition', level: 'Functional',
    eligible: ['funnel_conversion'], primary: 'funnel_conversion',
    outputDefault: 'report', periodDefault: 'week',
    examplePrompts: ['Top of funnel this month', 'Which channel is converting best'],
  },
  {
    name: 'Activation', level: 'Functional',
    eligible: ['funnel_conversion', 'cohort_longitudinal'], primary: 'funnel_conversion',
    outputDefault: 'report', periodDefault: 'week',
    examplePrompts: ["Activation trend, where we're losing people", 'How are signup cohorts maturing'],
  },
  {
    name: 'Retention', level: 'Functional',
    // primary = cohort (retention is the goal); engagement scorecard is the signal-triggered secondary
    eligible: ['cohort_longitudinal', 'state_scorecard'], primary: 'cohort_longitudinal',
    outputDefault: 'report', periodDefault: 'month',
    examplePrompts: ['How is retention holding by cohort', 'How sticky is the product'],
  },
  {
    name: 'Expansion', level: 'Functional',
    eligible: ['movement_bridge'], primary: 'movement_bridge',
    outputDefault: 'report', periodDefault: 'quarter',
    examplePrompts: ['Net expansion MRR this quarter', 'Expansion vs contraction, by segment'],
  },
  {
    name: 'Monetisation', level: 'Functional',
    eligible: ['price_sensitivity'], primary: 'price_sensitivity',
    outputDefault: 'report', periodDefault: 'quarter',
    examplePrompts: ['Should we raise the Business tier price', 'ARPU and price realisation'],
  },
];

export const WORKFLOWS_BY_NAME = Object.fromEntries(
  WORKFLOWS.map((w) => [w.name, w]),
) as Record<WorkflowName, WorkflowConfig>;

export function getWorkflow(n: WorkflowName): WorkflowConfig {
  return WORKFLOWS_BY_NAME[n];
}
export function workflowsForLevel(level: Altitude): WorkflowConfig[] {
  return WORKFLOWS.filter((w) => w.level === level);
}
export function recipesForWorkflow(n: WorkflowName): Recipe[] {
  return getWorkflow(n).eligible.map(getRecipe);
}
export function primaryRecipe(n: WorkflowName): Recipe {
  return getRecipe(getWorkflow(n).primary);
}

// =====================================================================
// 3 · RESOLVER CUE TABLES (Stage A reference data; the resolver itself is separate code)
// =====================================================================
export const OUTPUT_CUES: Record<Output, string[]> = {
  quick_answer: ['quick', 'quick answer', 'just the number', 'one number', 'tl;dr', 'in a line'],
  report: ['report', 'full', 'deep dive', 'break it down', 'details'],
  review: ['review', 'pacing', 'vs last', 'since last', 'how are we tracking', 'how are we pacing'],
  readout: ['readout', 'board', 'for the board', 'exec summary', 'presentation', 'deck'],
};

// Longest-match wins; keys checked as substrings of the normalized intent.
export const PERIOD_CUES: Record<string, string> = {
  'this week': 'week', 'last week': 'week',
  'this month': 'month', 'last month': 'month',
  'this quarter': 'quarter', 'last quarter': 'quarter',
  'this year': 'year', 'last year': 'year', 'ytd': 'year',
  'q1': 'quarter', 'q2': 'quarter', 'q3': 'quarter', 'q4': 'quarter',
};
