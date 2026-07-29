// atoms/NrrCurve.tsx
// ---------------------------------------------------------------------------
// The NRR smile: net revenue retention across cohort age, against the 100% line.
//
// The shape is the point. Churn and contraction pull the curve down early, then
// expansion pulls it back — a healthy base crosses back above 100% and keeps going,
// which is the only way revenue grows without new sales. So the 100% line is drawn
// as a real reference and the trough is annotated: "how deep, and did it come back".
//
// Segments below the line are drawn coral and above accent, so the crossing point
// reads without consulting the axis.
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

  // Drawn segment by segment so each can take the colour of where it sits. A single
  // polyline would have to pick one colour for a line whose whole story is crossing.
  const segments = data.points.slice(1).map((point, index) => ({
    x1: xs[index],
    y1: ys[index],
    x2: xs[index + 1],
    y2: ys[index + 1],
    below: (data.points[index].value + point.value) / 2 < data.baseline.value,
  }))

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
          className={`nrr__segment nrr__segment--${segment.below ? 'below' : 'above'}`}
          // Segment index, so the entrance in view.css traces left to right rather
          // than lighting every segment at once. Presentation only.
          style={{ '--i': index } as CSSProperties}
          x1={segment.x1}
          y1={segment.y1}
          x2={segment.x2}
          y2={segment.y2}
        />
      ))}

      {data.points.map((point, index) => (
        <circle
          key={point.label}
          className={`nrr__dot nrr__dot--${point.value < data.baseline.value ? 'below' : 'above'}`}
          style={{ '--i': index } as CSSProperties}
          cx={xs[index]}
          cy={ys[index]}
          r={index === last ? 4.5 : 2.6}
        />
      ))}

      {data.annotations?.map((annotation) => {
        const index = Math.min(Math.max(annotation.pointIndex, 0), last)
        const above = data.points[index].value < data.baseline.value
        return (
          <text
            key={annotation.text}
            className="nrr__annotation"
            x={xs[index]}
            y={ys[index] + (above ? 20 : -14)}
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
