// compose/composeEdit.ts
// ---------------------------------------------------------------------------
// EDIT A — revising the ask, or the context it was asked in.
//
// This is the coarse edit: change the intent, the workflow, the period, and the plan
// may come back as a different shape entirely. That's the point — re-resolving the
// recipe re-composes the whole plan, and if the new recipe belongs to another
// family then the accent, the spine and the eventual view all follow, because they
// already derive from (workflow, resolvedRecipe).
//
// Like every other composer here, the modal is handed a model and renders it. The
// eligible-recipe list comes from the workflow's own `eligible` declaration rather
// than from anything the component knows, so the workflow stays authoritative even
// inside the editor.
// ---------------------------------------------------------------------------

import { deriveSpine } from './composePlan'
import type { ComposeContext } from './models'
import { shortRecipeName } from './templates'
import { ALTITUDES, RECIPES_BY_ID, getWorkflow, workflowsForLevel } from '../data/recipes'
import { resolve } from '../data/resolve'
import { PERIODS, PERIOD_LABELS } from '../data/scope'
import type { Altitude, Period, RecipeId, WorkflowName } from '../data/recipe_schema'

export interface EditARecipeOption {
  id: RecipeId
  /** "Funnel · flow family" */
  label: string
  /** "new users → onboarding funnel steps → activated users" */
  summary: string
  /** What the current text resolves to in this workflow. */
  current: boolean
}

export interface EditAModel {
  intent: string
  workflow: WorkflowName
  altitude: Altitude
  period: Period
  /** Only the workflows reachable at the current altitude — the picker cascade. */
  workflows: readonly WorkflowName[]
  altitudes: readonly Altitude[]
  periods: readonly Period[]
  periodLabels: Record<Period, string>
  /** Only the shapes this workflow can produce. */
  recipes: EditARecipeOption[]
  /**
   * What the current text resolves to here. Never null: the resolver always lands
   * somewhere defensible within the workflow, so the modal has no "names nothing"
   * state to render any more.
   */
  resolvedId: RecipeId
  note: string
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/**
 * A one-line description of what a shape lays down. Read off the declaration, so a
 * shape with a spine shows it and a spineless one says what it watches instead —
 * no family check.
 *
 * The spineless branch used to read `spine.state` / `spine.benchmark`, which the
 * current schema no longer carries. It names the monitored subject from the recipe's
 * own `goal_metric_kind` instead — "ratio / level vs benchmark", which is exactly
 * what an operator would want to know about a shape that has no backbone to show.
 */
function summarise(recipeId: RecipeId): string {
  const recipe = RECIPES_BY_ID[recipeId]
  if (!recipe) return ''
  const nodes = deriveSpine(recipe.spine)
  if (nodes.length > 0) return nodes.map((node) => node.label).join(' → ')
  return `${recipe.trigger.goal_metric_kind} · no spine`
}

export function composeEditA(context: ComposeContext, intent: string): EditAModel {
  const eligible = getWorkflow(context.workflow).eligible

  // Only `.recipe` is read here, and that field doesn't depend on the touched flags —
  // they only ever decide output and period. So the modal can ask "what does this
  // text mean here?" without threading pick provenance through the compose layer.
  const resolvedId = resolve(
    {
      workflow: context.workflow,
      output: context.output,
      period: context.period,
      outputTouched: false,
      periodTouched: false,
    },
    intent,
  ).recipe

  return {
    intent,
    workflow: context.workflow,
    altitude: context.altitude,
    period: context.period,
    // Cascaded, not the full list: a workflow only exists at one altitude, so
    // offering all eight here would let the operator pick a pair that can't hold.
    workflows: workflowsForLevel(context.altitude).map((w) => w.name),
    altitudes: ALTITUDES,
    periods: PERIODS,
    periodLabels: PERIOD_LABELS,
    recipes: eligible.flatMap((id) => {
      const recipe = RECIPES_BY_ID[id]
      if (!recipe) return []
      return [
        {
          id,
          label: `${shortRecipeName(recipe.name)} · ${capitalise(recipe.family)} family`,
          summary: summarise(id),
          current: id === resolvedId,
        },
      ]
    }),
    resolvedId,
    note: 'Re-resolving the recipe re-composes the whole plan.',
  }
}
