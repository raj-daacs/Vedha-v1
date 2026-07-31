// scripts/checkResolve.ts
// ---------------------------------------------------------------------------
// Sanity checks for the scope resolver and the data it reads. `npm run check:recipes`.
//
// Not a unit-test suite — the prototype has no test runner and doesn't need one.
// It is a table of things an operator would plausibly do, each with the query it
// should produce, plus the structural invariants that no amount of case-writing
// would catch.
//
// Seven sections:
//
//   A  · THE SPEC'S OWN CASES. The eleven from vedha_scope_resolution §06,
//        asserting the resolved value AND its source. These are the acceptance
//        criteria; if one fails, the resolver disagrees with its own spec.
//   B  · ROUTING CASES. Carried over from the old matcher table. These guard
//        against a signal change silently re-routing an unrelated ask.
//   C  · THE SHIPPED PROMPT CHIPS. Every workflow's two declared examplePrompts,
//        resolved. The chips are data now, so a careless prompt would ship a
//        chip that flags itself off-domain.
//   D  · THE THREE RE-DERIVATIONS. The spine (both triplets), benchmark, and
//        trigger.shape — the fields the current schema no longer declares.
//   E  · displayLabel honesty, checked through subjectOf rather than structurally.
//   F  · View fixtures address real beats.
//   G  · Every bridge reconciles: opening + Σ deltas === closing.
//   H  · The response atoms: one curve per view, marker on the axis, and a
//        recommendation always stamped directional.
//
// NOTE ON "NO MATCH". The old table had `expect: null` cases — asks the matcher
// should refuse. The resolver has no such answer: the operator always has a scope,
// so those cases now assert the SCOPED FALLBACK plus the flag that says so. The
// point of each is unchanged, and in fact sharper: what mattered was never the
// refusal, it was that text can't drag you into a shape your workflow doesn't
// render.
// ---------------------------------------------------------------------------

import { deriveSpine, judgedAgainstBenchmark, subjectOf } from '../src/compose/composePlan'
import type { Picks } from '../src/data/resolve'
import { resolve } from '../src/data/resolve'
import {
  RECIPES,
  RECIPES_BY_ID,
  WORKFLOWS,
  getWorkflow,
  recipesForWorkflow,
} from '../src/data/recipes'
import type { Output, Period, RecipeId, Source, WorkflowName } from '../src/data/recipe_schema'
import { VIEW_FIXTURES } from '../src/data/viewFixtures'

// This script is bundled by esbuild and run under node, but the project carries no
// @types/node — its dependency list is deliberately tiny and nothing in `src/` needs
// them. Declaring the one member used is cheaper than pulling in the whole set.
declare const process: { exit(code: number): never }

let failures = 0
const fail = (message: string) => {
  failures++
  console.log(`FAIL  ${message}`)
}
const pass = (message: string) => console.log(`PASS  ${message}`)

/** Build picks the way the app does: scope defaults unless the case overrides them. */
function picksFor(workflow: WorkflowName, output?: Output, period?: Period): Picks {
  const config = getWorkflow(workflow)
  return {
    workflow,
    output: output ?? config.outputDefault,
    period: period ?? config.periodDefault,
    outputTouched: output !== undefined,
    periodTouched: period !== undefined,
  }
}

// ===========================================================================
// A · THE SPEC'S OWN ELEVEN CASES  (vedha_scope_resolution §06)
// ===========================================================================

interface SpecCase {
  n: number
  workflow: WorkflowName
  pickOutput?: Output
  pickPeriod?: Period
  text: string
  recipe: RecipeId
  recipeSrc: Source
  output: Output
  outputSrc: Source
  period: Period
  periodSrc: Source
  focus?: string
  flag?: string
  note?: string
}

const SPEC_CASES: SpecCase[] = [
  { n: 1, workflow: 'P&L', text: '', recipe: 'movement_bridge', recipeSrc: 'default', output: 'review', outputSrc: 'default', period: 'quarter', periodSrc: 'default', note: 'a valid query with zero text' },
  { n: 2, workflow: 'P&L', pickOutput: 'quick_answer', text: 'net profit this month', recipe: 'movement_bridge', recipeSrc: 'default', output: 'quick_answer', outputSrc: 'picked', period: 'month', periodSrc: 'text', note: 'output pick honoured over the Review default' },
  { n: 3, workflow: 'P&L', text: 'board readout of the quarter', recipe: 'movement_bridge', recipeSrc: 'default', output: 'readout', outputSrc: 'text', period: 'quarter', periodSrc: 'text', note: 'text cue overrides the default, chip untouched' },
  { n: 4, workflow: 'Activation', pickOutput: 'review', text: 'how was this month', recipe: 'funnel_conversion', recipeSrc: 'default', output: 'review', outputSrc: 'picked', period: 'month', periodSrc: 'text', flag: 'assumed_primary_recipe', note: 'vague text → the primary lens, flagged' },
  { n: 5, workflow: 'Activation', text: 'how are signup cohorts maturing', recipe: 'cohort_longitudinal', recipeSrc: 'text', output: 'report', outputSrc: 'default', period: 'week', periodSrc: 'default', note: 'shifts to the secondary recipe' },
  { n: 6, workflow: 'Retention', text: 'how sticky is the product', recipe: 'state_scorecard', recipeSrc: 'text', output: 'report', outputSrc: 'default', period: 'month', periodSrc: 'default', flag: 'displayLabel_applied', note: 'title becomes "Product engagement"' },
  { n: 7, workflow: 'Retention', text: "how's retention doing", recipe: 'cohort_longitudinal', recipeSrc: 'default', output: 'report', outputSrc: 'default', period: 'month', periodSrc: 'default', flag: 'assumed_primary_recipe', note: 'vague → primary; Build offers the scorecard' },
  { n: 8, workflow: 'Acquisition', text: 'show me this month status', recipe: 'funnel_conversion', recipeSrc: 'default', output: 'report', outputSrc: 'default', period: 'month', periodSrc: 'text', note: '"status" looks scorecard-y — the workflow filter blocks the leak' },
  { n: 9, workflow: 'Revenue engine', text: 'how did ARR move last quarter, by segment', recipe: 'movement_bridge', recipeSrc: 'default', output: 'review', outputSrc: 'default', period: 'quarter', periodSrc: 'text', focus: 'segment' },
  { n: 10, workflow: 'Monetisation', text: 'should we raise the Business tier price', recipe: 'price_sensitivity', recipeSrc: 'default', output: 'report', outputSrc: 'default', period: 'quarter', periodSrc: 'default', focus: 'Business tier', note: 'response family · the native "do" beat recommends a move' },
  { n: 11, workflow: 'Activation', text: "what's the weather", recipe: 'funnel_conversion', recipeSrc: 'default', output: 'report', outputSrc: 'default', period: 'week', periodSrc: 'default', flag: 'off_domain_text', note: 'scope defaults carry it, flagged prominently' },
]

console.log('=== A · the spec\'s eleven cases ===\n')

for (const c of SPEC_CASES) {
  const r = resolve(picksFor(c.workflow, c.pickOutput, c.pickPeriod), c.text)
  const focusText = r.focus?.dimension ?? r.focus?.member

  const errs: string[] = []
  if (r.recipe !== c.recipe) errs.push(`recipe ${r.recipe} ≠ ${c.recipe}`)
  if (r.sources.recipe !== c.recipeSrc) errs.push(`recipe source ${r.sources.recipe} ≠ ${c.recipeSrc}`)
  if (r.output !== c.output) errs.push(`output ${r.output} ≠ ${c.output}`)
  if (r.sources.output !== c.outputSrc) errs.push(`output source ${r.sources.output} ≠ ${c.outputSrc}`)
  if (r.period !== c.period) errs.push(`period ${r.period} ≠ ${c.period}`)
  if (r.sources.period !== c.periodSrc) errs.push(`period source ${r.sources.period} ≠ ${c.periodSrc}`)
  if (c.focus && focusText !== c.focus) errs.push(`focus ${focusText ?? '(none)'} ≠ ${c.focus}`)
  if (!c.focus && focusText) errs.push(`focus ${focusText} ≠ (none)`)
  if (c.flag && !r.flags.includes(c.flag)) errs.push(`missing flag ${c.flag}`)

  const label = `${String(c.n).padStart(2)}  [${c.workflow}] "${c.text}"`
  if (errs.length === 0) {
    pass(label)
    console.log(
      `        → ${r.recipe} [${r.sources.recipe}] · ${r.output} [${r.sources.output}] · ` +
        `${r.period} [${r.sources.period}]${focusText ? ` · focus ${focusText}` : ''}` +
        (r.flags.length ? `  {${r.flags.join(' ')}}` : ''),
    )
  } else {
    fail(label)
    for (const e of errs) console.log(`        ${e}`)
  }
  if (c.note) console.log(`        ${c.note}`)
}

// ===========================================================================
// B · ROUTING CASES — a signal change must not re-route an unrelated ask
// ===========================================================================

interface RouteCase {
  text: string
  workflow: WorkflowName
  expect: RecipeId
  /** Assert a flag, where the point of the case IS the flag. */
  flag?: string
  /** Assert NO flag — used where a fallback would be the wrong outcome. */
  notFlag?: string
  why?: string
}

const ROUTE_CASES: RouteCase[] = [
  // ---- each shape reachable where it lives --------------------------------
  { text: 'where are we losing people', workflow: 'Acquisition', expect: 'funnel_conversion' },
  { text: 'which step is leaking in onboarding', workflow: 'Activation', expect: 'funnel_conversion', notFlag: 'assumed_primary_recipe', why: 'names a funnel on a dual workflow — must be recognised, not assumed' },
  { text: 'show me the drop-off', workflow: 'Activation', expect: 'funnel_conversion', notFlag: 'assumed_primary_recipe' },
  { text: 'retention curve by signup week', workflow: 'Retention', expect: 'cohort_longitudinal', notFlag: 'assumed_primary_recipe' },
  { text: 'where is the decay', workflow: 'Retention', expect: 'cohort_longitudinal', notFlag: 'assumed_primary_recipe' },
  { text: 'where do we stand', workflow: 'Retention', expect: 'state_scorecard', notFlag: 'assumed_primary_recipe' },
  { text: 'how are we doing', workflow: 'Retention', expect: 'state_scorecard', notFlag: 'assumed_primary_recipe' },
  { text: 'what is our DAU/MAU', workflow: 'Retention', expect: 'state_scorecard', notFlag: 'assumed_primary_recipe', why: 'the scorecard is the shape that renders DAU/WAU/MAU tiles — "retention" must not pull it to the cohort' },
  { text: 'how many active users', workflow: 'Retention', expect: 'state_scorecard', notFlag: 'assumed_primary_recipe' },
  { text: 'Are retention cohorts improving?', workflow: 'Retention', expect: 'cohort_longitudinal', notFlag: 'assumed_primary_recipe' },
  { text: 'How are the signup cohorts maturing?', workflow: 'Activation', expect: 'cohort_longitudinal', notFlag: 'assumed_primary_recipe' },
  { text: "Activation trend last quarter, and where we're losing people", workflow: 'Activation', expect: 'funnel_conversion', notFlag: 'assumed_primary_recipe' },
  { text: 'How sticky is the product this month?', workflow: 'Retention', expect: 'state_scorecard', notFlag: 'assumed_primary_recipe' },
  { text: "what's the status of the onboarding funnel", workflow: 'Activation', expect: 'funnel_conversion', notFlag: 'assumed_primary_recipe', why: 'names a funnel; the generic "status" reading isn\'t eligible here anyway' },
  { text: 'show me the ARR build / MRR movement', workflow: 'Expansion', expect: 'movement_bridge' },

  // ---- the new workflows --------------------------------------------------
  { text: 'Net profit this quarter', workflow: 'P&L', expect: 'movement_bridge' },
  { text: 'Where does burn stand vs plan', workflow: 'Cost & Burn', expect: 'state_scorecard', why: 'Cost & Burn watches a state, so the scorecard is its only shape' },
  { text: 'ARPU and price realisation', workflow: 'Monetisation', expect: 'price_sensitivity' },

  // ---- THE HARD FILTER. Text naming another workflow's shape must not reach it.
  { text: 'how sticky are we', workflow: 'Activation', expect: 'funnel_conversion', flag: 'assumed_primary_recipe', why: 'the scorecard is not eligible on Activation — must fall to the primary, never leak' },
  { text: 'how did ARR move last quarter', workflow: 'Activation', expect: 'funnel_conversion', flag: 'assumed_primary_recipe', why: 'a movement ask from a funnel/cohort workflow cannot become a bridge' },
  { text: 'engagement and stickiness', workflow: 'Acquisition', expect: 'funnel_conversion', why: 'one-shape workflow: the workflow wins outright' },
  { text: 'how did ARR move', workflow: 'Monetisation', expect: 'price_sensitivity', why: 'Monetisation renders sensitivity only — the bridge is not reachable here' },
  { text: 'show me the onboarding funnel', workflow: 'Cost & Burn', expect: 'state_scorecard', why: 'a funnel ask from a scorecard-only workflow' },

  // ---- what used to be "no match" ----------------------------------------
  { text: '', workflow: 'Activation', expect: 'funnel_conversion', flag: 'assumed_primary_recipe', notFlag: 'off_domain_text', why: 'empty text is not off-domain text — there was nothing to be off-domain' },
  { text: 'what colour is the sky', workflow: 'Acquisition', expect: 'funnel_conversion', flag: 'off_domain_text', why: 'off-domain: resolved from scope, and said so' },
  { text: 'show me something useful', workflow: 'Activation', expect: 'funnel_conversion', flag: 'assumed_primary_recipe', why: 'vague on a dual workflow — take the primary, never guess between two' },
  { text: 'show me something useful', workflow: 'Retention', expect: 'cohort_longitudinal', flag: 'assumed_primary_recipe' },
  { text: 'this month', workflow: 'Acquisition', expect: 'funnel_conversion', notFlag: 'off_domain_text', why: 'a bare period names no shape but does set the period, so it is not off-domain' },
]

console.log('\n=== B · routing — the workflow filter is hard, not a preference ===\n')

for (const c of ROUTE_CASES) {
  const r = resolve(picksFor(c.workflow), c.text)
  const errs: string[] = []
  if (r.recipe !== c.expect) errs.push(`got ${r.recipe}, expected ${c.expect}`)
  if (c.flag && !r.flags.includes(c.flag)) errs.push(`missing flag ${c.flag}`)
  if (c.notFlag && r.flags.includes(c.notFlag)) errs.push(`unexpected flag ${c.notFlag}`)

  const label = `[${c.workflow}] "${c.text}" → ${r.recipe}${r.flags.length ? `  {${r.flags.join(' ')}}` : ''}`
  if (errs.length === 0) pass(label)
  else {
    fail(label)
    for (const e of errs) console.log(`        ${e}`)
  }
  if (c.why) console.log(`        ${c.why}`)
}

// ===========================================================================
// C · THE SHIPPED PROMPT CHIPS
//
// Prompt chips are data now — two per workflow, straight from examplePrompts. So a
// carelessly worded prompt ships a chip that resolves badly: an off-domain flag on
// something Vedha itself suggested, or a fallback where the prompt clearly names a
// shape. Nothing else in the codebase would notice.
// ===========================================================================

console.log('\n=== C · every workflow\'s two shipped prompt chips resolve cleanly ===\n')

for (const config of WORKFLOWS) {
  for (const prompt of config.examplePrompts) {
    const r = resolve(picksFor(config.name), prompt)
    const problems: string[] = []
    if (!config.eligible.includes(r.recipe)) {
      problems.push(`resolved to ${r.recipe}, which is not eligible here`)
    }
    if (r.flags.includes('off_domain_text')) {
      problems.push('flagged off_domain_text — Vedha would suggest an ask it then queries')
    }
    const label = `[${config.name}] "${prompt}" → ${r.recipe} · ${r.output} · ${r.period}`
    if (problems.length === 0) pass(label)
    else {
      fail(label)
      for (const p of problems) console.log(`        ${p}`)
    }
  }
}

// ===========================================================================
// D · THE THREE RE-DERIVATIONS
//
// The current schema dropped spine.rendered_as, spine.state and spine.benchmark,
// which three composers read. Each is now derived from a field the schema does
// declare, and each derivation is load-bearing enough to assert.
// ===========================================================================

console.log('\n=== D · the three re-derivations ===\n')

const spineless = RECIPES.filter((r) => deriveSpine(r.spine).length === 0)
const benchmarked = RECIPES.filter(judgedAgainstBenchmark)

for (const r of RECIPES) {
  const nodes = deriveSpine(r.spine)
  console.log(
    `      ${r.id.padEnd(21)} ${r.family.padEnd(9)} ${r.trigger.shape.padEnd(12)} ` +
      `${nodes.length ? nodes.map((n) => n.label).join(' → ') : '(no spine — collapses)'}` +
      `${judgedAgainstBenchmark(r) ? '   · vs benchmark' : ''}`,
  )
}
console.log()

// Spine-emptiness carries the whole state-family bend: it drives the collapsed plan
// label, the state/benchmark facets and the "not a flow you run" note. If a second
// recipe ever derives no spine, all of that silently applies to it too.
if (spineless.length === 1 && spineless[0].id === 'state_scorecard') {
  pass('exactly one recipe derives no spine, and it is state_scorecard')
} else {
  fail(`spineless recipes: ${spineless.map((r) => r.id).join(', ') || '(none)'} — expected only state_scorecard`)
}

// The both-triplets rule. price_sensitivity declares lever/response/constraint; if
// deriveSpine read only input/work/output it would come back spineless and be
// rendered as the state it isn't.
const price = RECIPES_BY_ID.price_sensitivity
const priceSpine = deriveSpine(price.spine).map((n) => n.label).join(' → ')
if (priceSpine === 'price → revenue under WTP → churn risk') {
  pass('price_sensitivity maps lever → response → constraint onto the backbone')
} else {
  fail(`price_sensitivity spine is "${priceSpine}" — the second triplet is not being read`)
}

if (benchmarked.length === 1 && benchmarked[0].id === 'state_scorecard') {
  pass('exactly one recipe is judged vs a benchmark, and it is state_scorecard')
} else {
  fail(`judged vs benchmark: ${benchmarked.map((r) => r.id).join(', ') || '(none)'} — expected only state_scorecard`)
}

// trigger.shape stands in for the removed spine.rendered_as on the build's step 1.
const shapeless = RECIPES.filter((r) => !r.trigger.shape)
if (shapeless.length === 0) pass('every recipe declares a trigger.shape (the rendered_as replacement)')
else fail(`recipes with no trigger.shape: ${shapeless.map((r) => r.id).join(', ')}`)

// ===========================================================================
// E · displayLabel honesty
//
// The scorecard is headed "Product engagement", but only under Retention — anywhere
// else that label would contradict the context pill.
//
// THIS USED TO BE A STRUCTURAL CHECK: the scorecard was eligible in exactly one
// workflow, so the label was unreachable elsewhere by construction. The current
// catalog deliberately breaks that — Cost & Burn renders a scorecard too — so
// single-reachability is now the wrong thing to assert. What matters is the
// behaviour: `subjectOf()` gates on displayLabelWorkspace, so check the subject it
// actually produces in every workflow the recipe can be reached from.
//
// Stronger than the old check, not weaker: it verifies the guarantee itself rather
// than one structural arrangement that happened to imply it.
// ===========================================================================

console.log('\n=== E · displayLabel honesty — the label appears only at home ===\n')

for (const recipe of RECIPES) {
  if (!recipe.displayLabel) continue
  const home = recipe.displayLabelWorkspace
  const reachableFrom = WORKFLOWS.filter((w) => w.eligible.includes(recipe.id)).map((w) => w.name)

  if (home === undefined) {
    fail(`${recipe.id} carries displayLabel "${recipe.displayLabel}" with no displayLabelWorkspace`)
    continue
  }
  if (!reachableFrom.includes(home)) {
    fail(`${recipe.id} names ${home} as its displayLabel home, but isn't eligible there`)
    continue
  }

  for (const workflow of reachableFrom) {
    const subject = subjectOf(recipe, {
      intent: '',
      workflow,
      altitude: getWorkflow(workflow).level,
      output: getWorkflow(workflow).outputDefault,
      period: getWorkflow(workflow).periodDefault,
    })
    const expected = workflow === home ? recipe.displayLabel : workflow
    const label = `${recipe.id} under ${workflow} → header reads "${subject}"`
    if (subject === expected) pass(label)
    else {
      fail(label)
      console.log(
        `        expected "${expected}" — a header that disagrees with the context pill is\n` +
          '        the exact bug displayLabelWorkspace exists to prevent.',
      )
    }
  }
}

// ===========================================================================
// F · View fixtures address real beats
//
// A fixture keys content by beat id. A renamed beat silently drops that section —
// the page is just shorter, with nothing to say a section went missing. This is
// exactly what happened when the recipe layer was replaced and every beat id
// changed: three rendered views became empty shells and typecheck saw nothing.
// ===========================================================================

console.log('\n=== F · view fixtures address real beats ===\n')

for (const [key, fixture] of Object.entries(VIEW_FIXTURES)) {
  const [workflow, recipeId] = key.split(':')
  const recipe = RECIPES_BY_ID[recipeId as RecipeId]
  const problems: string[] = []

  if (!recipe) {
    problems.push(`no recipe with id "${recipeId}"`)
  } else {
    const beatIds = new Set(recipe.beats.map((beat) => beat.id))

    for (const fixtureBeatId of Object.keys(fixture.beats)) {
      if (!beatIds.has(fixtureBeatId)) problems.push(`beat "${fixtureBeatId}" is not on ${recipeId}`)
    }
    // A deepen scope is a beat id or the whole-view scope. A typo makes a section
    // silently un-deepenable — it opens the panel to nothing.
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
    if (!fixture.deepen.root) problems.push("no 'root' deepen answer for \"Ask about this view\"")

    const config = WORKFLOWS.find((w) => w.name === workflow)
    if (!config) problems.push(`"${workflow}" is not a workflow`)
    else if (!config.eligible.includes(recipeId as RecipeId)) {
      problems.push(`${recipeId} is not eligible on ${workflow}, so this view is unreachable`)
    }
  }

  const rendered = recipe
    ? recipe.beats.filter((beat) => fixture.beats[beat.id] !== undefined).length
    : 0
  const label =
    `${key} — ${rendered}/${recipe?.beats.length ?? '?'} beats rendered · ` +
    `${Object.keys(fixture.deepen).length} deepen scopes`

  if (problems.length === 0) pass(label)
  else {
    fail(label)
    for (const p of problems) console.log(`        ${p}`)
  }
}

// Which pairs are plan-deep. Not an assertion — a plan-deep pair is a legitimate
// state, and the list is worth printing so it stays a decision rather than a drift.
const planDeep = WORKFLOWS.flatMap((w) =>
  recipesForWorkflow(w.name)
    .filter((r) => !VIEW_FIXTURES[`${w.name}:${r.id}`])
    .map((r) => `${w.name}:${r.id}`),
)
console.log(`\n      plan-deep pairs (real plan, placeholder view): ${planDeep.length}`)
for (const pair of planDeep) console.log(`        ${pair}`)

// ===========================================================================
// G · Every bridge reconciles
//
// A waterfall whose bars don't land on its closing anchor is a lying chart, and it is
// not a thing the eye catches — the bars are all individually plausible and the gap
// reads as a rendering quirk. So: opening + Σ deltas must equal closing, exactly.
//
// The fixtures compute the closing from the movements, so this can only fail if
// someone later types one in by hand. Which is exactly when it needs to fail.
// ===========================================================================

console.log('\n=== G · every bridge reconciles ===\n')

let bridgeCount = 0

for (const [key, fixture] of Object.entries(VIEW_FIXTURES)) {
  for (const [beatId, beat] of Object.entries(fixture.beats)) {
    for (const panel of beat.panels) {
      if (panel.atom !== 'bridge') continue
      bridgeCount++
      const { opening, closing, movements, projected } = panel.data
      const sum = movements.reduce((total, m) => total + m.delta, opening.value)
      // Compared at the display precision: the chart shows two decimals, so agreement
      // to two decimals is agreement as far as anyone reading it can tell.
      const balanced = Math.round(sum * 100) === Math.round(closing.value * 100)
      const gross = movements.filter((m) => m.delta > 0).reduce((t, m) => t + m.delta, 0)
      const cut = movements.filter((m) => m.delta < 0).reduce((t, m) => t + m.delta, 0)

      const label =
        `${key} · ${beatId} — ${opening.value.toFixed(2)} ` +
        `+${gross.toFixed(2)} ${cut.toFixed(2)} → ${closing.value.toFixed(2)}` +
        (projected ? `  (projected ${projected.value.toFixed(2)})` : '')

      if (balanced) pass(label)
      else {
        fail(label)
        console.log(
          `        bars sum to ${sum.toFixed(2)} but the closing anchor says ` +
            `${closing.value.toFixed(2)} — the chart would draw a gap it can't explain.`,
        )
      }

      // A bridge with no movements is a pair of anchors and no story; almost certainly
      // an unfinished fixture rather than a deliberate one.
      if (movements.length === 0) fail(`${key} · ${beatId} — bridge has no movements`)
    }
  }
}

console.log(`\n      ${bridgeCount} bridge panels checked`)

// NEVER TWICE IN ONE VIEW. The waterfall fuses "where we stand" and the top-level
// "why" — it shows the net move and its components in the same picture — so a second
// one is the same chart restated, not a second finding. Two bridges did ship once;
// this is what stops it coming back.
//
// `mb_ahead` is the one legitimate repeat: same walk, plus a projected closing bar.
// It's a different claim (a forecast, stamped directional), so it gets counted apart.
console.log('\n      no view renders the waterfall twice:')
for (const [key, fixture] of Object.entries(VIEW_FIXTURES)) {
  const bridgeBeats = Object.entries(fixture.beats).filter(([, beat]) =>
    beat.panels.some((panel) => panel.atom === 'bridge'),
  )
  if (bridgeBeats.length === 0) continue

  const measured = bridgeBeats.filter(([beatId]) => beatId !== 'mb_ahead').map(([id]) => id)
  const label = `${key} — bridge on ${bridgeBeats.map(([id]) => id).join(', ')}`
  if (measured.length <= 1) pass(`        ${label}`)
  else {
    fail(`        ${label}`)
    console.log(`                ${measured.length} measured waterfalls in one view; expected 1.`)
  }
}

// THE DIMENSIONAL WHY MUST RECONCILE WITH THE COMPONENT IT SPLITS. The fixtures claim
// the ranked bars sum to one of the bridge's movements — that claim is the reason the
// two sections can be read as one fact at two depths, so it should be enforced rather
// than asserted in a comment.
console.log('\n      the dimensional split sums to a component of its own bridge:')
for (const [key, fixture] of Object.entries(VIEW_FIXTURES)) {
  const bridgePanel = Object.values(fixture.beats)
    .flatMap((beat) => beat.panels)
    .find((panel) => panel.atom === 'bridge')
  if (!bridgePanel || bridgePanel.atom !== 'bridge') continue

  for (const [beatId, beat] of Object.entries(fixture.beats)) {
    for (const panel of beat.panels) {
      if (panel.atom !== 'rankedBars') continue
      const total = Math.round(panel.data.bars.reduce((t, b) => t + b.value, 0) * 100)
      const match = bridgePanel.data.movements.find(
        (m) => Math.round(Math.abs(m.delta) * 100) === total,
      )
      const label = `        ${key} · ${beatId} — bars sum to ${(total / 100).toFixed(2)}`
      if (match) pass(`${label}, which is ${match.label}`)
      else {
        fail(label)
        console.log(
          `                no movement on this bridge equals ${(total / 100).toFixed(2)} — ` +
            `the split would not reconcile with the waterfall above it.\n` +
            `                movements: ${bridgePanel.data.movements.map((m) => `${m.label} ${m.delta}`).join(', ')}`,
        )
      }
    }
  }
}

// ===========================================================================

// ===========================================================================
// H · The response family's two atoms
//
// Both make claims that are easy to break quietly, so both are asserted.
// ===========================================================================

console.log('\n=== H · the response atoms ===\n')

for (const [key, fixture] of Object.entries(VIEW_FIXTURES)) {
  const curveBeats = Object.entries(fixture.beats).filter(([, beat]) =>
    beat.panels.some((panel) => panel.atom === 'responseCurve'),
  )

  // RENDER THE CURVE ONCE. It fuses "why" (the shape) and "ahead" (what each candidate
  // move yields) into one annotated chart, so a second render is the same picture with
  // a different caption — the redundancy the bridge already had to have removed.
  if (curveBeats.length > 0) {
    const label = `${key} — response curve on ${curveBeats.map(([id]) => id).join(', ')}`
    if (curveBeats.length === 1) pass(label)
    else {
      fail(label)
      console.log(`        ${curveBeats.length} response curves in one view; expected 1.`)
    }
  }

  for (const [beatId, beat] of Object.entries(fixture.beats)) {
    for (const panel of beat.panels) {
      // THE CURRENT-PRICE MARKER MUST BE ON THE AXIS. Off the end it simply doesn't
      // draw, and the chart would silently lose half its finding — the gap between
      // where the price is and where revenue peaks.
      if (panel.atom === 'responseCurve') {
        const prices = panel.data.curve.map((p) => p.price)
        const inRange =
          panel.data.currentPrice >= Math.min(...prices) &&
          panel.data.currentPrice <= Math.max(...prices)
        const peak = panel.data.curve.reduce((b, p) => (p.revenue > b.revenue ? p : b))
        const label =
          `${key} · ${beatId} — now ${panel.data.currentPrice}, peak ${peak.price} ` +
          `(axis ${Math.min(...prices)}–${Math.max(...prices)})`
        if (inRange) pass(label)
        else {
          fail(label)
          console.log('        the current-price marker falls outside the plotted range.')
        }
      }

      // A RECOMMENDATION IS ALWAYS DIRECTIONAL. It is a call about something that
      // hasn't happened — a price nobody has been charged. Stamping it "from data"
      // would be the most misleading thing this app could say, and it is one careless
      // fixture edit away, so it is enforced rather than trusted.
      if (panel.atom === 'recommendation') {
        const label = `${key} · ${beatId} — recommendation stamped "${panel.data.confidence}"`
        if (panel.data.confidence === 'directional') pass(label)
        else {
          fail(label)
          console.log(
            '        a recommendation must be stamped directional — it predicts the\n' +
              '        effect of a move nobody has made yet.',
          )
        }
      }
    }
  }
}

// ===========================================================================
// I · Cross-panel coherence
//
// Two claims a view makes implicitly by putting two panels next to each other. Both
// are arithmetic, so both are checkable — and neither is something the eye catches,
// because each panel is individually plausible.
// ===========================================================================

console.log('\n=== I · cross-panel coherence ===\n')

for (const [key, fixture] of Object.entries(VIEW_FIXTURES)) {
  const panels = Object.values(fixture.beats).flatMap((beat) => beat.panels)

  // A FUNNEL MUST NARROW. Reach is a share of the population still present, so a stage
  // that reads higher than the one before it is impossible — and the consequence isn't
  // a visibly broken chart: `Funnel` derives its pass rates from consecutive reaches,
  // so a widening step yields a rate above 100% and can silently steal the worst-step
  // marker from the gate that actually leaks.
  for (const panel of panels) {
    if (panel.atom !== 'funnel') continue
    const steps = panel.data.steps
    const rising = steps.filter((s, i) => i > 0 && s.reach > steps[i - 1].reach)
    const label = `${key} — funnel descends: ${steps.map((s) => s.reach).join(' → ')}`
    if (rising.length === 0) pass(label)
    else {
      fail(label)
      console.log(
        `        these stages widen: ${rising.map((s) => s.label).join(', ')} — a pass rate\n` +
          '        above 100% would follow, and the worst-step marker becomes unreliable.',
      )
    }
  }

  // A COHORT MATRIX MUST RECONCILE WITH ITS CURVE — but there are TWO ways a curve can
  // relate to a matrix, depending on which axis it runs along, and a view is coherent
  // if either holds:
  //
  //   ALONG AGE      the curve is one cohort's path, so some ROW traces it.
  //                  (the two cohort views: m0…m12, w0…w7)
  //   ACROSS COHORTS the curve is each cohort's settled outcome, so every fully
  //                  matured row ENDS on its own curve point.
  //                  (the Activation funnel view: wk 1…wk 13 of signup)
  //
  // Both are genuine "these panels describe one dataset" claims. Asserting only the
  // first flagged the funnel view, where the trend runs across cohorts and shares no
  // axis with the matrix at all — the check was wrong there, not the data.
  const curve = panels.find((p) => p.atom === 'trend' || p.atom === 'nrrCurve')
  const matrix = panels.find((p) => p.atom === 'cohortMatrix')
  if (!curve || !matrix || matrix.atom !== 'cohortMatrix') continue
  if (curve.atom !== 'trend' && curve.atom !== 'nrrCurve') continue

  const curveValues = curve.data.points.map((p) => p.value)

  const rowTracingCurve = matrix.data.rows.find((row) => {
    const observed = row.values.filter((v): v is number => v !== null)
    return (
      observed.length >= curveValues.length && curveValues.every((v, i) => observed[i] === v)
    )
  })

  // Only rows with nothing left to observe can be compared to a settled outcome; a
  // still-maturing cohort legitimately ends below its own final rate.
  const matured = matrix.data.rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => row.values.every((v) => v !== null))
  const endsOnCurve =
    matured.length > 0 &&
    matured.every(
      ({ row, index }) => row.values[row.values.length - 1] === curveValues[index],
    )

  const label = `${key} — matrix reconciles with its curve`
  if (rowTracingCurve) {
    pass(`${label} · along age → row "${rowTracingCurve.label}" traces it`)
  } else if (endsOnCurve) {
    pass(`${label} · across cohorts → all ${matured.length} matured rows end on their point`)
  } else {
    fail(label)
    console.log(
      `        curve [${curveValues.join(', ')}] matches no row along age, and the\n` +
        '        matured rows do not end on their own curve points. The two panels are\n' +
        '        not views of the same data — one of them is wrong.',
    )
  }
}

// ===========================================================================

const total = SPEC_CASES.length + ROUTE_CASES.length + WORKFLOWS.length * 2
console.log(
  failures === 0
    ? `\nALL CHECKS PASS — ${SPEC_CASES.length} spec cases · ${ROUTE_CASES.length} routing · ` +
      `${WORKFLOWS.length * 2} prompt chips · ` +
      `invariants D–I  (${total} cases)`
    : `\n${failures} FAILED`,
)

if (failures > 0) process.exit(1)
