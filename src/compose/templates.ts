// compose/templates.ts
// ---------------------------------------------------------------------------
// Recipes are written generically because a recipe is a SHAPE, not a subject:
// "{goal_metric} across the {period}", "How {balance} moved from opening to
// closing". The semantic model plus the operator's context is what makes a shape
// concrete. This is where the two meet.
// ---------------------------------------------------------------------------

import type { WorkflowSemantics } from '../data/semanticModel'
import type { Period } from '../data/recipe_schema'

export interface Bindings {
  goal_metric: string
  /**
   * The BARE period noun — "quarter", not "last quarter". Beat questions read
   * "across the {period}" and "next {period}", so they supply their own
   * determiner. Titles and the context label use PERIOD_LABELS instead.
   */
  period: string
  balance: string
}

export function bindingsFor(semantics: WorkflowSemantics, period: Period): Bindings {
  return {
    goal_metric: semantics.goalMetric,
    period,
    balance: semantics.balance,
  }
}

/**
 * Substitute every `{placeholder}` the bindings know about.
 *
 * An unknown placeholder is left untouched rather than blanked: a visible
 * `{something}` in the prototype is a bug report, while a silent empty string is
 * a bug that ships.
 */
export function resolveTemplate(text: string, bindings: Bindings): string {
  return text.replace(/\{(\w+)\}/g, (whole, key: string) => {
    const value = bindings[key as keyof Bindings]
    return value === undefined ? whole : value
  })
}

/** Lowercase the first character, so a sentence can be spliced in as a fragment. */
export function asFragment(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1)
}

/**
 * Condense a spine field into a strip label.
 *
 * Recipes describe their spine in full prose because the declaration is
 * documentation as much as data — "new users / leads / visitors", "opening balance
 * (ARR / MRR / seats)". That's right in the recipe book and wrong in a strip, where
 * the whole job is to read the backbone at a glance. Three conservative passes,
 * in order:
 *
 *   drop a trailing parenthetical   "opening balance (ARR / MRR / seats)" → "opening balance"
 *   keep the first slash-alternate  "new users / leads / visitors"        → "new users"
 *   drop a leading article          "the onboarding funnel steps"         → "onboarding funnel steps"
 *
 * Parentheticals go first because they can contain slashes of their own, which
 * would otherwise get cut mid-phrase. Anything without these patterns passes
 * through untouched ("closing balance", "base at month N").
 */
export function spineLabel(text: string): string {
  return text
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .split('/')[0]
    .replace(/^\s*the\s+/i, '')
    .trim()
}

/**
 * A recipe's display name without its qualifying parenthetical:
 * "Funnel (conversion)" → "Funnel", "State scorecard (ratio / stickiness)" →
 * "State scorecard". The long form is right in a catalogue; the short form is
 * what an operator says out loud, and it's what the badge and the recognition
 * step show.
 */
export function shortRecipeName(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*$/, '')
}
