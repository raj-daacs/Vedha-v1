// useViewBuildSequence.ts
// ---------------------------------------------------------------------------
// Assembles the Insight View: the spine lays down, then each section arrives in
// walk order — the order the recipe declared its beats.
//
// Deliberately a mirror of `useBuildSequence`: one interval, cleared on teardown,
// state-driven so the progress is derivable and replays cleanly. The difference is
// what it's saying. The build sequence narrates work ("recognising the shape"); this
// one is the answer arriving, so it's quick enough to read as composition rather than
// as another thing to wait for.
//
// FAMILY-BLIND: it only ever sees a section count from the compose layer. All three
// views run the identical sequence; nothing here knows a funnel from a scorecard.
//
// Nothing it touches affects layout — see the reveal rules in view.css. The rigid
// content column is untouched, so the width invariant holds throughout.
// ---------------------------------------------------------------------------

import { useEffect } from 'react'
import { VIEW_STAGGER_MS, prefersReducedMotion } from '../motion'
import { useApp } from '../../state/AppContext'

/**
 * Reveal sections one at a time while the view is assembling.
 *
 * Completion is derived (`viewStep >= sectionCount`), which is what lets a promoted
 * follow-up animate in without any special case: promoting grows the count, the
 * sequence finds one more section to reveal, and stops again.
 */
export function useViewBuildSequence(sectionCount: number) {
  const { state, dispatch } = useApp()
  const { recipeId, viewStep } = state
  const done = viewStep >= sectionCount

  useEffect(() => {
    // Nothing composed, nothing to assemble, or we're not on the view.
    if (!recipeId || sectionCount === 0 || viewStep < 0) return
    if (done) return

    // Reduced motion: the whole view at once. No timers — the operator gets the same
    // artifact, just without it arriving in pieces.
    if (prefersReducedMotion()) {
      dispatch({ type: 'VIEW_COMPLETE', sectionCount })
      return
    }

    const interval = setInterval(() => {
      dispatch({ type: 'VIEW_ADVANCE', sectionCount })
    }, VIEW_STAGGER_MS)

    return () => clearInterval(interval)
  }, [recipeId, viewStep, sectionCount, done, dispatch])
}
