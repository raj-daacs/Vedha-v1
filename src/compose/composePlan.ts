// compose/composePlan.ts
// ---------------------------------------------------------------------------
// THE HEART OF THE PRODUCT.
//
// A recipe is the skeleton — which spine, which beats, in what order. This turns
// that skeleton into something a screen can render, and it is the ONLY place in
// the app where the two report families differ.
//
// ── Why it has to be one place ──────────────────────────────────────────────
// The thesis is that the funnel plan and the scorecard plan are the same product
// bending to two report shapes, not two tools. If a screen branched on family,
// that thesis would be a claim in a doc rather than a property of the code, and
// every new recipe would mean touching every screen. So: components render a
// PlanModel and are handed nothing that could tell them which family they're in.
//
// ── How the bend is expressed ───────────────────────────────────────────────
// Not as `if (family === 'state')`. Every difference below is read off fields the
// recipe DECLARED about itself:
//
//   the spine       ← SpineDecl's declared triplet                (absent ⇒ empty array)
//   the facets      ← whether a spine was derived at all
//   the benchmark   ← Recipe.trigger.goal_metric_kind
//   the note        ← emitted when the derived spine came back empty
//   the plan label  ← same
//   thin beats      ← Beat.optional + Recipe.four_question_fit
//
// A state family collapses because it has no spine to declare. Nothing asks its
// name. Add a sixth recipe and this function already handles it.
// ---------------------------------------------------------------------------

import type { BeatModel, Chip, ComposeContext, Facet, PlanModel, SpineNode } from './models'
import {
  asFragment,
  bindingsFor,
  resolveTemplate,
  shortRecipeName,
  spineLabel,
} from './templates'
import { semanticsFor } from '../data/semanticModel'
import type { Beat, Recipe, SpineDecl } from '../data/recipe_schema'
import { PERIOD_LABELS } from '../data/scope'

/**
 * The recipe's subject in the operator's words.
 *
 * A recipe may carry its own label for what it watches — the engagement scorecard
 * is "Product engagement", not "Retention" — but that label is only true under the
 * workflow it describes. Gated on `displayLabelWorkspace` so the header can never
 * contradict the context pill: the two, plus the family colour, all derive from
 * this same (workflow, recipe) pair.
 *
 * A workflow's `eligible` list already makes the scorecard unreachable outside
 * Retention, so today this gate is belt as well as braces. It's here because that
 * reachability guarantee is structural and a sixth recipe could quietly break it.
 */
export function subjectOf(recipe: Recipe, context: ComposeContext): string {
  const labelApplies =
    recipe.displayLabel !== undefined && recipe.displayLabelWorkspace === context.workflow
  return labelApplies ? recipe.displayLabel! : context.workflow
}

/** "Product engagement — this month" · "Activation — last quarter" */
export function resolveTitle(recipe: Recipe, context: ComposeContext): string {
  return `${subjectOf(recipe, context)} — ${PERIOD_LABELS[context.period]}`
}

/**
 * Derive the three-node backbone from what the recipe declared.
 *
 * TWO TRIPLETS, ONE BACKBONE. A flow declares `input → work → output`; a response
 * declares `lever → response → constraint`. Different vocabulary, identical reading:
 * where it starts, what acts on it, where it lands. So both collapse onto the same
 * three emphases and nothing downstream learns which words were used.
 *
 * Reading BOTH is what keeps spine-emptiness meaning exactly one thing. Were only the
 * flow triplet read, `price_sensitivity` would come back spineless and get rendered
 * as the state it isn't — collapsed, and captioned "not a flow you run". After this,
 * an empty spine is the scorecard and nothing else.
 *
 * A state declares neither triplet, so this returns `[]` and the spine simply isn't
 * there. That empty array IS the "collapse" in "the four questions collapse for the
 * state family": downstream there is nothing to lay beats on, so they stack instead.
 */
export function deriveSpine(declared: SpineDecl): SpineNode[] {
  const node = (field: string | undefined, emphasis: SpineNode['emphasis']) =>
    field ? { label: spineLabel(field), emphasis } : null

  const nodes: Array<SpineNode | null> = [
    node(declared.input ?? declared.lever, 'input'),
    node(declared.work ?? declared.response, 'work'),
    node(declared.output ?? declared.constraint, 'output'),
  ]
  return nodes.filter((entry): entry is SpineNode => entry !== null)
}

/**
 * Is this shape judged against an external bar, rather than against its own history?
 *
 * Read off `trigger.goal_metric_kind` — the recipe's own account of what kind of
 * number it produces. The scorecard's reads "ratio / level vs benchmark", and that
 * phrase IS the declaration: a ratio only means something beside the bar it's held
 * against. A rate is judged against target and a balance against last period — both
 * different sentences, and neither earns the suffix.
 *
 * This replaces the `spine.benchmark` field the current schema no longer carries.
 * Exported as one helper so the plan's benchmark facet and the view's "① Where we
 * stand vs benchmark" cannot disagree about the answer.
 */
export function judgedAgainstBenchmark(recipe: Recipe): boolean {
  return recipe.trigger.goal_metric_kind.toLowerCase().includes('benchmark')
}

/**
 * The scope panel — "what I'm working with", derived from the recipe.
 *
 * Each kind of thing the recipe declared contributes its own facet, which is why
 * the two families end up with different vocabulary without anyone choosing it:
 *
 *   derives a spine        → it's judged by MEASURES and interrogated by SLICES
 *   derives no spine       → the levels and ratios it watches, since a state you
 *                            monitor has no flow to measure or slice
 *   judged vs a benchmark  → the bar those are held against
 *
 * Chips are marked `in-plan` when this beat set actually reads them, `available`
 * when the workflow has them but this plan doesn't use them. Showing both is the
 * point: it tells the operator what they could add, which is what makes the panel
 * an affordance rather than a legend.
 */
function deriveFacets(recipe: Recipe, context: ComposeContext, spine: SpineNode[]): Facet[] {
  const semantics = semanticsFor(context.workflow)
  const bindings = bindingsFor(semantics, context.period, recipe.spine)

  // What the plan reads, flattened, with templates resolved so "{goal_metric}"
  // can be recognised as "Activation Rate".
  const readsText = recipe.beats
    .flatMap((beat) => beat.reads)
    .map((read) => resolveTemplate(read, bindings))
    .join(' · ')
    .toLowerCase()

  const isRead = (label: string) => readsText.includes(label.toLowerCase())

  const facets: Facet[] = []

  if (spine.length > 0) {
    facets.push({
      label: 'metrics',
      // The goal metric is in the plan by definition — it's what the shape measures.
      chips: semantics.metrics.map(
        (metric): Chip => ({
          label: metric,
          state: metric === semantics.goalMetric || isRead(metric) ? 'in-plan' : 'available',
        }),
      ),
    })
    facets.push({
      label: 'slice by',
      chips: [
        ...semantics.dimensions.map(
          (dimension): Chip => ({
            label: dimension,
            state: isRead(dimension) ? 'in-plan' : 'available',
          }),
        ),
        // Not a dimension — an invitation. The plan is editable.
        { label: '＋ plan', state: 'add' },
      ],
    })
  }

  // No spine ⇒ a state you monitor. There is no flow here to judge by measures or
  // cut by dimensions, so what it watches IS the scope. Gated on the DERIVED spine
  // rather than on a declared field, which is the mechanism the schema names: a
  // shape check ("spine empty?"), never a family check.
  if (spine.length === 0) {
    facets.push({
      // A monitored state is the recipe's whole reason for existing, so all of it is in play.
      label: 'state',
      chips: semantics.states.map((state): Chip => ({ label: state, state: 'in-plan' })),
    })
  }

  if (judgedAgainstBenchmark(recipe)) {
    facets.push({
      label: 'benchmark',
      chips: semantics.benchmarks.map((bar): Chip => ({ label: bar, state: 'in-plan' })),
    })
  }

  return facets
}

/**
 * Should this recipe's optional beats appear at all?
 *
 * The two families genuinely differ here, and the recipes say why. The funnel's
 * four questions `hold`, so its optional projection is simply not part of this
 * plan until something asks for it. The scorecard's questions `collapse`, and its
 * own narration_note spells out the consequence: "why/ahead/do go thin". There,
 * the thinning IS the finding — hiding those beats would hide the shape of the
 * answer. So a collapsing recipe shows its optionals, drawn back.
 *
 * Keyed on the declared fit, not on the family, so it generalises.
 */
/**
 * NO FIT DROPS ITS OPTIONAL BEATS ANY MORE — `optional` controls PROMINENCE only.
 *
 * This gate has narrowed twice and has now closed entirely, which is worth recording
 * because the field's meaning shifted under it. It began as `fit === 'collapse'`: the
 * scorecard shows its optionals drawn back because the thinning IS the finding, while
 * the funnel's optional beat was a speculative projection the plan shouldn't promise.
 * Then `bend` joined, because `movement_bridge` declares a dimensional why that applies
 * per-WORKFLOW rather than per-shape. Now `hold` joins too, because the funnel's
 * optional beat is no longer a projection — it is the demoted calendar-trend, a real
 * read that simply isn't the lead.
 *
 * Across all five recipes there is no longer one optional beat that should be hidden
 * outright. What decides whether a beat reaches a VIEW is the fixture, which is the
 * honest gate and always was.
 *
 * Kept as a named function rather than inlined so that if a recipe ever does declare a
 * beat worth hiding, there is one obvious place for the rule to come back.
 */
function showsOptionalBeats(_recipe: Recipe): boolean {
  return true
}

/**
 * WHICH BEATS ARE IN THIS PLAN — the single answer, shared with `composeView`.
 *
 * The plan and the view must agree about what the answer contains. The operator
 * approves a plan of N beats and then presses "Build view"; a view that quietly
 * carried an N+1th section would be delivering something they never approved, and
 * an `ahead` projection is exactly the kind of thing that would slip in that way —
 * `composeView` renders any beat a fixture covers, and nothing else would stop it.
 *
 * So both sides call this. Adding a fixture for a beat this excludes now renders
 * nothing rather than smuggling a section in.
 *
 * (Promoted deepen answers are different, and legitimately extra: the operator adds
 * those to the artifact themselves, after the fact.)
 */
export function beatsInPlan(recipe: Recipe): Beat[] {
  return recipe.beats.filter((beat) => !beat.optional || showsOptionalBeats(recipe))
}

const CONFIDENCE_LABELS = {
  from_data: 'from data',
  directional: 'directional',
} as const

/** What the recipe declared this beat reads, with templates resolved. */
function declaredReads(beat: Beat, context: ComposeContext, spine?: SpineDecl): string[] {
  const bindings = bindingsFor(semanticsFor(context.workflow), context.period, spine)
  return beat.reads.map((read) => resolveTemplate(read, bindings))
}

/**
 * EDIT B's candidate list: everything this beat could read.
 *
 * The recipe's own declarations come first — they're the beat's reason for existing —
 * then the rest of the workflow's measures and lenses, so the operator can widen
 * the scope rather than only narrow it.
 */
function candidateReads(beat: Beat, context: ComposeContext, spine?: SpineDecl): string[] {
  const semantics = semanticsFor(context.workflow)
  const offered = [...semantics.metrics, ...semantics.dimensions]
  return Array.from(new Set([...declaredReads(beat, context, spine), ...offered]))
}

export interface PlanEditOptions {
  /** The one beat in Edit B, if any. */
  editBeat?: string | null
  /** Per-beat scope overrides. Absent for a beat means "as the recipe declared". */
  beatReads?: Record<string, string[]>
}

function composeBeat(
  beat: Beat,
  context: ComposeContext,
  options: PlanEditOptions,
  /** The recipe's spine, so a question naming its ends resolves. */
  spine?: SpineDecl,
): BeatModel {
  const semantics = semanticsFor(context.workflow)
  const bindings = bindingsFor(semantics, context.period, spine)

  // An optional beat in a collapsing plan is present but drawn back. `optional` is
  // itself optional in the schema now, so absent reads as "always in the plan".
  const thin = beat.optional ?? false
  const confidence = CONFIDENCE_LABELS[beat.confidence]

  const declared = declaredReads(beat, context, spine)
  const effective = options.beatReads?.[beat.id] ?? declared
  const overridden =
    effective.length !== declared.length || effective.some((read) => !declared.includes(read))

  // Recomposed from the EFFECTIVE scope, so an Edit-B toggle re-resolves this line
  // and only this line.
  const readsClause = effective.length > 0 ? `reads ${effective.join(' · ')} · ` : ''

  const editing =
    options.editBeat === beat.id
      ? {
          reads: candidateReads(beat, context, spine).map((label) => ({
            label,
            inScope: effective.includes(label),
          })),
          resolved: overridden,
        }
      : undefined

  return {
    id: beat.id,
    // "· opt" marks a beat the plan could drop — the operator should be able to
    // see which parts of the answer are load-bearing.
    category: thin ? `${beat.category} · opt` : beat.category,
    question: resolveTemplate(beat.question, bindings),
    // Thin beats show the question only. A drawn-back beat with a full spec reads
    // as more important than the beats above it, which inverts the point.
    detail: thin ? undefined : `${readsClause}builds ${asFragment(beat.builds)}`,
    confidence: thin ? undefined : confidence,
    // Say why it's drawn back: a projection is soft, everything else is just small.
    tail: thin ? (beat.confidence === 'directional' ? '(directional)' : '(thin)') : undefined,
    prominence: thin ? 'thin' : 'full',
    editing,
  }
}

/**
 * Compose the plan the operator approves before anything is built.
 *
 * Pure: same recipe + same context ⇒ same model. No fetching, no clocks.
 */
export function composePlan(
  recipe: Recipe,
  context: ComposeContext,
  /** Edit-B state. Pure input: the same plan plus the same edits is the same model. */
  options: PlanEditOptions = {},
): PlanModel {
  const spine = deriveSpine(recipe.spine)
  const hasSpine = spine.length > 0

  const beats = beatsInPlan(recipe).map((beat) => composeBeat(beat, context, options, recipe.spine))

  return {
    // "Funnel · Flow family". Capitalising the declared family name avoids a
    // lookup table that would need editing every time a family is added.
    badge: `${shortRecipeName(recipe.name)} · ${capitalise(recipe.family)} family`,
    intent: context.intent,
    contextChips: [context.workflow, PERIOD_LABELS[context.period]],
    scope: {
      label: "What I'm working with · from the recipe",
      spine,
      facets: deriveFacets(recipe, context, spine),
      // Explain the absence in the operator's language, never the schema's.
      note: hasSpine
        ? undefined
        : 'no input → work → output — a state you monitor, not a flow you run.',
    },
    planLabel: hasSpine
      ? 'the plan — beats on the spine'
      : 'the plan — beats collapse toward “stand”',
    beats,
    primaryAction: 'Build view',
  }
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}
