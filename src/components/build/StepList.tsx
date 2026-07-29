// StepList.tsx
// ---------------------------------------------------------------------------
// The agent's visible reasoning, resolving one line at a time.
//
// Three states per step, from the low-fi: pending (drawn back), active (a pulsing
// dot — this is the one that's working), done (settled, deep accent). The step's
// own `strong` segment carries the payload, so the recipe name lands as emphasis
// rather than as a sentence the reader has to parse.
// ---------------------------------------------------------------------------

import type { BuildStep } from '../../compose/models'

type StepStatus = 'pending' | 'active' | 'done'

interface Props {
  steps: BuildStep[]
  /** -1 idle, 0..n-1 the active index, n = all resolved. */
  activeIndex: number
}

function statusOf(index: number, activeIndex: number): StepStatus {
  if (index < activeIndex) return 'done'
  if (index === activeIndex) return 'active'
  return 'pending'
}

export function StepList({ steps, activeIndex }: Props) {
  return (
    <div className="steps">
      {steps.map((step, index) => {
        const status = statusOf(index, activeIndex)
        return (
          <div
            key={step.pre + step.strong}
            className={`step step--${status}${step.isRecipeStep ? ' step--recipe' : ''}`}
          >
            <span className="step__dot" />
            <span>
              {step.pre}
              {step.strong && <b className="step__strong">{step.strong}</b>}
              {step.post}
            </span>
          </div>
        )
      })}
    </div>
  )
}
