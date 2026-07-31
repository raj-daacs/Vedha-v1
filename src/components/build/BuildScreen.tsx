// BuildScreen.tsx
// ---------------------------------------------------------------------------
// The thread: the ask echoed, the agent narrating, the steps resolving, then the
// composed plan. One screen for both report families.
//
// It never sees a recipe. `useComposition()` hands it display models, so there is
// nothing here that could tell a funnel from a scorecard — which is the point.
// ---------------------------------------------------------------------------

import { useComposition } from '../../compose/useComposition'
import { useApp } from '../../state/AppContext'
import { PlanBlock } from '../plan/PlanBlock'
import { ResolutionLine } from './ResolutionLine'
import { StepList } from './StepList'
import { useBuildSequence } from './useBuildSequence'

export function BuildScreen() {
  const { state } = useApp()
  const { build, plan } = useComposition()

  // Called unconditionally; a step count of 0 makes it inert.
  useBuildSequence(build?.steps.length ?? 0)

  if (!build || !plan) {
    return (
      <div className="stage__scroll">
        <div className="stage__placeholder">
          <strong>Nothing to build</strong>
          ask something from the front door
        </div>
      </div>
    )
  }

  return (
    <div className="stage__scroll">
      <div className="thread">
        <h1 className="thread__title">{build.title}</h1>

        {/* The ask, given back verbatim — the operator should see exactly what
            Vedha heard before it commits to a plan. */}
        <div className="thread__question">{build.question}</div>

        {/* The resolution, restated and sourced. This replaced a free-text narration
            line that said nearly the same thing — but couldn't say what it assumed. */}
        <ResolutionLine segments={build.resolution} notes={build.notes} />

        {/* Foldable only once the plan below is on screen — while the trace is still
            resolving it is the whole content of the screen, so it stays open. */}
        <StepList
          steps={build.steps}
          activeIndex={state.buildStep}
          collapsible={state.planRevealed}
        />

        {/* Kept mounted and faded in, so the page doesn't jump when it arrives. */}
        <div className={`plan-reveal${state.planRevealed ? ' plan-reveal--shown' : ''}`}>
          <PlanBlock plan={plan} />
        </div>
      </div>
    </div>
  )
}
