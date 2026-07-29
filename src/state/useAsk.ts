// state/useAsk.ts
// ---------------------------------------------------------------------------
// Asking is the one action that needs to consult the recipe book, so it happens
// here at the edge rather than inside the reducer — the reducer stays pure and
// knows nothing about matching.
//
// Both the send button and the example cards go through this, so the two entry
// paths can't drift apart.
// ---------------------------------------------------------------------------

import { useCallback } from 'react'
import { selectRecipe } from '../data/selectRecipe'
import type { Period, Workspace } from '../data/workspaces'
import { useApp } from './AppContext'

/** Context an ask may bring with it, overriding what's currently set. */
export interface AskContext {
  workspace?: Workspace
  period?: Period
}

export function useAsk() {
  const { state, dispatch } = useApp()

  return useCallback(
    (intent: string, context: AskContext = {}) => {
      const asked = intent.trim()
      if (!asked) return

      // Context an example card carries wins over the current setting — the card is
      // stating its own context, not borrowing yours. Otherwise an ask that says
      // "this month" would be planned against whatever period happened to be set.
      const inWorkspace = context.workspace ?? state.workspace
      const { recipe } = selectRecipe(asked, inWorkspace)

      dispatch({
        type: 'SUBMIT_INTENT',
        intent: asked,
        recipeId: recipe?.id ?? null,
        workspace: context.workspace,
        period: context.period,
      })
    },
    [dispatch, state.workspace],
  )
}
