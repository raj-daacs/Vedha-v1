// PlanBlock.tsx
// ---------------------------------------------------------------------------
// The composed plan the operator approves before anything gets built. Gamma's
// crucial beat, and ours: propose the shape first, let it be corrected, then build.
//
// Reads a PlanModel and nothing else. There is no funnel version of this file and
// no scorecard version — the beats, the scope, the labels and the accent all
// arrive already decided by composePlan.
// ---------------------------------------------------------------------------

import type { PlanModel } from '../../compose/models'
import { useApp } from '../../state/AppContext'
import { BeatCard } from './BeatCard'
import { EditIntentModal } from './EditIntentModal'
import { ScopePanel } from './ScopePanel'

export function PlanBlock({ plan }: { plan: PlanModel }) {
  const { state, dispatch } = useApp()

  return (
    <div className="plan">
      <div className="plan__badge">{plan.badge}</div>

      {/* The intent chip IS the Edit-A affordance — dashed because it's editable,
          and it opens the editor that can re-select the recipe. */}
      <div className="plan__chips">
        <button
          type="button"
          className="chip chip--editable"
          onClick={() => dispatch({ type: 'OPEN_EDIT_A' })}
        >
          ✎ intent: {plan.intent}
        </button>
        {plan.contextChips.map((label) => (
          <button
            key={label}
            type="button"
            className="chip chip--editable"
            onClick={() => dispatch({ type: 'OPEN_EDIT_A' })}
          >
            {label}
          </button>
        ))}
      </div>

      <ScopePanel scope={plan.scope} />

      <div className="plan__label">{plan.planLabel}</div>

      {plan.beats.map((beat) => (
        <BeatCard key={beat.id} beat={beat} />
      ))}

      <div className="plan__actions">
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => dispatch({ type: 'OPEN_VIEW' })}
        >
          {plan.primaryAction}
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => dispatch({ type: 'OPEN_EDIT_A' })}
        >
          Edit intent
        </button>
        {/* The coarse way back: return to the front door with the ask intact. */}
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => dispatch({ type: 'EDIT_INTENT' })}
        >
          Start over
        </button>
      </div>

      {state.editA && <EditIntentModal />}
    </div>
  )
}
