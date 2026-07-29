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
import { resolveTitle, subjectOf } from './composePlan'
import type { Recipe } from '../data/recipeTypes'

/**
 * Does this recipe describe a flow you run, or a state you monitor?
 *
 * Read off the spine declaration — a flow declares its input, a state doesn't —
 * so the aside on the recognition step is earned from data rather than asserted.
 */
function declaresAFlow(recipe: Recipe): boolean {
  return Boolean(recipe.spine.input ?? recipe.spine.work ?? recipe.spine.output)
}

export function composeBuild(recipe: Recipe, context: ComposeContext): BuildModel {
  const subject = subjectOf(recipe, context)
  const shapeName = shortRecipeName(recipe.name)

  const steps: BuildStep[] = [
    // 1 — loading the context Vedha already holds. `rendered_as` is the recipe's
    // own word for how this shape draws (funnel / bridge / cohort / scorecard).
    {
      pre: `Loading ${subject} — ${recipe.spine.rendered_as}`,
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
