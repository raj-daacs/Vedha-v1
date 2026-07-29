// compose/composeView.ts
// ---------------------------------------------------------------------------
// The rendered Insight View — the artifact the operator keeps.
//
// Same contract as composePlan: this is the only shape-aware code in the view
// pipeline. It walks `recipe.beats` for order, category and question, and asks the
// fixture what each beat draws. Screens receive a ViewModel and can't tell a funnel
// from a scorecard.
//
// The family bend, again as data rather than branches:
//
//   spine strip present  ← deriveSpine(recipe.spine) is non-empty
//   "… vs benchmark"     ← recipe.spine.benchmark is declared
//   which sections exist ← a fixture entry exists for that beat
//   confidence stamp     ← computed from the rendered beats' own confidence
//
// Returns null when no fixture covers this (workspace, recipe) pair, which is how a
// plan-deep recipe gets its placeholder without a list of built views anywhere.
// ---------------------------------------------------------------------------

import { deriveSpine, resolveTitle } from './composePlan'
import type { ComposeContext } from './models'
import { bindingsFor, resolveTemplate } from './templates'
import type { ViewModel, ViewSection } from './viewModels'
import type { Recipe } from '../data/recipeTypes'
import { semanticsFor } from '../data/semanticModel'
import { VIEW_FIXTURES, fixtureKey } from '../data/viewFixtures'

/**
 * The four business-word questions, numbered as the operator meets them. The
 * numeral is part of the reading — it says "this is the first thing to know".
 */
const CATEGORY_LABELS: Record<string, { numeral: string; label: string }> = {
  stand: { numeral: '①', label: 'Where we stand' },
  why: { numeral: '②', label: "Why — what's driving it" },
  ahead: { numeral: '③', label: "What's ahead" },
  do: { numeral: '④', label: 'What we do' },
}

/**
 * A shape that declares a benchmark is judged against it, so its "where we stand"
 * is always "…vs benchmark". Read off the declaration, not off the family.
 */
function categoryFor(category: string, judgedAgainstBenchmark: boolean): string {
  const entry = CATEGORY_LABELS[category]
  if (!entry) return category
  const suffix = judgedAgainstBenchmark && category === 'stand' ? ' vs benchmark' : ''
  return `${entry.numeral} ${entry.label}${suffix}`
}

/** Eyebrow on a section that arrived by promotion rather than from a beat. */
const PROMOTED_ORIGIN = 'added from a follow-up'

export function composeView(
  recipe: Recipe,
  context: ComposeContext,
  /** Deepen scopes promoted onto the view. Order is the order they were added. */
  promoted: string[] = [],
): ViewModel | null {
  const fixture = VIEW_FIXTURES[fixtureKey(context.workspace, recipe.id)]
  if (!fixture) return null

  const bindings = bindingsFor(semanticsFor(context.workspace), context.period)
  const judgedAgainstBenchmark = Boolean(recipe.spine.benchmark)

  // Beat order comes from the recipe; a beat with no fixture simply isn't rendered.
  // That's what keeps the scorecard's two thin optional beats out of the view
  // without anything here knowing they're optional, or why.
  const rendered = recipe.beats.filter((beat) => fixture.beats[beat.id] !== undefined)

  const sections: ViewSection[] = rendered.map((beat) => ({
    id: beat.id,
    category: categoryFor(beat.category, judgedAgainstBenchmark),
    question: resolveTemplate(beat.question, bindings),
    // From the fixture, not from `beat.builds` — see BeatView.subtitle.
    subtitle: fixture.beats[beat.id].subtitle,
    beatView: fixture.beats[beat.id],
  }))

  // Promoted follow-ups land as ordinary sections at the end — which, for a flow
  // view, is on the spine with everything else, since the spine strip heads the
  // whole column. They're text-only: a promoted answer has no atom behind it.
  for (const scope of promoted) {
    const answer = fixture.deepen[scope]?.promotedSection
    if (!answer) continue
    sections.push({
      id: `promoted:${scope}`,
      category: PROMOTED_ORIGIN,
      question: answer.question,
      beatView: { panels: [], takeaway: answer.takeaway },
      promoted: true,
    })
  }

  // Stated honestly rather than asserted (brief §5.6): if every rendered beat reads
  // from data, say so; if any is a projection, don't claim more than that.
  const allFromData = rendered.every((beat) => beat.confidence === 'from_data')
  const confidence = allFromData ? '✓ all from your data' : '◇ includes directional reads'

  return {
    title: resolveTitle(recipe, context),
    subtitle: fixture.subtitle,
    meta: fixture.meta,
    confidence,
    spine: deriveSpine(recipe.spine),
    sections,
  }
}
