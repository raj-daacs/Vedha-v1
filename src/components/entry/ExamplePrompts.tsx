// ExamplePrompts.tsx
// ---------------------------------------------------------------------------
// Two example asks — one per report family — so the operator never faces a cold
// blank prompt (moodboard: "a warm, context-aware start beats a cold blank prompt").
//
// The eyebrow names the workflow and family the way an operator would say it, and
// each card sets the workflow it describes — the workflow is a hard filter on which
// recipes are reachable, so a card that didn't set one could land nowhere.
//
// INTERIM. Step 4 replaces these two hand-written cards with the two
// `examplePrompts` each workflow declares, so the chips follow the scope.
//
// Note what these no longer carry: a period. Both texts name their own window in
// words ("last quarter", "this month") and the resolver reads it straight out of
// them, tagged `text`. Passing a period alongside would have been asserting the same
// fact twice, with two places for it to go wrong.
// ---------------------------------------------------------------------------

import type { WorkflowName } from '../../data/recipe_schema'
import { useAsk } from '../../state/useAsk'

interface Example {
  eyebrow: string
  text: string
  /** The card states its own workflow rather than borrowing whatever is set. */
  workflow: WorkflowName
}

const EXAMPLES: Example[] = [
  {
    eyebrow: 'Activation · flow',
    text: "Activation trend last quarter, and where we're losing people",
    workflow: 'Activation',
  },
  {
    // Engagement is monitored as a state under Retention — that's the scorecard's
    // home, and the only workflow where its "Product engagement" label is true.
    eyebrow: 'Retention · state',
    text: 'How sticky is the product this month?',
    workflow: 'Retention',
  },
]

export function ExamplePrompts() {
  const ask = useAsk()

  return (
    <>
      <div className="examples__eyebrow">or start from an example</div>
      <div className="examples">
        {EXAMPLES.map((example) => (
          <button
            key={example.text}
            type="button"
            className="example"
            onClick={() => ask(example.text, { workflow: example.workflow })}
          >
            <span className="example__eyebrow">{example.eyebrow}</span>
            {example.text}
          </button>
        ))}
      </div>
    </>
  )
}
