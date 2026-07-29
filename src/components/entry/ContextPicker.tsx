// ContextPicker.tsx
// ---------------------------------------------------------------------------
// The map, collapsed to a picker (moodboard: "not a browsable surface").
// Opens inline under the chip row — never a modal.
//
// All four context dimensions are live. The design lists Level / Output / Period
// as single rows with their options as static text on the right; here those
// options are the controls, which keeps the one-row-per-dimension shape while
// making the row do something.
// ---------------------------------------------------------------------------

import { LEVELS, OUTPUTS, PERIODS, WORKSPACES } from '../../data/workspaces'
import type { Level, Output, Period } from '../../data/workspaces'
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
    action: (value: string) => Action
  }> = [
    {
      label: 'Level',
      options: LEVELS,
      current: state.level,
      action: (value) => ({ type: 'SET_LEVEL', level: value as Level }),
    },
    {
      label: 'Output',
      options: OUTPUTS,
      current: state.output,
      action: (value) => ({ type: 'SET_OUTPUT', output: value as Output }),
    },
    {
      label: 'Period',
      options: PERIODS,
      current: state.period,
      action: (value) => ({ type: 'SET_PERIOD', period: value as Period }),
    },
  ]

  return (
    <div className="picker">
      <div className="picker__eyebrow">Workspace — your business</div>

      {WORKSPACES.map((workspace) => {
        const selected = state.workspace === workspace
        return (
          <button
            key={workspace}
            type="button"
            className={
              'picker__row picker__row--selectable' + (selected ? ' picker__row--selected' : '')
            }
            aria-pressed={selected}
            onClick={() => dispatch({ type: 'SET_WORKSPACE', workspace })}
          >
            {workspace}
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
                {option}
              </button>
            ))}
          </span>
        </div>
      ))}
    </div>
  )
}
