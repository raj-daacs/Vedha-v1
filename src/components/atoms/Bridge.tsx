// atoms/Bridge.tsx
// ---------------------------------------------------------------------------
// The waterfall: an opening balance, the movements that acted on it, a closing
// balance. "How did we get from there to here."
//
// THE SIGN CARRIES THE COLOUR. A positive delta floats up in the family accent, a
// negative one hangs down in coral — so there is no legend, and no `kind` field on
// the data to disagree with the arithmetic. A movement labelled "Churn" with a
// positive delta would draw as an addition, which is correct: the number is the
// truth, not the word.
//
// EVERYTHING IS DERIVED FROM ONE RUNNING TOTAL. Bar positions, the step-lines, and
// the check that the bars land on the closing anchor all come from the same
// accumulation of `opening + deltas`, so no two parts of the chart can disagree
// about where a bar sits. The fixture states the opening, the deltas and the
// closing; if they don't reconcile, `check:recipes` fails rather than the chart
// quietly drawing a gap.
//
// THE AXIS IS TRUNCATED, DELIBERATELY, and the anchors are not drawn proportional to
// zero — the baseline is the lowest tick the fixture chose. That's the sketch's own
// framing and it's the right call here: the movements on an ARR bridge are 0.18–0.85
// against a 4.2 base, so a zero-based axis would compress every bar that matters into
// a few pixels. The trade is that anchor HEIGHTS can't be compared as ratios, only
// their tops read against the axis — which is why both anchors are labelled with
// their actual balance and the axis is always fully ticked.
// ---------------------------------------------------------------------------

import type { CSSProperties } from 'react'
import type { BridgeData } from '../../compose/viewModels'
import { verticalScale } from './svgScale'

const W = 720
const H = 260
const LEFT = 54
const RIGHT = 706
const TOP = 20
const BASELINE = 186
/** Gap between adjacent bars, in viewBox units. The dashed step-line spans it. */
const GAP = 14
/** A movement of zero would be invisible; give it a hairline so the label has an anchor. */
const MIN_BAR_H = 2

type Kind = 'anchor' | 'add' | 'cut' | 'projected'

interface Bar {
  label: string
  /** Signed delta for a movement; the balance itself for an anchor. */
  display: string
  kind: Kind
  top: number
  height: number
  /** Where the dashed step-line leaving this bar sits. */
  exitY: number
}

function formatBalance(value: number, data: BridgeData): string {
  return `${data.prefix ?? ''}${value.toFixed(2)}${data.suffix ?? ''}`
}

function formatDelta(delta: number): string {
  // A true minus sign, not a hyphen — this is a number, and at 10px the hyphen
  // reads as a dash in the label rather than as a sign on the value.
  const sign = delta < 0 ? '−' : '+'
  return `${sign}${Math.abs(delta).toFixed(2)}`
}

export function Bridge({ data }: { data: BridgeData }) {
  const running = data.movements.reduce<number[]>(
    (acc, movement) => [...acc, acc[acc.length - 1] + movement.delta],
    [data.opening.value],
  )

  const scale = verticalScale(
    data.yTicks,
    TOP,
    BASELINE,
    [data.opening.value, data.closing.value, ...running, ...(data.projected ? [data.projected.value] : [])],
  )

  const anchor = (label: string, value: number, kind: Kind): Bar => ({
    label,
    display: formatBalance(value, data),
    kind,
    top: scale.y(value),
    height: BASELINE - scale.y(value),
    exitY: scale.y(value),
  })

  const bars: Bar[] = [
    anchor(data.opening.label, data.opening.value, 'anchor'),
    ...data.movements.map((movement, index): Bar => {
      const before = scale.y(running[index])
      const after = scale.y(running[index + 1])
      // A rise means a smaller y, so the top is whichever end is higher on screen.
      const top = Math.min(before, after)
      return {
        label: movement.label,
        display: formatDelta(movement.delta),
        kind: movement.delta < 0 ? 'cut' : 'add',
        top,
        height: Math.max(Math.abs(after - before), MIN_BAR_H),
        exitY: after,
      }
    }),
    anchor(data.closing.label, data.closing.value, 'anchor'),
    ...(data.projected ? [anchor(data.projected.label, data.projected.value, 'projected')] : []),
  ]

  const slot = (RIGHT - LEFT) / bars.length
  const barW = slot - GAP
  const x = (index: number) => LEFT + index * slot

  return (
    <svg
      className="chart"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`${data.opening.label} ${formatBalance(data.opening.value, data)} to ${data.closing.label} ${formatBalance(data.closing.value, data)}`}
    >
      <g className="chart__grid">
        {data.yTicks.map((tick) => (
          <line key={tick} x1={LEFT} y1={scale.y(tick)} x2={RIGHT} y2={scale.y(tick)} />
        ))}
      </g>
      <g className="chart__tick">
        {data.yTicks.map((tick) => (
          <text key={tick} x={LEFT - 6} y={scale.y(tick) + 4} textAnchor="end">
            {`${data.prefix ?? ''}${tick.toFixed(1)}${data.suffix ?? ''}`}
          </text>
        ))}
      </g>

      {/* Step-lines first, so the bars sit over them rather than the reverse. Each
          spans the gap at the level the NEXT bar starts from, which is what makes the
          floating bars read as one continuous descent. */}
      {bars.slice(0, -1).map((bar, index) => {
        // The projected bar is an alternative ending, not the next step in the walk,
        // so nothing steps into it.
        if (bars[index + 1].kind === 'projected') return null
        return (
          <line
            key={`step-${index}`}
            className="bridge__step"
            style={{ '--i': index } as CSSProperties}
            x1={x(index) + barW}
            y1={bar.exitY}
            x2={x(index + 1)}
            y2={bar.exitY}
          />
        )
      })}

      {bars.map((bar, index) => (
        <g
          key={`${bar.label}-${index}`}
          className={`bridge__bar bridge__bar--${bar.kind}`}
          // Bar index, for the staggered entrance in view.css. Presentation only.
          style={{ '--i': index } as CSSProperties}
        >
          <rect x={x(index)} y={bar.top} width={barW} height={bar.height} rx={3} />
          <text className="bridge__label" x={x(index) + barW / 2} y={BASELINE + 20} textAnchor="middle">
            {bar.label}
          </text>
          <text className="bridge__value" x={x(index) + barW / 2} y={BASELINE + 34} textAnchor="middle">
            {bar.display}
          </text>
        </g>
      ))}

      <line className="bridge__baseline" x1={LEFT} y1={BASELINE} x2={RIGHT} y2={BASELINE} />
    </svg>
  )
}
