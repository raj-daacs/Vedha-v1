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
// Like composePlan, every line is derived from what the recipe declared — the
// state family's "(a state, not a flow)" aside included. No family checks.
// ---------------------------------------------------------------------------

import type { BuildModel, BuildStep, ComposeContext } from './models'
import { shortRecipeName } from './templates'
import { deriveSpine, resolveTitle, subjectOf } from './composePlan'
import type { Recipe } from '../data/recipe_schema'

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

export function composeBuild(recipe: Recipe, context: ComposeContext): BuildModel {
  const subject = subjectOf(recipe, context)
  const shapeName = shortRecipeName(recipe.name)

  const steps: BuildStep[] = [
    // 1 — loading the context Vedha already holds. `trigger.shape` is the recipe's
    // own word for how it draws (funnel / bridge / cohort / scorecard / sensitivity).
    // It replaces the schema's former `spine.rendered_as`, which carried the same
    // vocabulary from the other side of the declaration.
    {
      pre: `Loading ${subject} — ${recipe.trigger.shape}`,
      strong: '',
      post: '',
      isRecipeStep: false,
    },
    // 2 — the semantic layer: measures and the lateral lenses.
    { pre: 'Finding measures & dimensions', strong: '', post: '', isRecipeStep: false },
    // 3 — THE HERO. Naming the shape is the agentic moment; the aside tells a
    // state-shaped answer apart from a flow-shaped one in the operator's words.
    {
      pre: 'Recognising the shape → ',
      strong: shapeName,
      post: declaresAFlow(recipe) ? '' : ' (a state, not a flow)',
      isRecipeStep: true,
    },
    // 4 — composing the beats.
    { pre: 'Drafting the plan…', strong: '', post: '', isRecipeStep: false },
  ]

  return {
    // Same resolver the Insight View uses, so the thread title and the built
    // view's title can never disagree.
    title: resolveTitle(recipe, context),
    question: context.intent,
    narration: {
      pre: "I'll look at ",
      strong: subject,
      post: '. Let me load what I already know about it, find the right measures and dimensions, and draft a plan.',
    },
    steps,
  }
}
