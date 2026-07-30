// state/reducer.ts
// ---------------------------------------------------------------------------
// Pure reducer. No side effects, no derived data cached in state — anything
// derivable (the build steps, the plan, the scope panel) is composed at render
// from `recipeId` + context, so there is exactly one source of truth.
// ---------------------------------------------------------------------------

import { getWorkflow, workflowsForLevel } from '../data/recipes'
import type { WorkflowName } from '../data/recipe_schema'
import { DEFAULT_ALTITUDE, DEFAULT_WORKFLOW } from '../data/scope'
import type { Action, AppState } from './types'

// Output and period have no global default any more — a default only means something
// relative to a standpoint, so both are seeded from whichever workflow is selected.
const DEFAULT_SCOPE = getWorkflow(DEFAULT_WORKFLOW)

export const initialState: AppState = {
  screen: 'entry',
  rail: 'new',
  workflow: DEFAULT_WORKFLOW,
  altitude: DEFAULT_ALTITUDE,
  output: DEFAULT_SCOPE.outputDefault,
  period: DEFAULT_SCOPE.periodDefault,
  outputTouched: false,
  periodTouched: false,
  draftIntent: '',
  submittedIntent: '',
  // The design file ships a picker open to document that state; at rest none is.
  pickerOpen: null,
  recipeId: null,
  resolution: null,
  buildStep: -1,
  planRevealed: false,
  deepenScope: null,
  promoted: [],
  viewStep: -1,
  editA: false,
  editBeat: null,
  beatReads: {},
}

/**
 * A fresh view: nothing selected, nothing promoted, and the assembly sequence armed
 * (not running — it starts when the operator actually opens the view).
 */
const CLEAN_VIEW = { deepenScope: null, promoted: [] as string[], viewStep: -1 }

/**
 * A fresh plan. Beat overrides are dropped on any re-plan on purpose: a re-selected
 * recipe has different beats, so keeping overrides keyed by the old ids would either
 * do nothing or, worse, silently apply to a beat that happens to share an id.
 */
const CLEAN_PLAN = {
  editA: false,
  editBeat: null,
  beatReads: {} as Record<string, string[]>,
}

/** The context the operator sets. Survives "New" — where you stand isn't the question. */
function contextOf(state: AppState) {
  return {
    workflow: state.workflow,
    altitude: state.altitude,
    output: state.output,
    period: state.period,
    outputTouched: state.outputTouched,
    periodTouched: state.periodTouched,
  }
}

/**
 * Move to a workflow and re-seed the scope around it.
 *
 * Output and period are re-seeded from the new workflow's own defaults, but ONLY
 * where the operator hasn't chosen them. A deliberate pick survives a scope change —
 * "pre-selected, never restricted" cuts both ways: the scope proposes, and once the
 * operator has answered, it stops proposing.
 *
 * The touched flags themselves are deliberately NOT cleared here: having chosen
 * Readout once, the operator meant it, and silently reverting to the new workflow's
 * default would be the app overruling them.
 */
function withWorkflow(state: AppState, workflow: WorkflowName): AppState {
  const config = getWorkflow(workflow)
  return {
    ...state,
    workflow,
    altitude: config.level,
    output: state.outputTouched ? state.output : config.outputDefault,
    period: state.periodTouched ? state.period : config.periodDefault,
  }
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_RAIL':
      // Selecting a rail destination other than New leaves the stage where it is;
      // the rail is navigation chrome, not a stage reset.
      return { ...state, rail: action.rail }

    case 'NEW':
      return { ...initialState, ...contextOf(state) }

    case 'SET_DRAFT':
      return { ...state, draftIntent: action.value }

    case 'TOGGLE_PICKER':
      return {
        ...state,
        pickerOpen: state.pickerOpen === action.picker ? null : action.picker,
      }

    case 'CLOSE_PICKER':
      return { ...state, pickerOpen: null }

    case 'SET_WORKFLOW':
      // Close on pick: the workflow is the one dimension where choosing is the whole
      // errand, so leaving the list open afterwards just asks to be dismissed.
      return { ...withWorkflow(state, action.workflow), pickerOpen: null }

    case 'SET_ALTITUDE': {
      // Altitude cascades: a workflow belongs to exactly one altitude, so the
      // current one is almost certainly not reachable from the new one. Land on the
      // first workflow there rather than leaving an impossible pair on screen.
      if (action.altitude === state.altitude) return state
      const [first] = workflowsForLevel(action.altitude)
      return withWorkflow({ ...state, altitude: action.altitude }, first.name)
    }

    // The two deliberate picks. Recording the touch is the whole point — see
    // AppState.outputTouched.
    case 'SET_OUTPUT':
      return { ...state, output: action.output, outputTouched: true }

    case 'SET_PERIOD':
      return { ...state, period: action.period, periodTouched: true }

    case 'SUBMIT_INTENT': {
      const intent = action.intent.trim()
      if (!intent) return state

      // There is no no-match branch any more. The resolver always produces a
      // defensible query, because the operator always has a scope — so every ask
      // goes to the thread, and what varies is only how much was assumed.
      const { resolved } = action
      const base = action.workflow ? withWorkflow(state, action.workflow) : state

      return {
        ...base,
        rail: 'new',
        screen: 'thread',
        // The resolved values become the context: if the text said "this month", the
        // chips must agree with the answer they're about to see. Not marked as
        // touched — the operator didn't pick these, the resolver read them.
        output: resolved.output,
        period: resolved.period,
        draftIntent: intent,
        submittedIntent: intent,
        pickerOpen: null,
        recipeId: resolved.recipe,
        resolution: {
          sources: resolved.sources,
          flags: resolved.flags,
          ...(resolved.focus ? { focus: resolved.focus } : {}),
        },
        // First step goes active immediately — the agent starts working the moment
        // you ask, with no dead frame in between.
        buildStep: 0,
        planRevealed: false,
        ...CLEAN_VIEW,
        ...CLEAN_PLAN,
      }
    }

    case 'BUILD_ADVANCE': {
      const next = state.buildStep + 1
      if (next >= action.stepCount) {
        return { ...state, buildStep: action.stepCount, planRevealed: true }
      }
      return { ...state, buildStep: next }
    }

    case 'BUILD_COMPLETE':
      return { ...state, buildStep: action.stepCount, planRevealed: true }

    case 'EDIT_INTENT':
      // Back to the front door with the ask still in the field, ready to be
      // reworded. Editing the intent may re-select the recipe, so the build resets —
      // and so does anything deepened off the view it produced.
      return {
        ...state,
        screen: 'entry',
        recipeId: null,
        resolution: null,
        buildStep: -1,
        planRevealed: false,
        ...CLEAN_VIEW,
        ...CLEAN_PLAN,
      }

    case 'OPEN_VIEW':
      // Promotions persist — they're part of the artifact now. Only the panel closes.
      // `viewStep: 0` starts the assembly from the spine, so "Build view" always
      // plays the sequence — including after an Edit-A re-plan.
      return { ...state, screen: 'view', deepenScope: null, viewStep: 0 }

    case 'VIEW_ADVANCE':
      return { ...state, viewStep: Math.min(state.viewStep + 1, action.sectionCount) }

    case 'VIEW_COMPLETE':
      return { ...state, viewStep: action.sectionCount }

    case 'OPEN_DEEPEN':
      return { ...state, deepenScope: action.scope }

    case 'CLOSE_DEEPEN':
      return { ...state, deepenScope: null }

    case 'PROMOTE_DEEPEN': {
      const scope = state.deepenScope
      if (!scope || state.promoted.includes(scope)) return state
      return { ...state, promoted: [...state.promoted, scope] }
    }

    case 'OPEN_EDIT_A':
      // The two edits are mutually exclusive: Edit A may replace the whole plan, so
      // holding a single-beat edit open underneath it would be editing a ghost.
      return { ...state, editA: true, editBeat: null }

    case 'CLOSE_EDIT_A':
      return { ...state, editA: false }

    case 'EDIT_BEAT':
      return { ...state, editBeat: action.beatId, editA: false }

    case 'CLOSE_EDIT_BEAT':
      return { ...state, editBeat: null }

    case 'TOGGLE_BEAT_READ': {
      const next = action.current.includes(action.read)
        ? action.current.filter((read) => read !== action.read)
        : [...action.current, action.read]
      return { ...state, beatReads: { ...state.beatReads, [action.beatId]: next } }
    }
  }
}
