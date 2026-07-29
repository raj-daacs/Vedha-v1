// ContextBar.tsx
// ---------------------------------------------------------------------------
// The context label — one of the shell's three fixed parts (command bar · context
// label · stage). A one-line statement of where you're standing: workspace,
// altitude, span.
//
// It is not a browsable surface. Tapping it returns to the front door with the ask
// intact, where the picker can change it — the map, collapsed to a picker.
// ---------------------------------------------------------------------------

import { PERIOD_LABELS } from '../../data/workspaces'
import { useApp } from '../../state/AppContext'

export function ContextBar() {
  const { state, dispatch } = useApp()

  return (
    <div className="ctxbar">
      <button
        type="button"
        className="ctxbar__pill"
        onClick={() => dispatch({ type: 'EDIT_INTENT' })}
      >
        <span className="ctxbar__dot" />
        {state.workspace} · {state.level} · {PERIOD_LABELS[state.period]}
        <span className="ctxbar__caret" aria-hidden="true">
          ▾
        </span>
      </button>
    </div>
  )
}
