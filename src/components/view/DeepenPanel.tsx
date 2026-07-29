// view/DeepenPanel.tsx
// ---------------------------------------------------------------------------
// The deepen panel — one component, every view, both families.
//
// Two rules it exists to honour (brief §5.2–5.3):
//
//  1. It NEVER changes the content column's width. It's a flex sibling of the scroll
//     container, so the most it can do is take room away from that container; the
//     column's width comes from a token. Below 1460px it leaves the flow entirely
//     and overlays. See the note at the top of view.css.
//  2. Answers are EPHEMERAL until promoted. The tag says so, and it's the difference
//     between dialogue and the artifact.
//
// It stays mounted whether open or closed so the width can animate, which is also
// why `.deepen__inner` is pinned to the panel width — the contents mustn't reflow
// mid-transition.
// ---------------------------------------------------------------------------

import { useComposition } from '../../compose/useComposition'
import { useApp } from '../../state/AppContext'

export function DeepenPanel() {
  const { state, dispatch } = useApp()
  const { deepen } = useComposition()

  const open = state.deepenScope !== null && deepen !== null

  return (
    <aside
      className={`deepen${open ? ' deepen--open' : ''}`}
      aria-label="Deeper answer"
      aria-hidden={!open}
    >
      {deepen && (
        <div className="deepen__inner">
          <div className="deepen__head">
            <span className="deepen__scope">{deepen.scopeLabel}</span>
            <button
              type="button"
              className="deepen__close"
              aria-label="Close"
              onClick={() => dispatch({ type: 'CLOSE_DEEPEN' })}
            >
              ×
            </button>
          </div>

          <h2 className="deepen__title">{deepen.title}</h2>

          <span className={`deepen__tag${deepen.promoted ? ' deepen__tag--added' : ''}`}>
            {deepen.tag}
          </span>

          <div className="deepen__body">
            {deepen.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            <div className="deepen__scoped-note">
              Scoped to this section — a deeper pass on the same question.
            </div>
          </div>

          {deepen.canPromote && (
            <div className="deepen__actions">
              <button
                type="button"
                className={`btn btn--primary${deepen.promoted ? ' deepen__add--done' : ''}`}
                disabled={deepen.promoted}
                onClick={() => dispatch({ type: 'PROMOTE_DEEPEN' })}
              >
                {deepen.addLabel}
              </button>
            </div>
          )}

          {/* Inert. The real dialogue is a later skill; an input that looks live and
              does nothing is worse than an obvious placeholder. */}
          <div className="deepen__ask">
            <span className="deepen__ask-dot" />
            ask about this part…
          </div>
        </div>
      )}
    </aside>
  )
}
