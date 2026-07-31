// view/ViewSection.tsx
// ---------------------------------------------------------------------------
// One section of the Insight View: the question, what it built, and what it means.
//
// The takeaway is not a caption — it's the answer in words, and it sits under a
// dashed rule because it's a different kind of statement from the chart above it.
// A section without one would be a chart the operator has to interpret themselves,
// which is the thing Vedha exists not to do.
//
// Every section is also a way in: selecting it opens the deepen panel scoped to this
// question. Keyboard-reachable, because a card you can only reach with a mouse isn't
// really an affordance.
//
// Panel layout follows the panel COUNT, not the family: one panel runs full width,
// two share a split grid. Nothing here knows which shape it's drawing.
// ---------------------------------------------------------------------------

import type { KeyboardEvent } from 'react'
import type { ViewSection as ViewSectionModel } from '../../compose/viewModels'
import { Panel } from '../atoms/Panel'

interface Props {
  section: ViewSectionModel
  selected: boolean
  onSelect: () => void
}

/**
 * NO `revealed` PROP ANY MORE. It used to gate a pending/revealed pair of classes,
 * because every section was rendered up front and faded in from opacity 0. Sections
 * are now mounted only once the sequence has written them (see InsightView), so being
 * here IS being revealed — a boolean for it could only ever be true, and the pending
 * half of the pair described a state that no longer exists.
 */
export function ViewSection({ section, selected, onSelect }: Props) {
  const { beatView } = section
  const split = beatView.panels.length > 1

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect()
    }
  }

  const classes = [
    'vsection',
    'vsection--selectable',
    // Still a real class, not merely the absence of another: it's what drives the
    // internal cascade and the chart entrances, which run on mount now.
    'vsection--revealed',
    selected ? 'vsection--selected' : '',
    section.promoted ? 'vsection--promoted' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <section
      className={classes}
      role="button"
      // Unconditionally reachable: an unwritten section is no longer in the document
      // at all, so there is no invisible-but-focusable case left to guard against.
      tabIndex={0}
      aria-pressed={selected}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
    >
      {!selected && <span className="vsection__cue">select to deepen →</span>}

      <div className={section.promoted ? 'vsection__origin' : 'vsection__category'}>
        {section.category}
      </div>
      <h2 className="vsection__question">{section.question}</h2>
      {section.subtitle && <div className="vsection__subtitle">{section.subtitle}</div>}

      {beatView.headline && (
        <div className="vsection__headline">
          <div className="vsection__headline-value">{beatView.headline.value}</div>
          <div className="vsection__headline-note">
            {beatView.headline.delta && (
              <span
                className={`vsection__headline-delta vsection__headline-delta--${beatView.headline.delta.tone}`}
              >
                {beatView.headline.delta.text}
              </span>
            )}
            {beatView.headline.note && <span>{beatView.headline.note}</span>}
          </div>
        </div>
      )}

      {beatView.panels.length > 0 && (
        <div className={`vsection__panels${split ? ' vsection__panels--split' : ''}`}>
          {beatView.panels.map((spec, index) => (
            <Panel key={`${spec.atom}-${index}`} spec={spec} />
          ))}
        </div>
      )}

      {beatView.legend && (
        <div className="vsection__legend">
          {beatView.legend.map((item) => (
            <span key={item.label} className="vsection__legend-item">
              <span
                className={
                  item.swatch === 'unobserved'
                    ? 'vsection__swatch vsection__swatch--unobserved'
                    : 'vsection__swatch'
                }
                style={item.swatch === 'unobserved' ? undefined : { background: item.swatch }}
              />
              {item.label}
            </span>
          ))}
        </div>
      )}

      <p className="vsection__takeaway">{beatView.takeaway}</p>
    </section>
  )
}
