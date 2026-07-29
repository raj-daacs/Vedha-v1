// compose/composeEdit.ts
// ---------------------------------------------------------------------------
// EDIT A — revising the ask, or the context it was asked in.
//
// This is the coarse edit: change the intent, the workspace, the period, and the plan
// may come back as a different shape entirely. That's the point — re-selecting the
// recipe re-composes the whole plan, and if the new recipe belongs to the other
// family then the accent, the spine and the eventual view all follow, because they
// already derive from (workspace, resolvedRecipe).
//
// Like every other composer here, the modal is handed a model and renders it. The
// eligible-recipe list comes from WORKSPACE_RECIPES rather than from anything the
// component knows, so the workspace stays authoritative even inside the editor.
// ---------------------------------------------------------------------------

import { deriveSpine } from './composePlan'
import type { ComposeContext } from './models'
import { shortRecipeName } from './templates'
import { RECIPES_BY_ID, WORKSPACE_RECIPES } from '../data/recipes'
import { selectRecipe } from '../data/selectRecipe'
import { LEVELS, PERIODS, PERIOD_LABELS, WORKSPACES } from '../data/workspaces'
import type { Level, Period, Workspace } from '../data/workspaces'

export interface EditARecipeOption {
  id: string
  /** "Funnel · flow family" */
  label: string
  /** "new users → onboarding funnel steps → activated users" */
  summary: string
  /** What the current text resolves to in this workspace. */
  current: boolean
}

export interface EditAModel {
  intent: string
  workspace: Workspace
  level: Level
  period: Period
  workspaces: readonly Workspace[]
  levels: readonly Level[]
  periods: readonly Period[]
  periodLabels: Record<Period, string>
  /** Only the shapes this workspace can produce. */
  recipes: EditARecipeOption[]
  /** null when the text names nothing this workspace renders. */
  resolvedId: string | null
  note: string
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/**
 * A one-line description of what a shape lays down. Read off the declaration, so a
 * flow shows its spine and a state shows what it monitors — no family check.
 */
function summarise(recipeId: string): string {
  const recipe = RECIPES_BY_ID[recipeId]
  if (!recipe) return ''
  const nodes = deriveSpine(recipe.spine)
  if (nodes.length > 0) return nodes.map((node) => node.label).join(' → ')
  return [recipe.spine.state, recipe.spine.benchmark]
    .filter(Boolean)
    .join(' · vs ')
    .concat(' · no spine')
}

export function composeEditA(context: ComposeContext, intent: string): EditAModel {
  const eligible = WORKSPACE_RECIPES[context.workspace] ?? []
  const resolvedId = selectRecipe(intent, context.workspace).recipe?.id ?? null

  return {
    intent,
    workspace: context.workspace,
    level: context.level,
    period: context.period,
    workspaces: WORKSPACES,
    levels: LEVELS,
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
    note: 'Re-selecting the recipe re-composes the whole plan.',
  }
}
