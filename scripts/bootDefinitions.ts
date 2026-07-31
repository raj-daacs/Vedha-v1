// scripts/bootDefinitions.ts
// ---------------------------------------------------------------------------
// Load the bundled business definitions, as an import side effect.
//
// This exists to be imported FIRST by the check scripts. It is a whole module for one
// function call because ES imports are hoisted above statements: a script cannot load
// the registry in its own body early enough for modules that compute at import time,
// but it CAN put the loading inside a module and import that module first, because
// module evaluation follows import order.
//
// The browser doesn't need this — `main.tsx` fetches `public/workflows.json` and then
// dynamically imports the app, which achieves the same ordering a different way.
// ---------------------------------------------------------------------------

import { initFromBundled } from '../src/data/definitionRegistry'

initFromBundled()
