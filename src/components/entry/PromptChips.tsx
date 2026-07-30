// PromptChips.tsx
// ---------------------------------------------------------------------------
// The two prompt chips, so the operator never faces a cold blank prompt
// (moodboard: "a warm, context-aware start beats a cold blank prompt").
//
// THEY FOLLOW THE SCOPE. Each workflow declares its own `examplePrompts` pair, so
// the chips change when the workflow does — standing in Monetisation, the offered
// asks are about pricing. This replaces two hand-written cards that named Activation
// and Retention no matter where the operator was standing.
//
// Note what the chips no longer carry: a period. Both prompts for most workflows name
// their own window in words ("this quarter", "last quarter"), and the resolver reads
// it straight out of the text. Stating it twice would give it two places to disagree.
//
// Each chip still passes its workflow explicitly. Today that's the workflow the chips
// were drawn from, so it's a no-op — but it keeps the seam honest: the ask resolves
// against the workflow it will land in, not whatever happens to be selected when the
// dispatch arrives.
// ---------------------------------------------------------------------------

import { getWorkflow } from '../../data/recipes'
import { useApp } from '../../state/AppContext'
import { useAsk } from '../../state/useAsk'

export function PromptChips() {
  const { state } = useApp()
  const ask = useAsk()
  const config = getWorkflow(state.workflow)

  return (
    <>
      <div className="examples__eyebrow">or start from an example</div>
      <div className="examples">
        {config.examplePrompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            className="example"
            onClick={() => ask(prompt, { workflow: config.name })}
          >
            <span className="example__eyebrow">{config.name}</span>
            {prompt}
          </button>
        ))}
      </div>
    </>
  )
}
