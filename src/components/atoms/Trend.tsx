// atoms/Trend.tsx
// ---------------------------------------------------------------------------
// A rate over time against the number it's supposed to hit.
//
// The target is drawn coral and dashed because a target you're under is news, not
// decoration — and the area fill under the line makes the gap to it legible at a
// glance rather than requiring the reader to trace two lines.
// ---------------------------------------------------------------------------

import type { TrendData } from '../../compose/viewModels'
import {
  areaPath,
  edgeLabels,
  formatValue,
  horizontalPositions,
  polylinePoints,
  verticalScale,
} from './svgScale'

const W = 470
const H = 220
const LEFT = 46
const RIGHT = 456
const TOP = 30
const BOTTOM = 150
const FLOOR = 190

export function Trend({ data }: { data: TrendData }) {
  const scale = verticalScale(
    data.yTicks,
    TOP,
    BOTTOM,
    data.points.map((point) => point.value),
  )
  const xs = horizontalPositions(data.points.length, LEFT + 14, RIGHT)
  const ys = data.points.map((point) => scale.y(point.value))
  const last = data.points.length - 1

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Trend over time">
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

      {data.target && (
        <>
          <line
            className="chart__target"
            x1={LEFT}
            y1={scale.y(data.target.value)}
            x2={RIGHT}
            y2={scale.y(data.target.value)}
          />
          <text
            className="chart__target-label"
            x={RIGHT - 4}
            y={scale.y(data.target.value) - 6}
            textAnchor="end"
          >
            {data.target.label}
          </text>
        </>
      )}

      <path className="chart__area" d={areaPath(xs, ys, FLOOR)} />
      <polyline className="chart__line" points={polylinePoints(xs, ys)} />
      <circle className="chart__dot" cx={xs[last]} cy={ys[last]} r={4.5} />

      <g className="chart__tick">
        {edgeLabels(data.points).map(({ index, label }) => (
          <text
            key={label}
            x={xs[index]}
            y={FLOOR + 15}
            textAnchor={index === 0 ? 'start' : index === last ? 'end' : 'middle'}
          >
            {label}
          </text>
        ))}
      </g>
    </svg>
  )
}
