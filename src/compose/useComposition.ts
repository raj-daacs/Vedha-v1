// compose/useComposition.ts
// ---------------------------------------------------------------------------
// The single doorway from app state into the compose layer.
//
// Screens call this and get display models back. They never look a recipe up
// themselves, which keeps the recipe book — and every schema field on it — out of
// the component tree entirely. One place to change when composition changes.
// ---------------------------------------------------------------------------

import { useMemo } from 'react'
import { composeBuild } from './composeBuild'
import { composeDeepen } from './composeDeepen'
import { composePlan } from './composePlan'
import { composeView } from './composeView'
import type { BuildModel, ComposeContext, PlanModel } from './models'
import { shortRecipeName } from './templates'
import type { DeepenModel, ViewModel } from './viewModels'
import { getRecipe } from '../data/recipes'
import type { Family } from '../data/recipe_schema'
import { useApp } from '../state/AppContext'

export interface Composition {
  /** Null until an ask has resolved to a recipe. */
  build: BuildModel | null
  plan: PlanModel | null
  /**
   * Null when this (workflow, recipe) pair has no rendered view yet — the
   * plan-deep case. The screen shows the "rolling out" placeholder instead.
   */
  view: ViewModel | null
  /**
   * The open deepen scope's answer, or null when the panel is closed (or the scope
   * has no scripted answer).
   */
  deepen: DeepenModel | null
  /**
   * FOR CSS ONLY. Forwarded to a `data-family` attribute so `tokens.css` can
   * repoint the `--accent*` aliases. Deliberately not part of BuildModel or
   * PlanModel: nothing a screen *renders* may depend on it.
   */
  family: Family | undefined
  /** The recipe's short display name, for headings. Never its id or plumbing. */
  shapeName: string | null
}

export function useComposition(): Composition {
  const { state } = useApp()
  const { recipeId, submittedIntent, workflow, altitude, output, period } = state
  const { deepenScope, promoted, editBeat, beatReads } = state

  return useMemo(() => {
    const recipe = recipeId ? getRecipe(recipeId) : undefined
    if (!recipe) {
      return {
        build: null,
        plan: null,
        view: null,
        deepen: null,
        family: undefined,
        shapeName: null,
      }
    }

    const context: ComposeContext = { intent: submittedIntent, workflow, altitude, output, period }

    return {
      build: composeBuild(recipe, context),
      plan: composePlan(recipe, context, { editBeat, beatReads }),
      view: composeView(recipe, context, promoted),
      deepen: composeDeepen(recipe, context, deepenScope, promoted),
      family: recipe.family,
      shapeName: shortRecipeName(recipe.name),
    }
  }, [
    recipeId,
    submittedIntent,
    workflow,
    altitude,
    output,
    period,
    deepenScope,
    promoted,
    editBeat,
    beatReads,
  ])
}
