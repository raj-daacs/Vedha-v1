// useBuildSequence.ts
// ---------------------------------------------------------------------------
// Drives the narrated build: one step resolves at a time, then the plan reveals.
//
// The state machine comes from `vedha_full_flow_lowfi.html`, the behaviour source of
// truth. The cadence no longer does.
//
// WHY THIS IS A TIMEOUT CHAIN AND NOT AN INTERVAL. A single `setInterval` advances
// every step on the same beat, and a fixed beat is the one thing that cannot happen
// when work is really being done — it reads as a progress bar playing back, because
// that is exactly what it is. Each step now waits its own authored dwell (see
// `BuildStep.dwellMs`) plus jitter, so the rhythm is uneven in the direction the work
// actually is: the semantic-layer lookup takes visibly longer than loading context,
// and naming the shape hesitates before it commits.
// ---------------------------------------------------------------------------

import { useEffect, useRef } from 'react'
import type { BuildStep } from '../../compose/models'
import { buildDwellMs, prefersReducedMotion } from '../motion'
import { useApp } from '../../state/AppContext'

/**
 * Advance the build while one is running.
 *
 * Idempotent under StrictMode's double-mount: the effect owns at most one pending
 * timeout and clears it on teardown. Once `planRevealed` flips true the effect
 * re-runs, takes the early return, and nothing is left scheduled.
 */
export function useBuildSequence(steps: BuildStep[]) {
  const { state, dispatch } = useApp()
  const { recipeId, planRevealed } = state
  const stepCount = steps.length

  // The chain reschedules itself from inside a timeout, so it must not close over
  // a stale `steps` from the render that armed it.
  const stepsRef = useRef(steps)
  stepsRef.current = steps

  useEffect(() => {
    // Nothing to narrate, or it's already finished.
    if (!recipeId || planRevealed || stepCount === 0) return

    // Reduced motion: resolve everything at once. No timers, no pulsing dot —
    // the operator still sees which steps ran and what shape was recognised.
    if (prefersReducedMotion()) {
      dispatch({ type: 'BUILD_COMPLETE', stepCount })
      return
    }

    let timer: ReturnType<typeof setTimeout>
    // Tracks the step whose dwell is currently being waited out. Held locally rather
    // than read back off state so the chain can't be knocked off course by an
    // unrelated re-render landing mid-flight.
    let index = 0

    const tick = () => {
      dispatch({ type: 'BUILD_ADVANCE', stepCount })
      index += 1
      if (index >= stepCount) return
      timer = setTimeout(tick, buildDwellMs(stepsRef.current[index]?.dwellMs))
    }

    timer = setTimeout(tick, buildDwellMs(stepsRef.current[0]?.dwellMs))

    return () => clearTimeout(timer)
  }, [recipeId, planRevealed, stepCount, dispatch])
}
