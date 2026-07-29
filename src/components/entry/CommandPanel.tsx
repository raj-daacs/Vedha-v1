// CommandPanel.tsx
// ---------------------------------------------------------------------------
// Entry — the always-present way to say what you want to know. The front door;
// it never leaves (moodboard, "our shell — three fixed parts").
//
// The design source renders the ask as static text. Here it's a real textarea
// that auto-grows, so at rest it matches the design pixel for pixel and can
// still be typed into.
// ---------------------------------------------------------------------------

import { useLayoutEffect, useRef } from 'react'
import { useApp } from '../../state/AppContext'
import { useAsk } from '../../state/useAsk'
import { ContextPicker } from './ContextPicker'
import { ExamplePrompts } from './ExamplePrompts'

export function CommandPanel() {
  const { state, dispatch } = useApp()
  const ask = useAsk()
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-grow: collapse to content height on every change so the card breathes
  // with the question instead of scrolling inside a fixed box.
  useLayoutEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [state.draftIntent])

  // The reducer no-ops on an empty ask, so send stays solid rather than greying
  // out — at rest it's the panel's one primary affordance and the design keeps it
  // filled. A dimmed hero button reads as broken, not as guidance.
  const submit = () => ask(state.draftIntent)

  return (
    <div className="stage__scroll">
      <div className="cmd">
        <div className="cmd__status">
          <span className="cmd__status-dot" />
          Vedha is ready
        </div>

        <h1 className="cmd__headline">
          I already know
          <br />
          your business.
        </h1>
        <p className="cmd__sub">
          Ask me anything about your workspaces — I'll compose the view.
        </p>

        <div className="cmd__card">
          <textarea
            ref={inputRef}
            className="cmd__input"
            rows={1}
            value={state.draftIntent}
            placeholder="Show me the activation trend last quarter…"
            aria-label="Ask Vedha"
            onChange={(e) => dispatch({ type: 'SET_DRAFT', value: e.target.value })}
            onKeyDown={(e) => {
              // Enter asks; Shift+Enter is a newline. An operator's question is
              // usually one line, so Enter is the fast path.
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                submit()
              }
            }}
          />

          <div className="cmd__controls">
            <button
              type="button"
              className="cmd__chip cmd__chip--accent"
              aria-expanded={state.pickerOpen}
              onClick={() => dispatch({ type: 'TOGGLE_PICKER' })}
            >
              ◇ Workspace: {state.workspace} <span className="cmd__caret">▾</span>
            </button>

            <button
              type="button"
              className="cmd__chip"
              aria-expanded={state.pickerOpen}
              onClick={() => dispatch({ type: 'TOGGLE_PICKER' })}
            >
              ▤ Output: {state.output} <span className="cmd__caret">▾</span>
            </button>

            <button
              type="button"
              className="cmd__chip cmd__chip--ghost"
              aria-expanded={state.pickerOpen}
              onClick={() => dispatch({ type: 'TOGGLE_PICKER' })}
            >
              ⋯ more
            </button>

            <button type="button" className="cmd__send" aria-label="Ask" onClick={submit}>
              ➤
            </button>
          </div>

          {state.pickerOpen && <ContextPicker />}

          <ExamplePrompts />
        </div>

        {/* An ask that matches no report shape. Vedha says so instead of composing
            a plan it has no reason to believe in. */}
        {state.unrecognised && (
          <div className="cmd__unmatched">
            <div className="cmd__unmatched-eyebrow">no shape recognised</div>
            I don't recognise a report shape in that yet. Try naming what you want to
            see — a trend, a drop-off, a movement between two periods, a retention
            curve, or how sticky something is.
          </div>
        )}
      </div>
    </div>
  )
}
