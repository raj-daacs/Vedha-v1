// useViewBuildSequence.ts
// ---------------------------------------------------------------------------
// Assembles the Insight View: the spine lays down, then each section arrives in
// walk order — the order the recipe declared its beats.
//
// Deliberately a mirror of `useBuildSequence`: a self-rescheduling timeout, cleared
// on teardown, state-driven so the progress is derivable and replays cleanly. The
// difference is what it's saying. The build sequence narrates work ("recognising the
// shape"); this one is the answer arriving, so it's quick enough to read as
// composition rather than as another thing to wait for.
//
// WHY NOT ONE INTERVAL. A fixed stagger reveals every section on the same beat, and
// nothing that is genuinely being assembled comes out evenly spaced — the eye reads
// the regularity as playback. Each section now waits a dwell scaled by how much it
// actually carries (panels, headline, legend), so the heavy section visibly takes
// longer than the one that resolves to a sentence. `viewDwellsMs` normalises those
// weights against their own mean, so the view still settles in the same ~2s total.
//
// FAMILY-BLIND: it only ever sees section weights from the compose layer. All three
// views run the identical sequence; nothing here knows a funnel from a scorecard.
//
// Nothing it touches affects layout — see the reveal rules in view.css. The rigid
// content column is untouched, so the width invariant holds throughout.
// ---------------------------------------------------------------------------

import { useEffect, useRef } from 'react'
import { prefersReducedMotion, viewDwellsMs } from '../motion'
import { useApp } from '../../state/AppContext'

/**
 * Reveal sections one at a time while the view is assembling.
 *
 * Completion is derived (`viewStep >= weights.length`), which is what lets a promoted
 * follow-up animate in without any special case: promoting grows the list, the
 * sequence finds one more section to reveal, and stops again.
 *
 * @param weights One entry per section still to be revealed, in walk order. Relative
 *                only — see `viewDwellsMs`.
 */
export function useViewBuildSequence(weights: number[]) {
  const { state, dispatch } = useApp()
  const { recipeId, viewStep } = state
  const sectionCount = weights.length
  const done = viewStep >= sectionCount

  // The chain reschedules from inside a timeout, so it must not close over a stale
  // weights array. A ref also keeps `weights` out of the effect's dependencies — a
  // fresh array identity each render would otherwise restart the assembly.
  const weightsRef = useRef(weights)
  weightsRef.current = weights

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

    // Computed once per pass, not per tick, so the rhythm is decided up front and a
    // re-render mid-assembly can't reshuffle the remaining dwells.
    const dwells = viewDwellsMs(weightsRef.current)

    let timer: ReturnType<typeof setTimeout>
    // Which section's dwell is being waited out. The effect re-runs on every
    // `viewStep` change, so this starts from wherever the sequence currently is.
    let index = viewStep

    const tick = () => {
      dispatch({ type: 'VIEW_ADVANCE', sectionCount })
      index += 1
      if (index >= sectionCount) return
      timer = setTimeout(tick, dwells[index] ?? dwells[dwells.length - 1])
    }

    timer = setTimeout(tick, dwells[index] ?? dwells[0])

    return () => clearTimeout(timer)
    // `viewStep` stays a dependency: a promoted follow-up arrives by growing the
    // count, and the effect has to re-arm to reveal it.
  }, [recipeId, viewStep, sectionCount, done, dispatch])
}
