// scripts/node-shims.d.ts
// ---------------------------------------------------------------------------
// The one node API the check scripts use, declared by hand.
//
// The project carries no `@types/node`: its dependency list is deliberately tiny and
// nothing under `src/` needs them, so pulling in the whole set to read one file would
// be a poor trade. `checkDefinitions.ts` needs `readFileSync` for its candidate-file
// mode, and that is the entire surface.
//
// This has to be a `.d.ts` rather than a `declare module` inside the script. A file
// with imports IS a module, so `declare module 'node:fs'` there is read as an
// AUGMENTATION of an existing module — and augmenting something unresolvable is an
// error (TS2664). An ambient declaration in its own declaration file creates the
// module instead of extending it.
//
// `process` is declared locally in each script instead, because each needs a different
// slice of it and a shared global would let a script reach for members it never
// checked were there.
// ---------------------------------------------------------------------------

declare module 'node:fs' {
  export function readFileSync(path: string, encoding: 'utf8'): string
}
