// selectRecipe.ts
// ---------------------------------------------------------------------------
// COMPOSER STEP 1 — recognise the shape of the report the operator is asking for,
// and hand back the recipe that renders it.
//
// This is the "Recognising the shape → [recipe name]" beat the user watches
// resolve during the narrated build. It is deliberately a keyword/signal matcher,
// not a model call: the prototype has no backend, and the design brief is explicit
// that plan composition should be recipe-driven rather than hand-wired.
//
// What it is NOT: routing. This picks the SKELETON. Filling each beat with a
// reasoned verdict (`Beat.fills_from` → the RS nodes) is a separate track.
//
// ── Precedence ──────────────────────────────────────────────────────────────
// THE SELECTED WORKFLOW IS AUTHORITATIVE. It decides which recipes are eligible;
// the free text only refines within that set. Text can never pull the operator
// into a shape their workflow doesn't produce — that used to happen, and it left
// the header, the context pill, and the plan disagreeing about what was being
// looked at. When the text names a shape this workflow can't render, the answer
// is no-match plus a pointer to where it *would* have matched.
// ---------------------------------------------------------------------------

import { RECIPES, RECIPES_BY_ID, WORKFLOWS, getWorkflow } from './recipes'
import type { Recipe, RecipeId, WorkflowName } from './recipe_schema'
import { semanticsFor } from './semanticModel'

export interface RecipeMatch {
  recipe: Recipe
  score: number
  /** the raw `trigger.intent_signals` entries that fired, for narration + debugging */
  matchedSignals: string[]
}

/** Where an ask would have landed, had the operator been standing somewhere else. */
export interface WorkflowSuggestion {
  workflow: WorkflowName
  recipe: Recipe
}

export interface SelectRecipeResult {
  /** null when nothing eligible matched confidently — Vedha should say so, not guess. */
  recipe: Recipe | null
  score: number
  matchedSignals: string[]
  /** runners-up within this workflow, best first. Feeds the Edit-A recipe list. */
  alternatives: RecipeMatch[]
  /**
   * Only populated on a no-match: workflows where this same text WOULD have
   * resolved. Lets the no-match state ask "did you mean Monetisation?" rather than
   * only "be more specific".
   *
   * NOT YET RENDERED — surfacing it needs a CommandPanel change.
   */
  suggestedWorkflows: WorkflowSuggestion[]
  /**
   * True when the recipe was reached by elimination, not recognition: the ask was
   * on-domain but named no shape, and the workflow offers exactly one. Worth
   * knowing because the build screen currently narrates "Recognising the shape",
   * which overstates what happened here.
   */
  resolvedByElimination: boolean
}

// ---------------------------------------------------------------------------
// Weights.
// ---------------------------------------------------------------------------

/** A whole signal phrase appearing in the ask — the strongest evidence there is. */
const PHRASE_HIT = 10
/** One distinct word of the ask overlapping one of the signals. */
const TOKEN_OVERLAP = 2

/**
 * Below this, the ask hasn't named a shape.
 *
 * Note what this does and doesn't protect against. It rejects an ask with no
 * signal at all; it does NOT reject an ask carried by a single incidental word,
 * because one overlap already scores TOKEN_OVERLAP. The real safety now comes from
 * `a workflow's eligible list` narrowing the field to one or two candidates before any text
 * is scored — a mis-scored ask can at worst pick the wrong one of two shapes the
 * operator's own workflow produces, never a shape from somewhere else entirely.
 */
const FLOOR = 2

/** Shortest alternate we'll treat as a phrase — below this it's just a token. */
const MIN_PHRASE_LEN = 3
/** Shortest token we'll fuzzy-match, and the prefix length we compare on. */
const STEM_LEN = 5

/**
 * Words that carry no shape signal. Kept short on purpose: over-trimming loses
 * real signal ("step", "net", "new" all matter here).
 */
const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'then',
  'i', 'me', 'my', 'we', 'us', 'our', 'you', 'your', 'it', 'its', 'they',
  'is', 'are', 'was', 'were', 'be', 'been', 'am', 'do', 'does', 'did',
  'has', 'have', 'had', 'can', 'could', 'will', 'would', 'should',
  'how', 'what', 'which', 'where', 'when', 'why', 'who',
  'to', 'of', 'in', 'on', 'at', 'for', 'from', 'by', 'with', 'about',
  'this', 'that', 'these', 'those', 'there', 'here',
  'last', 'next', 'now', 'so', 'as', 'me',
])

// ---------------------------------------------------------------------------
// Normalisation
// ---------------------------------------------------------------------------

/** Lowercase, drop punctuation, collapse whitespace. Space-padded for word-safe `includes`. */
function normalise(text: string): string {
  return ` ${text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()} `
}

function tokenise(normalised: string): string[] {
  return normalised.split(' ').filter((t) => t.length > 0 && !STOPWORDS.has(t))
}

/**
 * A signal may pack alternates behind a slash — "conversion / drop-off",
 * "retention / NRR". Each side is its own phrase to look for.
 */
function alternates(signal: string): string[] {
  return signal
    .split('/')
    .map((part) => normalise(part).trim())
    .filter((part) => part.length > 0)
}

/**
 * Loose token equality, so "move" reaches "movement" and "sticky" reaches
 * "stickiness" without dragging in a stemmer. Two rules, both conservative:
 * the shorter token is a prefix of the longer, or they agree on 5 characters.
 */
function fuzzyEqual(a: string, b: string): boolean {
  if (a === b) return true
  const [short, long] = a.length <= b.length ? [a, b] : [b, a]
  if (short.length >= 4 && long.startsWith(short)) return true
  return short.length >= STEM_LEN && a.slice(0, STEM_LEN) === b.slice(0, STEM_LEN)
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

interface SignalScore {
  score: number
  matched: string[]
  /** How many whole signal phrases the intent contained. */
  phraseHits: number
  /** How many distinct intent words matched a signal word. */
  tokenHits: number
}

/** Score one recipe's trigger against the intent. WorkflowName is NOT folded in here. */
function scoreSignals(recipe: Recipe, intentNorm: string, intentTokens: string[]): SignalScore {
  let score = 0
  let phraseHits = 0
  let tokenHits = 0
  const matched: string[] = []
  // A single intent word shouldn't earn credit once per signal it happens to
  // brush against, so each intent token can only pay out once per recipe.
  const spent = new Set<string>()

  for (const signal of recipe.trigger.intent_signals) {
    let signalFired = false

    for (const phrase of alternates(signal)) {
      if (phrase.length >= MIN_PHRASE_LEN && intentNorm.includes(` ${phrase} `)) {
        score += PHRASE_HIT
        phraseHits += 1
        signalFired = true
        // A matched phrase consumes its own words.
        for (const word of tokenise(` ${phrase} `)) spent.add(word)
      }
    }

    for (const signalToken of tokenise(normalise(signal))) {
      for (const intentToken of intentTokens) {
        if (spent.has(intentToken)) continue
        // Exact and loose overlaps are worth the same: "sticky" reaching
        // "stickiness" is the same evidence as "sticky" reaching "sticky".
        if (intentToken === signalToken || fuzzyEqual(intentToken, signalToken)) {
          score += TOKEN_OVERLAP
          tokenHits += 1
          spent.add(intentToken)
          signalFired = true
        }
      }
    }

    if (signalFired) matched.push(signal)
  }

  return { score, matched, phraseHits, tokenHits }
}

// ---------------------------------------------------------------------------
// The entry point
// ---------------------------------------------------------------------------

/**
 * Rank the recipes a given workflow can produce against the intent.
 *
 * The candidate list IS the workflow constraint — nothing outside it is scored,
 * so no amount of matching text can reach a shape this workflow doesn't render.
 * Every eligible recipe comes back, scored (including zero), so the caller can see
 * the top score and decide whether it cleared the floor.
 */
function rankWithin(
  candidateIds: readonly RecipeId[],
  intentNorm: string,
  intentTokens: string[],
): RecipeMatch[] {
  return candidateIds
    .flatMap((id, rank) => {
      const recipe = RECIPES_BY_ID[id]
      if (!recipe) return []
      const signal = scoreSignals(recipe, intentNorm, intentTokens)
      return [
        {
          rank,
          match: {
            recipe,
            score: signal.score,
            matchedSignals: signal.matched,
          } satisfies RecipeMatch,
        },
      ]
    })
    // Score desc, then the workflow's own ordering — no positional bonus, so the
    // list order only ever breaks a genuine tie. Deterministic across runs.
    .sort((a, b) => b.match.score - a.match.score || a.rank - b.rank)
    .map((entry) => entry.match)
}

/** Every phrase and word that appears in ANY recipe's signals. Built once. */
const ALL_SIGNAL_PHRASES: string[] = RECIPES.flatMap((recipe) =>
  recipe.trigger.intent_signals.flatMap((signal) => alternates(signal)),
).filter((phrase) => phrase.length >= MIN_PHRASE_LEN)

/**
 * Timeframe words carry no analytical intent on their own — naming a period isn't
 * asking a question. They have to be excluded explicitly because several signals
 * mention time ("cohort / by signup month", "decay / churn over time", "nrr by
 * age"), which would otherwise make a bare "this month" look on-domain.
 */
const TIME_WORDS = new Set([
  'day', 'days', 'daily',
  'week', 'weeks', 'weekly',
  'month', 'months', 'monthly',
  'quarter', 'quarters', 'quarterly',
  'year', 'years', 'yearly', 'annual',
  'time', 'age', 'period', 'periods', 'today', 'yesterday',
])

const ALL_SIGNAL_TOKENS: Set<string> = new Set(
  RECIPES.flatMap((recipe) =>
    recipe.trigger.intent_signals.flatMap((signal) => tokenise(normalise(signal))),
  ).filter((token) => !TIME_WORDS.has(token)),
)

/**
 * Is the operator asking about their business at all?
 *
 * This is the difference between "you asked something analytical, and this
 * workflow only does one thing, so I'll assume you meant that" and "I have no
 * idea what you want". It's what lets *"show me this month status"* on Acquisition
 * resolve to the funnel — "status" is analytical vocabulary, Acquisition renders
 * exactly one shape, so there is nothing to be ambiguous about — while
 * *"what colour is the sky"* still gets the ask-again state.
 *
 * A bare period ("this month") is NOT on-domain on its own — see TIME_WORDS.
 */
function isOnDomain(intentNorm: string, intentTokens: string[], workflow: WorkflowName): boolean {
  const meaningful = intentTokens.filter((token) => !TIME_WORDS.has(token))
  if (meaningful.length === 0) return false

  // Vocabulary from any recipe — including shapes this workflow can't render,
  // since the operator asking for one still counts as asking about the business.
  if (ALL_SIGNAL_PHRASES.some((phrase) => intentNorm.includes(` ${phrase} `))) return true
  if (meaningful.some((token) => ALL_SIGNAL_TOKENS.has(token))) return true

  // Vocabulary from what Vedha already knows about this workflow.
  const semantics = semanticsFor(workflow)
  const vocabulary = new Set(
    [
      semantics.goalMetric,
      semantics.balance,
      ...semantics.metrics,
      ...semantics.dimensions,
      ...semantics.states,
      ...semantics.benchmarks,
    ]
      .flatMap((term) => tokenise(normalise(term)))
      .filter((token) => !TIME_WORDS.has(token)),
  )
  return meaningful.some((token) => vocabulary.has(token))
}

/**
 * Pick the recipe whose shape best fits what the operator asked for, within the
 * workflow they're standing in.
 *
 * @param intent    the operator's plain-language question
 * @param workflow where they're standing — AUTHORITATIVE. It constrains which
 *                  recipes are eligible; the text only refines within that set.
 *
 * Returns `recipe: null` when nothing eligible matched confidently. That's a real
 * answer, not a failure: Vedha asks rather than composing a plan whose own header
 * would contradict the context label. On a no-match, `suggestedWorkflows` names
 * anywhere the same ask would have landed.
 */
export function selectRecipe(intent: string, workflow: WorkflowName): SelectRecipeResult {
  const intentNorm = normalise(intent)
  const intentTokens = tokenise(intentNorm)

  const eligibleIds = getWorkflow(workflow).eligible
  const ranked = rankWithin(eligibleIds, intentNorm, intentTokens)
  const [best, ...rest] = ranked

  // The text named a shape this workflow produces.
  if (best && best.score >= FLOOR) {
    return {
      recipe: best.recipe,
      score: best.score,
      matchedSignals: best.matchedSignals,
      alternatives: rest.filter((match) => match.score >= FLOOR),
      suggestedWorkflows: [],
      resolvedByElimination: false,
    }
  }

  // Nothing here cleared the floor. Whichever way this resolves, it's worth knowing
  // where the ask WOULD have landed — the operator may simply be standing in the
  // wrong place, and that's a far more useful thing to say than "be more specific".
  const suggestedWorkflows: WorkflowSuggestion[] = WORKFLOWS.map((w) => w.name).filter(
    (candidate) => candidate !== workflow,
  ).flatMap((candidate) => {
    const [elsewhere] = rankWithin(
      getWorkflow(candidate).eligible,
      intentNorm,
      intentTokens,
    ).filter((match) => match.score >= FLOOR)
    return elsewhere ? [{ workflow: candidate, recipe: elsewhere.recipe }] : []
  })

  // If the workflow renders exactly one shape and the ask was at least about the
  // business, there is nothing to be ambiguous about — take it. The workflow is
  // authoritative, so a shapeless-but-on-domain ask means "analyse what I'm looking
  // at". Any suggestions ride along, so the UI can still offer the other reading.
  //
  // With two or more eligible shapes we do NOT pick: guessing between two plausible
  // readings is how the operator ends up with a plan they didn't ask for.
  if (eligibleIds.length === 1 && isOnDomain(intentNorm, intentTokens, workflow)) {
    const only = RECIPES_BY_ID[eligibleIds[0]]
    if (only) {
      return {
        recipe: only,
        score: 0,
        matchedSignals: [],
        alternatives: [],
        suggestedWorkflows,
        resolvedByElimination: true,
      }
    }
  }

  return {
    recipe: null,
    score: 0,
    matchedSignals: [],
    alternatives: [],
    suggestedWorkflows,
    resolvedByElimination: false,
  }
}
