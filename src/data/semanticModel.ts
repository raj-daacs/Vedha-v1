// semanticModel.ts
// ---------------------------------------------------------------------------
// What Vedha "already knows about your business" — the business definitions it
// carries into every answer, so the operator never re-explains them.
//
// In the real product this is the moat (brief: "our semantic model + reasoning
// library"). Here it does three jobs:
//
//   1. Supplies TEMPLATE BINDINGS. Recipe beats are written generically —
//      "{goal_metric} across the {period}" — because a recipe is a shape, not a
//      subject. The semantic model is what makes a shape concrete.
//   2. Supplies the SCOPE PANEL's chips — the metrics and ways-to-slice available
//      in this workflow, so the plan can show used-in-plan vs merely available.
//   3. Supplies the resolver's FOCUS vocabulary — the dimensions and members free
//      text can name ("by segment", "the Business tier").
//
// ── THE LOADING SEAM IS NOW WIRED ────────────────────────────────────────────
// This file used to hold one static table and a `loadSemanticsFor` stub marked
// "when eng wires the real fill, this is the only function that changes shape".
// That fill has arrived: the business team owns `workflowDefinitions.json`, and
// `definitionRegistry.ts` loads it — fetched at boot from `public/workflows.json` so
// the file can be REPLACED ON A BUILT SITE without a rebuild.
//
// TWO TIERS, ONE DIRECTION. The JSON is the SOURCE OF RECORD. `WorkflowSemantics` is
// the DERIVED view every consumer reads, and its published fields are UNCHANGED from
// the static version on purpose — `composePlan`, `composeView`, `resolve` and
// `textScoring` all keep working against the same shape, and none of them learns that
// a file exists.
//
// NOTHING HERE MAY THROW ON BAD DATA. The file gets replaced wholesale, so every
// lookup has a stated fallback and REPORTS what it fell back to. Silent coercion
// would leave someone reading defaulted numbers as though they were their own. The
// only exception is reading the registry before boot, which is a programming error
// rather than a data one.
// ---------------------------------------------------------------------------

import { allDefinitions, definitionsEpoch, findDefinition } from './definitionRegistry'
import type { Issue, WorkflowDefinition } from './definitionSchema'
import type { WorkflowName } from './recipe_schema'

export type { DimensionDecl, GoalDecl, MeasureDecl, WorkflowDefinition } from './definitionSchema'

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
   * NO LONGER A STUB. These used to be two hand-written examples per workflow, enough
   * for the resolver's focus rule to have something to match. They now come from the
   * declared VALUES of the declared dimensions, so the vocabulary the resolver can
   * recognise is exactly the vocabulary the business model defines.
   */
  focusMembers: string[]
  /** The full business definition — tiers, dimension values, lifecycle steps. */
  definition: WorkflowDefinition
}

// ---------------------------------------------------------------------------
// DERIVATION ISSUES
// ---------------------------------------------------------------------------

/**
 * Problems found while DERIVING from the definitions, as opposed to while parsing
 * them. Parse issues come from the normaliser; these come from the app asking for
 * something the file doesn't have — a dimension a view wanted, a lifecycle a funnel
 * needed. Collected rather than thrown, and surfaced beside the parse issues.
 */
const derivationIssues: Issue[] = []
const seenIssues = new Set<string>()
const semanticsCache = new Map<string, WorkflowSemantics>()

/**
 * Drop everything derived when a different definitions payload is loaded.
 *
 * Without this, a re-init (a script checking a candidate file, a second boot in the
 * same process) would keep serving semantics computed from the previous model and keep
 * reporting issues that belong to it — the worst kind of wrong, because the numbers
 * would look settled.
 */
let cacheEpoch = -1
function ensureFresh(): void {
  const epoch = definitionsEpoch()
  if (epoch === cacheEpoch) return
  cacheEpoch = epoch
  semanticsCache.clear()
  derivationIssues.length = 0
  seenIssues.clear()
}

function reportDerivation(severity: Issue['severity'], where: string, message: string): void {
  // Deduped: these fire from render paths that run many times, and the same missing
  // dimension reported forty times would bury everything else.
  const fingerprint = `${severity}|${where}|${message}`
  if (seenIssues.has(fingerprint)) return
  seenIssues.add(fingerprint)
  derivationIssues.push({ severity, where, message })
}

export function derivationIssueList(): Issue[] {
  ensureFresh()
  return derivationIssues
}

/**
 * Report a derivation issue from another module in the data layer, so the banner can
 * show one list and a reader doesn't have to know which file noticed the problem.
 */
export function reportDataIssue(severity: Issue['severity'], where: string, message: string): void {
  reportDerivation(severity, where, message)
}

// ---------------------------------------------------------------------------
// WHAT THE JSON DOESN'T CARRY
// ---------------------------------------------------------------------------

/**
 * NOT FROM THE BUSINESS TEAM'S JSON — the prototype's own values for the three fields
 * the recipe layer binds and the file has no field for:
 *
 *   `balance`     binds `{balance}` in `movement_bridge`'s beat ("How {balance} moved
 *                 from opening to closing"). NOT the goal metric: Monetisation's goal
 *                 is ARPU, and ARPU is a ratio, not a stock you can open and close a
 *                 bridge on.
 *   `states`      the scorecard's `state` facet.
 *   `benchmarks`  the scorecard's `benchmark` facet. A benchmark carries a THRESHOLD —
 *                 "DAU/MAU ≥ 20%" — and the threshold is what makes it a bar to judge
 *                 against. The JSON's `guardrails` name a metric and state no
 *                 threshold, so they don't substitute.
 *
 * THIS IS THE PREVIOUS STATIC TABLE, KEPT DELIBERATELY RATHER THAN TRIMMED TO THOSE
 * THREE FIELDS. It has a second job now: it is the whole-workflow fallback for a
 * workflow the catalog routes but the business file doesn't declare. `Cost & Burn` is
 * exactly that case today — it is in `WORKFLOWS` with eligible recipes, and the file
 * has no entry for it, so without this table picking it would render a plan with a
 * blank subject.
 *
 * When the team supplies balance / states / benchmarks in the JSON, delete the field.
 */
type CarriedSemantics = Omit<WorkflowSemantics, 'definition'>

const CARRIED: Record<WorkflowName, CarriedSemantics> = {
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
    // MRR, not ARR: the team's goal metric here is "Net Expansion MRR", and
    // `{balance}` renders straight into the beat's question above a bridge drawn in
    // MRR. ARR had the heading and the chart naming two different quantities.
    balance: 'MRR',
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

function carriedFor(workflow: string): CarriedSemantics | undefined {
  return CARRIED[workflow as WorkflowName]
}

/**
 * A blank-but-valid definition for a workflow the JSON doesn't declare.
 *
 * Reachable two ways: `Cost & Burn`, which has no entry in the business file, and a
 * stale selection — someone picks Expansion, the file is replaced with one that has no
 * Expansion, and the app reloads holding a workflow that no longer exists. Returning
 * something valid keeps the screen up and lets the banner explain it; throwing would
 * white-screen on a stale selection.
 *
 * The carried metrics are spread across the tiers so the scope panel still has chips:
 * the goal metric leads and the rest read as drivers, which is what they are.
 */
function placeholderDefinition(workflow: string, carried?: CarriedSemantics): WorkflowDefinition {
  return {
    name: workflow,
    key: workflow.toLowerCase(),
    goal: {
      metric: carried?.goalMetric ?? workflow,
      owner: [],
      team: [],
      cadence: [],
      family: [],
      recipe: [],
      analysis_type: '',
    },
    drivers: (carried?.metrics ?? []).slice(1).map((metric) => ({ metric })),
    inputs: [],
    guardrails: [],
    funnel: null,
    lifecycles: [],
    dimensions: (carried?.dimensions ?? []).map((name) => ({ name, values: [] })),
  }
}

// ---------------------------------------------------------------------------
// THE DERIVATION
// ---------------------------------------------------------------------------

/**
 * Flatten the tiers into one vocabulary, goal metric first.
 *
 * Order matches how the scope panel reads top to bottom: the number you're judged on,
 * the levers, the raw quantities, then what must not break. Deduped because a metric
 * can appear in two tiers and a repeated chip is a rendering bug.
 */
function flattenMeasures(definition: WorkflowDefinition): string[] {
  return Array.from(
    new Set([
      definition.goal.metric,
      ...definition.drivers.map((d) => d.metric),
      ...definition.inputs.map((i) => i.metric),
      ...definition.guardrails.map((g) => g.metric),
    ]),
  )
}

/**
 * Every declared value of every declared dimension, as the resolver's focus vocabulary.
 *
 * TWO FORMS PER VALUE: THE BARE ONE AND THE QUALIFIED ONE.
 *
 * The business file declares `plan/tier` with values `business · free · enterprise ·
 * custom` — bare tier names, because inside a `plan/tier` column that is all they need
 * to be. But an operator writes "should we raise the Business tier price", and matching
 * only the bare form resolves that to `business`, which is a weaker label than the
 * sentence contained. So each value is also emitted qualified by its dimension's name,
 * giving `Business tier` (and `Business plan`, since the dimension declares both names
 * behind a slash).
 *
 * This is what the resolver already assumes: its own longest-member-wins rule is
 * commented "'Enterprise tier' should not resolve to 'Enterprise'", which only means
 * anything if the qualified form is in the vocabulary to be preferred. Ordering here is
 * irrelevant — the resolver sorts by length itself.
 *
 * THE LENGTH FLOOR IS NOT COSMETIC. The resolver scans this list for a substring of the
 * operator's text, so a one- or two-character value — a plan code, a region initial —
 * would match almost any sentence and silently pin focus to it. Those are dropped and
 * reported, so a file full of codes doesn't quietly lose its focus vocabulary instead.
 */
function focusMembersFrom(definition: WorkflowDefinition): string[] {
  const members: string[] = []
  let tooShort = 0

  const add = (member: string) => {
    if (!members.includes(member)) members.push(member)
  }

  for (const dimension of definition.dimensions) {
    // `plan/tier` names one cut two ways. Both are things an operator says, so both
    // qualify a value. Empty parts are dropped so a trailing slash can't produce a
    // member with a dangling space.
    const qualifiers = dimension.name
      .split('/')
      .map((part) => deWarehouse(part).trim().toLowerCase())
      .filter((part) => part.length > 2)

    for (const value of dimension.values) {
      const clean = deWarehouse(value).trim()
      if (clean.length <= 2) {
        tooShort += 1
        continue
      }
      add(clean)
      // `humanise` on the value so the qualified form reads as a proper name in the
      // resolution line — "Business tier", not "business tier".
      for (const qualifier of qualifiers) add(`${humanise(clean)} ${qualifier}`)
    }
  }

  if (tooShort > 0) {
    reportDerivation(
      'note',
      definition.name,
      `${tooShort} dimension value${tooShort === 1 ? '' : 's'} too short to match on safely; ` +
        'left out of the focus vocabulary',
    )
  }
  return members
}

export function semanticsFor(workflow: WorkflowName | string): WorkflowSemantics {
  ensureFresh()
  const cached = semanticsCache.get(workflow)
  if (cached) return cached

  const carried = carriedFor(workflow)
  const definition = findDefinition(workflow)

  // Routed by the catalog, absent from the business file — `Cost & Burn` today. The
  // carried entry stands in whole, which is why it was kept rather than trimmed to
  // three fields.
  if (!definition) {
    reportDerivation(
      carried ? 'warning' : 'error',
      workflow,
      carried
        ? 'the definitions file declares no such workflow; falling back to the carried ' +
            `table (goal metric "${carried.goalMetric}"). Add it to ` +
            'workflowDefinitions.json to drive it from your own model'
        : 'neither the definitions file nor the carried table knows this workflow; ' +
            'rendering an empty model for it',
    )
    const stood: WorkflowSemantics = {
      goalMetric: carried?.goalMetric ?? workflow,
      balance: carried?.balance ?? workflow,
      metrics: carried?.metrics ?? [workflow],
      dimensions: carried?.dimensions ?? [],
      states: carried?.states ?? [],
      benchmarks: carried?.benchmarks ?? [],
      focusMembers: carried?.focusMembers ?? [],
      definition: placeholderDefinition(workflow, carried),
    }
    semanticsCache.set(workflow, stood)
    return stood
  }

  // No carried entry for a workflow the file DOES declare. states/benchmarks default
  // to EMPTY rather than to something invented, and that is the right answer rather
  // than a cop-out: the scope panel builds its facets from presence, so an empty list
  // means the facet simply doesn't render. An invented benchmark would put a made-up
  // threshold on screen next to real numbers, which is the one thing this prototype
  // must not do.
  if (!carried) {
    reportDerivation(
      'note',
      definition.name,
      'no balance / states / benchmarks carried for this workflow — a bridge will name ' +
        'its goal metric as the balance, and the scorecard facets stay empty',
    )
  }

  const dimensions = definition.dimensions.map((dimension) => deWarehouse(dimension.name))
  const semantics: WorkflowSemantics = {
    goalMetric: definition.goal.metric,
    balance: carried?.balance ?? definition.goal.metric,
    metrics: flattenMeasures(definition),
    // Falls back to the carried names when the file declares no dimensions at all,
    // because the resolver's "by <dimension>" rule needs something to match and an
    // empty scope panel reads as a loading bug rather than as a claim.
    dimensions: dimensions.length > 0 ? dimensions : (carried?.dimensions ?? []),
    states: carried?.states ?? [],
    benchmarks: carried?.benchmarks ?? [],
    focusMembers: focusMembersFrom(definition),
    definition,
  }
  semanticsCache.set(workflow, semantics)
  return semantics
}

/** Every workflow the file declares, as derived semantics. */
export function allSemantics(): WorkflowSemantics[] {
  return allDefinitions().map((definition) => semanticsFor(definition.name))
}

/** The business definition behind a workflow — tiers, dimension values, funnel. */
export function definitionOf(workflow: WorkflowName | string): WorkflowDefinition {
  return semanticsFor(workflow).definition
}

// ---------------------------------------------------------------------------
// LOOKUPS THAT SURVIVE A RENAMED OR MISSING FIELD
// ---------------------------------------------------------------------------

/** `ICP/segment` and `icp_segment` are the same dimension as far as a lookup cares. */
function dimensionKey(name: string): string {
  return name.toLowerCase().replace(/[\s_-]+/g, '').replace(/\//g, '')
}

/**
 * The declared values of a dimension, tried under several names.
 *
 * A caller passes the names it would accept, most-preferred first, plus the values to
 * use if none of them are there. That is what makes a view survive the team renaming
 * `ICP/segment` to `segment`: the fixture asks for both, and only falls back when the
 * file has neither.
 *
 * Matching ignores case, underscores and hyphens, so `account_size`, `account size`
 * and `Account-Size` are the same dimension. Never throws.
 */
export function dimensionValuesOf(
  workflow: WorkflowName | string,
  candidates: string | string[],
  fallback: string[] = [],
): string[] {
  const wanted = (Array.isArray(candidates) ? candidates : [candidates]).map(dimensionKey)
  const declared = definitionOf(workflow).dimensions

  for (const want of wanted) {
    const match = declared.find((dimension) => dimensionKey(dimension.name) === want)
    if (match && match.values.length > 0) return match.values
  }

  reportDerivation(
    'warning',
    `${workflow} · ${Array.isArray(candidates) ? candidates[0] : candidates}`,
    `no dimension matching ${JSON.stringify(candidates)} with values; ` +
      `a view fell back to its own defaults (${fallback.join(', ') || 'none'})`,
  )
  return fallback
}

/**
 * The declared lifecycle, or a stated fallback.
 *
 * A funnel view needs steps. If the file stops declaring them — renamed key, set to
 * null, workflow dropped — the view falls back to the steps it was authored against
 * and says so, rather than vanishing. That is the right trade for a prototype whose
 * job is to be looked at: a missing section reads as a finding, a reported fallback
 * reads as what it is.
 */
export function lifecycleOf(workflow: WorkflowName | string, fallback: string[]): string[] {
  const declared = definitionOf(workflow).funnel
  if (declared && declared.length > 0) return declared
  reportDerivation(
    'warning',
    workflow,
    'no lifecycle declared, but a funnel view renders one; using the authored steps ' +
      `(${fallback.join(' → ')})`,
  )
  return fallback
}

// ---------------------------------------------------------------------------
// NUMERIC SERIES THAT FOLLOW THE DATA
// ---------------------------------------------------------------------------

/**
 * Resample a series of illustrative figures onto a different length.
 *
 * THE PROBLEM THIS SOLVES. Fixture figures are positional — seven reach values against
 * seven lifecycle steps, three percentages against three segments. Replace the
 * definitions with a file that has eight steps and the eighth reach is `undefined`,
 * which renders as `NaN`: a chart that looks authored and is wrong.
 *
 * Linear interpolation over normalised position, with the first and last values
 * preserved exactly. Preserving the ends matters more than it looks: the last reach
 * value IS the funnel's end-to-end rate, which the headline quotes, so resampling must
 * not move it. Monotonic input stays monotonic, so a funnel stays a funnel.
 */
export function fitProfile(profile: number[], length: number): number[] {
  if (length <= 0) return []
  if (profile.length === 0) return new Array(length).fill(0)
  if (profile.length === length) return [...profile]
  if (length === 1) return [profile[profile.length - 1]]

  const lastIndex = profile.length - 1
  return Array.from({ length }, (_, i) => {
    const position = (i / (length - 1)) * lastIndex
    const low = Math.floor(position)
    const high = Math.min(low + 1, lastIndex)
    const t = position - low
    return Math.round(profile[low] + (profile[high] - profile[low]) * t)
  })
}

// ---------------------------------------------------------------------------
// DISPLAY
// ---------------------------------------------------------------------------

/**
 * Strip warehouse spelling from a term, without touching its case.
 *
 * The definitions are written for a data team, so they carry snake_case:
 * `sales_assist`, `at_limit`, `self_serve_vs_sales`. Brief §5.8 — internal machinery
 * never reaches the UI — applies to the SHAPE of a word as much as to its content.
 *
 * Underscores become spaces but HYPHENS DO NOT: the team writes real compounds with
 * hyphens (`mid-market`, `core-action ×N`, `Time-to-Value`) and flattening those would
 * be a worse reading, not a better one.
 */
export function deWarehouse(term: string): string {
  return term.replace(/_/g, ' ')
}

/**
 * Terms that are acronyms in this domain, so sentence case would mangle them.
 *
 * WHY A LIST AND NOT A RULE. The definitions are cased inconsistently across workflows
 * — Activation writes `SMB`, Acquisition writes `smb` for the same thing — so `smb`
 * reaches a chart label and sentence case renders it "Smb". No general rule separates
 * an acronym from a short word ("paid", "geo", "free").
 *
 * THE DURABLE FIX IS IN THE JSON: one casing per term, chosen by the team. This is the
 * display-side repair until then, kept short on purpose.
 */
const ACRONYMS = new Set(['smb', 'icp', 'arr', 'mrr', 'arpu', 'nrr', 'grr', 'cac', 'cpc', 'saas'])

/**
 * A term as an operator reads it, standing on its own — a bar label, a heading.
 *
 * Only the first character is touched, which leaves an ALL-CAPS term alone. For
 * anything in a lowercase register — the scope panel's chips sit beside words like
 * `channel` — use `deWarehouse` directly, or the capital reads as emphasis the term
 * hasn't earned.
 */
export function humanise(term: string): string {
  const spaced = deWarehouse(term)
  if (ACRONYMS.has(spaced.toLowerCase())) return spaced.toUpperCase()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

// ---------------------------------------------------------------------------
// THE OLD SEAM
// ---------------------------------------------------------------------------

/**
 * Load the semantic model for a workflow. Called when the operator picks a scope,
 * which is the moment the real product would go and fetch.
 *
 * NO LONGER A STUB, and no longer the seam either — the fetch moved UP, to `main.tsx`,
 * which loads the definitions file once at boot and only then imports the app. That is
 * strictly better than fetching per workflow: the file is one document describing the
 * whole business, so reading it eight times for one entry each would be eight round
 * trips for one payload, and every consumer would have to learn to wait.
 *
 * Kept as a synchronous pass-through because the call site is still the right one. If
 * the real product moves to per-workflow fetching, this is where that goes.
 */
export function loadSemanticsFor(workflow: WorkflowName): WorkflowSemantics {
  return semanticsFor(workflow)
}
