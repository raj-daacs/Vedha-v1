import { createRoot } from 'react-dom/client'
import { initDefinitions, initFromBundled } from './data/definitionRegistry'

// Order matters: tokens define the custom properties everything else consumes.
import './styles/tokens.css'
import './styles/global.css'
import './styles/shell.css'
import './styles/entry.css'
import './styles/build.css'
import './styles/plan.css'
import './styles/view.css'

// ---------------------------------------------------------------------------
// BOOT — load the business model, THEN the app.
//
// `public/workflows.json` is the drop-in file: replace it on a built site, hard
// refresh, and the app runs on the new model with no rebuild. The copy bundled at
// `src/data/workflowDefinitions.json` is the fallback for when that can't be
// fetched — offline, `file://`, or a deploy where nobody dropped the file in.
//
// ── Why the app is imported dynamically ─────────────────────────────────────
// Modules under `data/` compute at import time from the loaded definitions, and
// `reducer.ts` reads a default workflow before the first render. ES imports are
// hoisted, so a plain `import App from './App'` at the top of this file would
// evaluate that whole graph BEFORE the fetch resolved, against an empty registry.
//
// `await import('./App')` after `initDefinitions` is what defers it. NOTHING ABOVE
// THIS COMMENT MAY IMPORT ANYTHING THAT TOUCHES THE DATA LAYER. Break that and the
// registry throws with an explanation rather than rendering blank panels — see
// `data/definitionRegistry.ts`.
// ---------------------------------------------------------------------------

/** A same-origin static asset, not a backend. No server runtime is involved. */
const DEFINITIONS_URL = `${import.meta.env.BASE_URL}workflows.json`

async function loadDefinitions(): Promise<void> {
  try {
    // `cache: no-store` so a replaced file is picked up on refresh rather than served
    // from the disk cache — the whole point is to swap it without a rebuild.
    const response = await fetch(DEFINITIONS_URL, { cache: 'no-store' })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    initDefinitions(await response.json(), 'fetched')
  } catch (error) {
    // Not an alarm: the bundled copy is a real answer and the banner says which one is
    // live. A fetched file that parses but has nothing usable is the case worth
    // shouting about, and the registry reports that one separately.
    initFromBundled()
    console.info(
      '[vedha] using the bundled workflow definitions — no drop-in file could be read: ' +
        `${(error as Error).message}`,
    )
  }
}

async function boot(): Promise<void> {
  const container = document.getElementById('root')
  if (!container) throw new Error('#root not found')

  await loadDefinitions()

  // Dynamic, and only now — see the note above.
  const [{ StrictMode }, { default: App }] = await Promise.all([import('react'), import('./App')])

  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void boot()
