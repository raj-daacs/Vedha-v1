// StepList.tsx
// ---------------------------------------------------------------------------
// The agent's visible reasoning, resolving one line at a time.
//
// Three states per step, from the low-fi: pending (drawn back), active (a pulsing
// dot — this is the one that's working), done (settled, deep accent). The step's
// own `strong` segment carries the payload, so the recipe name lands as emphasis
// rather than as a sentence the reader has to parse.
//
// The trace earns the full height only while it is narrating. Once the plan and its
// beat questions have landed, the operator's attention belongs down there — so the
// steps fold into a one-line summary that still says what was recognised, and stay
// one click away for anyone auditing how the shape was picked.
// ---------------------------------------------------------------------------

import { useEffect, useState } from 'react'
import type { BuildStep } from '../../compose/models'
import { ChevronIcon } from '../shell/Icons'

type StepStatus = 'pending' | 'active' | 'done'

interface Props {
  steps: BuildStep[]
  /** -1 idle, 0..n-1 the active index, n = all resolved. */
  activeIndex: number
  /** True once the plan below has revealed. Until then the trace is not foldable. */
  collapsible?: boolean
}

function statusOf(index: number, activeIndex: number): StepStatus {
  if (index < activeIndex) return 'done'
  if (index === activeIndex) return 'active'
  return 'pending'
}

/** The shape the run recognised — the one thing worth keeping visible when folded. */
function shapeOf(steps: BuildStep[]): string | undefined {
  return steps.find((s) => s.isRecipeStep && s.strong)?.strong
}

export function StepList({ steps, activeIndex, collapsible = false }: Props) {
  const [open, setOpen] = useState(true)

  // Fold once, at the moment the plan arrives. Keyed on the transition rather than
  // on the value, so a reopen by the operator survives every later render.
  useEffect(() => {
    if (collapsible) setOpen(false)
  }, [collapsible])

  const shape = shapeOf(steps)
  const summary = shape
    ? `${steps.length} steps · recognised ${shape}`
    : `${steps.length} steps`

  return (
    <div className={`steps${collapsible ? ' steps--foldable' : ''}`}>
      {collapsible && (
        <button
          type="button"
          className="steps__summary"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="build-steps"
        >
          <span className={`steps__caret${open ? ' steps__caret--open' : ''}`}>
            <ChevronIcon size={13} />
          </span>
          {open ? 'Hide how this was composed' : summary}
        </button>
      )}

      {/* Unmounting would drop the resolved states the operator may come back to
          read, so the list stays mounted and is hidden by CSS instead. */}
      <div id="build-steps" className="steps__list" hidden={collapsible && !open}>
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
    </div>
  )
}
