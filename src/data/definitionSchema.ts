// data/definitionSchema.ts
// ---------------------------------------------------------------------------
// The shape of the business model, and a normaliser that ACCEPTS ANYTHING.
//
// The workflow definitions are owned by the business team and swapped in as a
// whole file, so this code cannot assume the file is the one it was written
// against. Field names change, dimensions get renamed, a workflow appears or
// disappears, someone pastes one object instead of five.
//
// THE ONE RULE HERE: `normaliseDefinitions` NEVER THROWS. Whatever it is handed,
// it returns a usable model plus a list of everything it had to assume, repair or
// discard. A prototype that white-screens on a data edit is worse than useless to
// the person doing the editing — they need to see what they broke, with the rest
// of the app still standing.
//
// The issue list is the honesty mechanism. Silent coercion would leave someone
// reading defaulted numbers as though they were their own.
// ---------------------------------------------------------------------------

export type IssueSeverity = 'error' | 'warning' | 'note'

export interface Issue {
  severity: IssueSeverity
  /** Where in the data — "monetisation", "acquisition · dimensions[2]". */
  where: string
  /** What happened, in the terms of whoever edits the JSON. */
  message: string
}

export interface MeasureDecl {
  metric: string
}

export interface DimensionDecl {
  name: string
  values: string[]
}

export interface GoalDecl {
  metric: string
  /** Who owns the number. Several people may. Not rendered. */
  owner: string[]
  /** The function that owns it, when the file names one separately. Not rendered. */
  team: string[]
  /** How often it's reviewed — a workflow can run on two clocks. Not rendered. */
  cadence: string[]
  /**
   * The families this workflow's shapes belong to, AS DECLARED.
   *
   * Not authoritative: the recipe already carries its own family, and the recipe is
   * what composes. This is kept so a disagreement between the two can be REPORTED —
   * a file declaring `family: "state"` beside `recipe: "movement_bridge"` is a
   * modelling mistake worth seeing, not something to silently resolve.
   */
  family: string[]
  /**
   * The report shapes this workflow produces, AS DECLARED — and authoritative.
   *
   * This is the field that replaced guessing. Earlier files carried
   * `analysis_type: "DCG: funnel + cohort"`, and eligibility had to be inferred from
   * those words; now the file names recipe ids outright. An id the recipe book
   * doesn't have is reported and dropped rather than quietly ignored.
   */
  recipe: string[]
  /** Legacy provenance from earlier files. Never rendered, no longer read for routing. */
  analysis_type: string
}

/**
 * One lifecycle path, when a workflow has more than one.
 *
 * Activation's onboarding forks by motion: self-serve walks setup → connect data →
 * first object, sales-led walks kickoff call → data migration → team rollout. Same
 * goal metric, same funnel shape, genuinely different steps — so a single `funnel`
 * array cannot express it without picking a winner and hiding the other.
 */
export interface LifecycleDecl {
  /** The motion this path belongs to — "self-serve", "sales-led". */
  motion: string
  /** The team's name for it — "PLG", "CS-guided". */
  label: string
  /** True when the steps are a hypothesis rather than something observed. */
  assumption: boolean
  steps: string[]
}

/**
 * ALTITUDE IS NOT DECLARED HERE, ON PURPOSE.
 *
 * The recipe layer's `WORKFLOWS` catalog (`recipes.ts`) already carries `level:
 * Altitude` for every workflow, and it is the harder source: altitude decides which
 * recipes are eligible, so the catalog cannot not know it. An `altitude` field on this
 * side would be a second place to state the same fact, and the two would drift the
 * first time someone edited one file and not the other.
 *
 * So this file describes WHAT A WORKFLOW MEASURES, and the catalog describes WHERE IT
 * SITS. A definitions file that declares an altitude is ignored rather than obeyed —
 * `normaliseDefinitions` reports it as a note so whoever wrote it finds out.
 */

export interface WorkflowDefinition {
  /** Display name — "Acquisition". Derived from the JSON key. */
  name: string
  /** The JSON key it came from, lowercased. */
  key: string
  goal: GoalDecl
  drivers: MeasureDecl[]
  inputs: MeasureDecl[]
  guardrails: MeasureDecl[]
  /**
   * The lifecycle steps in order. `null` means "no lifecycle transition exists
   * here" — a real claim, and different from `[]`, which means "steps exist but
   * none are listed".
   */
  /**
   * The PRIMARY lifecycle, flattened for everything that just wants "the steps".
   *
   * When the file declares `funnels` (plural), this is the first path's steps, so a
   * funnel view keeps working without knowing motions exist. `lifecycles` carries all
   * of them for anything that does.
   */
  funnel: string[] | null
  /** Every declared path. Empty when the file uses the singular `funnel` form. */
  lifecycles: LifecycleDecl[]
  journey_note?: string
  dimensions: DimensionDecl[]
}

export interface NormalisedDefinitions {
  /** In declaration order, so the picker follows the file. */
  workflows: WorkflowDefinition[]
  byName: Record<string, WorkflowDefinition>
  issues: Issue[]
}

// ---------------------------------------------------------------------------
// Coercion helpers. Each takes anything and returns the expected type.
// ---------------------------------------------------------------------------

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const asString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null

/** Strings pass through; anything else is dropped rather than stringified. */
function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map(asString).filter((entry): entry is string => entry !== null)
}

/**
 * One value or several, always returned as a list.
 *
 * `owner`, `team`, `cadence`, `family` and `recipe` are each written as a bare string
 * in some workflows and an array in others — Acquisition has one owner, Retention has
 * two; Monetisation runs quarterly, Retention runs monthly AND weekly. Normalising to
 * a list means nothing downstream has to ask which form it got.
 */
function asList(value: unknown): string[] {
  if (value === undefined || value === null) return []
  const single = asString(value)
  if (single) return [single]
  return asStringArray(value)
}

/**
 * Measures, accepting both shapes the team might write.
 *
 * `[{ "metric": "CAC" }]` is the current format and `["CAC"]` is the obvious
 * thing to type when you're editing quickly. Accepting both costs three lines and
 * removes a whole class of "why is the panel empty".
 */
function asMeasures(value: unknown, where: string, issues: Issue[]): MeasureDecl[] {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) {
    issues.push({ severity: 'warning', where, message: 'expected a list of measures; ignored' })
    return []
  }
  const measures: MeasureDecl[] = []
  value.forEach((entry, index) => {
    const bare = asString(entry)
    if (bare) {
      measures.push({ metric: bare })
      return
    }
    if (isObject(entry)) {
      const metric = asString(entry.metric) ?? asString(entry.name)
      if (metric) {
        measures.push({ metric })
        return
      }
    }
    issues.push({
      severity: 'warning',
      where: `${where}[${index}]`,
      message: 'no readable metric name; entry dropped',
    })
  })
  return measures
}

function asDimensions(value: unknown, where: string, issues: Issue[]): DimensionDecl[] {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) {
    issues.push({ severity: 'warning', where, message: 'expected a list of dimensions; ignored' })
    return []
  }
  const dimensions: DimensionDecl[] = []
  value.forEach((entry, index) => {
    if (!isObject(entry)) {
      issues.push({
        severity: 'warning',
        where: `${where}[${index}]`,
        message: 'not an object; dimension dropped',
      })
      return
    }
    const name = asString(entry.name)
    if (!name) {
      issues.push({
        severity: 'warning',
        where: `${where}[${index}]`,
        message: 'no name; dimension dropped',
      })
      return
    }
    const values = asStringArray(entry.values)
    if (values.length === 0) {
      issues.push({
        severity: 'note',
        where: `${where} · ${name}`,
        message: 'no values declared; anything slicing by it falls back to its own defaults',
      })
    }
    dimensions.push({ name, values })
  })
  return dimensions
}

/**
 * The motion-forked form: `funnels: [{ motion, label, steps }]`.
 *
 * A path with no steps is dropped — it names a motion and then says nothing about it,
 * which would render as an empty funnel.
 */
function asLifecycles(value: unknown, where: string, issues: Issue[]): LifecycleDecl[] {
  if (!Array.isArray(value)) {
    issues.push({ severity: 'warning', where, message: 'expected a list of lifecycles; ignored' })
    return []
  }
  const paths: LifecycleDecl[] = []
  value.forEach((entry, index) => {
    if (!isObject(entry)) {
      issues.push({
        severity: 'warning',
        where: `${where}[${index}]`,
        message: 'not an object; lifecycle dropped',
      })
      return
    }
    const steps = asStringArray(entry.steps)
    if (steps.length === 0) {
      issues.push({
        severity: 'warning',
        where: `${where}[${index}]`,
        message: 'no steps; lifecycle dropped',
      })
      return
    }
    const motion = asString(entry.motion) ?? `path ${index + 1}`
    paths.push({
      motion,
      label: asString(entry.label) ?? motion,
      assumption: entry.assumption === true,
      steps,
    })
  })
  return paths
}

/**
 * Read whichever lifecycle form the file uses.
 *
 * `funnels` (plural, motion-forked) wins when present, because a file that bothered to
 * fork by motion is making a claim the singular form can't carry. `funnel` (singular)
 * stays supported — most workflows have one path and shouldn't have to wrap it.
 *
 * `null` means no lifecycle exists; a MISSING key means the same thing but says so less
 * clearly, so it's reported as a note rather than read as a considered claim.
 */
function asLifecycleForms(
  raw: Record<string, unknown>,
  where: string,
  issues: Issue[],
): { funnel: string[] | null; lifecycles: LifecycleDecl[] } {
  if ('funnels' in raw) {
    const lifecycles = asLifecycles(raw.funnels, `${where} · funnels`, issues)
    if (lifecycles.length === 0) return { funnel: null, lifecycles: [] }
    const assumed = lifecycles.filter((path) => path.assumption).map((path) => path.label)
    if (assumed.length > 0) {
      issues.push({
        severity: 'note',
        where,
        message: `lifecycle${assumed.length === 1 ? '' : 's'} marked as assumption: ${assumed.join(', ')}`,
      })
    }
    // The first path is the primary — it is what a funnel view renders when nothing
    // has asked for a specific motion.
    return { funnel: lifecycles[0].steps, lifecycles }
  }

  if (!('funnel' in raw)) {
    issues.push({
      severity: 'note',
      where,
      message: 'no funnel key — read as "no lifecycle". Write funnel: null to say so on purpose',
    })
    return { funnel: null, lifecycles: [] }
  }
  if (raw.funnel === null) return { funnel: null, lifecycles: [] }
  const steps = asStringArray(raw.funnel)
  if (steps.length === 0) {
    issues.push({
      severity: 'note',
      where,
      message: 'funnel is present but empty; treated as no lifecycle',
    })
    return { funnel: null, lifecycles: [] }
  }
  return { funnel: steps, lifecycles: [] }
}

/**
 * The JSON is keyed in lowercase; the app shows title case.
 *
 * A lookup preserves the spellings the product has opinions about — "Monetisation"
 * is British here and a naive title-caser would not know that "monetization" is the
 * same workflow. Anything unrecognised gets plain title case, which is right often
 * enough and visibly wrong when it isn't.
 */
const NAME_BY_KEY: Record<string, string> = {
  // The three altitudes above the five spaces. None is a title-casing problem a rule
  // could solve: "p&l" title-cases to "P&l" because the ampersand isn't a word
  // boundary, "cost_and_burn" has to become an ampersand it doesn't contain, and
  // "revenue_engine" is a proper noun for one thing rather than two capitalised words.
  'p&l': 'P&L',
  pl: 'P&L',
  pnl: 'P&L',
  profit_and_loss: 'P&L',
  revenue_engine: 'Revenue engine',
  revenue: 'Revenue engine',
  'cost&burn': 'Cost & Burn',
  cost_and_burn: 'Cost & Burn',
  cost_burn: 'Cost & Burn',
  burn: 'Cost & Burn',
  acquisition: 'Acquisition',
  activation: 'Activation',
  retention: 'Retention',
  expansion: 'Expansion',
  monetisation: 'Monetisation',
  monetization: 'Monetisation',
}

/**
 * The workflow names the recipe layer can actually route.
 *
 * DUPLICATED FROM `recipe_schema.ts`'s `WorkflowName` ON PURPOSE, as strings rather
 * than as the type. This file must not import the recipe layer: the definitions are
 * business data and the catalog is app code, and an import here would make the data
 * layer depend on the thing that consumes it.
 *
 * The cost of duplication is a list that can fall out of date, which is why it is
 * CHECKED rather than trusted — `check:definitions` asserts these are exactly the
 * catalog's names, so the two can't drift silently.
 */
export const ROUTABLE_WORKFLOWS = [
  'P&L',
  'Revenue engine',
  'Cost & Burn',
  'Acquisition',
  'Activation',
  'Retention',
  'Expansion',
  'Monetisation',
] as const

function displayName(key: string): string {
  const known = NAME_BY_KEY[key.toLowerCase()]
  if (known) return known
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (c) => c.toUpperCase())
}

/**
 * Find the workflow map inside whatever was handed over.
 *
 * Three shapes are accepted: the bare map the team writes, the same map wrapped in
 * `{ workflows: … }`, and a single workflow object at the top level (which is
 * what you get from copying one block out of the file).
 */
function locateWorkflowMap(raw: unknown, issues: Issue[]): Record<string, unknown> | null {
  if (!isObject(raw)) {
    issues.push({
      severity: 'error',
      where: 'file',
      message: 'not a JSON object; nothing could be read from it',
    })
    return null
  }
  if (isObject(raw.workflows)) return raw.workflows
  // A lone workflow object, recognised by its own goal block rather than by key.
  if (isObject(raw.goal) && !Object.values(raw).every(isObject)) {
    issues.push({
      severity: 'warning',
      where: 'file',
      message: 'looks like a single workflow rather than a map of them; loaded as one',
    })
    return { workflow: raw }
  }
  return raw
}

export function normaliseDefinitions(raw: unknown): NormalisedDefinitions {
  const issues: Issue[] = []
  const map = locateWorkflowMap(raw, issues)
  const workflows: WorkflowDefinition[] = []
  const byName: Record<string, WorkflowDefinition> = {}

  for (const [key, value] of Object.entries(map ?? {})) {
    // JSON has no comments, so `_comment` / `_note` keys are how people leave them.
    // Silently skipped rather than reported: a deliberate annotation is not a defect,
    // and flagging it would train whoever edits this file to ignore the issues list.
    if (key.startsWith('_')) continue

    const where = key
    if (!isObject(value)) {
      issues.push({ severity: 'error', where, message: 'not an object; workflow dropped' })
      continue
    }

    const goalRaw = isObject(value.goal) ? value.goal : {}
    // The goal metric is the one field with no sensible default: it binds
    // {goal_metric} into beat questions and leads the scope panel. Without it the
    // workflow would render a plan with a blank subject, so it is dropped instead.
    const metric = asString(goalRaw.metric) ?? asString(value.goal_metric)
    if (!metric) {
      issues.push({
        severity: 'error',
        where,
        message: 'no goal.metric; workflow dropped (every other field has a default)',
      })
      continue
    }

    const name = displayName(key)
    if (byName[name]) {
      issues.push({
        severity: 'warning',
        where,
        message: `duplicates workflow "${name}"; the later one wins`,
      })
    }

    // A name the recipe catalog has no entry for. The definition still LOADS — it is
    // valid business data — but nothing can route to it, because eligibility comes from
    // the catalog and the catalog has never heard of it. Reported as a warning rather
    // than dropped, so the fix is legible: add it to `WORKFLOWS` in `recipes.ts`.
    if (!(ROUTABLE_WORKFLOWS as readonly string[]).includes(name)) {
      issues.push({
        severity: 'warning',
        where,
        message:
          `read as "${name}", which the recipe catalog doesn't list; its definitions load ` +
          `but no screen can reach it until it's added to WORKFLOWS in recipes.ts`,
      })
    }

    // Altitude belongs to the catalog (see the note above `WorkflowDefinition`). Said
    // out loud, because a file declaring it would otherwise look obeyed.
    if ('altitude' in value || 'altitude' in goalRaw) {
      issues.push({
        severity: 'note',
        where,
        message: "declares an altitude; ignored — the recipe catalog's `level` owns that",
      })
    }

    const { funnel, lifecycles } = asLifecycleForms(value, where, issues)

    const definition: WorkflowDefinition = {
      name,
      key: key.toLowerCase(),
      goal: {
        metric,
        owner: asList(goalRaw.owner),
        team: asList(goalRaw.team),
        cadence: asList(goalRaw.cadence),
        family: asList(goalRaw.family),
        recipe: asList(goalRaw.recipe),
        analysis_type: asString(goalRaw.analysis_type) ?? '',
      },
      drivers: asMeasures(value.drivers, `${where} · drivers`, issues),
      inputs: asMeasures(value.inputs, `${where} · inputs`, issues),
      guardrails: asMeasures(value.guardrails, `${where} · guardrails`, issues),
      funnel,
      lifecycles,
      journey_note: asString(value.journey_note) ?? undefined,
      dimensions: asDimensions(value.dimensions, `${where} · dimensions`, issues),
    }

    if (definition.dimensions.length === 0) {
      issues.push({
        severity: 'warning',
        where,
        message: 'no dimensions; the plan will have nothing to slice by',
      })
    }
    if (definition.funnel === null && !definition.journey_note) {
      issues.push({
        severity: 'note',
        where,
        message: 'no lifecycle and no journey_note explaining why',
      })
    }

    byName[name] = definition
    const existing = workflows.findIndex((w) => w.name === name)
    if (existing >= 0) workflows[existing] = definition
    else workflows.push(definition)
  }

  if (workflows.length === 0) {
    issues.push({
      severity: 'error',
      where: 'file',
      message: 'no usable workflows found',
    })
  }

  return { workflows, byName, issues }
}
