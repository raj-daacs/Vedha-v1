// view/InsightView.tsx
// ---------------------------------------------------------------------------
// The built view — an ARTIFACT, not a message (brief §5.1). It persists in the
// stage; there is no chat thread beneath it, and deepening never scrolls it away.
//
// Renders a ViewModel and nothing else. Both report families come through this one
// file: the spine strip appears when the model has spine nodes, sections come in
// whatever order the recipe declared, and the accent is already set on the stage.
//
// LAYOUT: `.view-wrap` is a flex row of [scroll container | deepen panel]. The
// column inside the scroll container is RIGID — opening the panel recentres it and
// cannot resize it. Read the note at the top of view.css before touching this.
//
// When the (workspace, recipe) pair has no fixture yet, the composer returns null
// and this says so plainly rather than faking a chart.
// ---------------------------------------------------------------------------

import { ROOT_SCOPE } from '../../compose/composeDeepen'
import { useComposition } from '../../compose/useComposition'
import { useApp } from '../../state/AppContext'
import { SpineStrip } from '../plan/SpineStrip'
import { DeepenPanel } from './DeepenPanel'
import { ViewSection } from './ViewSection'
import { useViewBuildSequence } from './useViewBuildSequence'

export function InsightView() {
  const { state, dispatch } = useApp()
  const { view, shapeName } = useComposition()

  // Called unconditionally; a section count of 0 (the plan-deep placeholder) makes it
  // inert. The count comes straight from the compose layer, so every view assembles
  // the same way.
  useViewBuildSequence(view?.sections.length ?? 0)

  if (!view) {
    return (
      <div className="stage__scroll">
        <div className="stage__placeholder">
          <strong>{shapeName ? `${shapeName} view` : 'Insight View'}</strong>
          this shape composes a full plan today · the rendered view is rolling out
          <div className="stage__placeholder-action">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => dispatch({ type: 'EDIT_INTENT' })}
            >
              Back to the ask
            </button>
          </div>
        </div>
      </div>
    )
  }

  const askingWholeView = state.deepenScope === ROOT_SCOPE

  return (
    <div className="view-wrap">
      <div className="view-scroll">
        <article className="view">
          <header className="view__header">
            <h1 className="view__title">{view.title}</h1>
            <div className="view__subtitle">{view.subtitle}</div>
            <div className="view__actions">
              {/* Presentational: saving and sharing are later work, but the
                  affordances belong to the artifact and the header reads wrong
                  without them. */}
              <span className="view__action">Save</span>
              <span className="view__action">Share</span>
              <button
                type="button"
                className={`view__action view__action--ask${
                  askingWholeView ? ' view__action--active' : ''
                }`}
                aria-pressed={askingWholeView}
                onClick={() => dispatch({ type: 'OPEN_DEEPEN', scope: ROOT_SCOPE })}
              >
                Ask about this view
              </button>
            </div>
          </header>

          <div className="view__meta">
            <span className="view__confidence">{view.confidence}</span>
            <span>{view.meta}</span>
            <span className="view__cue">select any section to go deeper →</span>
          </div>

          {view.spine.length > 0 && (
            <div className={`view__spine${state.viewStep < 0 ? ' view__spine--pending' : ''}`}>
              <SpineStrip nodes={view.spine} />
            </div>
          )}

          {view.sections.map((section, index) => (
            <ViewSection
              key={section.id}
              section={section}
              // Walk order: a section is up once the sequence has reached its index.
              revealed={index < state.viewStep}
              selected={state.deepenScope === section.id}
              onSelect={() => dispatch({ type: 'OPEN_DEEPEN', scope: section.id })}
            />
          ))}

          <footer className="view__footer">
            Illustrative figures · composed from the recipe's beats
          </footer>
        </article>
      </div>

      <DeepenPanel />
    </div>
  )
}
