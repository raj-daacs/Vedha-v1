// atoms/StickinessTrend.tsx
// ---------------------------------------------------------------------------
// A ratio over time against the bar it has to clear.
//
// Distinct from Trend even though both draw a line: the benchmark here is a FLOOR,
// not a goal, so it's drawn neutral rather than coral, and there's no area fill —
// clearing the bar is normal, and shading the whole gap would imply the space above
// it is surplus. What matters is the slope, so the two ends are annotated.
// ---------------------------------------------------------------------------

import type { StickinessTrendData } from '../../compose/viewModels'
import {
  formatValue,
  horizontalPositions,
  polylinePoints,
  verticalScale,
} from './svgScale'

const W = 560
const H = 150
const LEFT = 30
const RIGHT = 540
const TOP = 26
const BOTTOM = 102

export function StickinessTrend({ data }: { data: StickinessTrendData }) {
  const scale = verticalScale(
    [...data.yTicks, data.benchmark.value],
    TOP,
    BOTTOM,
    data.points.map((point) => point.value),
  )
  const xs = horizontalPositions(data.points.length, LEFT, RIGHT)
  const ys = data.points.map((point) => scale.y(point.value))
  const last = data.points.length - 1

  return (
    <svg
      className="chart"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Ratio over time against its benchmark"
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

      <line
        className="chart__benchmark"
        x1={LEFT}
        y1={scale.y(data.benchmark.value)}
        x2={RIGHT}
        y2={scale.y(data.benchmark.value)}
      />
      <text
        className="chart__benchmark-label"
        x={RIGHT}
        y={scale.y(data.benchmark.value) - 6}
        textAnchor="end"
      >
        {data.benchmark.label}
      </text>

      <polyline className="chart__line chart__line--state" points={polylinePoints(xs, ys)} />
      <circle className="chart__dot chart__dot--state" cx={xs[last]} cy={ys[last]} r={4} />

      <g className="chart__tick">
        <text x={LEFT} y={H - 12}>
          {data.startNote}
        </text>
        <text x={RIGHT} y={H - 12} textAnchor="end">
          {data.endNote}
        </text>
      </g>
    </svg>
  )
}
