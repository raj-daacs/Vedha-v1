// atoms/RankedBars.tsx
// ---------------------------------------------------------------------------
// Segments ranked against their own average.
//
// The average line is what turns a bar chart into an answer: it says which
// segments are the drag rather than merely which is smallest. It's COMPUTED from
// the bars, so it can't disagree with them.
//
// Colour is by rank, not by threshold — best in accent, worst in coral, the rest
// mid-tone — because the question this atom answers is always "which one is the
// problem", and rank is what answers it.
// ---------------------------------------------------------------------------

import type { CSSProperties } from 'react'
import type { RankedBarsData } from '../../compose/viewModels'
import { formatValue, mean } from './svgScale'

const W = 620
const ROW_H = 46
const BAR_H = 26
const BAR_LEFT = 130
const BAR_MAX = 300
const AXIS_H = 26

export function RankedBars({ data }: { data: RankedBarsData }) {
  const average = mean(data.bars.map((bar) => bar.value))
  const maxValue = Math.max(...data.bars.map((bar) => bar.value), average)
  const scaleX = (value: number) => (value / maxValue) * BAR_MAX

  const height = data.bars.length * ROW_H + AXIS_H
  const averageX = BAR_LEFT + scaleX(average)

  // Rank once so both the fill and the "◀ the drag" note agree.
  const worstValue = Math.min(...data.bars.map((bar) => bar.value))
  const bestValue = Math.max(...data.bars.map((bar) => bar.value))

  return (
    <svg
      className="chart"
      viewBox={`0 0 ${W} ${height}`}
      role="img"
      aria-label="Ranked comparison against the average"
    >
      <line className="ranked__avg" x1={averageX} y1={8} x2={averageX} y2={height - AXIS_H} />
      <text className="ranked__avg-label" x={averageX} y={height - 8} textAnchor="middle">
        {data.averageLabel ?? 'avg'} {formatValue(Math.round(average), data.unit)}
      </text>

      {data.bars.map((bar, index) => {
        const y = index * ROW_H + 12
        const tone =
          bar.value === worstValue ? 'worst' : bar.value === bestValue ? 'best' : 'mid'
        return (
          <g
            key={bar.label}
            className={`ranked__row ranked__row--${tone}`}
            // Row index, for the staggered entrance in view.css. Presentation only.
            style={{ '--i': index } as CSSProperties}
          >
            <text className="ranked__label" x={0} y={y + 18}>
              {bar.label}
            </text>
            <rect
              className="ranked__bar"
              x={BAR_LEFT}
              y={y}
              width={scaleX(bar.value)}
              height={BAR_H}
              rx={5}
            />
            <text className="ranked__value" x={BAR_LEFT + scaleX(bar.value) + 8} y={y + 18}>
              {formatValue(bar.value, data.unit)}
            </text>
            {tone === 'worst' && (
              <text
                className="ranked__note"
                x={BAR_LEFT + scaleX(bar.value) + 48}
                y={y + 18}
              >
                ◀ the drag
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
