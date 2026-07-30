// ContextPicker.tsx
// ---------------------------------------------------------------------------
// The map, collapsed to a picker (moodboard: "not a browsable surface").
// Opens inline under the chip row — never a modal.
//
// INTERIM. This is still the single picker every chip opens; step 4 of the scope
// work replaces it with three real ones (Altitude · Workflow · Output). Renamed to
// the workflow model here so the tree compiles and behaves, nothing more.
// ---------------------------------------------------------------------------

import { ALTITUDES, workflowsForLevel } from '../../data/recipes'
import { OUTPUTS, OUTPUT_LABELS, PERIODS } from '../../data/scope'
import type { Altitude, Output, Period } from '../../data/recipe_schema'
import { useApp } from '../../state/AppContext'
import type { Action } from '../../state/types'

export function ContextPicker() {
  const { state, dispatch } = useApp()

  /**
   * One row per secondary dimension. Typed per-dimension rather than over a union
   * so each row's options and its action stay checked against each other.
   */
  const rows: Array<{
    label: string
    options: readonly string[]
    current: string
    /** How an option id reads to an operator, where the two differ. */
    labelFor?: (value: string) => string
    action: (value: string) => Action
  }> = [
    {
      label: 'Altitude',
      options: ALTITUDES,
      current: state.altitude,
      action: (value) => ({ type: 'SET_ALTITUDE', altitude: value as Altitude }),
    },
    {
      label: 'Output',
      options: OUTPUTS,
      current: state.output,
      labelFor: (value) => OUTPUT_LABELS[value as Output],
      action: (value) => ({ type: 'SET_OUTPUT', output: value as Output }),
    },
    {
      label: 'Period',
      options: PERIODS,
      current: state.period,
      action: (value) => ({ type: 'SET_PERIOD', period: value as Period }),
    },
  ]

  // Cascaded off the altitude: a workflow exists at exactly one altitude, so listing
  // all eight would offer pairs that can't hold.
  const workflows = workflowsForLevel(state.altitude)

  return (
    <div className="picker">
      <div className="picker__eyebrow">Workflow — your business</div>

      {workflows.map((workflow) => {
        const selected = state.workflow === workflow.name
        return (
          <button
            key={workflow.name}
            type="button"
            className={
              'picker__row picker__row--selectable' + (selected ? ' picker__row--selected' : '')
            }
            aria-pressed={selected}
            onClick={() => dispatch({ type: 'SET_WORKFLOW', workflow: workflow.name })}
          >
            {workflow.name}
            {selected && <span aria-hidden="true">✓</span>}
          </button>
        )
      })}

      <div className="picker__eyebrow">Also in the picker</div>
      {rows.map((row) => (
        <div key={row.label} className="picker__row">
          {row.label}
          <span className="picker__options">
            {row.options.map((option) => (
              <button
                key={option}
                type="button"
                className={
                  'picker__opt' + (option === row.current ? ' picker__opt--selected' : '')
                }
                aria-pressed={option === row.current}
                onClick={() => dispatch(row.action(option))}
              >
                {row.labelFor ? row.labelFor(option) : option}
              </button>
            ))}
          </span>
        </div>
      ))}
    </div>
  )
}
