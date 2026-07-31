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
// When the (workflow, recipe) pair has no fixture yet, the composer returns null
// and this says so plainly rather than faking a chart.
// ---------------------------------------------------------------------------

import { useMemo } from 'react'
import { ROOT_SCOPE } from '../../compose/composeDeepen'
import { useComposition } from '../../compose/useComposition'
import type { ViewSection as ViewSectionModel } from '../../compose/viewModels'
import { useApp } from '../../state/AppContext'
import { SpineStrip } from '../plan/SpineStrip'
import { DeepenPanel } from './DeepenPanel'
import { SectionSkeleton } from './SectionSkeleton'
import { ViewSection } from './ViewSection'
import { useViewBuildSequence } from './useViewBuildSequence'

/**
 * Roughly how much this section is: what the assembly sequence spends time on.
 *
 * Relative units, not milliseconds — `viewDwellsMs` normalises against the view's own
 * mean, so only the ratios between sections matter here. Counting rendered parts is
 * the honest proxy: a split two-panel section with a headline and a legend genuinely
 * is more for the agent to draw than a bare takeaway, and the operator can see that
 * it was, which is what makes the uneven timing legible rather than random.
 */
function sectionWeight(section: ViewSectionModel): number {
  const { beatView } = section
  return (
    1 +
    beatView.panels.length * 0.4 +
    (beatView.headline ? 0.25 : 0) +
    (beatView.legend ? 0.2 : 0) +
    (beatView.subtitle ? 0.1 : 0)
  )
}

export function InsightView() {
  const { state, dispatch } = useApp()
  const { view, shapeName } = useComposition()

  /**
   * The spine takes the first beat of the sequence — when there is one to lay down.
   * A shape that declares no spine has nothing to show on that beat, so its first
   * section leads instead and the view never opens on an empty pause.
   *
   * Derived from the model's spine, exactly like the strip below it. Not a family
   * check: any spineless shape behaves this way.
   */
  const revealOffset = (view?.spine.length ?? 0) > 0 ? 0 : 1

  // One weight per section the sequence will reveal, in walk order. When the spine
  // takes the first beat there is no offset to drop; when it doesn't, the leading
  // section is already up on first render and is not the sequence's to reveal.
  const weights = useMemo(
    () => (view?.sections ?? []).slice(revealOffset).map(sectionWeight),
    [view?.sections, revealOffset],
  )

  // Called unconditionally; an empty weight list (the plan-deep placeholder) makes it
  // inert. The weights come straight from the compose layer, so every view assembles
  // the same way.
  useViewBuildSequence(weights)

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
  // Mid-assembly. False once every section is up, so a finished view carries no
  // working indicator, and false at -1 so nothing shimmers before the pass starts.
  const assembling = state.viewStep >= 0 && state.viewStep < weights.length

  // How many sections have actually been written. `revealOffset` accounts for the
  // spine having taken the first beat (or not having one to take).
  const generatedCount = Math.max(
    Math.min(state.viewStep + revealOffset, view.sections.length),
    0,
  )
  // The one being written right now — undefined once the last section has landed, so
  // a finished view carries no placeholder.
  const generatingSection = assembling ? view.sections[generatedCount] : undefined

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

          {/* ONLY WHAT HAS BEEN WRITTEN, PLUS THE BLOCK BEING WRITTEN.
              A section past the sequence's reach is absent from the document — not
              present-and-transparent. That is the whole difference between generation
              and a fade: the page has no idea how tall it will be, so it grows as the
              agent works, and each block arriving changes the document. See the note
              in SectionSkeleton.tsx. */}
          {view.sections.slice(0, generatedCount).map((section) => (
            <ViewSection
              key={section.id}
              section={section}
              selected={state.deepenScope === section.id}
              onSelect={() => dispatch({ type: 'OPEN_DEEPEN', scope: section.id })}
            />
          ))}

          {/* The block currently being written, at whatever height a placeholder is —
              replaced by the real section, at its real height, when it lands. */}
          {generatingSection && <SectionSkeleton section={generatingSection} />}

          <footer className="view__footer">
            Illustrative figures · composed from the recipe's beats
          </footer>
        </article>
      </div>

      {/* Says which section is being worked on, and is the difference between a view
          that fades in and a view something is visibly assembling.

          NOT INSIDE THE SECTION IT DESCRIBES, AND IT CANNOT BE. A section that hasn't
          landed sits at `opacity: 0` in flow — that is what keeps the document height
          final from the first frame (see the assembly note in view.css). Anything
          nested in it inherits that zero, so a per-section badge would be invisible,
          and swapping the section's content for a skeleton would change its height and
          break the very invariant the zero-opacity trick exists to protect. So the
          indicator lives here, positioned out of flow, and names the section instead. */}
      {assembling && (
        <div className="view__composing" role="status" aria-live="polite">
          <span className="view__composing-dot" />
          composing {Math.min(state.viewStep + 1, weights.length)} of {weights.length}
        </div>
      )}

      <DeepenPanel />
    </div>
  )
}
