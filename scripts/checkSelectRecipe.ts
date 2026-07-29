// scripts/checkSelectRecipe.ts
// ---------------------------------------------------------------------------
// Sanity checks for the recipe matcher. Run with `npm run check:recipes`.
//
// Not a unit-test suite — the prototype has no test runner and doesn't need one.
// This is a table of asks an operator would plausibly type, each with the shape it
// should resolve to, so a change to the signals, the weights or WORKSPACE_RECIPES
// can't silently re-route an unrelated ask. `null` means "no confident match" —
// the ask-again state, where Vedha asks for more rather than composing a plan it
// can't justify.
//
// Plus one structural invariant at the end, which is what keeps the header, the
// context pill and the plan from ever disagreeing again.
// ---------------------------------------------------------------------------

import { RECIPES, RECIPES_BY_ID, WORKSPACE_RECIPES } from '../src/data/recipes'
import { selectRecipe } from '../src/data/selectRecipe'
import { VIEW_FIXTURES } from '../src/data/viewFixtures'
import { WORKSPACES } from '../src/data/workspaces'
import type { Workspace } from '../src/data/workspaces'

interface Case {
  intent: string
  workspace: Workspace
  expect: string | null
  /** On a no-match, the workspaces this ask should point at instead. */
  expectSuggests?: Workspace[]
  why?: string
}

const CASES: Case[] = [
  // ---- the finalized scope's named cases -------------------------------------
  {
    intent: 'How sticky is the product this month?',
    workspace: 'Retention',
    expect: 'state_scorecard',
    why: 'the state example card — engagement is monitored under Retention',
  },
  {
    intent: "Activation trend last quarter, and where we're losing people",
    workspace: 'Activation',
    expect: 'funnel_conversion',
    why: 'the flow example card',
  },
  {
    intent: 'How are the signup cohorts maturing?',
    workspace: 'Activation',
    expect: 'cohort_longitudinal',
    why: 'Activation offers two shapes; "cohorts maturing" picks the cohort',
  },
  {
    intent: 'Are retention cohorts improving?',
    workspace: 'Retention',
    expect: 'cohort_longitudinal',
    why: 'Retention offers two shapes; this one names the cohort, not the state',
  },
  {
    intent: 'Show me this month status',
    workspace: 'Acquisition',
    expect: 'funnel_conversion',
    why: 'NEVER the scorecard. On-domain, and Acquisition renders one shape.',
  },
  { intent: 'how did ARR move', workspace: 'Monetisation', expect: 'movement_bridge' },

  // ---- no-match: empty, off-domain, and vague-on-a-2-recipe-workspace --------
  { intent: '', workspace: 'Activation', expect: null, why: 'empty ask' },
  {
    intent: 'what colour is the sky',
    workspace: 'Acquisition',
    expect: null,
    why: 'off-domain — not analytical at all, so the single-shape fallback must not fire',
  },
  {
    intent: 'show me something useful',
    workspace: 'Activation',
    expect: null,
    why: 'vague on a 2-recipe workspace — never guess between funnel and cohort',
  },
  {
    intent: 'show me something useful',
    workspace: 'Retention',
    expect: null,
    why: 'vague on the other 2-recipe workspace',
  },
  {
    intent: 'this month',
    workspace: 'Acquisition',
    expect: null,
    why: 'a bare period is not a question, so it is not on-domain',
  },

  // ---- the workspace filter is hard, not a preference ------------------------
  {
    intent: 'how sticky are we',
    workspace: 'Activation',
    expect: null,
    expectSuggests: ['Retention'],
    why: 'the scorecard is not reachable from Activation — point at Retention instead',
  },
  {
    // Acquisition renders one shape, so per the single-eligible rule this resolves
    // to the funnel by elimination rather than no-matching. That is the same rule
    // that makes "this month status" on Acquisition a funnel, and it stays honest:
    // header, pill and recipe all say Acquisition, so nothing contradicts itself.
    // The Retention suggestion rides along so the UI can offer the other reading.
    intent: 'engagement and stickiness',
    workspace: 'Acquisition',
    expect: 'funnel_conversion',
    expectSuggests: ['Retention'],
    why: 'one-shape workspace: the workspace wins, but the alternative is reported',
  },
  {
    intent: 'how did ARR move last quarter',
    workspace: 'Activation',
    expect: null,
    expectSuggests: ['Expansion', 'Monetisation'],
    why: 'a movement ask from a funnel/cohort workspace',
  },

  // ---- each shape still reachable in its own workspace ----------------------
  { intent: 'where are we losing people', workspace: 'Acquisition', expect: 'funnel_conversion' },
  { intent: 'which step is leaking in onboarding', workspace: 'Activation', expect: 'funnel_conversion' },
  { intent: 'show me the drop-off', workspace: 'Activation', expect: 'funnel_conversion' },
  { intent: 'retention curve by signup week', workspace: 'Retention', expect: 'cohort_longitudinal' },
  { intent: 'where is the decay', workspace: 'Retention', expect: 'cohort_longitudinal' },
  { intent: 'where do we stand', workspace: 'Retention', expect: 'state_scorecard' },
  { intent: 'how are we doing', workspace: 'Retention', expect: 'state_scorecard' },
  { intent: 'what is our DAU/MAU', workspace: 'Retention', expect: 'state_scorecard' },
  { intent: 'show me the ARR build / MRR movement', workspace: 'Expansion', expect: 'movement_bridge' },

  // ---- specific beats generic ----------------------------------------------
  {
    intent: "what's the status of the onboarding funnel",
    workspace: 'Activation',
    expect: 'funnel_conversion',
    why: 'names a funnel explicitly; the generic "status" reading is not even eligible here',
  },
]

let failures = 0

for (const testCase of CASES) {
  const result = selectRecipe(testCase.intent, testCase.workspace)
  const got = result.recipe?.id ?? null
  const suggested = result.suggestedWorkspaces.map((s) => s.workspace)

  const recipeOk = got === testCase.expect
  const suggestsOk =
    testCase.expectSuggests === undefined ||
    (suggested.length === testCase.expectSuggests.length &&
      testCase.expectSuggests.every((w) => suggested.includes(w)))
  const ok = recipeOk && suggestsOk
  if (!ok) failures++

  console.log(`${ok ? 'PASS' : 'FAIL'}  [${testCase.workspace}] "${testCase.intent}"`)
  console.log(
    `        → ${got ?? 'null'}  (score ${result.score}${result.resolvedByElimination ? ', by elimination' : ''})` +
      (recipeOk ? '' : `   EXPECTED ${testCase.expect ?? 'null'}`),
  )
  if (result.matchedSignals.length > 0) {
    console.log(`        signals: ${result.matchedSignals.join(' | ')}`)
  }
  if (result.alternatives.length > 0) {
    console.log(
      `        runners-up: ${result.alternatives.map((a) => `${a.recipe.id}:${a.score}`).join(', ')}`,
    )
  }
  if (suggested.length > 0 || testCase.expectSuggests) {
    console.log(
      `        would match in: ${suggested.join(', ') || '(nowhere)'}` +
        (suggestsOk ? '' : `   EXPECTED ${testCase.expectSuggests?.join(', ')}`),
    )
  }
  if (testCase.why) console.log(`        why: ${testCase.why}`)
  console.log()
}

// ---------------------------------------------------------------------------
// STRUCTURAL INVARIANT — a displayLabel must be unreachable outside its home.
//
// `subjectOf()` in the compose layer reads `recipe.displayLabel` unconditionally,
// so the only thing stopping "Product engagement" appearing above an Acquisition
// context pill is that the scorecard isn't eligible there. That's a real guarantee,
// but an implicit one — this asserts it, so adding a recipe can't quietly break it.
// ---------------------------------------------------------------------------

console.log('--- structural invariant: displayLabel reachability ---')
for (const recipe of RECIPES) {
  if (!recipe.displayLabel) continue

  const reachableFrom = WORKSPACES.filter((workspace) =>
    (WORKSPACE_RECIPES[workspace] ?? []).includes(recipe.id),
  )
  const home = recipe.displayLabelWorkspace
  const ok = home !== undefined && reachableFrom.length === 1 && reachableFrom[0] === home

  if (!ok) failures++
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${recipe.id} displayLabel "${recipe.displayLabel}"` +
      `\n        home: ${home ?? '(unset)'} · reachable from: ${reachableFrom.join(', ') || '(nowhere)'}` +
      (ok
        ? ''
        : '\n        A recipe with a displayLabel must be eligible in exactly its' +
          ' displayLabelWorkspace, or subjectOf() will render a label that' +
          ' contradicts the context pill. Either narrow WORKSPACE_RECIPES or make' +
          ' subjectOf() gate on displayLabelWorkspace.'),
  )
}
console.log()

// ---------------------------------------------------------------------------
// STRUCTURAL INVARIANT — view fixtures must address real beats.
//
// A fixture keys its content by beat id. A typo, or a beat renamed in the recipe,
// would silently drop that section from the rendered view — the page would just be
// shorter, with nothing to indicate a section went missing. This catches that, and
// also catches a fixture keyed to a workspace/recipe pair that can't occur.
// ---------------------------------------------------------------------------

console.log('--- structural invariant: view fixtures address real beats ---')
for (const [key, fixture] of Object.entries(VIEW_FIXTURES)) {
  const [workspace, recipeId] = key.split(':')
  const recipe = RECIPES_BY_ID[recipeId]

  const problems: string[] = []

  if (!recipe) {
    problems.push(`no recipe with id "${recipeId}"`)
  } else {
    const beatIds = new Set(recipe.beats.map((beat) => beat.id))
    for (const fixtureBeatId of Object.keys(fixture.beats)) {
      if (!beatIds.has(fixtureBeatId)) {
        problems.push(`beat "${fixtureBeatId}" is not on ${recipeId}`)
      }
    }

    // A deepen scope is a beat id or the whole-view scope. A typo here would make a
    // section silently un-deepenable — it would open the panel to nothing.
    for (const scope of Object.keys(fixture.deepen)) {
      if (scope !== 'root' && !beatIds.has(scope)) {
        problems.push(`deepen scope "${scope}" is neither a beat on ${recipeId} nor 'root'`)
      }
    }
    // Every rendered section must be deepenable, or selecting it does nothing.
    for (const beat of recipe.beats) {
      if (fixture.beats[beat.id] && !fixture.deepen[beat.id]) {
        problems.push(`section "${beat.id}" renders but has no deepen answer`)
      }
    }
    if (!fixture.deepen.root) problems.push(`no 'root' deepen answer for "Ask about this view"`)
    const eligible = WORKSPACE_RECIPES[workspace as Workspace]
    if (!eligible) problems.push(`"${workspace}" is not a workspace`)
    else if (!eligible.includes(recipeId)) {
      problems.push(`${recipeId} is not eligible on ${workspace}, so this view is unreachable`)
    }
  }

  const ok = problems.length === 0
  if (!ok) failures++
  const rendered = recipe
    ? recipe.beats.filter((beat) => fixture.beats[beat.id] !== undefined).length
    : 0
  const deepenCount = Object.keys(fixture.deepen).length
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${key} — ${rendered}/${recipe?.beats.length ?? '?'} beats rendered · ` +
      `${deepenCount} deepen scopes` +
      (ok ? '' : `\n        ${problems.join('\n        ')}`),
  )
}
console.log()

console.log(failures === 0 ? `ALL CHECKS PASS (${CASES.length} cases + invariants)` : `${failures} FAILED`)

if (failures > 0) process.exit(1)
