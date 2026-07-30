// state/types.ts
// ---------------------------------------------------------------------------
// One reducer, one context, one state object for the whole prototype.
//
// The shape deliberately tracks the design prototype's own state object
// (`{screen, family, activeStep, buildDone, pickerOpen, panelScope, added,
// editA, editB}`) so the remaining fields (deepen panel, edit modes) stay purely
// additive. Only the fields a built screen actually reads are declared.
//
// Note what is NOT here: the selected recipe's beats, the plan, the composed
// steps. Those are derived at render from `recipeId` + context via the compose
// layer, so there is exactly one source of truth and no cache to invalidate.
// ---------------------------------------------------------------------------

import type {
  Altitude,
  Output,
  Period,
  RecipeId,
  WorkflowName,
} from '../data/recipe_schema'

/** The three stages of the core loop. */
export type Screen = 'entry' | 'thread' | 'view'

/** Which rail destination is selected. 'you' is presentational, so not included. */
export type RailKey = 'new' | 'views' | 'search' | 'settings'

export interface AppState {
  screen: Screen
  rail: RailKey

  /** The context the operator has set — what the Entry chips and context bar render. */
  workflow: WorkflowName
  altitude: Altitude
  output: Output
  period: Period

  /** Live value of the ask field. */
  draftIntent: string
  /** What was actually asked. Empty until SUBMIT_INTENT. */
  submittedIntent: string

  /** The in-panel Workflow/Altitude/Output/Period picker. */
  pickerOpen: boolean

  /** The recipe the submitted ask resolved to. Null before any ask. */
  recipeId: RecipeId | null

  /**
   * How far the narrated build has resolved: -1 idle, 0..n-1 the active step,
   * n = every step done. Lives in state rather than in the component so that
   * re-planning restarts it cleanly and the plan reveal stays derivable.
   */
  buildStep: number
  planRevealed: boolean

  /**
   * Set when an ask matched no recipe. A real product state, not an error:
   * Vedha says it can't recognise the shape rather than composing a plan it has
   * no reason to believe in.
   */
  unrecognised: string | null

  /**
   * What the deepen panel is scoped to: a section's beat id, `'root'` for the whole
   * view, or null when the panel is closed. Deepening is the same reasoning
   * re-invoked from a narrower standpoint, so the scope IS the state.
   */
  deepenScope: string | null

  /**
   * Scopes whose answers have been promoted onto the view with "＋ Add to view".
   * Until a scope is in here its answer is ephemeral — shown in the panel, not part
   * of the artifact. Once in, the view composes a section for it and it survives the
   * panel closing.
   */
  promoted: string[]

  /**
   * How much of the Insight View has assembled: -1 not on the view, 0 the spine has
   * laid down, k the spine plus the first k sections. Section `i` is revealed when
   * `i < viewStep`.
   *
   * Completion is DERIVED (`viewStep >= sectionCount`) rather than stored, which is
   * what makes a promoted follow-up animate in for free: promoting grows the section
   * count, so the sequence has one more section to reveal and nothing else changes.
   */
  viewStep: number

  /**
   * EDIT A — the intent/scope modal is open. Coarse edits (revise the ask, change
   * workflow or period) that may re-resolve the recipe and re-compose everything.
   */
  editA: boolean

  /**
   * EDIT B — which single beat is being edited, if any. One beat at a time: the
   * point of Edit B is that the rest of the plan stays put.
   */
  editBeat: string | null

  /**
   * Per-beat overrides of which semantic reads are in scope, keyed by beat id.
   * Absent means "whatever the recipe declared". Cleared on any re-plan, since a new
   * recipe's beats are different beats.
   */
  beatReads: Record<string, string[]>
}

export type Action =
  /** Rail navigation. */
  | { type: 'SET_RAIL'; rail: RailKey }
  /** "New" — back to a clean Entry. */
  | { type: 'NEW' }
  /** Every keystroke in the ask field. */
  | { type: 'SET_DRAFT'; value: string }
  | { type: 'TOGGLE_PICKER' }
  | { type: 'SET_WORKFLOW'; workflow: WorkflowName }
  | { type: 'SET_ALTITUDE'; altitude: Altitude }
  | { type: 'SET_OUTPUT'; output: Output }
  | { type: 'SET_PERIOD'; period: Period }
  /**
   * Send / Enter / an example card. Carries the intent explicitly so an example
   * card can submit its own text without a round-trip through draftIntent, and
   * the resolved recipe so the reducer stays pure (selection happens at the edge).
   */
  | {
      type: 'SUBMIT_INTENT'
      intent: string
      recipeId: RecipeId | null
      /** A prompt chip states its own context rather than borrowing the current one. */
      workflow?: WorkflowName
      period?: Period
    }
  /** One tick of the narrated build. */
  | { type: 'BUILD_ADVANCE'; stepCount: number }
  /** Skip straight to a resolved build — reduced motion, or a re-entered thread. */
  | { type: 'BUILD_COMPLETE'; stepCount: number }
  /** "Edit intent" — back to Entry with the ask intact. */
  | { type: 'EDIT_INTENT' }
  /** "Build view" — leaves the plan for the rendered view (or its placeholder). */
  | { type: 'OPEN_VIEW' }
  /** One tick of the view assembling — reveal the next section. */
  | { type: 'VIEW_ADVANCE'; sectionCount: number }
  /** Skip straight to a fully assembled view — reduced motion. */
  | { type: 'VIEW_COMPLETE'; sectionCount: number }
  /** Selecting a section, or "Ask about this view" (`scope: 'root'`). */
  | { type: 'OPEN_DEEPEN'; scope: string }
  | { type: 'CLOSE_DEEPEN' }
  /** "＋ Add to view" — promote the open scope's answer onto the view. */
  | { type: 'PROMOTE_DEEPEN' }
  /** Edit A — the intent/scope modal. */
  | { type: 'OPEN_EDIT_A' }
  | { type: 'CLOSE_EDIT_A' }
  /** Edit B — one beat at a time. */
  | { type: 'EDIT_BEAT'; beatId: string }
  | { type: 'CLOSE_EDIT_BEAT' }
  /**
   * Toggle one read in or out of a beat's scope. `current` is the beat's effective
   * read list, passed in so the reducer never has to know what the recipe declared.
   */
  | { type: 'TOGGLE_BEAT_READ'; beatId: string; read: string; current: string[] }
