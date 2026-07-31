// atoms/ResponseCurve.tsx
// ---------------------------------------------------------------------------
// Revenue as a function of price. The response family's signature.
//
// Every other atom here plots an outcome against TIME (trend, cohort age, bridge
// walk) or against a BENCHMARK (scorecard). This one plots an outcome against a
// LEVER — which is the whole reason the response family exists as a third shape and
// not a variant of the other two.
//
// THE FINDING IS THE GAP. Revenue rises with price until churn overtakes the list
// gain, so the curve is an inverted U with a peak somewhere. Two vertical markers:
// where the price is now, and where revenue peaks. The distance between them is the
// entire recommendation, so those two lines get the emphasis and nothing else does.
// The sketch is explicit about resisting further annotation, and it's right — a third
// marker would make the reader hunt for which one matters.
//
// THE PEAK IS DERIVED, never declared. It's the argmax of the curve, computed here,
// so the emphasised marker cannot sit anywhere the data doesn't peak. Same rule as
// Funnel finding its own worst step and NrrCurve its own trough: if it can be
// computed from the series, it is not the fixture's business to assert it.
// ---------------------------------------------------------------------------

import type { CSSProperties } from 'react'
import type { ResponseCurveData } from '../../compose/viewModels'
import { verticalScale } from './svgScale'

const W = 720
const H = 250
const LEFT = 56
const RIGHT = 704
const TOP = 18
const BASELINE = 196

export function ResponseCurve({ data }: { data: ResponseCurveData }) {
  const prices = data.curve.map((point) => point.price)
  const minPrice = Math.min(...prices)
  const maxPriceOnAxis = Math.max(...prices)
  const priceSpan = maxPriceOnAxis - minPrice || 1

  const x = (price: number) => LEFT + ((price - minPrice) / priceSpan) * (RIGHT - LEFT)
  const scale = verticalScale(
    data.yTicks,
    TOP,
    BASELINE,
    data.curve.map((point) => point.revenue),
  )

  // The peak, computed. `reduce` rather than a sort so ties keep the LOWER price:
  // if two price points yield the same revenue, recommending the cheaper one is the
  // strictly safer call — same money, less churn risk.
  const peak = data.curve.reduce((best, point) => (point.revenue > best.revenue ? point : best))

  // Where the current price sits ON the curve, so its dot lands on the line rather
  // than floating at an interpolated height.
  const current = data.curve.reduce((closest, point) =>
    Math.abs(point.price - data.currentPrice) < Math.abs(closest.price - data.currentPrice)
      ? point
      : closest,
  )

  const line = data.curve.map((point) => `${x(point.price)},${scale.y(point.revenue)}`).join(' ')

  // The region past the peak, closed down to the baseline. Faint on purpose — it marks
  // territory rather than making a measurement.
  const pastPeak = data.curve.filter((point) => point.price >= peak.price)
  const riskArea =
    pastPeak.length > 1
      ? `M${pastPeak.map((p) => `${x(p.price)},${scale.y(p.revenue)}`).join(' L')} ` +
        `L${x(pastPeak[pastPeak.length - 1].price)},${BASELINE} L${x(peak.price)},${BASELINE} Z`
      : ''

  const priceLabel = (value: number) => `${data.prefix ?? ''}${value}`

  return (
    <svg
      className="chart"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Revenue response to price. Currently ${priceLabel(data.currentPrice)}, revenue peaks at ${priceLabel(peak.price)}.`}
    >
      <g className="chart__grid">
        {data.yTicks.map((tick) => (
          <line key={tick} x1={LEFT} y1={scale.y(tick)} x2={RIGHT} y2={scale.y(tick)} />
        ))}
      </g>

      {/* Real axes, unlike the other charts here. A lever needs its own axis drawn:
          the reader has to see that the horizontal is price and not time, or they'll
          read the curve as a trend that goes up and then falls over. */}
      <line className="resp__axis" x1={LEFT} y1={TOP} x2={LEFT} y2={BASELINE} />
      <line className="resp__axis" x1={LEFT} y1={BASELINE} x2={RIGHT} y2={BASELINE} />

      {data.yAxisLabel && (
        <text
          className="resp__axis-label"
          x={LEFT - 12}
          y={(TOP + BASELINE) / 2}
          textAnchor="middle"
          transform={`rotate(-90 ${LEFT - 12} ${(TOP + BASELINE) / 2})`}
        >
          {data.yAxisLabel}
        </text>
      )}
      {data.xAxisLabel && (
        <text className="resp__axis-label" x={(LEFT + RIGHT) / 2} y={H - 6} textAnchor="middle">
          {data.xAxisLabel}
        </text>
      )}

      {riskArea && <path className="resp__risk" d={riskArea} />}
      {data.riskNote && pastPeak.length > 1 && (
        <text
          className="resp__risk-note"
          x={(x(peak.price) + RIGHT) / 2}
          y={(TOP + BASELINE) / 2 + 24}
          textAnchor="middle"
        >
          {data.riskNote}
        </text>
      )}

      <polyline className="resp__curve" points={line} />

      {/* Current price — quiet. It's the starting point, not the finding. */}
      <line className="resp__marker resp__marker--now" x1={x(current.price)} y1={TOP} x2={x(current.price)} y2={BASELINE} />
      <circle className="resp__dot resp__dot--now" cx={x(current.price)} cy={scale.y(current.revenue)} r={4.5} />
      <text className="resp__label resp__label--now" x={x(current.price)} y={BASELINE + 16} textAnchor="middle">
        now {priceLabel(data.currentPrice)}
      </text>

      {/* The peak — emphasised. This is the one thing the chart is for. */}
      <line className="resp__marker resp__marker--peak" x1={x(peak.price)} y1={TOP} x2={x(peak.price)} y2={BASELINE} />
      <circle
        className="resp__dot resp__dot--peak"
        style={{ '--i': 1 } as CSSProperties}
        cx={x(peak.price)}
        cy={scale.y(peak.revenue)}
        r={5.5}
      />
      <text className="resp__peak-label" x={x(peak.price)} y={scale.y(peak.revenue) - 12} textAnchor="middle">
        rev-max {priceLabel(peak.price)}
      </text>
      <text className="resp__label resp__label--peak" x={x(peak.price)} y={BASELINE + 16} textAnchor="middle">
        {priceLabel(peak.price)}
      </text>
    </svg>
  )
}
