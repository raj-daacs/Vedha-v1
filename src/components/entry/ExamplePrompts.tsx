// ExamplePrompts.tsx
// ---------------------------------------------------------------------------
// Two example asks — one per report family — so the operator never faces a cold
// blank prompt (moodboard: "a warm, context-aware start beats a cold blank prompt").
//
// The eyebrow names the workflow and family the way an operator would say it, and
// each card sets the context it describes — the workflow is a hard filter on which
// recipes are reachable, so a card that didn't set one could land nowhere.
// ---------------------------------------------------------------------------

import type { Period, WorkflowName } from '../../data/recipe_schema'
import { useAsk } from '../../state/useAsk'

interface Example {
  eyebrow: string
  text: string
  /** The card states its own context — an ask that says "this month" plans against a month. */
  workflow: WorkflowName
  period: Period
}

const EXAMPLES: Example[] = [
  {
    eyebrow: 'Activation · flow',
    text: "Activation trend last quarter, and where we're losing people",
    workflow: 'Activation',
    period: 'quarter',
  },
  {
    // Engagement is monitored as a state under Retention — that's the scorecard's
    // home, and the only workflow where its "Product engagement" label is true.
    eyebrow: 'Retention · state',
    text: 'How sticky is the product this month?',
    workflow: 'Retention',
    period: 'month',
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
            onClick={() =>
              ask(example.text, { workflow: example.workflow, period: example.period })
            }
          >
            <span className="example__eyebrow">{example.eyebrow}</span>
            {example.text}
          </button>
        ))}
      </div>
    </>
  )
}
