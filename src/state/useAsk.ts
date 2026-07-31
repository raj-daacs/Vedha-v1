// state/useAsk.ts
// ---------------------------------------------------------------------------
// Asking is the one action that has to consult the resolver, so it happens here at
// the edge rather than inside the reducer — the reducer stays pure and knows nothing
// about matching, cues or defaults.
//
// Both the send button and the prompt chips go through this, so the two entry paths
// can't drift apart.
// ---------------------------------------------------------------------------

import { useCallback } from 'react'
import { getWorkflow } from '../data/recipes'
import { resolve } from '../data/resolve'
import type { Picks } from '../data/resolve'
import type { WorkflowName } from '../data/recipe_schema'
import { useApp } from './AppContext'

/** Context an ask may bring with it, overriding what's currently set. */
export interface AskContext {
  workflow?: WorkflowName
}

export function useAsk() {
  const { state, dispatch } = useApp()

  return useCallback(
    (intent: string, context: AskContext = {}) => {
      const asked = intent.trim()
      if (!asked) return

      // A prompt chip states its own workflow rather than borrowing the current one,
      // so resolution has to happen against the workflow the ask will actually land
      // in — otherwise a chip could be resolved against a scope it's about to leave.
      const workflow = context.workflow ?? state.workflow

      // When the chip moves the workflow, the untouched output/period defaults move
      // with it. Mirrors the reducer's `withWorkflow`, because the resolver must see
      // the same picks the reducer is about to commit.
      const moving = workflow !== state.workflow
      const config = getWorkflow(workflow)
      const picks: Picks = {
        workflow,
        output: moving && !state.outputTouched ? config.outputDefault : state.output,
        period: moving && !state.periodTouched ? config.periodDefault : state.period,
        outputTouched: state.outputTouched,
        periodTouched: state.periodTouched,
      }

      dispatch({
        type: 'SUBMIT_INTENT',
        intent: asked,
        resolved: resolve(picks, asked),
        workflow: context.workflow,
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
