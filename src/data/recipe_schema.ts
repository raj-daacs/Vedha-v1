// recipe_schema.ts — Vedha recipe layer · type definitions
// Supersedes the prior 4-recipe / 2-family schema.
// Adds: `response` family · `sensitivity` spine · `extend` fit · the `Output` axis ·
//       `displayLabelWorkspace` · the altitude/workflow scope model · `ResolvedQuery`.
//
// Layer boundary (see vedha_recipe_layer + vedha_scope_resolution):
//   Semantic layer  = what is computable (Tessera; eng codifies)
//   Recipe layer    = the shape + ordered beats (THIS file's Recipe/Beat)
//   Reasoning walk  = what is true (fills each beat's verdict)
//   Output axis     = how deep / how framed (orthogonal to recipe)

// ---------- families & shapes ----------
export type Family = 'flow' | 'state' | 'response';                       // + response
export type Spine = 'funnel' | 'bridge' | 'cohort' | 'scorecard' | 'sensitivity'; // + sensitivity
export type QuestionCategory = 'stand' | 'why' | 'ahead' | 'do';
export type FourQFit = 'hold' | 'bend' | 'collapse' | 'extend';           // + extend
export type Confidence = 'from_data' | 'directional';
export type Producibility = 'yes' | 'needs_atom' | 'needs_join' | 'needs_orientation';

// ---------- the output axis (second, orthogonal to recipe) ----------
export type Output = 'quick_answer' | 'report' | 'review' | 'readout';

export type RecipeId =
  | 'funnel_conversion'
  | 'cohort_longitudinal'
  | 'state_scorecard'
  | 'movement_bridge'
  | 'price_sensitivity';

// Spine declaration.
//   flow      -> input / work / output
//   response  -> lever / response / constraint
//   state     -> none (empty object). The "collapse" of the state family falls out
//                of an absent spine, so screens do a shape check (spine empty?) not a family check.
export interface SpineDecl {
  input?: string;
  work?: string;
  output?: string;
  lever?: string;
  response?: string;
  constraint?: string;
}

export interface RecipeTrigger {
  shape: Spine;
  goal_metric_kind: string;
  intent_signals: string[]; // whole-phrase signals the resolver scores against the free text
}

export interface Beat {
  id: string;
  category: QuestionCategory;   // stand | why | ahead | do
  question: string;             // business-word; may template {goal_metric} / {period}
  reads: string[];              // semantic scope it draws (metrics · dimensions) — the eng fill point
  builds: string;               // the atomic insight it renders
  atoms: string[];              // atom component id(s)
  confidence: Confidence;
  fills_from?: string[];        // routing nodes that resolve the beat
  optional?: boolean;           // may render thin or be dropped
  include_when?: string;        // condition under which an optional beat is included
}

export interface Recipe {
  id: RecipeId;
  name: string;
  family: Family;
  spine: SpineDecl;
  trigger: RecipeTrigger;
  beats: Beat[];
  four_question_fit: FourQFit;
  narration_note: string;
  producibility: Producibility;
  requires: string[];              // gap / conformance ids this recipe depends on
  displayLabel?: string;           // e.g. "Product engagement"
  displayLabelWorkspace?: WorkflowName; // the workflow that label applies to (else use workflow name)
}

export type RecipeBook = Recipe[];

// ---------- scope model: altitude -> workflow -> eligible recipes ----------
export type Altitude = 'Financial' | 'Company' | 'Functional';
export type Period = 'week' | 'month' | 'quarter' | 'year';

export type WorkflowName =
  | 'P&L'
  | 'Revenue engine'
  | 'Cost & Burn'
  | 'Acquisition'
  | 'Activation'
  | 'Retention'
  | 'Expansion'
  | 'Monetisation';

export interface WorkflowConfig {
  name: WorkflowName;
  level: Altitude;
  eligible: RecipeId[];   // recipes reachable in this workflow — the HARD filter (the standpoint)
  primary: RecipeId;      // the vague-ask default lens (only meaningful where eligible.length > 1)
  outputDefault: Output;  // PRE-SELECTED output — never a restriction; all four stay selectable
  periodDefault: Period;  // the workflow clock
  examplePrompts: [string, string]; // the two command-panel prompt chips
}

// ---------- resolver output (Stage A) ----------
export type Source = 'picked' | 'text' | 'default';

export interface ResolvedQuery {
  recipe: RecipeId;
  output: Output;
  period: Period;
  focus?: { dimension?: string; member?: string; note?: string };
  sources: { recipe: Source; output: Source; period: Source }; // for honest "assumed X" surfacing
  flags: string[]; // e.g. 'assumed_primary_recipe' · 'off_domain_text' · 'displayLabel_applied'
}
