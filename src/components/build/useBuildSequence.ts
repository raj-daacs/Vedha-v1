// useBuildSequence.ts
// ---------------------------------------------------------------------------
// Drives the narrated build: one step resolves at a time, then the plan reveals.
//
// The cadence and the state machine come from `vedha_full_flow_lowfi.html`, the
// behaviour source of truth. It runs a single interval and advances one step per
// tick — deliberately not a spinner, and deliberately not all-at-once (brief §5.4).
// ---------------------------------------------------------------------------

import { useEffect } from 'react'
import { useApp } from '../../state/AppContext'

/** 720ms — the low-fi's interval. Slow enough to read, quick enough not to stall. */
const STEP_MS = 720

/**
 * Read once per call rather than subscribed: the build sequence is short, and a
 * user toggling the OS setting mid-animation isn't a case worth the listener.
 */
function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

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
    }, STEP_MS)

    return () => clearInterval(interval)
  }, [recipeId, planRevealed, stepCount, dispatch])
}
