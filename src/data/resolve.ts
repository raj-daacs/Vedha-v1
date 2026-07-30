// resolve.ts
// ---------------------------------------------------------------------------
// STAGE A — the layer that sits BEFORE the recipe.
//
// Merges what the operator PICKED (altitude · workflow · output · period) with
// what they TYPED into one fully-specified query, filling any gap with the
// sensible default for the chosen scope, and always recording what it assumed.
//
//   "Say as much or as little as you like. What you pick sets the scope; what you
//    type refines it; anything you left out, Vedha fills with the sensible default
//    for that scope — and tells you what it assumed."
//
// Two mistakes this layer exists to correct, both from the earlier model:
//
//   OUTPUT WAS TREATED AS RESTRICTED. "Financial → default Review" read as "only
//   Review". Wrong: all four outputs are always selectable everywhere. A default
//   is PRE-SELECTED, never ALLOWED-ONLY. Nothing in this file narrows `output`.
//
//   INTENT WAS TREATED AS REQUIRING A PRECISE COMMAND. Wrong: if the operator has
//   already picked Activation + Review + "this month", they have said enough. The
//   scope carries the query; the text only refines. So `resolve` NEVER returns
//   "no match" — see the note on `off_domain_text` below.
//
// Pure function. Same picks + same text ⇒ same query. No clocks, no fetching.
// ---------------------------------------------------------------------------

import { OUTPUT_CUES, PERIOD_CUES, RECIPES_BY_ID, getWorkflow } from './recipes'
import type {
  Output,
  Period,
  ResolvedQuery,
  Source,
  WorkflowName,
} from './recipe_schema'
import { semanticsFor } from './semanticModel'
import { FLOOR, isOnDomain, normalise, rankWithin, tokenise } from './textScoring'

/**
 * What the operator has picked. `outputTouched` / `periodTouched` are the crux of
 * the precedence rules: without them a value that merely *equals* the scope default
 * is indistinguishable from one the operator deliberately chose, and "explicit pick
 * beats a text cue" becomes unimplementable.
 */
export interface Picks {
  workflow: WorkflowName
  output: Output
  period: Period
  /** The operator changed output away from whatever the scope pre-selected. */
  outputTouched: boolean
  /** The operator changed period away from the workflow clock. */
  periodTouched: boolean
}

// ---------------------------------------------------------------------------
// 1 · recipe — WHAT shape
// ---------------------------------------------------------------------------

/**
 * Precedence: text signal (≥ FLOOR) → single eligible → the workflow's primary.
 *
 * The workflow's `eligible` list is a HARD filter, applied before any text is
 * scored. This is what stops "show me this month status" on Acquisition becoming a
 * scorecard: "status" is scorecard vocabulary, but the scorecard isn't eligible
 * there, so the leak can't happen and the header can never contradict the pill.
 *
 * Because the workflow is always chosen, the recipe is DETERMINED everywhere except
 * the two dual-recipe workflows (Activation and Retention). Text only has to
 * disambiguate in two places; everywhere else it just refines period and focus.
 */
function resolveRecipe(picks: Picks, intentNorm: string, intentTokens: string[]) {
  const config = getWorkflow(picks.workflow)
  const eligible = config.eligible
  const flags: string[] = []

  // ONE ELIGIBLE SHAPE ⇒ THE WORKFLOW DECIDED, whatever the text says.
  //
  // Checked before any scoring, and the source is `default` even when the text names
  // the shape squarely. That isn't a technicality: the text cannot have *chosen*
  // something that was the only option. Saying "picked from your wording" here would
  // credit the operator with a decision they never had to make — and six of the
  // spec's own eleven cases are exactly this, all marked as scope-derived.
  if (eligible.length === 1) {
    flags.push('single_eligible')
    return { recipe: eligible[0], source: 'default' as Source, matchedSignals: [], flags }
  }

  // Two eligible: now the text has real work to do, and the bar is higher.
  //
  // FLOOR alone is too low to choose BETWEEN two shapes — one incidental word clears
  // it, which is the soft spot the recipe layer has carried from the start. So a
  // confident read needs a whole phrase, or at least two distinct words. "how's
  // retention doing" on Retention brushes the cohort shape's vocabulary with exactly
  // one word; that is a vague ask about retention, not a request for a cohort curve.
  const [best] = rankWithin(eligible, intentNorm, intentTokens)
  const confident =
    best !== undefined &&
    best.score >= FLOOR &&
    (best.phraseHits >= 1 || best.tokenHits >= 2)

  if (confident) {
    return {
      recipe: best.recipe.id,
      source: 'text' as Source,
      matchedSignals: best.matchedSignals,
      flags,
    }
  }

  // The text didn't choose: take the workflow's primary lens and SAY SO. A defensible
  // default, surfaced — not a guess in disguise.
  flags.push('assumed_primary_recipe')
  return { recipe: config.primary, source: 'default' as Source, matchedSignals: [], flags }
}

// ---------------------------------------------------------------------------
// 2 · output — HOW deep
// ---------------------------------------------------------------------------

/**
 * Precedence: explicit pick → text cue → scope default.
 *
 * THE ASYMMETRY. Here a deliberate structured pick outranks a fuzzy word in the
 * text; for `period` below it is the other way round. Both follow from the same
 * principle — the more deliberate signal wins — because changing the output chip is
 * a decision, whereas writing "this month" is more deliberate than leaving a
 * period chip at whatever it happened to say.
 */
function resolveOutput(picks: Picks, intentNorm: string) {
  if (picks.outputTouched) return { output: picks.output, source: 'output_picked' as const }

  // Longest cue wins, so "board readout" beats a bare "report" that happens to be
  // a substring of something else in the sentence.
  let bestCue = ''
  let bestOutput: Output | null = null
  for (const [output, cues] of Object.entries(OUTPUT_CUES) as Array<[Output, string[]]>) {
    for (const cue of cues) {
      if (cue.length > bestCue.length && intentNorm.includes(` ${normalise(cue).trim()} `)) {
        bestCue = cue
        bestOutput = output
      }
    }
  }
  if (bestOutput) return { output: bestOutput, source: 'output_text' as const }

  return { output: getWorkflow(picks.workflow).outputDefault, source: 'output_default' as const }
}

// ---------------------------------------------------------------------------
// 3 · period — WHEN
// ---------------------------------------------------------------------------

/**
 * Bare period nouns, as a documented SUPPLEMENT to the handoff's `PERIOD_CUES`.
 *
 * `PERIOD_CUES` only carries determined phrases ("this month", "last quarter", "q3").
 * The spec's own test case 3 — "board readout of the quarter" → period `quarter`
 * from TEXT — cannot pass on that table alone, because "of the quarter" matches no
 * entry. Rather than edit `recipes.ts` (which is replaced wholesale on every drop
 * from eng), the bare nouns live here.
 *
 * Checked only AFTER `PERIOD_CUES`, and by the same longest-match rule, so a
 * determined phrase always wins over the bare noun inside it.
 */
const BARE_PERIOD_CUES: Record<string, Period> = {
  week: 'week',
  weekly: 'week',
  month: 'month',
  monthly: 'month',
  quarter: 'quarter',
  quarterly: 'quarter',
  year: 'year',
  yearly: 'year',
  annual: 'year',
}

/**
 * Precedence: text date phrase → explicit pick → the workflow clock.
 *
 * Text wins here — a written "this month" is the most deliberate statement of when
 * there is, more so than a chip the operator may never have looked at.
 */
function resolvePeriod(picks: Picks, intentNorm: string) {
  // Longest match across both tables, determined phrases first.
  let bestCue = ''
  let bestPeriod: Period | null = null
  const consider = (cue: string, period: Period) => {
    if (cue.length > bestCue.length && intentNorm.includes(` ${cue} `)) {
      bestCue = cue
      bestPeriod = period
    }
  }
  for (const [cue, period] of Object.entries(PERIOD_CUES)) consider(cue, period as Period)
  for (const [cue, period] of Object.entries(BARE_PERIOD_CUES)) consider(cue, period)

  if (bestPeriod) return { period: bestPeriod as Period, source: 'period_text' as const }
  if (picks.periodTouched) return { period: picks.period, source: 'period_picked' as const }
  return { period: getWorkflow(picks.workflow).periodDefault, source: 'period_default' as const }
}

// ---------------------------------------------------------------------------
// 4 · focus — WHERE within
// ---------------------------------------------------------------------------

/**
 * Text only, and optional — empty is entirely fine. Two things are looked for:
 *
 *   a DIMENSION, from "by <something>" ("by segment", "by channel")
 *   a MEMBER, one named slice of a cut ("the Business tier", "SMB")
 *
 * A dimension is a way to cut; a member is one slice of one cut. Both come from the
 * workflow's semantic model, so focus can only ever name something Vedha actually
 * knows about here.
 */
function resolveFocus(picks: Picks, intentNorm: string) {
  const semantics = semanticsFor(picks.workflow)

  const dimension = semantics.dimensions.find((d) =>
    intentNorm.includes(` by ${normalise(d).trim()} `),
  )

  // Longest member wins: "Enterprise tier" should not resolve to "Enterprise".
  const member = [...semantics.focusMembers]
    .sort((a, b) => b.length - a.length)
    .find((m) => intentNorm.includes(` ${normalise(m).trim()} `))

  if (!dimension && !member) return undefined
  return { ...(dimension ? { dimension } : {}), ...(member ? { member } : {}) }
}

// ---------------------------------------------------------------------------
// The entry point
// ---------------------------------------------------------------------------

/**
 * Merge picks and text into one fully-specified query.
 *
 * NEVER returns a no-match. The operator always has a scope, so there is always a
 * defensible query to run; what varies is how much of it was assumed, which is what
 * `sources` and `flags` are for. The Build step restates the result in plain words
 * and marks every assumed value one-tap correctable — defaulting is safe precisely
 * because it is surfaced.
 */
export function resolve(picks: Picks, text: string): ResolvedQuery {
  const intentNorm = normalise(text)
  const intentTokens = tokenise(intentNorm)

  const recipe = resolveRecipe(picks, intentNorm, intentTokens)
  const output = resolveOutput(picks, intentNorm)
  const period = resolvePeriod(picks, intentNorm)
  const focus = resolveFocus(picks, intentNorm)

  const flags = [...recipe.flags]

  // OFF-DOMAIN means the text contributed NOTHING — not merely that it named no
  // shape. "board readout of the quarter" names no metric, but it set the output and
  // the period; that is a scope-refining ask, and flagging it "was that your
  // question?" would be nonsense. Only text that landed nowhere at all earns the
  // prominent flag, which is the one case ("what's the weather") where Vedha really
  // does need to check it understood.
  const textContributed =
    recipe.source === 'text' ||
    output.source === 'output_text' ||
    period.source === 'period_text' ||
    focus !== undefined
  if (
    intentTokens.length > 0 &&
    !textContributed &&
    !isOnDomain(intentNorm, intentTokens, picks.workflow)
  ) {
    flags.push('off_domain_text')
  }

  // Worth surfacing: the label the view will be headed with is not the workflow
  // name. The header will read "Product engagement" while the pill reads
  // "Retention", and an operator should be told that rather than left to notice.
  //
  // Read off the recipe's own two fields — the same test `subjectOf()` applies, so
  // the flag and the rendered header cannot disagree. No recipe id appears here.
  const chosen = RECIPES_BY_ID[recipe.recipe]
  if (chosen.displayLabel !== undefined && chosen.displayLabelWorkspace === picks.workflow) {
    flags.push('displayLabel_applied')
  }

  return {
    recipe: recipe.recipe,
    output: output.output,
    period: period.period,
    ...(focus ? { focus } : {}),
    sources: {
      recipe: recipe.source,
      output: output.source === 'output_picked'
        ? 'picked'
        : output.source === 'output_text'
          ? 'text'
          : 'default',
      period: period.source === 'period_text'
        ? 'text'
        : period.source === 'period_picked'
          ? 'picked'
          : 'default',
    },
    flags,
  }
}
