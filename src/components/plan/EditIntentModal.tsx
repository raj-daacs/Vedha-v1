// plan/EditIntentModal.tsx
// ---------------------------------------------------------------------------
// EDIT A — "Edit intent & scope".
//
// The coarse edit. Revise the ask or the context it was asked in, and the plan may
// come back a different shape: Re-plan goes through the same SUBMIT_INTENT path the
// front door uses, so the narrated build replays and the recognition step names
// whatever it resolved to.
//
// Renders an EditAModel. The eligible-shape list is whatever the workflow can
// produce — this editor can choose *between* those shapes, never outside them, so
// the workflow stays authoritative even here.
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { composeEditA } from '../../compose/composeEdit'
import type { ComposeContext } from '../../compose/models'
import { useApp } from '../../state/AppContext'
import { useReplan } from '../../state/useReplan'
import type { Altitude, Period, RecipeId, WorkflowName } from '../../data/recipe_schema'

export function EditIntentModal() {
  const { state, dispatch } = useApp()
  const replan = useReplan()
  const inputRef = useRef<HTMLTextAreaElement>(null)

  /**
   * An explicitly picked shape. Component-local because it's transient — it only
   * means anything at the moment Re-plan is pressed. Null = let the text decide.
   */
  const [override, setOverride] = useState<RecipeId | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const context: ComposeContext = {
    intent: state.draftIntent,
    workflow: state.workflow,
    altitude: state.altitude,
    output: state.output,
    period: state.period,
  }
  const model = composeEditA(context, state.draftIntent)

  const close = () => dispatch({ type: 'CLOSE_EDIT_A' })
  const picked = override ?? model.resolvedId

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') close()
  }

  return (
    <div className="modal" onKeyDown={onKeyDown}>
      {/* Clicking the scrim dismisses, as a modal should. */}
      <div className="modal__scrim" onClick={close} aria-hidden="true" />

      <div className="modal__dialog" role="dialog" aria-modal="true" aria-label="Edit intent and scope">
        <div className="modal__head">
          <h2 className="modal__title">Edit intent &amp; scope</h2>
          <button type="button" className="modal__close" aria-label="Close" onClick={close}>
            ×
          </button>
        </div>
        <p className="modal__note">{model.note}</p>

        <div className="modal__label">Intent</div>
        <textarea
          ref={inputRef}
          className="modal__intent"
          rows={2}
          value={state.draftIntent}
          aria-label="Intent"
          onChange={(event) => dispatch({ type: 'SET_DRAFT', value: event.target.value })}
        />

        <div className="modal__label">Context</div>
        <div className="modal__rows">
          <ContextRow
            label="Workflow"
            options={model.workflows}
            current={model.workflow}
            onPick={(value) => {
              // Changing workflow changes which shapes are eligible, so an override
              // picked under the old workflow must not survive.
              setOverride(null)
              dispatch({ type: 'SET_WORKFLOW', workflow: value as WorkflowName })
            }}
          />
          <ContextRow
            label="Period"
            options={model.periods}
            current={model.period}
            format={(value) => model.periodLabels[value as Period]}
            onPick={(value) => dispatch({ type: 'SET_PERIOD', period: value as Period })}
          />
          <ContextRow
            label="Altitude"
            options={model.altitudes}
            current={model.altitude}
            onPick={(value) => dispatch({ type: 'SET_ALTITUDE', altitude: value as Altitude })}
          />
        </div>

        <div className="modal__label">Recipe — the report shape</div>
        <div className="modal__recipes">
          {model.recipes.map((recipe) => {
            const selected = recipe.id === picked
            return (
              <button
                key={recipe.id}
                type="button"
                className={`shape${selected ? ' shape--selected' : ''}`}
                aria-pressed={selected}
                onClick={() => setOverride(recipe.id)}
              >
                <span className={`shape__radio${selected ? ' shape__radio--on' : ''}`} />
                <span>
                  <span className="shape__label">
                    {recipe.label}
                    {recipe.current && <span className="shape__current"> · the current shape</span>}
                  </span>
                  <span className="shape__summary">{recipe.summary}</span>
                </span>
              </button>
            )
          })}
          {model.recipes.length === 0 && (
            <div className="modal__empty">No shapes are available in this workflow.</div>
          )}
        </div>

        {/* No "names nothing" warning any more: the resolver always lands on a shape
            this workflow produces, so there is nothing to warn about. Where it fell
            back to the workflow's primary lens, the Build step says so — and says it
            where the operator can act on it. */}

        <div className="modal__actions">
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => replan(state.draftIntent, override)}
          >
            Re-plan
          </button>
          <button type="button" className="btn btn--ghost" onClick={close}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

interface ContextRowProps {
  label: string
  options: readonly string[]
  current: string
  format?: (value: string) => string
  onPick: (value: string) => void
}

/** One context dimension, its options inline. Same shape as the Entry picker's rows. */
function ContextRow({ label, options, current, format, onPick }: ContextRowProps) {
  return (
    <div className="modal__row">
      <span className="modal__row-label">{label}</span>
      <span className="modal__row-options">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className={`modal__opt${option === current ? ' modal__opt--selected' : ''}`}
            aria-pressed={option === current}
            onClick={() => onPick(option)}
          >
            {format ? format(option) : option}
          </button>
        ))}
      </span>
    </div>
  )
}
