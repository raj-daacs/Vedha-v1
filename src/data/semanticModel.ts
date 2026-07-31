// semanticModel.ts
// ---------------------------------------------------------------------------
// What Vedha "already knows about your business" — the business definitions it
// carries into every answer, so the operator never re-explains them.
//
// In the real product this is the moat (brief: "our semantic model + reasoning
// library"). Here it is a small illustrative table, and it does three jobs:
//
//   1. Supplies TEMPLATE BINDINGS. Recipe beats are written generically —
//      "{goal_metric} across the {period}" — because a recipe is a shape, not a
//      subject. The semantic model is what makes a shape concrete.
//   2. Supplies the SCOPE PANEL's chips — the metrics and ways-to-slice available
//      in this workflow, so the plan can show used-in-plan vs merely available.
//   3. Supplies the resolver's FOCUS vocabulary — the dimensions and members free
//      text can name ("by segment", "the Business tier").
//
// Figures and names are illustrative. Nothing here is fetched — see the loading
// seam at the bottom.
// ---------------------------------------------------------------------------

import type { WorkflowName } from './recipe_schema'

export interface WorkflowSemantics {
  /** The metric the operator is judged on here. Binds `{goal_metric}`. */
  goalMetric: string
  /** The stock a movement/bridge shape opens and closes on. Binds `{balance}`. */
  balance: string
  /** Measures available in this workflow. The goal metric leads. */
  metrics: string[]
  /** Ways to slice — the lateral lenses. Also the resolver's "by <dimension>" set. */
  dimensions: string[]
  /** Monitored levels and ratios, for shapes that watch a state instead of a flow. */
  states: string[]
  /** The bars those states are judged against. */
  benchmarks: string[]
  /**
   * Named members the free text can single out — "should we raise the Business tier
   * price" resolves focus to `Business tier`. A dimension is a way to cut; a member
   * is one slice of one cut.
   *
   * STUB. In the real product these enumerate from the warehouse, so this list is
   * illustrative and deliberately short — enough for the resolver's focus rule to
   * have something to match, not a pretence of completeness.
   */
  focusMembers: string[]
}

export const SEMANTICS: Record<WorkflowName, WorkflowSemantics> = {
  // ---- Financial ---------------------------------------------------------
  'P&L': {
    goalMetric: 'Net Profit',
    balance: 'net profit',
    metrics: ['Net Profit', 'Gross Margin'],
    dimensions: ['cost centre', 'product line'],
    states: ['revenue / COGS / opex'],
    benchmarks: ['gross margin ≥ 75%'],
    focusMembers: ['R&D', 'Sales & Marketing'],
  },

  // ---- Company -----------------------------------------------------------
  'Revenue engine': {
    goalMetric: 'ARR',
    balance: 'ARR',
    metrics: ['ARR', 'Net New ARR'],
    dimensions: ['segment', 'region'],
    states: ['new / expansion / churn'],
    benchmarks: ['net new ARR ≥ plan'],
    focusMembers: ['Enterprise', 'SMB'],
  },
  'Cost & Burn': {
    goalMetric: 'Net Burn',
    balance: 'cash',
    metrics: ['Net Burn', 'Cost to Serve'],
    dimensions: ['cost centre', 'vendor'],
    states: ['runway', 'burn multiple'],
    benchmarks: ['burn multiple ≤ 1.5×'],
    focusMembers: ['Infrastructure', 'Headcount'],
  },

  // ---- Functional --------------------------------------------------------
  Acquisition: {
    goalMetric: 'Lead Conversion Rate',
    balance: 'pipeline',
    metrics: ['Lead Conversion Rate', 'Cost per Lead'],
    dimensions: ['channel', 'campaign'],
    states: ['visitors / leads / MQLs'],
    benchmarks: ['Lead → MQL ≥ 15%'],
    focusMembers: ['paid search', 'organic'],
  },
  Activation: {
    goalMetric: 'Activation Rate',
    balance: 'activated base',
    metrics: ['Activation Rate', 'Time-to-Value'],
    dimensions: ['segment', 'channel'],
    states: ['DAU/WAU/MAU', 'stickiness'],
    benchmarks: ['DAU/MAU ≥ 20%'],
    focusMembers: ['SMB', 'the connect-data step'],
  },
  Retention: {
    goalMetric: 'Net Revenue Retention',
    balance: 'retained ARR',
    metrics: ['Net Revenue Retention', 'Logo Churn'],
    dimensions: ['cohort', 'plan'],
    states: ['active accounts', 'health score'],
    benchmarks: ['NRR ≥ 110%'],
    focusMembers: ['SMB', 'Enterprise'],
  },
  Expansion: {
    goalMetric: 'Expansion ARR',
    balance: 'ARR',
    metrics: ['Expansion ARR', 'Seat Growth'],
    dimensions: ['segment', 'plan'],
    states: ['seats in use', 'feature adoption'],
    benchmarks: ['expansion ≥ 20% of new ARR'],
    focusMembers: ['Enterprise', 'Business tier'],
  },
  Monetisation: {
    // ARPU = MRR ÷ active paid seats. PER SEAT, not per account — the tessera defines
    // it that way because the lever here is the price of a seat.
    //
    // ARPA (revenue per account) is deliberately absent. It is a different denominator
    // answering a different question, and nothing in Monetisation's scope drives it:
    // the drivers below are all per-seat or per-tier. A per-account figure alongside a
    // per-seat goal invites exactly the mismatch it caused when it was here.
    goalMetric: 'ARPU',
    balance: 'ARR',
    metrics: ['ARPU', 'Price realisation', 'Tier mix premium', 'Add-on attach'],
    dimensions: ['plan', 'region'],
    /** Seats, because seats are the ARPU denominator. */
    states: ['paid seats', 'discount depth'],
    benchmarks: ['price realisation ≥ 90%'],
    focusMembers: ['Business tier', 'Enterprise tier'],
  },
}

export function semanticsFor(workflow: WorkflowName): WorkflowSemantics {
  return SEMANTICS[workflow]
}

// ---------------------------------------------------------------------------
// THE LOADING SEAM
// ---------------------------------------------------------------------------

/**
 * Load the semantic model for a workflow. Called when the operator picks a scope,
 * which is the moment the real product would go and fetch.
 *
 * STUBBED THIS SESSION — returns the static table above, synchronously. The seam
 * exists so the call site is already in the right place: picking a workflow is what
 * triggers the fill, not composing a plan, so nothing downstream has to learn to
 * wait later on.
 *
 * When eng wires the real fill, this is the only function that changes shape (to a
 * promise, or to a hook with a loading state). Everything else calls
 * `semanticsFor()` against whatever is resident and stays synchronous.
 */
export function loadSemanticsFor(workflow: WorkflowName): WorkflowSemantics {
  return semanticsFor(workflow)
}
