// plan/BeatCard.tsx
// ---------------------------------------------------------------------------
// One beat of the plan: the question Vedha will answer, what it reads, what it
// builds, and how much to trust it.
//
// `prominence` is the whole story. A full beat carries its spec and a confidence
// stamp; a thin one shows the question and why it's drawn back. Both come from the
// recipe — this file only renders what it was handed.
//
// EDIT B lives here. A full beat can be opened for editing, and while it is, its
// scope chips toggle. Every toggle recomposes THIS beat's detail line through
// composePlan and leaves the rest of the plan alone — which is the difference between
// Edit B and Edit A. There's no "Re-resolve" button because the re-resolve already
// happened as you toggled; a button to make it happen would be theatre.
// ---------------------------------------------------------------------------

import type { BeatModel } from '../../compose/models'
import { useApp } from '../../state/AppContext'

export function BeatCard({ beat }: { beat: BeatModel }) {
  const { dispatch } = useApp()
  const editing = beat.editing
  // Thin beats aren't editable: the recipe has already drawn them back, and giving
  // them a scope editor would say they matter more than the beats above them.
  const canEdit = beat.prominence === 'full'

  return (
    <div className={`beat beat--${beat.prominence}${editing ? ' beat--editing' : ''}`}>
      <div className="beat__question">
        <span className="beat__category">{beat.category}</span>
        {beat.question}
        {beat.tail && <span className="beat__tail">{beat.tail}</span>}
        {canEdit && !editing && (
          <button
            type="button"
            className="beat__edit"
            aria-label={`Edit scope: ${beat.question}`}
            onClick={() => dispatch({ type: 'EDIT_BEAT', beatId: beat.id })}
          >
            ✎ scope
          </button>
        )}
      </div>

      {beat.detail && (
        <div className="beat__detail">
          {beat.detail}
          {beat.confidence && <span className="beat__confidence">{beat.confidence}</span>}
        </div>
      )}

      {editing && (
        <div className="beat__editor">
          <div className="beat__editor-label">
            In scope — what this beat reads
            {editing.resolved && (
              <span className="beat__stamp">re-resolved ✓ · only this beat changed</span>
            )}
          </div>

          <div className="beat__reads">
            {editing.reads.map((read) => (
              <button
                key={read.label}
                type="button"
                className={`token token--${read.inScope ? 'in-plan' : 'add'}`}
                aria-pressed={read.inScope}
                onClick={() =>
                  dispatch({
                    type: 'TOGGLE_BEAT_READ',
                    beatId: beat.id,
                    read: read.label,
                    // The effective scope, passed in so the reducer never needs to
                    // know what the recipe declared.
                    current: editing.reads.filter((r) => r.inScope).map((r) => r.label),
                  })
                }
              >
                {read.inScope ? '✓ ' : '＋ '}
                {read.label}
              </button>
            ))}
          </div>

          <div className="beat__editor-actions">
            <button
              type="button"
              className="btn btn--ghost btn--small"
              onClick={() => dispatch({ type: 'CLOSE_EDIT_BEAT' })}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
