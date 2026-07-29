// atoms/Funnel.tsx
// ---------------------------------------------------------------------------
// The whole funnel, with the leaking step marked.
//
// Two numbers per row and they say different things: `reach` is how much of the
// original population is still here, `pass` is how many of the previous step's
// survivors made it through. The second is what identifies a leak — a step can look
// fine on reach and still be the worst gate in the funnel.
//
// Both the pass rates and the worst step are COMPUTED from `reach`, so the flagged
// step can't be wrong and can't go stale when the fixture changes.
// ---------------------------------------------------------------------------

import type { CSSProperties } from 'react'
import type { FunnelData } from '../../compose/viewModels'

const W = 720
const ROW_H = 42
const BAR_H = 26
const LABEL_W = 145
const BAR_LEFT = 150
const BAR_MAX = 500

interface Row {
  label: string
  reach: number
  /** Share of the previous step that got through. Undefined for the first step. */
  pass?: number
  isWorst: boolean
  isLast: boolean
}

/** Derive pass rates and find the leak. The fixture only states `reach`. */
function deriveRows(steps: FunnelData['steps']): Row[] {
  const passes = steps.map((step, index) =>
    index === 0 ? undefined : Math.round((step.reach / steps[index - 1].reach) * 100),
  )

  const observed = passes.filter((pass): pass is number => pass !== undefined)
  const worst = observed.length > 0 ? Math.min(...observed) : undefined

  // First occurrence only: if two steps tie on the worst rate, marking both would
  // say "look here" twice and point nowhere.
  const worstIndex = worst === undefined ? -1 : passes.indexOf(worst)

  return steps.map((step, index) => ({
    label: step.label,
    reach: step.reach,
    pass: passes[index],
    isWorst: index === worstIndex,
    isLast: index === steps.length - 1,
  }))
}

export function Funnel({ data }: { data: FunnelData }) {
  const rows = deriveRows(data.steps)
  const height = rows.length * ROW_H + 8
  const maxReach = Math.max(...rows.map((row) => row.reach))

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${height}`} role="img" aria-label="Funnel by step">
      {rows.map((row, index) => {
        const y = index * ROW_H + 12
        const barW = (row.reach / maxReach) * BAR_MAX
        const tone = row.isWorst ? 'worst' : row.isLast ? 'final' : 'step'

        return (
          <g
            key={row.label}
            className={`funnel__row funnel__row--${tone}`}
            // Row index, for the staggered entrance in view.css. Presentation only.
            style={{ '--i': index } as CSSProperties}
          >
            <text className="funnel__label" x={0} y={y + 18}>
              {row.label}
            </text>
            <rect className="funnel__bar" x={BAR_LEFT} y={y} width={barW} height={BAR_H} rx={5} />
            <text className="funnel__reach" x={BAR_LEFT + barW + 8} y={y + 18}>
              {row.reach}%
            </text>

            {row.pass !== undefined && (
              <text className="funnel__pass" x={W - 8} y={y + 18} textAnchor="end">
                {row.pass}% pass
                {row.isWorst ? ' ◀ worst step' : row.isLast && data.finalNote ? ` · ${data.finalNote}` : ''}
              </text>
            )}
          </g>
        )
      })}
      <line className="funnel__rule" x1={LABEL_W} y1={4} x2={LABEL_W} y2={height - 8} />
    </svg>
  )
}
