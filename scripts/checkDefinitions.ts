// scripts/checkDefinitions.ts
// ---------------------------------------------------------------------------
// Does a definitions file work? `npm run check:definitions`.
//
// The business team owns `workflowDefinitions.json` and replaces it wholesale. That
// only works if "the app survives a replaced file" is CHECKED rather than believed, so
// this script is the thing you run against a new drop before putting it in.
//
//   npm run check:definitions                    the bundled file, then the stress fixture
//   npm run check:definitions -- path/to.json    a candidate file you were just handed
//
// Five sections:
//
//   A · THE DRIFT GUARD. `definitionSchema.ts` carries `ROUTABLE_WORKFLOWS` as bare
//       strings because the data layer must not import the recipe layer. Duplicated
//       constants rot, so this asserts it still equals the catalog's names exactly.
//   B · THE BUNDLED FILE. Loads, reports what it assumed, and every workflow it
//       declares must yield usable semantics.
//   C · EVERY CATALOG WORKFLOW. Not just the declared ones — the catalog can route to a
//       workflow the file omits (`Cost & Burn` today), and that has to render.
//   D · THE STRESS FIXTURE. A deliberately broken payload. ERRORS ARE THE EXPECTED
//       RESULT here; what must not happen is a throw, and every catalog workflow must
//       still come back usable.
//   E · A CANDIDATE FILE, when one is passed.
//
// The whole contract is "never throws". So this script deliberately does NOT wrap the
// loads in try/catch: if the data layer throws, the script dies with a stack trace,
// which is the loudest possible way to report the one regression that matters.
// ---------------------------------------------------------------------------

import './bootDefinitions'

import { initDefinitions } from '../src/data/definitionRegistry'
import { ROUTABLE_WORKFLOWS } from '../src/data/definitionSchema'
import type { Issue } from '../src/data/definitionSchema'
import { WORKFLOWS } from '../src/data/recipes'
import { allSemantics, derivationIssueList, semanticsFor } from '../src/data/semanticModel'
import BUNDLED from '../src/data/workflowDefinitions.json'
import STRESS from './fixtures/stress-definitions.json'

// This script is bundled by esbuild and run under node, but the project carries no
// @types/node — its dependency list is deliberately tiny and nothing in `src/` needs
// them. Declaring the members used is cheaper than pulling in the whole set.
declare const process: { exit(code: number): never; argv: string[] }
// `readFileSync`, used by the candidate-file path below, is declared in node-shims.d.ts.

let failures = 0
const fail = (message: string) => {
  failures++
  console.log(`FAIL  ${message}`)
}
const pass = (message: string) => console.log(`PASS  ${message}`)
const section = (title: string) => console.log(`\n=== ${title} ===\n`)
const note = (message: string) => console.log(`      ${message}`)

function countBySeverity(issues: Issue[]) {
  return {
    error: issues.filter((issue) => issue.severity === 'error').length,
    warning: issues.filter((issue) => issue.severity === 'warning').length,
    note: issues.filter((issue) => issue.severity === 'note').length,
  }
}

/**
 * Load a payload and report what came back. Returns the issue list so a caller can
 * assert on it.
 *
 * `'fetched'` rather than `'bundled'` even for the bundled copy, because the fetched
 * path is the one with the "nothing usable → fall back" branch in it, and that branch
 * is worth exercising.
 */
function load(label: string, payload: unknown): Issue[] {
  const { workflows, issues } = initDefinitions(payload, 'fetched')
  const counts = countBySeverity(issues)
  note(
    `${label}: ${workflows.length} workflow${workflows.length === 1 ? '' : 's'} — ` +
      `${counts.error} error / ${counts.warning} warning / ${counts.note} note`,
  )
  // Warnings are printed for every payload, not just failing ones. A warning is the
  // normaliser saying it repaired something, and "it loaded fine" next to an unread
  // repair is how a file quietly stops meaning what its author thought.
  for (const issue of issues.filter((issue) => issue.severity === 'warning')) {
    note(`  warning · ${issue.where}: ${issue.message}`)
  }
  return issues
}

/**
 * Every workflow the catalog can route must produce a model a screen can render.
 *
 * "Usable" is deliberately narrow: a goal metric to bind `{goal_metric}` and at least
 * one measure for the scope panel. Those are the two things whose absence renders a
 * plan with a blank subject, which is the failure this whole layer exists to prevent.
 */
function assertEveryCatalogWorkflowUsable(context: string): void {
  for (const workflow of WORKFLOWS) {
    const semantics = semanticsFor(workflow.name)
    const problems: string[] = []
    if (!semantics.goalMetric || semantics.goalMetric.trim().length === 0) {
      problems.push('no goal metric')
    }
    if (semantics.metrics.length === 0) problems.push('no measures')
    if (!semantics.definition) problems.push('no definition')

    if (problems.length > 0) fail(`${context} · ${workflow.name} — ${problems.join(', ')}`)
    else pass(`${context} · ${workflow.name} → "${semantics.goalMetric}"`)
  }
}

// ---------------------------------------------------------------------------
section('A · the drift guard — ROUTABLE_WORKFLOWS vs the catalog')

{
  const catalog = [...WORKFLOWS.map((workflow) => workflow.name)].sort()
  const declared = [...ROUTABLE_WORKFLOWS].sort()
  const missing = catalog.filter((name) => !declared.includes(name))
  const extra = declared.filter((name) => !catalog.includes(name))

  if (missing.length === 0 && extra.length === 0) {
    pass(`ROUTABLE_WORKFLOWS matches the catalog (${catalog.length} names)`)
  } else {
    if (missing.length > 0) {
      fail(`the catalog has names ROUTABLE_WORKFLOWS lacks: ${missing.join(', ')}`)
    }
    if (extra.length > 0) {
      fail(`ROUTABLE_WORKFLOWS has names the catalog lacks: ${extra.join(', ')}`)
    }
    note('add them to ROUTABLE_WORKFLOWS in src/data/definitionSchema.ts')
  }
}

// ---------------------------------------------------------------------------
section('B · the bundled definitions file')

{
  const issues = load('workflowDefinitions.json', BUNDLED)
  const counts = countBySeverity(issues)

  // The file that ships with the build is the fallback for every other path, so an
  // error in it is a real failure rather than something to report and move past.
  if (counts.error > 0) {
    fail(`the bundled file reports ${counts.error} error(s) — it is the fallback, so it must be clean`)
    for (const issue of issues.filter((i) => i.severity === 'error')) {
      note(`${issue.where}: ${issue.message}`)
    }
  } else {
    pass('the bundled file loads with no errors')
  }

  const declared = allSemantics()
  if (declared.length === 0) fail('the bundled file declares no usable workflows')
  else pass(`${declared.length} declared workflows derive usable semantics`)

  // The focus vocabulary is what lets the resolver recognise "the Business tier". A
  // file whose dimensions carry no values would silently produce an empty one.
  const withoutFocus = declared.filter((s) => s.focusMembers.length === 0)
  if (withoutFocus.length > 0) {
    note(
      `no focus vocabulary for: ${withoutFocus.map((s) => s.definition.name).join(', ')} ` +
        '(their dimensions declare no values)',
    )
  } else {
    pass('every declared workflow contributes a focus vocabulary')
  }

  for (const issue of derivationIssueList().filter((i) => i.severity !== 'note')) {
    note(`derivation · ${issue.where}: ${issue.message}`)
  }
}

// ---------------------------------------------------------------------------
section('C · every catalog workflow renders on the bundled file')

assertEveryCatalogWorkflowUsable('bundled')

// ---------------------------------------------------------------------------
section('D · the stress fixture — errors are the EXPECTED result')

{
  const issues = load('stress-definitions.json', STRESS)
  const counts = countBySeverity(issues)

  // Inverted on purpose. This fixture contains a workflow with no goal.metric and an
  // entry that isn't an object; if it ever loads clean, the tolerance regressed into
  // silence and the honesty mechanism stopped working.
  if (counts.error === 0) {
    fail('the stress fixture reported NO errors — the normaliser has stopped noticing')
  } else {
    pass(`the stress fixture reported ${counts.error} error(s), as designed`)
    for (const issue of issues.filter((i) => i.severity === 'error')) {
      note(`${issue.where}: ${issue.message}`)
    }
  }

  // The point of the whole exercise: a payload this broken still leaves every screen
  // renderable, because the catalog's own workflows fall back to the carried table.
  assertEveryCatalogWorkflowUsable('stressed')
}

// ---------------------------------------------------------------------------
{
  // argv is [node, script, ...args] under the bundled ESM entry.
  const candidate = process.argv.slice(2).find((arg) => arg.endsWith('.json'))
  if (candidate) {
    section(`E · candidate file — ${candidate}`)
    // Imported here rather than at the top so the common path never touches the
    // filesystem, and so a missing @types/node can't affect the default run.
    const { readFileSync } = await import('node:fs')
    const raw: unknown = JSON.parse(readFileSync(candidate, 'utf8'))
    const issues = load(candidate, raw)

    if (countBySeverity(issues).error > 0) {
      note('errors mean those workflows were DROPPED — the app runs, but without them')
      for (const issue of issues.filter((i) => i.severity === 'error')) {
        note(`${issue.where}: ${issue.message}`)
      }
    }
    assertEveryCatalogWorkflowUsable('candidate')

    const unroutable = allSemantics()
      .map((s) => s.definition.name)
      .filter((name) => !(ROUTABLE_WORKFLOWS as readonly string[]).includes(name))
    if (unroutable.length > 0) {
      note(
        `declared but unroutable: ${unroutable.join(', ')} — add to WORKFLOWS in ` +
          'src/data/recipes.ts to make them reachable',
      )
    }
  } else {
    console.log('\n      (pass a path to also check a candidate file: -- path/to/file.json)')
  }
}

// ---------------------------------------------------------------------------
console.log('')
if (failures > 0) {
  console.log(`${failures} FAILED`)
  process.exit(1)
} else {
  console.log('ALL CHECKS PASS — drift guard · bundled · catalog coverage · stress tolerance')
}
