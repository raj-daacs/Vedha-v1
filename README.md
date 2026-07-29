# Vedha — clickable prototype

A decision-intelligence layer for operators running a B2B SaaS business.

> A data analyst that already knows your business — pick your workspace, tell it what
> you want to know, and it builds the view.

**This is a prototype, not a product.** No backend, no database, no auth, no network
calls. Every figure is illustrative. It exists to make the interaction model and the
composition architecture concrete enough to build against.

---

## Run it

```bash
npm install
npm run dev            # http://localhost:5173
```

| script | what it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | typecheck + production build to `dist/` |
| `npm run check:recipes` | sanity-checks the recipe matcher and the data invariants |
| `npm run preview` | serve the built `dist/` locally |

**Deploy:** it's a static Vite build — `npm run build` and serve `dist/`. On Vercel or
Netlify, point the project at this repo with build command `npm run build` and output
directory `dist`; no environment variables, no server runtime.

Stack: Vite + React + TypeScript. Dependencies are **`react` and `react-dom`** — that's
the whole list. Charts are hand-rolled SVG; styling is plain CSS with custom
properties. Roughly 8k lines including comments.

---

## The one thing to understand first

**Nothing about a report's shape is hardcoded in a component.** The app has four
*recipes* (report shapes) across five *workspaces*, in two *families* — and one set of
screens renders all of them. A recipe is data; the screens render a model.

```
                    ┌─ composeBuild() ─▶ BuildModel ─▶ <BuildScreen/>
recipe              ├─ composePlan()  ─▶ PlanModel  ─▶ <PlanBlock/>
  + context    ─────┼─ composeView()  ─▶ ViewModel  ─▶ <InsightView/>
  + semantics       ├─ composeDeepen()─▶ DeepenModel─▶ <DeepenPanel/>
                    └─ composeEditA() ─▶ EditAModel ─▶ <EditIntentModal/>
```

`src/compose/` is **the only place in the codebase that knows a family exists.** This
is enforceable and enforced — see [Family-blindness](#family-blindness-the-core-guarantee).

### The three layers

**1 · `src/data/` — the recipe layer.** This is the interesting part.

| file | what it is |
|---|---|
| `recipeTypes.ts` | Port of `vedha_recipe_schema.ts`. A `Recipe` declares a family, a spine, a trigger, and an ordered list of `Beat`s. |
| `recipes.ts` | The four recipes, transcribed from `vedha_recipes.yaml`. Also `WORKSPACE_RECIPES` — which shapes each workspace can produce. |
| `selectRecipe.ts` | `selectRecipe(intent, workspace) → Recipe \| null`. |
| `semanticModel.ts` | What Vedha "already knows": per-workspace goal metric, measures, dimensions, states, benchmarks. |
| `viewFixtures.ts` | The illustrative content behind the rendered views and the deepen answers. |
| `workspaces.ts` | The five workspaces, plus level / output / period. |

**2 · `src/compose/` — the composers.** Turn a recipe plus context into display
models. Pure functions; same inputs always give the same model. `useComposition()` is
the single doorway from app state into this layer, so components never look a recipe up.

**3 · `src/components/` — the screens.** Render models. `src/components/atoms/` holds
the seven chart atoms. Nothing here imports the recipe book.

State is one reducer plus one context (`src/state/`). Anything derivable — the build
steps, the plan, the view, the deepen answer — is composed at render rather than
cached, so there is exactly one source of truth and nothing to invalidate.

---

## How selection works

**The selected workspace is authoritative.** `WORKSPACE_RECIPES` decides which recipes
are eligible; free text only refines *within* that set. Text can never pull the
operator into a shape their workspace doesn't render.

```ts
Acquisition   ['funnel_conversion']
Activation    ['funnel_conversion', 'cohort_longitudinal']
Retention     ['cohort_longitudinal', 'state_scorecard']
Expansion     ['movement_bridge']
Monetisation  ['movement_bridge']
```

Scoring within the eligible set: **+10** per whole `intent_signal` phrase in the ask,
**+2** per distinct word overlap; `FLOOR = 2`. Below the floor:

- **one eligible shape + an on-domain ask → take it.** The workspace is authoritative,
  so a shapeless-but-analytical ask means "analyse what I'm looking at". This is why
  *"show me this month status"* on Acquisition is a funnel, not a scorecard.
- **two eligible shapes → no-match**, and the Entry panel asks again. Guessing between
  two plausible readings is how an operator gets a plan they didn't ask for.

*On-domain* = the ask contains vocabulary from any recipe's signals or from the
workspace's semantic model. Timeframe words don't count (`TIME_WORDS`), so a bare
*"this month"* is a no-match — naming a period isn't asking a question.

Either way `selectRecipe` returns `suggestedWorkspaces` — where the same text *would*
have landed — so the UI can offer "did you mean Retention?". **Not rendered yet.**

> **Run `npm run check:recipes` after touching signals, weights, or the map.** 24 cases
> plus data invariants. Retuning one signal can silently re-route an unrelated ask;
> this is what catches it.

---

## Family-blindness — the core guarantee

Two report families: **flow** (funnel / bridge / cohort — has an input→work→output
spine) and **state** (scorecard — no spine, the four questions collapse toward "where
do we stand"). The thesis is that these are *the same product bending to two report
shapes*, not two tools.

That's a property of the code, not a claim in a doc:

```bash
grep -rn "=== 'funnel'\|=== 'state'\|=== 'flow'\|family ===\|'funnel_conversion'\|'state_scorecard'\|'cohort_longitudinal'\|'movement_bridge'" src/components/
# → ZERO HITS
```

The only `family` reference in the whole component tree is a CSS passthrough:

```tsx
// src/components/shell/AppShell.tsx
const { family } = useComposition()
<main className="stage" data-family={family}>
```

`tokens.css` repoints the `--accent*` aliases from teal to purple off that attribute.
**Component stylesheets reference only the aliases**, never `--teal-*` or `--purple-*`.

### How the bend happens without a branch

Every difference is read off a field the recipe *declared about itself*:

| what bends | what decides it |
|---|---|
| the spine strip | `SpineDecl.input`/`.work`/`.output` — absent ⇒ empty array |
| the scope facets | which `SpineDecl` fields exist at all |
| "① Where we stand **vs benchmark**" | `spine.benchmark` is declared |
| the plan label | derived spine is empty |
| whether optional beats show | `Beat.optional` + `Recipe.four_question_fit` |
| which sections a view has | a fixture exists for that beat |
| panel layout | `panels.length` |

A state family collapses **because it has no spine to declare.** Nothing asks its name.

One rule that isn't obvious from the design files: a required beat renders full; an
optional beat renders **thin** when `four_question_fit` is `collapse`, and is otherwise
dropped. That's why the funnel plan shows 3 beats and the scorecard shows 4 (two drawn
back) — the scorecard's own `narration_note` says *"why/ahead/do go thin"*, so there
the thinning *is* the finding.

**If you find yourself writing `if (family === …)` in a component, stop.** Move the
decision into a composer and hand the component a model.

---

## The layout invariant

**The Insight View's content column is rigid.** Its rendered width must be identical
whether the deepen panel is open or closed. Opening the panel may *reposition* the
column; it must never resize, reflow, or deform it. This bug was fixed twice before
the rigid column landed.

```
.view-wrap     flex row · position:relative
  .view-scroll flex:1 · min-width:0 · overflow:auto   ← the only elastic box
    .view      width: var(--view-col) · margin:0 auto ← RIGID
  .deepen      flex sibling — can only take room from the container
```

`.view` takes its width from a token, never from available space, so there is no path
by which panel state reaches it. **Never give `.view` `width:100%`, `max-width`,
`flex-grow`, or a percentage.** There is also deliberately no viewport media query
inside a section card — the column is rigid, so inner width is constant.

The panel **overlays by default** (out of flow, so it cannot squeeze anything) and only
becomes a pushing flex sibling above `1460px`, where there's demonstrably room for
`820 + 400` beside the 236px rail. Measured:

| window | mode | closed | open |
|---|---|---|---|
| 1600px | push (`static`) | **820px** | **820px** (recentres, left 508 → 308) |
| 1100px | overlay (`absolute`) | **820px** | **820px** (container stays 864px) |

**The same rule governs the view's assembly animation.** Pending sections stay *in
flow* at `opacity: 0` with a `translateY`, so document height is final from the first
frame — measured constant at `scrollHeight 1875` and `.view` at `820px` across every
frame of the sequence. Only `opacity`, `transform` and (on strokes)
`stroke-dashoffset` animate. **Bars grow with `transform: scaleX`, never `width`.** The
one rule in the codebase that transitions `width` is `.deepen` itself, by design.

---

## The loop, end to end

**Entry** → **Build** → **Plan** → **Insight View**, with deepening and two edit modes.

1. **Entry.** Pick a workspace and period, type an ask (or use an example card). The
   command bar is the front door and never leaves.
2. **Build.** The agent narrates: four steps resolve one at a time on a 720ms
   interval, with *"Recognising the shape → [recipe]"* as the hero beat. Deliberately
   not a spinner.
3. **Plan.** The composed plan you approve before anything is built: recipe badge,
   intent + context chips, the scope panel derived from the recipe, and the beats.
   Spine-first for a flow; spineless and collapsed for a state.
4. **Insight View.** The built artifact — it *persists* in the stage; there is no chat
   thread beneath it. It **assembles**: the spine lays down, then each section arrives
   in walk order 140ms apart, with the line charts tracing and the bars growing from
   their baseline. Driven by `useViewBuildSequence` off a `viewStep` counter, so it
   replays on "Build view" and after an Edit-A re-plan, and it is family-blind — the
   hook only ever sees a section count.
5. **Deepen.** Selecting any section opens a right-side panel scoped to that question;
   **Ask about this view** opens it at whole-view scope. Answers are **ephemeral** until
   **＋ Add to view** promotes one onto the view as a section.
6. **Edit A** (the dashed `✎ intent` chip, or **Edit intent**) — revise the ask,
   workspace, period or level, or pick a different eligible shape. Re-plan goes through
   the *same* `SUBMIT_INTENT` path the front door uses, so the narrated build replays
   and may land on a different family entirely.
7. **Edit B** (`✎ scope` on a beat) — toggle which semantic reads one beat is scoped
   to. That beat's spec re-resolves live through `composePlan`; the rest of the plan
   stays put. There's no "Re-resolve" button because the re-resolve already happened as
   you toggled.

### The three rendered views

| workspace · recipe | sections |
|---|---|
| Activation · funnel | trend vs target + cohort-maturation matrix · full onboarding funnel with the worst step marked · ranked segment bars. Spine strip. |
| Retention · scorecard | levels · stickiness ratios flagged vs benchmark · stickiness trend vs the benchmark line. No spine, titled "Product engagement". |
| Retention · cohort | the NRR smile curve + headline stat · the retention/NRR matrix. Spine strip. |

### Adding a view

Two data edits, no component changes:

1. Add `VIEW_FIXTURES['<Workspace>:<recipe_id>']`, keyed by beat id, with a `deepen`
   answer per section plus `root`.
2. Reuse an atom, or add one to `PanelSpec` + `Panel` — the union is exhaustive, so a
   missing case is a type error rather than a blank panel.

**One `CohortMatrix`, two matrices.** It serves both the activation maturation grid and
the retention NRR grid, parameterised by data, axis labels, legend text and colour
scale (`sequential` for "more is better"; `divergent` around a neutral midpoint for
NRR, where 100% is *held* rather than average). Periods that haven't happened yet are
`null`, which draws the dashed triangle. **Don't add a second matrix component.**

---

## Illustrative vs. real

**Real** — the architecture, and worth trusting:

- The recipe schema and the four recipes, transcribed from `vedha_recipes.yaml`.
- `selectRecipe` — a genuine matcher with a documented scoring model and a test table.
- The compose layer, and the family-blindness it enforces.
- Every *derived* figure in a view is computed from one series, so no two numbers can
  disagree: the 47% headline is the mean of the weekly series; funnel pass-rates and
  the worst step come from `reach`; the ranked average from the bars; DAU/MAU from the
  level tiles; the NRR trough and recovery month from the curve.

**Illustrative** — plausible numbers standing in for a data layer:

- Everything in `semanticModel.ts` and `viewFixtures.ts`.
- All deepen answers. The real dialogue is a later skill; this builds the container.
- The confidence stamps say "from your data", but there is no data.

---

## Known scope edges

**Plan-deep pairs.** Acquisition · funnel, Activation · cohort, Expansion · bridge and
Monetisation · bridge compose a real plan and then show an honest "the rendered view is
rolling out" placeholder. Nothing lists them — a pair is plan-deep precisely when
`VIEW_FIXTURES` has no entry for it.

**The Output selector doesn't shape anything.** The design source is internally
inconsistent: the Entry chip reads `Output: Report` while the picker below it lists
"quick answer · review · readout". All four are in the union and the default is
`Report` so the chip matches the design — but `Report` and `Readout` still overlap
semantically, and Output only renders. The natural job for it is deciding which
optional beats survive (quick answer = required only, readout = everything), using the
`optional` + `include_when` fields the recipes already carry.

**Forward-looking stubs.** `Save` and `Share` in the view header are presentational —
the affordances belong to an artifact and the header reads wrong without them, but
nothing is saved or shared. The panel's `ask about this part…` box is an inert
placeholder for the same reason: an input that looks live and does nothing is worse
than an obvious placeholder.

**`suggestedWorkspaces` is computed but not rendered.** The no-match state says "be
more specific" when it could say "did you mean Monetisation?". Needs a `CommandPanel`
change.

**`ramps.ts` restates token colours.** An SVG `fill` can't interpolate a CSS custom
property and heat cells are computed per value, so the ramp endpoints are the one place
that duplicates `tokens.css`. **If a token colour changes, change it there too.**

**`displayLabel` is guarded twice.** `state_scorecard` renders as "Product engagement"
only under Retention. `subjectOf()` gates on `displayLabelWorkspace`, *and*
`WORKSPACE_RECIPES` makes it unreachable elsewhere; `check:recipes` asserts the second.

**Not built, deliberately:** the saved-views index (the rail's "Your views", Search and
Settings show placeholders), real data, real dialogue, any backend.

---

## Matcher soft spot

With `FLOOR = 2` and +2 per word, a *single* incidental word clears the floor. On the
two two-shape workspaces that can pick the wrong one of the two. The workspace filter
caps the damage — never a shape from another workspace, so the header can't contradict
the context pill. If it bites, require a phrase hit or ≥2 overlaps whenever more than
one recipe is eligible.

---

## Design provenance

Built from the Claude Design handoff `# Vedha Core Loop Design`, plus:

| source | role |
|---|---|
| `vedha_full_flow_lowfi.html` | interaction and layout source of truth |
| `vedha_insight_view_activation.html` | fidelity target for rendered views |
| `Vedha Core Loop.dc.html` | the hi-fi frame set |
| `vedha_design_brief.md`, `vedha_moodboard_shell.md` | tokens, vocabulary, interaction rules |
| `vedha_recipe_schema.ts`, `vedha_recipes.yaml` | the recipe layer |
| `vedha_prototype_scope.md` | scope of record, selection spec |

Where the source was silent (hover states, focus rings) the lightest consistent thing
was added and marked with a comment. Where two sources disagreed, the low-fi won on
behaviour and the hi-fi on visuals.

Interaction rules from the brief that must not regress: the Insight View is an artifact
that persists, not a message; the deepen panel repositions the content column rather
than resizing it; deepen answers are ephemeral until promoted; confidence is stated
honestly; and internal machinery — atom ids, gap tags, schema fields, routing names —
never reaches the UI.
