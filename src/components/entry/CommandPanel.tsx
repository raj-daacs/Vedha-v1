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
import { OUTPUT_LABELS, PERIOD_LABELS } from '../../data/scope'
import { useApp } from '../../state/AppContext'
import type { Output, Period } from '../../data/recipe_schema'
import type { PickerKey } from '../../state/types'
import { useAsk } from '../../state/useAsk'
import { PromptChips } from './PromptChips'
import { ScopePicker } from './ScopePicker'

/**
 * The chip row. Each chip names one dimension and opens only that dimension.
 *
 * Workflow leads and carries the accent — it's the one pick that decides which
 * questions are even askable. Altitude sits before it because it gates the workflow
 * list. Output and period follow: both can also be read out of the text, so their
 * chips exist mainly so the operator CAN be deliberate, not because they must be.
 */
const CHIPS: Array<{
  key: PickerKey
  glyph: string
  label: string
  className?: string
  value: (state: { workflow: string; altitude: string; output: Output; period: Period }) => string
}> = [
  { key: 'altitude', glyph: '⬡', label: 'Altitude', value: (s) => s.altitude },
  {
    key: 'workflow',
    glyph: '◇',
    label: 'Workflow',
    className: 'cmd__chip--accent',
    value: (s) => s.workflow,
  },
  { key: 'output', glyph: '▤', label: 'Output', value: (s) => OUTPUT_LABELS[s.output] },
  {
    key: 'period',
    glyph: '◷',
    label: 'Period',
    className: 'cmd__chip--ghost',
    value: (s) => PERIOD_LABELS[s.period],
  },
]

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
          Ask me anything about your workflows — I'll compose the view.
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
            {CHIPS.map((chip) => (
              <button
                key={chip.key}
                type="button"
                className={`cmd__chip${chip.className ? ` ${chip.className}` : ''}${
                  state.pickerOpen === chip.key ? ' cmd__chip--open' : ''
                }`}
                aria-expanded={state.pickerOpen === chip.key}
                onClick={() => dispatch({ type: 'TOGGLE_PICKER', picker: chip.key })}
              >
                {chip.glyph} {chip.label}: {chip.value(state)}{' '}
                <span className="cmd__caret">▾</span>
              </button>
            ))}

            <button type="button" className="cmd__send" aria-label="Ask" onClick={submit}>
              ➤
            </button>
          </div>

          {/* One panel, whichever chip is open. Only one can be — they share the space
              under the row, and two open lists would compete for the same decision. */}
          {state.pickerOpen && <ScopePicker open={state.pickerOpen} />}

          <PromptChips />
        </div>

        {/* The no-match panel that used to live here is gone. Entry has no dead end
            any more: the operator always has a scope, so even a vague or off-domain
            ask resolves to a defensible query. Whatever had to be assumed is stated
            at the Build step, where it can be corrected in a tap — which is a better
            place to negotiate than a refusal at the front door. */}
      </div>
    </div>
  )
}
