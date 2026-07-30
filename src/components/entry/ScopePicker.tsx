// ScopePicker.tsx
// ---------------------------------------------------------------------------
// The map, collapsed to a picker (moodboard: "not a browsable surface").
// Opens inline under the chip row — never a modal.
//
// ONE PICKER PER DIMENSION. This replaces the old single panel that every chip
// opened and that listed every dimension at once. Each chip now opens only what it
// names, because a chip that reads "Output: Report" and opens a panel about
// workflows is lying about what it does.
//
// Two things this deliberately does NOT do:
//
//   IT NEVER RESTRICTS OUTPUT. All four outputs are offered at every workflow. The
//   workflow's `outputDefault` decides what is PRE-SELECTED, never what is allowed —
//   that conflation is one of the two mistakes the resolution spec exists to correct.
//
//   IT DOESN'T KNOW ABOUT RECIPES. Picking a scope can't reach the recipe book from
//   here; the resolver does that, later, off the picks plus the text.
// ---------------------------------------------------------------------------

import { ALTITUDES, getWorkflow, workflowsForLevel } from '../../data/recipes'
import { OUTPUTS, OUTPUT_LABELS, PERIODS, PERIOD_LABELS } from '../../data/scope'
import type { Altitude, Output, Period, WorkflowName } from '../../data/recipe_schema'
import { useApp } from '../../state/AppContext'
import type { Action, PickerKey } from '../../state/types'

/** One selectable option, already in display form. */
interface Option {
  /** The value to dispatch. */
  value: string
  /** What the operator reads. Never the wire id. */
  label: string
  /** A short aside on the right — what this option implies. */
  hint?: string
}

export function ScopePicker({ open }: { open: PickerKey }) {
  const { state, dispatch } = useApp()
  const config = getWorkflow(state.workflow)

  const panels: Record<PickerKey, { eyebrow: string; options: Option[]; current: string; action: (v: string) => Action }> = {
    altitude: {
      eyebrow: 'Altitude — how far back you’re standing',
      options: ALTITUDES.map((altitude) => ({
        value: altitude,
        label: altitude,
        // Naming the workflows is the only honest way to show what altitude means:
        // it isn't a zoom level, it's which questions come into reach.
        hint: workflowsForLevel(altitude)
          .map((w) => w.name)
          .join(' · '),
      })),
      current: state.altitude,
      action: (value) => ({ type: 'SET_ALTITUDE', altitude: value as Altitude }),
    },

    workflow: {
      eyebrow: 'Workflow — your business',
      // Cascaded off the altitude. A workflow exists at exactly one altitude, so
      // listing all eight would offer pairs that cannot hold.
      options: workflowsForLevel(state.altitude).map((workflow) => ({
        value: workflow.name,
        label: workflow.name,
      })),
      current: state.workflow,
      action: (value) => ({ type: 'SET_WORKFLOW', workflow: value as WorkflowName }),
    },

    output: {
      eyebrow: 'Output — how deep, how framed',
      options: OUTPUTS.map((output) => ({
        value: output,
        label: OUTPUT_LABELS[output],
        // Say which one the scope proposed, so a pre-selection reads as a suggestion
        // rather than as something the operator already decided.
        hint: output === config.outputDefault ? `usual for ${state.workflow}` : undefined,
      })),
      current: state.output,
      action: (value) => ({ type: 'SET_OUTPUT', output: value as Output }),
    },

    period: {
      eyebrow: 'Period — over what window',
      options: PERIODS.map((period) => ({
        value: period,
        label: PERIOD_LABELS[period],
        hint: period === config.periodDefault ? `${state.workflow} clock` : undefined,
      })),
      current: state.period,
      action: (value) => ({ type: 'SET_PERIOD', period: value as Period }),
    },
  }

  const panel = panels[open]

  return (
    <div className="picker">
      <div className="picker__eyebrow">{panel.eyebrow}</div>

      {panel.options.map((option) => {
        const selected = option.value === panel.current
        return (
          <button
            key={option.value}
            type="button"
            className={
              'picker__row picker__row--selectable' + (selected ? ' picker__row--selected' : '')
            }
            aria-pressed={selected}
            onClick={() => dispatch(panel.action(option.value))}
          >
            <span>{option.label}</span>
            <span className="picker__aside">
              {option.hint && <span className="picker__hint">{option.hint}</span>}
              {selected && <span aria-hidden="true">✓</span>}
            </span>
          </button>
        )
      })}
    </div>
  )
}
