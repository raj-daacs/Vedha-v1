// atoms/NrrCurve.tsx
// ---------------------------------------------------------------------------
// The NRR smile: net revenue retention across cohort age, against the 100% line.
//
// The shape is the point. Churn and contraction pull the curve down early, then
// expansion pulls it back — a healthy base crosses back above 100% and keeps going,
// which is the only way revenue grows without new sales. So the 100% line is drawn
// as a real reference and the trough is annotated: "how deep, and did it come back".
//
// THE LINE IS SPLIT AT THE TROUGH, not at the 100% crossing. The decay leg is coral
// and the recovery leg accent — so the recovery reads as recovery from the moment it
// turns, even while it is still under 100%.
//
// That distinction is the whole point of the atom. Colouring by position instead of
// by direction would paint the first half of the climb out as failure, which says the
// opposite of what's happening: a cohort going from 87% to 94% is recovering, and
// only the axis can tell you it hasn't cleared the bar yet. Position is what the
// dashed reference line is for; direction is what the colour is for.
// ---------------------------------------------------------------------------

import type { CSSProperties } from 'react'
import type { NrrCurveData } from '../../compose/viewModels'
import { edgeLabels, formatValue, horizontalPositions, verticalScale } from './svgScale'

const W = 560
const H = 190
const LEFT = 40
const RIGHT = 540
const TOP = 24
const BOTTOM = 140

export function NrrCurve({ data }: { data: NrrCurveData }) {
  const scale = verticalScale(
    [...data.yTicks, data.baseline.value],
    TOP,
    BOTTOM,
    data.points.map((point) => point.value),
  )
  const xs = horizontalPositions(data.points.length, LEFT, RIGHT)
  const ys = data.points.map((point) => scale.y(point.value))
  const last = data.points.length - 1
  const baselineY = scale.y(data.baseline.value)

  // Clamped, so a fixture that names a trough off the end of the series still draws
  // something sane rather than an all-one-colour line with no explanation.
  const trough = Math.min(Math.max(data.troughIndex, 0), last)

  // Drawn segment by segment so each can take its leg's colour. A single polyline
  // would have to pick one colour for a line whose whole story is turning around.
  // Segment `index` joins point `index` to `index + 1`, so every segment before the
  // trough is decay and everything from it on is recovery.
  const segments = data.points.slice(1).map((_, index) => ({
    x1: xs[index],
    y1: ys[index],
    x2: xs[index + 1],
    y2: ys[index + 1],
    leg: index < trough ? 'decay' : 'recovery',
  }))

  /** The three points worth a marker: where it bottomed, where it crossed, where it got to. */
  const marked = new Set(
    [trough, data.crossIndex, last].filter((index): index is number => index !== undefined),
  )

  return (
    <svg
      className="chart"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Net revenue retention across cohort age"
    >
      <g className="chart__grid">
        {data.yTicks.map((tick) => (
          <line key={tick} x1={LEFT} y1={scale.y(tick)} x2={RIGHT} y2={scale.y(tick)} />
        ))}
      </g>
      <g className="chart__tick">
        {data.yTicks.map((tick) => (
          <text key={tick} x={LEFT - 6} y={scale.y(tick) + 4} textAnchor="end">
            {formatValue(tick, data.unit)}
          </text>
        ))}
      </g>

      <line className="chart__baseline" x1={LEFT} y1={baselineY} x2={RIGHT} y2={baselineY} />
      {/* Labelled on the left: the right-hand end is where the curve recovers, and
          that's where the recovery annotation needs the room. */}
      <text className="chart__baseline-label" x={LEFT + 4} y={baselineY - 6} textAnchor="start">
        {data.baseline.label}
      </text>

      {segments.map((segment, index) => (
        <line
          key={index}
          className={`nrr__segment nrr__segment--${segment.leg}`}
          // Segment index, so the entrance in view.css traces left to right rather
          // than lighting every segment at once. Presentation only.
          style={{ '--i': index } as CSSProperties}
          x1={segment.x1}
          y1={segment.y1}
          x2={segment.x2}
          y2={segment.y2}
        />
      ))}

      {/* Dots take their leg's colour, and the three that carry the reading are drawn
          larger. Everything else is a tick on the path. */}
      {data.points.map((point, index) => (
        <circle
          key={point.label}
          className={`nrr__dot nrr__dot--${index < trough ? 'decay' : 'recovery'}`}
          style={{ '--i': index } as CSSProperties}
          cx={xs[index]}
          cy={ys[index]}
          r={marked.has(index) ? 4.2 : 2.4}
        />
      ))}

      {/* Annotations sit on the outside of the turn — below the decay leg, above the
          recovery — so neither one lands on top of the line it describes. */}
      {data.annotations?.map((annotation) => {
        const index = Math.min(Math.max(annotation.pointIndex, 0), last)
        const onDecay = index <= trough
        return (
          <text
            key={annotation.text}
            className={`nrr__annotation nrr__annotation--${onDecay ? 'decay' : 'recovery'}`}
            x={xs[index]}
            y={ys[index] + (onDecay ? 20 : -13)}
            textAnchor={index === 0 ? 'start' : index === last ? 'end' : 'middle'}
          >
            {annotation.text}
          </text>
        )
      })}

      <g className="chart__tick">
        {edgeLabels(data.points).map(({ index, label }) => (
          <text
            key={label}
            x={xs[index]}
            y={H - 10}
            textAnchor={index === 0 ? 'start' : index === last ? 'end' : 'middle'}
          >
            {label}
          </text>
        ))}
      </g>
    </svg>
  )
}
