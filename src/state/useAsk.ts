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
import type { Period, WorkflowName } from '../data/recipe_schema'
import { useApp } from './AppContext'

/** Context an ask may bring with it, overriding what's currently set. */
export interface AskContext {
  workflow?: WorkflowName
  period?: Period
}

export function useAsk() {
  const { state, dispatch } = useApp()

  return useCallback(
    (intent: string, context: AskContext = {}) => {
      const asked = intent.trim()
      if (!asked) return

      // Context a prompt chip carries wins over the current setting — the chip is
      // stating its own context, not borrowing yours. Otherwise an ask that says
      // "this month" would be planned against whatever period happened to be set.
      const inWorkflow = context.workflow ?? state.workflow
      const { recipe } = selectRecipe(asked, inWorkflow)

      dispatch({
        type: 'SUBMIT_INTENT',
        intent: asked,
        recipeId: recipe?.id ?? null,
        workflow: context.workflow,
        period: context.period,
      })
    },
    [dispatch, state.workflow],
  )
}
