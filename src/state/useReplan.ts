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
import { resolve } from '../data/resolve'
import type { Picks } from '../data/resolve'
import type { RecipeId } from '../data/recipe_schema'
import { useApp } from './AppContext'

export function useReplan() {
  const { state, dispatch } = useApp()

  return useCallback(
    /**
     * @param intent   the revised ask
     * @param override a recipe picked explicitly from the eligible list. Still inside
     *                 the workflow's own set, so the standpoint rule holds — this
     *                 chooses *between* eligible shapes, it can't escape them.
     */
    (intent: string, override?: RecipeId | null) => {
      const asked = intent.trim()
      if (!asked) return

      const picks: Picks = {
        workflow: state.workflow,
        output: state.output,
        period: state.period,
        outputTouched: state.outputTouched,
        periodTouched: state.periodTouched,
      }
      const resolved = resolve(picks, asked)

      // SUBMIT_INTENT resets the build, clears the old plan's edits and routes to the
      // thread. There is no failing branch: the resolver always lands somewhere
      // defensible within this workflow.
      dispatch({
        type: 'SUBMIT_INTENT',
        intent: asked,
        resolved: override
          ? // An explicit pick outranks whatever the text said about the shape, and is
            // recorded as `picked` so the Build step credits the operator rather than
            // claiming it recognised something.
            {
              ...resolved,
              recipe: override,
              sources: { ...resolved.sources, recipe: 'picked' },
              flags: resolved.flags.filter(
                (flag) => flag !== 'assumed_primary_recipe' && flag !== 'off_domain_text',
              ),
            }
          : resolved,
      })
    },
    [
      dispatch,
      state.workflow,
      state.output,
      state.period,
      state.outputTouched,
      state.periodTouched,
    ],
  )
}
