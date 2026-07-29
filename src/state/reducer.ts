// state/reducer.ts
// ---------------------------------------------------------------------------
// Pure reducer. No side effects, no derived data cached in state — anything
// derivable (the build steps, the plan, the scope panel) is composed at render
// from `recipeId` + context, so there is exactly one source of truth.
// ---------------------------------------------------------------------------

import {
  DEFAULT_LEVEL,
  DEFAULT_OUTPUT,
  DEFAULT_PERIOD,
  DEFAULT_WORKSPACE,
} from '../data/workspaces'
import type { Action, AppState } from './types'

export const initialState: AppState = {
  screen: 'entry',
  rail: 'new',
  workspace: DEFAULT_WORKSPACE,
  level: DEFAULT_LEVEL,
  output: DEFAULT_OUTPUT,
  period: DEFAULT_PERIOD,
  draftIntent: '',
  submittedIntent: '',
  // The design file ships the picker open to document that state; at rest it's closed.
  pickerOpen: false,
  recipeId: null,
  buildStep: -1,
  planRevealed: false,
  unrecognised: null,
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
    workspace: state.workspace,
    level: state.level,
    output: state.output,
    period: state.period,
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
      return { ...state, draftIntent: action.value, unrecognised: null }

    case 'TOGGLE_PICKER':
      return { ...state, pickerOpen: !state.pickerOpen }

    case 'SET_WORKSPACE':
      return { ...state, workspace: action.workspace }

    case 'SET_LEVEL':
      return { ...state, level: action.level }

    case 'SET_OUTPUT':
      return { ...state, output: action.output }

    case 'SET_PERIOD':
      return { ...state, period: action.period }

    case 'SUBMIT_INTENT': {
      const intent = action.intent.trim()
      if (!intent) return state

      // No recognised shape — stay on Entry and say so. Guessing a plan here
      // would be the one thing an analyst shouldn't do.
      if (!action.recipeId) {
        return {
          ...state,
          workspace: action.workspace ?? state.workspace,
          period: action.period ?? state.period,
          draftIntent: intent,
          pickerOpen: false,
          unrecognised: intent,
        }
      }

      return {
        ...state,
        rail: 'new',
        screen: 'thread',
        workspace: action.workspace ?? state.workspace,
        period: action.period ?? state.period,
        draftIntent: intent,
        submittedIntent: intent,
        pickerOpen: false,
        unrecognised: null,
        recipeId: action.recipeId,
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
