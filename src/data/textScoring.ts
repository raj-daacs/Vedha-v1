// textScoring.ts
// ---------------------------------------------------------------------------
// HOW MUCH DOES THIS TEXT LOOK LIKE A REQUEST FOR THIS SHAPE?
//
// Extracted verbatim from the old `selectRecipe.ts`, whose outer shell the
// resolver replaced. The scoring model is unchanged and still the thing worth
// trusting — it's a keyword/signal matcher with published weights and a test
// table, not a model call. The prototype has no backend, and the brief is
// explicit that plan composition should be recipe-driven rather than hand-wired.
//
// What this is NOT: the resolver. This only scores text against a recipe's
// declared signals. Deciding WHICH recipe wins — and what happens when the text
// says nothing at all — is `resolve.ts`, which owns the precedence rules.
//
// What this is also NOT: routing. Scoring picks the SKELETON. Filling each beat
// with a reasoned verdict (`Beat.fills_from` → the RS nodes) is a separate track.
// ---------------------------------------------------------------------------

import { RECIPES, RECIPES_BY_ID } from './recipes'
import type { Recipe, RecipeId, WorkflowName } from './recipe_schema'
import { semanticsFor } from './semanticModel'

export interface RecipeMatch {
  recipe: Recipe
  score: number
  /** the raw `trigger.intent_signals` entries that fired, for narration + debugging */
  matchedSignals: string[]
  /**
   * How many WHOLE signal phrases the text contained, and how many distinct words
   * merely overlapped. Kept apart from `score` because they answer a different
   * question: not "how strong?" but "how deliberate?".
   *
   * The resolver needs that distinction. A single incidental word clears FLOOR on its
   * own (one overlap already scores TOKEN_OVERLAP), which is fine when only one shape
   * is eligible and meaningless anyway, but not good enough to choose BETWEEN two
   * shapes the operator's workflow can both produce.
   */
  phraseHits: number
  tokenHits: number
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
 * because one overlap already scores TOKEN_OVERLAP. The real safety comes from the
 * workflow's own `eligible` list narrowing the field to one or two candidates
 * before any text is scored — a mis-scored ask can at worst pick the wrong one of
 * two shapes the operator's own workflow produces, never a shape from somewhere
 * else entirely.
 */
export const FLOOR = 2

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
export function normalise(text: string): string {
  return ` ${text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()} `
}

export function tokenise(normalised: string): string[] {
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

/** Score one recipe's trigger against the intent. The workflow is NOT folded in here. */
function scoreSignals(recipe: Recipe, intentNorm: string, intentTokens: string[]) {
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

/**
 * Rank the recipes a given workflow can produce against the intent.
 *
 * The candidate list IS the workflow constraint — nothing outside it is scored, so
 * no amount of matching text can reach a shape this workflow doesn't render. Every
 * eligible recipe comes back, scored (including zero), so the caller can see the
 * top score and decide whether it cleared the floor.
 */
export function rankWithin(
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
            phraseHits: signal.phraseHits,
            tokenHits: signal.tokenHits,
          } satisfies RecipeMatch,
        },
      ]
    })
    // Score desc, then the workflow's own ordering — no positional bonus, so the
    // list order only ever breaks a genuine tie. Deterministic across runs.
    .sort((a, b) => b.match.score - a.match.score || a.rank - b.rank)
    .map((entry) => entry.match)
}

// ---------------------------------------------------------------------------
// Is the operator talking about their business at all?
// ---------------------------------------------------------------------------

/** Every phrase and word that appears in ANY recipe's signals. Built once. */
const ALL_SIGNAL_PHRASES: string[] = RECIPES.flatMap((recipe) =>
  recipe.trigger.intent_signals.flatMap((signal) => alternates(signal)),
).filter((phrase) => phrase.length >= MIN_PHRASE_LEN)

/**
 * Timeframe words carry no analytical intent on their own — naming a period isn't
 * asking a question. They have to be excluded explicitly because several signals
 * mention time ("cohort / by signup month", "decay / churn over time", "nrr by
 * age"), which would otherwise make a bare "this month" look on-domain.
 *
 * Exported because the resolver reads periods out of the same text, where these
 * words are exactly the signal it wants — the two uses are complementary, not
 * contradictory: a period tells you WHEN, never WHAT.
 */
export const TIME_WORDS = new Set([
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
 * This separates "you asked something analytical, so I'll analyse what you're
 * looking at" from "I have no idea what you want". Under the resolver both still
 * produce a query — the scope carries it either way — but only the second is
 * flagged prominently, so the distinction has to be drawn somewhere.
 *
 * A bare period ("this month") is NOT on-domain on its own — see TIME_WORDS.
 */
export function isOnDomain(
  intentNorm: string,
  intentTokens: string[],
  workflow: WorkflowName,
): boolean {
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
