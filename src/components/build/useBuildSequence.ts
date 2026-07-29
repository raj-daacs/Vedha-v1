// useBuildSequence.ts
// ---------------------------------------------------------------------------
// Drives the narrated build: one step resolves at a time, then the plan reveals.
//
// The cadence and the state machine come from `vedha_full_flow_lowfi.html`, the
// behaviour source of truth. It runs a single interval and advances one step per
// tick — deliberately not a spinner, and deliberately not all-at-once (brief §5.4).
// ---------------------------------------------------------------------------

import { useEffect } from 'react'
import { BUILD_STEP_MS, prefersReducedMotion } from '../motion'
import { useApp } from '../../state/AppContext'

/**
 * Advance the build while one is running.
 *
 * Idempotent under StrictMode's double-mount: the effect only ever owns one
 * interval and clears it on teardown. Once `planRevealed` flips true the effect
 * re-runs, takes the early return, and no interval is left behind.
 */
export function useBuildSequence(stepCount: number) {
  const { state, dispatch } = useApp()
  const { recipeId, planRevealed } = state

  useEffect(() => {
    // Nothing to narrate, or it's already finished.
    if (!recipeId || planRevealed || stepCount === 0) return

    // Reduced motion: resolve everything at once. No timers, no pulsing dot —
    // the operator still sees which steps ran and what shape was recognised.
    if (prefersReducedMotion()) {
      dispatch({ type: 'BUILD_COMPLETE', stepCount })
      return
    }

    const interval = setInterval(() => {
      dispatch({ type: 'BUILD_ADVANCE', stepCount })
    }, BUILD_STEP_MS)

    return () => clearInterval(interval)
  }, [recipeId, planRevealed, stepCount, dispatch])
}
