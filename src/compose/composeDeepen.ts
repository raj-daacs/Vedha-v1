// compose/composeDeepen.ts
// ---------------------------------------------------------------------------
// The scoped deeper pass — the same reasoning re-invoked from one section's
// standpoint, or from the whole view (brief §5.3).
//
// Family-blind like the rest of the compose layer: a scope is just a beat id (or
// `'root'`), and the answer is looked up on the same (workspace, recipe) fixture the
// view itself came from. One panel component renders whatever this returns.
//
// Ephemeral is the default. An answer becomes part of the artifact only when it's
// promoted, which is why `promoted` is passed in rather than baked into the fixture.
// ---------------------------------------------------------------------------

import type { ComposeContext } from './models'
import type { DeepenModel } from './viewModels'
import type { Recipe } from '../data/recipeTypes'
import { VIEW_FIXTURES, fixtureKey } from '../data/viewFixtures'

/** The whole-view scope, opened by "Ask about this view". */
export const ROOT_SCOPE = 'root'

export function composeDeepen(
  recipe: Recipe,
  context: ComposeContext,
  scope: string | null,
  promoted: string[],
): DeepenModel | null {
  if (!scope) return null

  const fixture = VIEW_FIXTURES[fixtureKey(context.workspace, recipe.id)]
  const answer = fixture?.deepen[scope]
  if (!answer) return null

  const isPromoted = promoted.includes(scope)
  const canPromote = answer.promotedSection !== undefined

  return {
    scope,
    scopeLabel: answer.scopeLabel,
    title: answer.title,
    body: answer.body,
    promoted: isPromoted,
    canPromote,
    // Stated plainly, because the distinction is the point: until it's promoted this
    // answer is dialogue, not a finding, and it isn't in the view.
    tag: isPromoted ? 'added to the view ✓' : 'ephemeral · not in the view',
    addLabel: isPromoted ? 'Added to view ✓' : '＋ Add to view',
  }
}
