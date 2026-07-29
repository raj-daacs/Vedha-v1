// state/useReplan.ts
// ---------------------------------------------------------------------------
// EDIT A's commit step. A deliberate sibling of `useAsk` — the same edge, the same
// action, so a revised ask and a fresh one cannot behave differently.
//
// Because it dispatches SUBMIT_INTENT, the narrated build replays and the
// recipe-recognition step names whatever the edit resolved to. That's what makes the
// re-plan visible rather than a silent swap.
// ---------------------------------------------------------------------------

import { useCallback } from 'react'
import { selectRecipe } from '../data/selectRecipe'
import { useApp } from './AppContext'

export function useReplan() {
  const { state, dispatch } = useApp()

  return useCallback(
    /**
     * @param intent   the revised ask
     * @param override a recipe picked explicitly from the eligible list. Still inside
     *                 the workspace's own set, so the standpoint rule holds — this
     *                 chooses *between* eligible shapes, it can't escape them.
     */
    (intent: string, override?: string | null) => {
      const asked = intent.trim()
      if (!asked) return

      const recipeId = override ?? selectRecipe(asked, state.workspace).recipe?.id ?? null

      // SUBMIT_INTENT already resets the build and clears the old plan's edits, and
      // routes to the thread. If the revision resolves to nothing it lands on the
      // ask-again state instead — which is the honest outcome, not a failure.
      dispatch({ type: 'SUBMIT_INTENT', intent: asked, recipeId })
    },
    [dispatch, state.workspace],
  )
}
