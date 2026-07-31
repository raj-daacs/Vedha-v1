// data/definitionRegistry.ts
// ---------------------------------------------------------------------------
// The one place the loaded business model lives.
//
// It has to be a registry rather than a plain import because the definitions are
// FETCHED at boot from `public/workflows.json`, so that the file can be replaced
// on a built site without rebuilding. The bundled copy in
// `workflowDefinitions.json` is the fallback when that fetch can't happen —
// offline, file://, or a deployment where the file was never dropped in.
//
// ── The ordering constraint, and the tripwire that enforces it ───────────────
// Several modules compute at import time from the definitions: `viewFixtures.ts`
// zips reach values onto declared lifecycle steps, `reducer.ts` reads the default
// workflow. ES imports are hoisted, so if `main.tsx` statically imported `App`
// those modules would evaluate BEFORE the fetch resolved and read an empty
// registry.
//
// `main.tsx` therefore initialises the registry and only then `await import()`s
// the app, which is what defers the whole module graph. That is a real invariant
// and an easy one to break by adding an innocent-looking import, so reading the
// registry before it is initialised THROWS with an explanation rather than
// returning an empty model that would quietly render blank panels.
// ---------------------------------------------------------------------------

import BUNDLED from './workflowDefinitions.json'
import { normaliseDefinitions } from './definitionSchema'
import type { Issue, NormalisedDefinitions, WorkflowDefinition } from './definitionSchema'

/** Where the live definitions came from — shown in the issues banner. */
export type DefinitionSource = 'fetched' | 'bundled'

interface RegistryState extends NormalisedDefinitions {
  source: DefinitionSource
  /**
   * Bumped on every load. Downstream memoisation keys on it, so a re-init — a second
   * `initDefinitions` call, or a candidate file loaded by a script — invalidates every
   * cached derivation instead of serving answers computed from the previous model.
   */
  epoch: number
}

/**
 * State lives on `globalThis`, not in a module-level `let`.
 *
 * HMR replaces a module and re-runs it, which resets module scope — but it does NOT
 * re-run `main.tsx`, so nothing calls `initDefinitions` again. Editing this file (or
 * anything that causes it to reload) would blank the registry while the app kept
 * running, and every consumer would hit the tripwire below until a full refresh.
 *
 * Hanging the state off the global survives the module being swapped. It costs one
 * symbol and removes an entire category of "why is dev broken but a refresh fixes
 * it". Production never reloads a module, so this is invisible there.
 */
const STATE_KEY = Symbol.for('vedha.definitionRegistry')

type GlobalWithRegistry = typeof globalThis & { [STATE_KEY]?: RegistryState | null }
const globalStore = globalThis as GlobalWithRegistry

function readState(): RegistryState | null {
  return globalStore[STATE_KEY] ?? null
}

function writeState(next: RegistryState): RegistryState {
  globalStore[STATE_KEY] = next
  return next
}

function nextEpoch(): number {
  return (readState()?.epoch ?? 0) + 1
}

function requireState(): RegistryState {
  const state = readState()
  if (!state) {
    throw new Error(
      'Workflow definitions read before initDefinitions() ran.\n' +
        'main.tsx must init the registry and THEN dynamically import the app — a static\n' +
        'import of anything that touches the data layer evaluates it too early.\n' +
        'See the note at the top of data/definitionRegistry.ts.',
    )
  }
  return state
}

/**
 * Load a definitions payload. Safe to call more than once; the last call wins.
 *
 * Takes unknown rather than a typed object on purpose — the whole point is that
 * this is handed the contents of a file nobody validated.
 */
export function initDefinitions(raw: unknown, source: DefinitionSource): NormalisedDefinitions {
  const normalised = normaliseDefinitions(raw)

  // A payload with nothing usable in it is worse than the copy we shipped with, so
  // fall back rather than boot an app with no workflows at all.
  if (normalised.workflows.length === 0 && source === 'fetched') {
    const fallback = normaliseDefinitions(BUNDLED)
    return writeState({
      ...fallback,
      source: 'bundled',
      epoch: nextEpoch(),
      issues: [
        ...normalised.issues,
        {
          severity: 'error',
          where: 'file',
          message: 'fetched definitions had no usable workflows; fell back to the bundled copy',
        },
        ...fallback.issues,
      ],
    })
  }

  return writeState({ ...normalised, source, epoch: nextEpoch() })
}

/** Load the copy that shipped with the build. Used by the fallback path and by scripts. */
export function initFromBundled(): NormalisedDefinitions {
  return initDefinitions(BUNDLED, 'bundled')
}

/** The raw bundled payload, for a script that wants to diff against a candidate file. */
export const BUNDLED_DEFINITIONS: unknown = BUNDLED

export function definitionsInitialised(): boolean {
  return readState() !== null
}

/** Which load this is. Cache keys downstream include it. */
export function definitionsEpoch(): number {
  return requireState().epoch
}

export function definitionSource(): DefinitionSource {
  return requireState().source
}

/** Everything the normaliser had to assume, repair or discard. */
export function definitionIssues(): Issue[] {
  return requireState().issues
}

/** Workflow display names, in the order the file declares them. */
export function workflowNames(): string[] {
  return requireState().workflows.map((workflow) => workflow.name)
}

export function allDefinitions(): WorkflowDefinition[] {
  return requireState().workflows
}

/** The definition for a workflow, or undefined if the file doesn't declare it. */
export function findDefinition(workflow: string): WorkflowDefinition | undefined {
  const { byName } = requireState()
  return byName[workflow] ?? byName[workflow.replace(/^./, (c) => c.toUpperCase())]
}
