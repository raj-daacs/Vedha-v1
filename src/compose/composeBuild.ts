// compose/composeBuild.ts
// ---------------------------------------------------------------------------
// The narrated build — what the operator watches between asking and approving.
//
// This exists because of a hard-won interaction rule (brief §5.4): the build is
// NARRATED AND ANIMATED, NOT A SPINNER, and the recipe-selection step is visible.
// A spinner says "wait"; this says "here is what I'm doing, and here is the moment
// I recognised what kind of question you asked." That recognition step is the beat
// that makes Vedha read as an analyst rather than a search box.
//
// It is also where THE RESOLUTION IS SURFACED. The resolver fills gaps with scoped
// defaults, and it must never do so silently — so the query is restated here in plain
// words with every value's provenance marked, and every assumption made correctable.
// Defaulting is safe precisely because it's shown.
//
// Like composePlan, every line is derived from what the recipe declared — the
// state family's "(a state, not a flow)" aside included. No family checks.
// ---------------------------------------------------------------------------

import type {
  BuildModel,
  BuildStep,
  ComposeContext,
  ResolutionNote,
  ResolutionSegment,
} from './models'
import { shortRecipeName } from './templates'
import { deriveSpine, resolveTitle, subjectOf } from './composePlan'
import { RECIPES_BY_ID, getWorkflow } from '../data/recipes'
import type { Recipe, Source } from '../data/recipe_schema'
import { OUTPUT_LABELS, PERIOD_LABELS } from '../data/scope'

/** What the reducer stored about how the ask resolved. Null before any ask. */
export interface ResolutionInput {
  sources: { recipe: Source; output: Source; period: Source }
  flags: string[]
  focus?: { dimension?: string; member?: string; note?: string }
}

/**
 * Does this recipe describe something that moves, or a state you monitor?
 *
 * Asks `deriveSpine` rather than reading spine fields directly, so it inherits the
 * both-triplets rule for free: a response shape declares `lever → response →
 * constraint` and is every bit as much a thing that moves as a funnel is. Only the
 * scorecard comes back spineless, which is what earns the aside from data rather
 * than asserting it.
 */
function declaresAFlow(recipe: Recipe): boolean {
  return deriveSpine(recipe.spine).length > 0
}

/**
 * How each output reads as something Vedha is about to do, with the output itself as
 * the object of the verb: "I'll run a **review** of …", "I'll pull a **quick answer**
 * on …".
 *
 * Phrased this way on purpose. The obvious construction — a verb chosen by output,
 * then "as a <output>" later in the sentence — states the output twice and lands on
 * "I'll review Activation … as a review". Making the chip the object says it once,
 * keeps it sourced, and still lets the sentence change shape with the output.
 */
const OUTPUT_PHRASING = {
  quick_answer: { before: "I'll pull a ", after: ' on ' },
  report: { before: "I'll work through a ", after: ' on ' },
  review: { before: "I'll run a ", after: ' of ' },
  readout: { before: "I'll put together a ", after: ' on ' },
} as const

/**
 * Restate the resolved query in plain words, marking where each value came from.
 *
 * Reads like the sentence a colleague would say back to you before starting —
 * "I'll review Activation, for this month, as a review — using the funnel." Every
 * `default` segment is a guess, and every guess is tappable.
 */
function restate(
  recipe: Recipe,
  context: ComposeContext,
  resolution: ResolutionInput,
): ResolutionSegment[] {
  const { sources, focus } = resolution
  const focusText = focus?.dimension ?? focus?.member
  const phrasing = OUTPUT_PHRASING[context.output]

  const segments: ResolutionSegment[] = [
    { text: phrasing.before },
    {
      text: OUTPUT_LABELS[context.output].toLowerCase(),
      source: sources.output,
      correctable: sources.output === 'default',
    },
    { text: phrasing.after },
    // The workflow is always the operator's own pick — it's the standpoint they chose
    // to stand in, and nothing in the resolver can move it.
    { text: subjectOf(recipe, context), source: 'picked' },
    { text: ', for ' },
    {
      text: PERIOD_LABELS[context.period],
      source: sources.period,
      correctable: sources.period === 'default',
    },
  ]

  if (focusText) {
    segments.push({ text: ', focused on ' }, { text: focusText, source: 'text' })
  }

  segments.push(
    { text: ' — using the ' },
    {
      text: shortRecipeName(recipe.name).toLowerCase(),
      source: sources.recipe,
      correctable: sources.recipe === 'default',
    },
    { text: '.' },
  )

  return segments
}

/**
 * What Vedha should say out loud about the resolution, beyond the sourced sentence.
 *
 * Both notes exist because a default that is merely *marked* is easy to skim past. If
 * we guessed the shape, name the alternative; if the text landed nowhere at all, ask
 * outright rather than pretending we understood.
 */
function noteFor(
  recipe: Recipe,
  context: ComposeContext,
  resolution: ResolutionInput,
): ResolutionNote[] {
  const notes: ResolutionNote[] = []

  if (resolution.flags.includes('assumed_primary_recipe')) {
    // Name the shape NOT taken, read off the workflow's own eligible list — so the
    // offer is always the real alternative rather than a hardcoded pairing.
    const other = getWorkflow(context.workflow)
      .eligible.filter((id) => id !== recipe.id)
      .map((id) => shortRecipeName(RECIPES_BY_ID[id].name).toLowerCase())
      .join(' or ')
    notes.push({
      tone: 'assumed',
      text: other
        ? `Your wording didn't name a shape, so I took the usual lens for ${context.workflow}. Did you want the ${other} instead?`
        : `Your wording didn't name a shape, so I took the usual lens for ${context.workflow}.`,
    })
  }

  if (resolution.flags.includes('off_domain_text')) {
    notes.push({
      tone: 'check',
      text: `I couldn't find anything to go on in that, so I focused on ${context.workflow} for ${PERIOD_LABELS[context.period]}. Was that your question?`,
    })
  }

  return notes
}

export function composeBuild(
  recipe: Recipe,
  context: ComposeContext,
  /** How the ask resolved. Absent only for a state that predates any submit. */
  resolution: ResolutionInput | null,
): BuildModel {
  const subject = subjectOf(recipe, context)
  const shapeName = shortRecipeName(recipe.name)

  const steps: BuildStep[] = [
    // 1 — loading the context Vedha already holds. `trigger.shape` is the recipe's
    // own word for how it draws (funnel / bridge / cohort / scorecard / sensitivity).
    // It replaces the schema's former `spine.rendered_as`, which carried the same
    // vocabulary from the other side of the declaration.
    //
    // Dwells are weighted by how much work the beat stands for. Reading them in
    // order — short, long, hesitate, short — is what stops the sequence sounding
    // like a metronome and starts it sounding like something is being worked out.
    {
      pre: `Loading ${subject} — ${recipe.trigger.shape}`,
      strong: '',
      post: '',
      isRecipeStep: false,
      // Context Vedha already holds. It should land almost immediately, so the
      // sequence opens with something rather than with a blank pause.
      dwellMs: 420,
    },
    // 2 — the semantic layer: measures and the lateral lenses.
    {
      pre: 'Finding measures & dimensions',
      strong: '',
      post: '',
      isRecipeStep: false,
      // The heaviest genuine lookup of the four — it reads the whole semantic layer.
      dwellMs: 1020,
    },
    // 3 — THE HERO. Naming the shape is the agentic moment; the aside tells a
    // state-shaped answer apart from a flow-shaped one in the operator's words.
    //
    // The verb tracks how the shape was actually reached. "Recognising" is only true
    // when the text named it; where the scope decided, say so — claiming recognition
    // for a default is the exact overstatement the resolution surface exists to stop.
    {
      pre:
        resolution?.sources.recipe === 'text'
          ? 'Recognising the shape → '
          : 'Taking the shape for this scope → ',
      strong: shapeName,
      post: declaresAFlow(recipe) ? '' : ' (a state, not a flow)',
      isRecipeStep: true,
      // The hero. Deliberately the longest: a judgement that resolves instantly
      // doesn't read as a judgement. The pause is the point.
      dwellMs: 1180,
    },
    // 4 — composing the beats.
    {
      pre: 'Drafting the plan…',
      strong: '',
      post: '',
      isRecipeStep: false,
      // Its own trailing ellipsis already says "still going", and the plan fading
      // in underneath is the resolution — so this one hands off quickly.
      dwellMs: 560,
    },
  ]

  return {
    // Same resolver the Insight View uses, so the thread title and the built
    // view's title can never disagree.
    title: resolveTitle(recipe, context),
    question: context.intent,
    // Falls back to the bare subject when there's no resolution to report — which
    // only happens for a recipe set outside the submit path.
    resolution: resolution
      ? restate(recipe, context, resolution)
      : [{ text: "I'll look at " }, { text: subject, source: 'picked' }, { text: '.' }],
    notes: resolution ? noteFor(recipe, context, resolution) : [],
    steps,
  }
}
