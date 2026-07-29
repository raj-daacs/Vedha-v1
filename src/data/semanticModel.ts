// semanticModel.ts
// ---------------------------------------------------------------------------
// What Vedha "already knows about your business" — the business definitions it
// carries into every answer, so the operator never re-explains them.
//
// In the real product this is the moat (brief: "our semantic model + reasoning
// library"). Here it is a small illustrative table, and it does two jobs:
//
//   1. Supplies TEMPLATE BINDINGS. Recipe beats are written generically —
//      "{goal_metric} across the {period}" — because a recipe is a shape, not a
//      subject. The semantic model is what makes a shape concrete.
//   2. Supplies the SCOPE PANEL's chips — the metrics and ways-to-slice available
//      in this workspace, so the plan can show used-in-plan vs merely available.
//
// Figures and names are illustrative. Nothing here is fetched.
// ---------------------------------------------------------------------------

import type { Workspace } from './workspaces'

export interface WorkspaceSemantics {
  /** The metric the operator is judged on here. Binds `{goal_metric}`. */
  goalMetric: string
  /** The stock a movement/bridge shape opens and closes on. Binds `{balance}`. */
  balance: string
  /** Measures available in this workspace. The goal metric leads. */
  metrics: string[]
  /** Ways to slice — the lateral lenses. */
  dimensions: string[]
  /** Monitored levels and ratios, for shapes that watch a state instead of a flow. */
  states: string[]
  /** The bars those states are judged against. */
  benchmarks: string[]
}

export const SEMANTICS: Record<Workspace, WorkspaceSemantics> = {
  Acquisition: {
    goalMetric: 'Lead Conversion Rate',
    balance: 'pipeline',
    metrics: ['Lead Conversion Rate', 'Cost per Lead'],
    dimensions: ['channel', 'campaign'],
    states: ['visitors / leads / MQLs'],
    benchmarks: ['Lead → MQL ≥ 15%'],
  },
  Activation: {
    goalMetric: 'Activation Rate',
    balance: 'activated base',
    metrics: ['Activation Rate', 'Time-to-Value'],
    dimensions: ['segment', 'channel'],
    states: ['DAU/WAU/MAU', 'stickiness'],
    benchmarks: ['DAU/MAU ≥ 20%'],
  },
  Retention: {
    goalMetric: 'Net Revenue Retention',
    balance: 'retained ARR',
    metrics: ['Net Revenue Retention', 'Logo Churn'],
    dimensions: ['cohort', 'plan'],
    states: ['active accounts', 'health score'],
    benchmarks: ['NRR ≥ 110%'],
  },
  Expansion: {
    goalMetric: 'Expansion ARR',
    balance: 'ARR',
    metrics: ['Expansion ARR', 'Seat Growth'],
    dimensions: ['segment', 'plan'],
    states: ['seats in use', 'feature adoption'],
    benchmarks: ['expansion ≥ 20% of new ARR'],
  },
  Monetisation: {
    goalMetric: 'ARR',
    balance: 'ARR',
    metrics: ['ARR', 'ARPA'],
    dimensions: ['plan', 'region'],
    states: ['paid accounts', 'discount depth'],
    benchmarks: ['gross margin ≥ 75%'],
  },
}

export function semanticsFor(workspace: Workspace): WorkspaceSemantics {
  return SEMANTICS[workspace]
}
