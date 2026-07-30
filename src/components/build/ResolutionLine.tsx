// ResolutionLine.tsx
// ---------------------------------------------------------------------------
// The resolved query, restated in plain words with every value's provenance shown.
//
// This is the safety net for the whole resolver: because gaps get filled with scoped
// defaults, the defaults have to be VISIBLE and CORRECTABLE. A marked assumption is
// a negotiation; an unmarked one is Vedha quietly deciding for the operator.
//
// The component is handed segments and notes and renders them. It has no idea which
// values were assumed or why — it just draws a chip per `source` and makes the
// correctable ones tappable. Deciding what counts as assumed is the composer's job.
// ---------------------------------------------------------------------------

import type { ResolutionNote, ResolutionSegment } from '../../compose/models'
import { useApp } from '../../state/AppContext'

const SOURCE_TITLES = {
  picked: 'you chose this',
  text: 'from what you typed',
  default: 'assumed — the usual for this scope. Tap to change.',
} as const

export function ResolutionLine({
  segments,
  notes,
}: {
  segments: ResolutionSegment[]
  notes: ResolutionNote[]
}) {
  const { dispatch } = useApp()

  return (
    <div className="rq">
      <p className="rq__line">
        {segments.map((segment, index) => {
          if (!segment.source) return <span key={index}>{segment.text}</span>

          const className = `rq__chip rq__chip--${segment.source}`

          // A correctable value is a real affordance, so it's a button. The rest are
          // statements of fact and shouldn't invite a click that does nothing.
          return segment.correctable ? (
            <button
              key={index}
              type="button"
              className={`${className} rq__chip--tappable`}
              title={SOURCE_TITLES[segment.source]}
              onClick={() => dispatch({ type: 'OPEN_EDIT_A' })}
            >
              {segment.text}
            </button>
          ) : (
            <span key={index} className={className} title={SOURCE_TITLES[segment.source]}>
              {segment.text}
            </span>
          )
        })}
      </p>

      <div className="rq__legend">
        <span>
          <span className="rq__swatch rq__swatch--picked" />
          picked
        </span>
        <span>
          <span className="rq__swatch rq__swatch--text" />
          from your words
        </span>
        <span>
          <span className="rq__swatch rq__swatch--default" />
          assumed — tap to change
        </span>
      </div>

      {notes.map((note) => (
        <div key={note.text} className={`rq__note rq__note--${note.tone}`}>
          {note.text}
          <button
            type="button"
            className="rq__note-action"
            onClick={() => dispatch({ type: 'OPEN_EDIT_A' })}
          >
            Change it
          </button>
        </div>
      ))}
    </div>
  )
}
