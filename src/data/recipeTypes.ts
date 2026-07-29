// recipeTypes.ts
// ---------------------------------------------------------------------------
// THE RECIPE LAYER — how Vedha composes a PLAN for a given report shape.
//
// A recipe is the SKELETON: which family/spine, which beats, in what order.
// Routing (reason() / the RSL) is the FLESH: it fills each beat's atom with a
// reasoned verdict. Recipe decides *what to lay down*; routing decides *what's
// true in each slot*.
//
// Derivation note: several beats declare `fills_from` routes (RS3/RS5 dimensional,
// F leading-indicator) that the conformance survey found UNREACHABLE from orient
// alone (CF-1, CF-7 — "lateral lenses are the systematic gap"). The recipe layer
// resolves that meta-pattern: by hard-composing those beats into the plan, the
// recipe makes reachable what routing-from-orient could not reach on its own.
//
// PORTED VERBATIM from `vedha_recipe_schema.ts`, with one marked EXTENSION
// (`Recipe.displayLabel`). Keep this file in sync with the source of truth.
// ---------------------------------------------------------------------------

/** Two shape families discovered in report validation (rows 1–4). */
export type Family = 'flow' | 'state'

/** How the spine is rendered. Flow family: funnel|bridge|cohort. State family: scorecard. */
export type Spine = 'funnel' | 'bridge' | 'cohort' | 'scorecard'

/** The four business-word question categories (the narration layer). */
export type QuestionCategory = 'stand' | 'why' | 'ahead' | 'do'

/** How the four questions behave over this recipe's native spine (validation finding). */
export type FourQFit = 'hold' | 'bend' | 'collapse'

/** Whether a beat is answerable from data or is a directional projection. */
export type Confidence = 'from_data' | 'directional'

/** Whether Vedha can build this recipe today, and if not, what's missing. */
export type Producibility = 'yes' | 'needs_atom' | 'needs_join' | 'needs_orientation'

/**
 * The spine declaration — the reframed primitive.
 * Flow family declares input → work → output; State family declares the
 * monitored state and its benchmark (there is no flow underneath).
 */
export interface SpineDecl {
  family: Family
  rendered_as: Spine
  // flow family only:
  input?: string
  work?: string
  output?: string
  // state family only:
  state?: string
  benchmark?: string
}

/** How the composer SELECTS this recipe from an intent + workspace shape. */
export interface RecipeTrigger {
  /** the workspace/report shape(s) this recipe renders */
  shape: Spine[]
  /** the kind of goal metric: 'rate' | 'movement' | 'retention' | 'ratio' */
  goal_metric_kind: string
  /** phrases / intents that point the composer here */
  intent_signals: string[]
}

/** One ordered beat of the composed plan. */
export interface Beat {
  id: string
  /** which of the four questions this beat narrates */
  category: QuestionCategory
  /** business-word question; may template {goal_metric}, {period}, {balance} */
  question: string
  /** semantic scope this beat pulls: metrics + dimensions */
  reads: string[]
  /** the atomic insight this beat renders */
  builds: string
  /** atom ids (from the AIL) this beat needs */
  atoms: string[]
  /** ROUTING HOOK — the RS / reason() nodes that fill this beat's atom */
  fills_from: string[]
  confidence: Confidence
  /** false = always in the plan; true = conditional */
  optional: boolean
  /** condition under which an optional beat is included */
  include_when?: string
}

/** A composition template for one report shape. */
export interface Recipe {
  id: string
  name: string
  family: Family
  spine: SpineDecl
  trigger: RecipeTrigger
  four_question_fit: FourQFit
  /** how the four questions behave here — documents the validation finding */
  narration_note: string
  /** the ordered plan the recipe lays down */
  beats: Beat[]
  producibility: Producibility
  /** gap ids (from the gap log) this recipe depends on; empty when producible today */
  requires: string[]
  /** the validation-board row that confirmed this pattern */
  validated_by: string

  // EXTENSION (not in vedha_recipe_schema.ts) --------------------------------
  /**
   * Optional human-facing label for headers and context lines, when the
   * recipe's subject reads differently from its workspace.
   *
   * Why this exists: the design's scorecard screens are headed "Product
   * engagement", but "Product" is NOT a sixth workspace — the five in
   * `workspaces.ts` are canonical. `displayLabel` lets the view render the
   * operator's word for the subject while `workspace` stays inside the
   * five-space model.
   *
   * Never show internal machinery here (brief §5.8) — this is a business word.
   */
  displayLabel?: string

  /**
   * The one workspace where `displayLabel` is true.
   *
   * A label like "Product engagement" is only honest under the workspace it
   * describes; anywhere else the header must fall back to the workspace itself,
   * or the header, the context pill and the plan end up disagreeing about what
   * the operator is looking at (which is exactly the bug this field records).
   *
   * Today this is enforced STRUCTURALLY rather than read at render time: a
   * recipe carrying a displayLabel is listed in `WORKSPACE_RECIPES` under this
   * workspace and no other, so it can never be selected where the label would
   * lie. `scripts/checkSelectRecipe.ts` asserts that invariant. If a future
   * recipe needs a displayLabel across several workspaces, `subjectOf()` in the
   * compose layer must start gating on this field.
   */
  displayLabelWorkspace?: string
}

/** The full set of recipes Vedha can compose from. */
export type RecipeBook = Recipe[]
