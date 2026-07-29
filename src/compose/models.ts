// compose/models.ts
// ---------------------------------------------------------------------------
// The PRESENTATION MODELS — the contract between the recipe book and the screens.
//
// This boundary is the point of the compose layer. Screens receive these types
// and nothing else: no `Recipe`, no `SpineDecl`, no `four_question_fit`, no
// `producibility`, no atom ids, no `fills_from` routing names. That gives us two
// things at once —
//
//   * the no-branching rule holds structurally, not by discipline. A component
//     literally cannot ask "is this the funnel family?" because it was never
//     handed anything that would answer;
//   * the "never surface internal machinery" rule (brief §5.8) is enforced at a
//     single seam instead of audited screen by screen.
//
// Everything here is display-ready: strings are resolved, casing is final, and
// ordering is meaningful.
// ---------------------------------------------------------------------------

import type { Level, Output, Period, Workspace } from '../data/workspaces'

/**
 * Everything the operator has told us that isn't the recipe: where they're
 * standing, at what altitude, over what span, and what they asked.
 */
export interface ComposeContext {
  intent: string
  workspace: Workspace
  level: Level
  output: Output
  period: Period
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

/**
 * One line of the agent's visible reasoning. Split into three parts so a step can
 * emphasise its payload — "Recognising the shape → **Funnel**" — without any
 * component parsing markup out of a string.
 */
export interface BuildStep {
  pre: string
  strong: string
  post: string
  /**
   * The recipe-recognition beat. This is the hero moment of the whole sequence:
   * it's where the agent stops looking like a search box and starts looking like
   * an analyst that recognised the shape of your question (moodboard: "the one
   * moment that carries the agentic feeling").
   */
  isRecipeStep: boolean
}

export interface BuildModel {
  /** "Activation — last quarter" */
  title: string
  /** The operator's question, echoed back verbatim. */
  question: string
  /** First-person narration, split so the subject can carry weight. */
  narration: { pre: string; strong: string; post: string }
  steps: BuildStep[]
}

// ---------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------

/** One node of the input → work → output backbone. */
export interface SpineNode {
  label: string
  /** Drives the visual weight: the output node is the destination, so it's solid. */
  emphasis: 'input' | 'work' | 'output'
}

/**
 * `in-plan` — this beat set actually reads it.
 * `available` — the workspace has it; this plan doesn't use it.
 * `add`      — an affordance, not a thing (the dashed "＋ plan" chip).
 */
export type ChipState = 'in-plan' | 'available' | 'add'

export interface Chip {
  label: string
  state: ChipState
}

/** A named group of chips — "metrics", "slice by", "state", "benchmark". */
export interface Facet {
  label: string
  chips: Chip[]
}

export interface ScopeModel {
  label: string
  /**
   * EMPTY for a state shape. This is how the family bend arrives at the component:
   * not as a flag to test, but as nothing to render. A state has no spine to
   * declare, so there is no spine here.
   */
  spine: SpineNode[]
  facets: Facet[]
  /** Present only when there is no spine — explains the absence in the operator's words. */
  note?: string
}

export interface BeatModel {
  id: string
  /** Display form of the question category — "stand", "why · opt". */
  category: string
  question: string
  /** "reads … · builds …". Absent on thin beats, which show the question only. */
  detail?: string
  /** "from data" | "directional" — the honest confidence stamp (brief §5.6). */
  confidence?: string
  /** "(thin)" | "(directional)" — why this beat is drawn back. */
  tail?: string
  /**
   * `thin` beats are in the plan but drawn back: the recipe declared them optional
   * and the shape's narration says they go thin. Not a lesser beat — a smaller one.
   */
  prominence: 'full' | 'thin'

  /**
   * EDIT B. Present only on the one beat being edited, so a card cannot render an
   * editing UI it wasn't given.
   *
   * `reads` is the full candidate set — what the recipe declared for this beat plus
   * what the workspace's semantic model could offer it — each flagged in or out of
   * scope. Toggling one recomposes this beat's `detail` and nothing else, which is
   * the whole point of Edit B.
   */
  editing?: {
    reads: Array<{ label: string; inScope: boolean }>
    /** The scope now differs from what the recipe declared. */
    resolved: boolean
  }
}

export interface PlanModel {
  /**
   * Note what isn't here: no `family`. Nothing a screen renders needs it. Colour
   * is handled by a `data-family` attribute the shell forwards from the recipe
   * straight to CSS, where `tokens.css` repoints the `--accent*` aliases. So the
   * plan's components are handed no way at all to know which family they drew —
   * the no-branching rule is a property of this type, not a convention.
   */
  /** "Funnel · Flow family" */
  badge: string
  intent: string
  contextChips: string[]
  scope: ScopeModel
  /** "the plan — beats on the spine" | 'the plan — beats collapse toward "stand"' */
  planLabel: string
  beats: BeatModel[]
  primaryAction: string
}
