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
//   the spine       ← SpineDecl.input / .work / .output       (absent ⇒ empty array)
//   the facets      ← which SpineDecl fields exist at all
//   the note        ← emitted when the derived spine came back empty
//   the plan label  ← same
//   thin beats      ← Beat.optional + Recipe.four_question_fit
//
// A state family collapses because it has no spine to declare. Nothing asks its
// name. Add a fifth recipe and this function already handles it.
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
import type { Beat, Recipe, SpineDecl } from '../data/recipeTypes'
import { PERIOD_LABELS } from '../data/workspaces'

/**
 * The recipe's subject in the operator's words.
 *
 * A recipe may carry its own label for what it watches — the engagement scorecard
 * is "Product engagement", not "Retention" — but that label is only true under the
 * workspace it describes. Gated on `displayLabelWorkspace` so the header can never
 * contradict the context pill: the two, plus the family colour, all derive from
 * this same (workspace, recipe) pair.
 *
 * `WORKSPACE_RECIPES` already makes the scorecard unreachable outside Retention, so
 * today this gate is belt as well as braces. It's here because that reachability
 * guarantee is structural and a fifth recipe could quietly break it.
 */
export function subjectOf(recipe: Recipe, context: ComposeContext): string {
  const labelApplies =
    recipe.displayLabel !== undefined && recipe.displayLabelWorkspace === context.workspace
  return labelApplies ? recipe.displayLabel! : context.workspace
}

/** "Product engagement — this month" · "Activation — last quarter" */
export function resolveTitle(recipe: Recipe, context: ComposeContext): string {
  return `${subjectOf(recipe, context)} — ${PERIOD_LABELS[context.period]}`
}

/**
 * Derive the input → work → output backbone from what the recipe declared.
 *
 * A flow declares all three. A state declares none of them — it names a state and
 * a benchmark instead — so this returns `[]` and the spine simply isn't there.
 * That empty array IS the "collapse" in "the four questions collapse for the state
 * family": downstream there is nothing to lay beats on, so they stack instead.
 */
export function deriveSpine(declared: SpineDecl): SpineNode[] {
  const nodes: Array<SpineNode | null> = [
    declared.input ? { label: spineLabel(declared.input), emphasis: 'input' } : null,
    declared.work ? { label: spineLabel(declared.work), emphasis: 'work' } : null,
    declared.output ? { label: spineLabel(declared.output), emphasis: 'output' } : null,
  ]
  return nodes.filter((node): node is SpineNode => node !== null)
}

/**
 * The scope panel — "what I'm working with", derived from the recipe.
 *
 * Each kind of thing the recipe declared contributes its own facet, which is why
 * the two families end up with different vocabulary without anyone choosing it:
 *
 *   declares a flow (input/work/output) → it's judged by MEASURES and
 *                                          interrogated by SLICES
 *   declares a state                    → the levels and ratios it watches
 *   declares a benchmark                → the bar those are judged against
 *
 * Chips are marked `in-plan` when this beat set actually reads them, `available`
 * when the workspace has them but this plan doesn't use them. Showing both is the
 * point: it tells the operator what they could add, which is what makes the panel
 * an affordance rather than a legend.
 */
function deriveFacets(recipe: Recipe, context: ComposeContext, spine: SpineNode[]): Facet[] {
  const semantics = semanticsFor(context.workspace)
  const bindings = bindingsFor(semantics, context.period)
  const declared = recipe.spine

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

  if (declared.state) {
    facets.push({
      label: 'state',
      // A declared state is what the recipe exists to monitor, so all of it is in play.
      chips: semantics.states.map((state): Chip => ({ label: state, state: 'in-plan' })),
    })
  }

  if (declared.benchmark) {
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
function showsOptionalBeats(recipe: Recipe): boolean {
  return recipe.four_question_fit === 'collapse'
}

const CONFIDENCE_LABELS = {
  from_data: 'from data',
  directional: 'directional',
} as const

/** What the recipe declared this beat reads, with templates resolved. */
function declaredReads(beat: Beat, context: ComposeContext): string[] {
  const bindings = bindingsFor(semanticsFor(context.workspace), context.period)
  return beat.reads.map((read) => resolveTemplate(read, bindings))
}

/**
 * EDIT B's candidate list: everything this beat could read.
 *
 * The recipe's own declarations come first — they're the beat's reason for existing —
 * then the rest of the workspace's measures and lenses, so the operator can widen
 * the scope rather than only narrow it.
 */
function candidateReads(beat: Beat, context: ComposeContext): string[] {
  const semantics = semanticsFor(context.workspace)
  const offered = [...semantics.metrics, ...semantics.dimensions]
  return Array.from(new Set([...declaredReads(beat, context), ...offered]))
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
): BeatModel {
  const semantics = semanticsFor(context.workspace)
  const bindings = bindingsFor(semantics, context.period)

  // An optional beat in a collapsing plan is present but drawn back.
  const thin = beat.optional
  const confidence = CONFIDENCE_LABELS[beat.confidence]

  const declared = declaredReads(beat, context)
  const effective = options.beatReads?.[beat.id] ?? declared
  const overridden =
    effective.length !== declared.length || effective.some((read) => !declared.includes(read))

  // Recomposed from the EFFECTIVE scope, so an Edit-B toggle re-resolves this line
  // and only this line.
  const readsClause = effective.length > 0 ? `reads ${effective.join(' · ')} · ` : ''

  const editing =
    options.editBeat === beat.id
      ? {
          reads: candidateReads(beat, context).map((label) => ({
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

  const beats = recipe.beats
    .filter((beat) => !beat.optional || showsOptionalBeats(recipe))
    .map((beat) => composeBeat(beat, context, options))

  return {
    // "Funnel · Flow family". Capitalising the declared family name avoids a
    // lookup table that would need editing every time a family is added.
    badge: `${shortRecipeName(recipe.name)} · ${capitalise(recipe.family)} family`,
    intent: context.intent,
    contextChips: [context.workspace, PERIOD_LABELS[context.period]],
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
