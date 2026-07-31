# Vedha — clickable prototype

A decision-intelligence layer for operators running a B2B SaaS business.

> A data analyst that already knows your business — set your scope, tell it what
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
| `npm run typecheck` | `tsc --noEmit` — covers `src/` **and** `scripts/` |
| `npm run build` | typecheck + production build to `dist/` |
| `npm run check:recipes` | 55 resolver cases plus the structural invariants |
| `npm run preview` | serve the built `dist/` locally |

**Deploy:** it's a static Vite build — `npm run build` and serve `dist/`. On Vercel or
Netlify, point the project at this repo with build command `npm run build` and output
directory `dist`; no environment variables, no server runtime.

Stack: Vite + React + TypeScript. Runtime dependencies are **`react` and
`react-dom`** — that's the whole list. Charts are hand-rolled SVG; styling is plain
CSS with custom properties. Roughly 9.4k lines across 62 files, including comments.

---

## The two things to understand first

### 1 · Resolution comes before composition

There are two stages, and everything downstream of the first one is unchanged by it:

```
picks  ─┐
        ├─▶  A · RESOLVE  ─▶  {recipe, output, period, focus}  ─▶  B · COMPOSE  ─▶  view
text   ─┘    resolve.ts        + a source per field                the recipe layer
```

**Stage A** merges what the operator *picked* (altitude · workflow · output · period)
with what they *typed* into one fully-specified query, filling any gap with the
sensible default for that scope — and recording what it assumed.

> "Say as much or as little as you like. What you pick sets the scope; what you type
> refines it; anything you leave out, Vedha fills with the sensible default for that
> scope — and tells you what it assumed."

Two consequences worth stating plainly, because both correct earlier mistakes:

- **Output is never restricted.** All four outputs are selectable at every workflow. A
  workflow's `outputDefault` decides what is *pre-selected*, never what is *allowed*.
- **The text is never required to be a precise command.** If the operator has picked
  Activation and typed "how was this month", they've said enough. The scope carries
  the query. `resolve()` has no no-match answer.

**Stage B** is the recipe layer, and it is family-blind.

### 2 · Nothing about a report's shape is hardcoded in a component

The app has five *recipes* (report shapes) across eight *workflows*, in three
*families* — and one set of screens renders all of them. A recipe is data; the screens
render a model.

```
                    ┌─ composeBuild() ─▶ BuildModel ─▶ <BuildScreen/>
recipe              ├─ composePlan()  ─▶ PlanModel  ─▶ <PlanBlock/>
  + context    ─────┼─ composeView()  ─▶ ViewModel  ─▶ <InsightView/>
  + semantics       ├─ composeDeepen()─▶ DeepenModel─▶ <DeepenPanel/>
                    └─ composeEditA() ─▶ EditAModel ─▶ <EditIntentModal/>
```

`src/compose/` is **the only place in the codebase that knows a family exists.** This
is enforceable and enforced — see [Family-blindness](#family-blindness-the-core-guarantee).

---

## The three layers

**1 · `src/data/` — the recipe layer and the resolver.** This is the interesting part.

| file | what it is |
|---|---|
| `recipe_schema.ts` | The type definitions, **verbatim from the eng handoff**. A `Recipe` declares a family, a spine, a trigger, and an ordered list of `Beat`s. Also the scope model (`Altitude`, `WorkflowName`, `Output`, `Period`) and `ResolvedQuery`. |
| `recipes.ts` | **Verbatim from the handoff.** The five recipes, the eight-workflow scope catalog, and the resolver cue tables. |
| `resolve.ts` | `resolve(picks, text) → ResolvedQuery`. Stage A. The four precedence rules. |
| `textScoring.ts` | How much a piece of text looks like a request for a given shape. The scoring model, with published weights. |
| `scope.ts` | What a picker needs and the schema doesn't provide: option arrays and display labels. |
| `semanticModel.ts` | What Vedha "already knows": per-workflow goal metric, measures, dimensions, states, benchmarks, focus members. **Derived from the business definitions file** — see below. |
| `definitionSchema.ts` | The shape of the business model, and a normaliser that **accepts anything**. Returns a usable model plus a list of everything it had to assume, repair or discard. |
| `definitionRegistry.ts` | The one place the loaded business model lives. Fetched at boot, with the bundled copy as fallback. |
| `workflowDefinitions.json` | **Owned by the business team.** The goal metric, measure tiers, dimensions and values, and lifecycle steps for each workflow. |
| `viewFixtures.ts` | The illustrative content behind the rendered views and the deepen answers. |

> **`recipe_schema.ts` and `recipes.ts` are replaced wholesale on every drop from
> eng.** Don't edit them to add prototype conveniences — that's what `scope.ts` and
> `resolve.ts` are for. `resolve.ts`'s `BARE_PERIOD_CUES` is an example: a documented
> supplement living outside the files that get overwritten.
>
> **`workflowDefinitions.json` is replaced wholesale by the business team**, for the
> same reason and with a different owner. Nothing in `src/` may assume it is the file
> the code was written against — see the next section.

### The business definitions file

`workflowDefinitions.json` is the source of record for **what each workflow measures**.
The recipe catalog stays the source of record for **where a workflow sits and which
shapes it can produce**. Two owners, two files, one direction of flow:

```
workflowDefinitions.json  →  semanticsFor()  →  WorkflowSemantics  →  composers
   (business team)            (derivation)       (the derived view)
```

`WorkflowSemantics` is unchanged from when it was a static table, so `composePlan`,
`composeView`, `resolve` and `textScoring` never learn that a file exists.

**It is swappable at runtime.** `main.tsx` fetches `public/workflows.json` before it
imports the app, so replacing that file on a built site and hard-refreshing runs the
prototype on a new business model with no rebuild. The copy at
`src/data/workflowDefinitions.json` is the fallback for when the fetch can't happen.

**Nothing in the data layer throws on bad data.** `normaliseDefinitions` accepts
anything and reports what it had to assume; every lookup has a stated fallback. A
prototype that white-screens on a data edit is worse than useless to the person doing
the editing. The dev-only banner in the bottom-left corner is that report — it names
which file is live and lists every assumption. **Run `npm run check:definitions -- your-file.json`
before dropping a new file in.**

Three things the JSON does *not* decide, each for a stated reason:

| not from the file | why | where it lives |
|---|---|---|
| altitude | the catalog already carries `level`, and eligibility depends on it. A second source would drift. | `recipes.ts` |
| `balance` / `states` / `benchmarks` | the file has no field for them, and a benchmark's **threshold** is what makes it a bar to judge against. Inventing one would put a made-up number beside real ones. | `CARRIED` in `semanticModel.ts` |
| a workflow the file omits | `Cost & Burn` is routable and undeclared. `CARRIED` stands in whole so picking it still renders. | `CARRIED` in `semanticModel.ts` |

`ROUTABLE_WORKFLOWS` in `definitionSchema.ts` duplicates the catalog's names as bare
strings, because the data layer must not import the recipe layer. Duplicated constants
rot, so `check:definitions` asserts the two still agree.

**2 · `src/compose/` — the composers.** Turn a recipe plus context into display
models. Pure functions; same inputs always give the same model. `useComposition()` is
the single doorway from app state into this layer, so components never look a recipe up.

**3 · `src/components/` — the screens.** Render models. `src/components/atoms/` holds
the seven chart atoms. Nothing here imports the recipe book.

State is one reducer plus one context (`src/state/`). Anything derivable — the build
steps, the plan, the view, the deepen answer — is composed at render rather than
cached, so there is exactly one source of truth and nothing to invalidate.

---

## The scope catalog

**Altitude gates workflow; workflow gates recipe.** A workflow belongs to exactly one
altitude, so picking an altitude cascades — the workflow list changes, and the
untouched output/period defaults move with it.

| altitude | workflow | eligible recipes | primary | output | period |
|---|---|---|---|---|---|
| Financial | P&L | `movement_bridge` | — | Review | quarter |
| Company | Revenue engine | `movement_bridge` | — | Review | month |
| Company | Cost & Burn | `state_scorecard` | — | Review | month |
| Functional | Acquisition | `funnel_conversion` | — | Report | week |
| Functional | **Activation** | `funnel_conversion` · `cohort_longitudinal` | funnel | Report | week |
| Functional | **Retention** | `cohort_longitudinal` · `state_scorecard` | cohort | Report | month |
| Functional | Expansion | `movement_bridge` | — | Report | quarter |
| Functional | Monetisation | `price_sensitivity` | — | Report | quarter |

**The recipe is determined by the workflow everywhere except the two bold rows.** Six
of the eight workflows render one shape, so the text has nothing to disambiguate
there — it only refines period and focus. This is why no-match is not merely rare but
absent: a vague ask resolves to the scope's primary lens, which is a defensible
default rather than a guess.

---

## How resolution works

Four fields, each with its own precedence rule. The governing principle: **the more
deliberate signal wins.**

| field | precedence | source |
|---|---|---|
| **recipe** | 1 · one eligible shape → that one, whatever the text says | `default` |
| | 2 · text names an eligible shape *confidently* | `text` |
| | 3 · two eligible and the text didn't choose → the **primary**, flagged | `default` |
| **output** | 1 · explicit chip pick · 2 · text cue · 3 · scope default | `picked` → `text` → `default` |
| **period** | 1 · text date phrase · 2 · explicit chip · 3 · workflow clock | `text` → `picked` → `default` |
| **focus** | text only — `by <dimension>`, or a named member. Optional. | `text` |

**The one asymmetry to remember:** for **output** the explicit chip beats a text cue (a
deliberate structured pick outranks a fuzzy word); for **period** the text date phrase
beats the chip (a written "this month" is the most deliberate statement of *when*
there is).

**Why single-eligible reports `default` even when the text names the shape squarely:**
the text cannot have *chosen* what was the only option. Crediting the operator with a
decision they never had to make would be a small lie, and six of the eleven spec cases
are exactly this situation.

### Confidence, and the floor

Scoring within the eligible set: **+10** per whole `intent_signal` phrase in the ask,
**+2** per distinct word overlap; `FLOOR = 2`.

Clearing the floor is enough when one shape is eligible — where it's also meaningless,
since there's nothing to choose. **Choosing between two shapes needs more: a whole
phrase, or at least two distinct words.** A single incidental word clears `FLOOR` on
its own, which used to make *"how's retention doing"* read as a confident request for
a cohort curve rather than the vague ask it is.

### Off-domain means the text contributed *nothing*

Not merely that it named no shape. *"board readout of the quarter"* names no metric,
but it sets the output and the period — that's a scope-refining ask, and flagging it
*"was that your question?"* would be nonsense. Only text that landed nowhere at all
(`"what's the weather"`) earns the `off_domain_text` flag.

> **Run `npm run check:recipes` after touching signals, weights, cue tables or the
> catalog.** 55 cases plus the structural invariants. Retuning one signal can silently
> re-route an unrelated ask; this is what catches it.

---

## Resolution is always shown, and correctable

Because the resolver fills gaps with defaults, it must never do so silently. The Build
step restates the query in plain words, marks each value's source, and makes every
assumption tappable:

> I'll work through a `report` on `Retention`, for `this month` — using the `cohort`.
> ▪ picked ▪ from your words ▪ assumed — tap to change

Blue for a deliberate pick, accent for something read from the text, **dashed amber for
an assumption** — and every amber chip is a button that opens Edit A. Two notes sit
under it when needed: one names the shape *not* taken (read off the workflow's own
eligible list), and one fires only for text that landed nowhere and asks outright.

The recognition step tracks how the shape was actually reached: *"Recognising the
shape → Funnel"* only when the text named it, *"Taking the shape for this scope →
Cohort"* when the scope decided. Claiming recognition for a default is the exact
overstatement this surface exists to prevent.

**Defaulting is safe precisely because it's surfaced.** `composeBuild.ts` decides what
counts as assumed; `ResolutionLine.tsx` is handed segments and draws a chip per
source, so a component cannot get that judgement wrong.

---

## Family-blindness — the core guarantee

Three report families:

- **flow** — funnel / bridge / cohort. An `input → work → output` spine.
- **state** — scorecard. No spine; the four questions collapse toward "where do we stand".
- **response** — price sensitivity. A `lever → response → constraint` spine, and the
  four questions *extend* toward "what do we do".

The thesis is that these are *the same product bending to three report shapes*, not
three tools. That's a property of the code, not a claim in a doc:

```bash
grep -rnE "family *===|=== *['\"](flow|state|response)['\"]|['\"](funnel_conversion|\
cohort_longitudinal|state_scorecard|movement_bridge|price_sensitivity)['\"]|\.family\b|Family\b" \
  src/components/
# → ZERO HITS
```

Run it against `src/compose/` and `src/data/` as a control — it should hit there. A
zero from a pattern that never fires anywhere proves nothing.

The only *executable* family reference in the whole component tree is a CSS
passthrough:

```tsx
// src/components/shell/AppShell.tsx
const { family } = useComposition()
<main className="stage" data-family={family}>
```

`tokens.css` repoints the `--accent*` aliases off that attribute — teal for flow,
purple for state, bronze for response.

**Inside the `data-family` subtree, stylesheets must reference only the aliases** —
`plan.css`, `view.css` and `build.css`, the three that bend. The shell and Entry
(`shell.css`, `entry.css`, `global.css`) use `--teal-*` directly and should: they sit
*outside* that subtree, where teal is the brand rather than the flow accent, and Entry
has no recipe yet to have a family.

```bash
grep -n "var(--teal\|var(--purple\|var(--bronze" src/styles/{plan,view,build}.css
# → one hit, and it is a known bug:
#   view.css:499  .ranked__row--mid .ranked__bar { fill: var(--teal-mid) }
```

That one is latent rather than visible: `RankedBars` currently renders only in
Activation · funnel, a flow view where `--accent` *is* teal. But the `--best` bar above
it uses `var(--accent)` and bends, so the first time a ranked chart appears in a state
or response view, best goes purple/bronze while mid stays teal. Fixing it properly
means adding an `--accent-mid` alias with purple and bronze mid-steps — there is no
such alias today, which is why the raw token got used.

### How the bend happens without a branch

Every difference is read off a field the recipe *declared about itself*:

| what bends | what decides it |
|---|---|
| the spine strip | whichever triplet `SpineDecl` declares — absent ⇒ empty array |
| the scope facets | whether a spine was derived at all |
| "① Where we stand **vs benchmark**" | `trigger.goal_metric_kind` names a benchmark |
| the plan label | derived spine is empty |
| the build's step 1 | `trigger.shape` |
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

### The three re-derivations

The current schema dropped `spine.rendered_as`, `spine.state` and `spine.benchmark`,
which three composers read. Each is now derived from a field the schema *does* declare:

| gone | now derived from |
|---|---|
| `spine.rendered_as` | `trigger.shape` |
| `spine.benchmark` | `trigger.goal_metric_kind` contains "benchmark" — one exported helper, `judgedAgainstBenchmark()`, so the plan's facet and the view's heading can't disagree |
| `spine.state` | the derived spine is empty |

**`deriveSpine()` maps BOTH triplets** — `input/work/output` *and*
`lever/response/constraint` — onto the same three emphases. This is load-bearing: read
only the flow triplet and `price_sensitivity` comes back spineless, gets rendered as
the state it isn't, and is captioned "not a flow you run". After it, **an empty spine
means the scorecard and nothing else** — which is what lets spine-emptiness safely
carry the whole state-family bend. Asserted in `check:recipes` section D.

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
frame. Only `opacity`, `transform` and (on strokes) `stroke-dashoffset` animate.
**Bars grow with `transform: scaleX`, never `width`.** The one rule in the codebase
that transitions `width` is `.deepen` itself, by design.

---

## The loop, end to end

**Entry** → **Build** → **Plan** → **Insight View**, with deepening and two edit modes.

1. **Entry.** Set your scope and type an ask (or click a prompt chip). The command bar
   is the front door and never leaves.

   Four chips, each opening **only its own dimension** — a chip reading "Output:
   Report" that opened a list of workflows would be lying about what it does.
   *Altitude* comes first because it gates the workflow list, and each altitude names
   the workflows it reaches. *Workflow* carries the accent: it's the pick that decides
   which questions are askable. *Output* offers all four everywhere, marking the
   scope's own as "usual for <workflow>". *Period* exists mainly so the operator
   **can** be deliberate — without it, the "explicit pick" tier of the period rule
   would be unreachable.

   Two **prompt chips** per workflow, from that workflow's declared `examplePrompts`,
   so they follow the scope: standing in Monetisation, the offered asks are about
   pricing.

2. **Build.** The agent narrates: four steps resolve one at a time on a 720ms
   interval. Above them, the resolved query restated and sourced. Deliberately not a
   spinner.
3. **Plan.** The composed plan you approve before anything is built: recipe badge,
   intent + context chips, the scope panel derived from the recipe, and the beats.
   Spine-first for a flow or a response; spineless and collapsed for a state.
4. **Insight View.** The built artifact — it *persists* in the stage; there is no chat
   thread beneath it.

   It **assembles, as if being written**. The spine lays down, then each section
   arrives in walk order ~440ms apart (`VIEW_STAGGER_MS`) — and each section composes
   *internally*: heading → what it measures → the number → the chart drawing → and the
   **takeaway last**, after the evidence it's drawn from. A three-section view settles
   in about 2.3s. Timings live in `motion.ts` and the cascade delays in `view.css`;
   `VIEW_STAGGER_MS` is the one knob for overall pace.

   Driven by `useViewBuildSequence` off a `viewStep` counter, so it replays on "Build
   view" and after an Edit-A re-plan. Family-blind — the hook only ever sees a beat
   count.
5. **Deepen.** Selecting any section opens a right-side panel scoped to that question;
   **Ask about this view** opens it at whole-view scope. Answers are **ephemeral** until
   **＋ Add to view** promotes one onto the view as a section.
6. **Edit A** (the dashed `✎ intent` chip, **Edit intent**, or *any amber chip in the
   restatement*) — revise the ask, workflow, altitude or period, or pick a different
   eligible shape. Re-plan goes through the *same* `SUBMIT_INTENT` path the front door
   uses, so the narrated build replays and may land on a different family entirely.
7. **Edit B** (`✎ scope` on a beat) — toggle which semantic reads one beat is scoped
   to. That beat's spec re-resolves live through `composePlan`; the rest of the plan
   stays put. There's no "Re-resolve" button because the re-resolve already happened as
   you toggled.

### The three rendered views

| workflow · recipe | sections |
|---|---|
| Activation · funnel | trend vs target + cohort-maturation matrix · full onboarding funnel with the worst step marked · ranked segment bars. Spine strip. |
| Retention · scorecard | levels · stickiness ratios flagged vs benchmark · stickiness trend vs the benchmark line. No spine, titled "Product engagement". |
| Retention · cohort | the NRR smile curve + headline stat · the retention/NRR matrix. Spine strip. |

### Adding a view

Two data edits, no component changes:

1. Add `VIEW_FIXTURES['<Workflow>:<recipe_id>']`, keyed by beat id, with a `deepen`
   answer per section plus `root`.
2. Reuse an atom, or add one to `PanelSpec` + `Panel` — the union is exhaustive, so a
   missing case is a type error rather than a blank panel.

`check:recipes` section F asserts that every fixture key addresses beats that exist,
that every rendered section is deepenable, and that the pair is reachable at all.
**This matters more than it sounds:** when the recipe layer was replaced, every beat id
changed, and all three views silently became empty shells — header and spine drawing,
sections absent. Typecheck can't see it, because fixture keys are `Record<string, _>`.

**One `CohortMatrix`, two matrices.** It serves both the activation maturation grid and
the retention NRR grid, parameterised by data, axis labels, legend text and colour
scale (`sequential` for "more is better"; `divergent` around a neutral midpoint for
NRR, where 100% is *held* rather than average). Periods that haven't happened yet are
`null`, which draws the dashed triangle. **Don't add a second matrix component.**

---

## Illustrative vs. real

**Real** — the architecture, and worth trusting:

- The recipe schema, the five recipes and the scope catalog, verbatim from the handoff.
- `resolve()` — a genuine resolver implementing the spec's four precedence rules,
  validated against the spec's own eleven test cases.
- `textScoring` — a keyword/signal matcher with a documented scoring model.
- The compose layer, and the family-blindness it enforces.
- Every *derived* figure in a view is computed from one series, so no two numbers can
  disagree: the 47% headline is the mean of the weekly series; funnel pass-rates and
  the worst step come from `reach`; the ranked average from the bars; DAU/MAU from the
  level tiles; the NRR trough and recovery month from the curve.

**Illustrative** — plausible numbers standing in for a data layer:

- Everything in `viewFixtures.ts`, and the `balance` / `states` / `benchmarks` in
  `semanticModel.ts`'s `CARRIED` table. `Cost & Burn` is invented outright — it is the
  one routable workflow the business file doesn't declare.
- **Not** the goal metrics, measure tiers, dimensions or lifecycle steps. Those come
  from `workflowDefinitions.json`, which the business team wrote about their own model.
- All deepen answers. The real dialogue is a later skill; this builds the container.
- The confidence stamps say "from your data", but there is no data.

---

## Known scope edges

**Semantic loading is wired, but to a file rather than to a warehouse.**
`semanticsFor(workflow)` derives from the loaded business definitions and stays
synchronous. The fetch moved *up*, to `main.tsx`, because the file is one document
describing the whole business — reading it once at boot beats eight per-workflow round
trips for one payload. `loadSemanticsFor` survives as a pass-through for the day the
real product does fetch per workflow.

**The lifecycle fork is parsed and not shown.** Activation declares two motions —
`self-serve · PLG` and `sales-led · CS-guided`, the second marked `assumption: true` —
and only the first reaches the funnel. The banner reports it. Rendering the fork, with
the assumed path marked as unobserved, is the obvious next move.

**`journey_note` is parsed and not shown.** `P&L` and `Monetisation` each carry one, and
they are exactly the two workflows with no funnel — so the note is the answer to "why is
there no funnel here", currently going unread.

**Seven of the ten workflow·recipe pairs are plan-deep** — they compose a real plan and
then show an honest "the rendered view is rolling out" placeholder. Nothing lists them;
a pair is plan-deep precisely when `VIEW_FIXTURES` has no entry for it. `check:recipes`
prints the current list on every run so it stays a decision rather than a drift.

**Output is resolved but doesn't shape the plan.** It has real precedence rules, is
stated in the restatement, and picks the sentence's verb — but it does not yet decide
*which beats survive*. That's the natural job for it: quick answer = required beats
only, readout = everything, using the `optional` + `include_when` fields the recipes
already carry.

**No cross-workflow suggestion.** The old matcher computed where an ask *would* have
landed, so the no-match state could say "did you mean Retention?". With no-match gone,
so is that: the resolver answers within the chosen workflow and says what it assumed.
Pointing an operator at a different workflow would be a genuinely useful feature and
would need building fresh.

**Forward-looking stubs.** `Save` and `Share` in the view header are presentational —
the affordances belong to an artifact and the header reads wrong without them, but
nothing is saved or shared. The panel's `ask about this part…` box is an inert
placeholder for the same reason: an input that looks live and does nothing is worse
than an obvious placeholder.

**`ramps.ts` restates token colours.** An SVG `fill` can't interpolate a CSS custom
property and heat cells are computed per value, so the ramp endpoints are the one place
that duplicates `tokens.css`. **If a token colour changes, change it there too.**

**`displayLabel` is guarded once, and checked.** `state_scorecard` renders as "Product
engagement" only under Retention. It's now eligible under **Cost & Burn** too, so the
old structural guarantee — reachable from exactly one workflow — no longer holds;
`subjectOf()`'s gate on `displayLabelWorkspace` is what keeps the label honest.
`check:recipes` section E verifies the rendered subject in *every* reachable workflow
rather than asserting single reachability.

**Not built, deliberately:** the saved-views index (the rail's "Your views", Search and
Settings show placeholders), real data, real dialogue, any backend.

---

## Design provenance

Built from the Claude Design handoff `# Vedha Core Loop Design`, plus:

| source | role |
|---|---|
| `vedha_scope_resolution.html` | the resolver spec — Stage A, the four precedence rules, the eleven test cases |
| `recipe_schema.ts`, `recipes.ts` | the recipe layer and the scope catalog, dropped in verbatim |
| `vedha_full_flow_lowfi.html` | interaction and layout source of truth |
| `vedha_insight_view_activation.html` | fidelity target for rendered views |
| `Vedha Core Loop.dc.html` | the hi-fi frame set |
| `vedha_design_brief.md`, `vedha_moodboard_shell.md` | tokens, vocabulary, interaction rules |
| `vedha_prototype_scope.md` | scope of record |

Where the source was silent (hover states, focus rings) the lightest consistent thing
was added and marked with a comment. Where two sources disagreed, the low-fi won on
behaviour and the hi-fi on visuals.

One deliberate departure: the spec's example restatement states the output twice — *"I'll
review Activation … as a review"*. Making the output chip the object of the verb —
*"I'll run a review of Activation"* — says it once and still lets the sentence change
shape with the output.

Interaction rules from the brief that must not regress: the Insight View is an artifact
that persists, not a message; the deepen panel repositions the content column rather
than resizing it; deepen answers are ephemeral until promoted; confidence is stated
honestly; assumptions are always visible and correctable; and internal machinery —
atom ids, beat ids, schema fields, output ids, routing names — never reaches the UI.
