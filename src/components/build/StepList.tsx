// StepList.tsx
// ---------------------------------------------------------------------------
// The agent's visible reasoning, resolving one line at a time.
//
// Two live states per step: active (a pulsing dot — this is the one that's working)
// and done (settled, deep accent). The step's own `strong` segment carries the
// payload, so the recipe name lands as emphasis rather than as a sentence the reader
// has to parse.
//
// NO LOOKAHEAD, ON PURPOSE — AND THIS REVERSES AN EARLIER DECISION. Every step used
// to render up front, drawn back at 45% opacity, "so the operator can see what's
// coming". That is a fair thing to want and it costs the sequence its whole premise:
// an agent that has already printed step four is an agent that decided all four
// before it started, and the eye reads that instantly. Steps now appear as they
// begin. `step--pending` is kept in the stylesheet, unused by this component, because
// a paused or queued run is a plausible future caller.
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

  // `activeIndex` is -1 before the first step and `steps.length` once every one has
  // resolved, so this covers both ends without a special case.
  const revealCount = Math.min(Math.max(activeIndex + 1, 0), steps.length)
  const narrating = activeIndex >= 0 && activeIndex < steps.length

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
      <div
        id="build-steps"
        // `--live` scopes the entrance animation to the run itself. Without it,
        // unfolding a finished trace would replay all four lines arriving, which
        // claims work is happening when the plan is already on screen.
        className={`steps__list${narrating ? ' steps__list--live' : ''}`}
        hidden={collapsible && !open}
      >
        {steps.slice(0, revealCount).map((step, index) => {
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
                {/* Only on the line being worked. Decorative — the pulsing dot already
                    carries the same fact to a screen reader via step order. */}
                {status === 'active' && <i className="step__caret" aria-hidden="true" />}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
