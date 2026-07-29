// atoms/CohortMatrix.tsx
// ---------------------------------------------------------------------------
// ONE matrix, used by both cohort views. There is deliberately no second matrix
// component — the Design left this as a build job, and the two uses differ only in
// data, labels and colour semantics, never in structure:
//
//   Activation · maturation   rows = signup weeks, cols = weeks since signup,
//                             sequential 25→55 — "how far has each week activated?"
//   Retention  · NRR smile    rows = signup months, cols = months since start,
//                             divergent around 100 — "does the base hold, dip, recover?"
//
// Both are "cohorts × periods-since-start, with a triangle of periods that haven't
// happened yet". That triangle is expressed as `null` values, so neither caller has
// to pass an elapsed window.
//
// It renders real values: every cell carries its computed number, both axes are
// labelled, and the legend states what the colour means.
// ---------------------------------------------------------------------------

import type { CohortMatrixData } from '../../compose/viewModels'
import { cellFill, cellInk } from './ramps'
import { formatValue } from './svgScale'

// viewBox geometry. Cell width flexes with the column count so a 13-month matrix
// stays inside the same column as an 8-week one.
const ROW_LABEL_W = 58
const HEADER_H = 20
const ROW_H = 16
const ROW_GAP = 1
const AXIS_H = 20
const MIN_CELL_W = 26
const MAX_CELL_W = 46
/**
 * Target viewBox width. Smaller than the column it renders into on purpose: the SVG
 * scales to its container, so a tighter viewBox makes the cell labels render LARGER.
 * Tuned so an 8-column matrix in a split section lands at roughly 1:1.
 */
const TARGET_W = 340

export function CohortMatrix({ data }: { data: CohortMatrixData }) {
  const columnCount = data.columnLabels.length
  const cellW = Math.max(
    MIN_CELL_W,
    Math.min(MAX_CELL_W, (TARGET_W - ROW_LABEL_W) / Math.max(columnCount, 1)),
  )
  const gridW = cellW * columnCount
  const width = ROW_LABEL_W + gridW
  const height = HEADER_H + data.rows.length * (ROW_H + ROW_GAP) + AXIS_H

  // Only show a cell's number when there's room for it — a 26px cell can hold "104"
  // but the label would collide at anything narrower.
  const showValues = cellW >= 24

  return (
    <div className="matrix">
      <svg
        className="matrix__svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Cohort matrix: ${data.rowAxisLabel ?? 'cohorts'} by ${data.columnAxisLabel}`}
      >
        {data.rowAxisLabel && (
          <text className="matrix__axis" x={0} y={10}>
            {data.rowAxisLabel}
          </text>
        )}

        {data.columnLabels.map((label, column) => (
          <text
            key={label}
            className="matrix__col"
            x={ROW_LABEL_W + column * cellW + cellW / 2}
            y={HEADER_H - 5}
            textAnchor="middle"
          >
            {label}
          </text>
        ))}

        {data.rows.map((row, rowIndex) => {
          const y = HEADER_H + rowIndex * (ROW_H + ROW_GAP)
          return (
            <g key={row.label}>
              <text className="matrix__row" x={0} y={y + ROW_H - 4}>
                {row.label}
              </text>

              {data.columnLabels.map((_, column) => {
                const value = row.values[column] ?? null
                const x = ROW_LABEL_W + column * cellW

                // Not observed yet: an outline, not a fill. The empty triangle in
                // the top-right IS the information — those cohorts are still young.
                if (value === null) {
                  return (
                    <rect
                      key={column}
                      className="matrix__cell matrix__cell--unobserved"
                      x={x}
                      y={y}
                      width={cellW - 2}
                      height={ROW_H}
                      rx={2}
                    />
                  )
                }

                const fill = cellFill(value, data.scale)
                return (
                  <g key={column}>
                    <rect x={x} y={y} width={cellW - 2} height={ROW_H} rx={2} fill={fill} />
                    {showValues && (
                      <text
                        className="matrix__value"
                        x={x + (cellW - 2) / 2}
                        y={y + ROW_H - 4.5}
                        textAnchor="middle"
                        fill={cellInk(fill)}
                      >
                        {formatValue(value, data.unit)}
                      </text>
                    )}
                  </g>
                )
              })}
            </g>
          )
        })}

        <text className="matrix__axis" x={ROW_LABEL_W} y={height - 6}>
          {data.columnAxisLabel}
        </text>
      </svg>

      <MatrixLegend data={data} />
    </div>
  )
}

/**
 * States what the colour means. Three sampled swatches plus the dashed outline —
 * a heat grid without this is a decoration, not a reading.
 */
function MatrixLegend({ data }: { data: CohortMatrixData }) {
  const { scale } = data
  const stops =
    scale.kind === 'divergent'
      ? [scale.min, scale.midpoint, scale.max]
      : [scale.min, (scale.min + scale.max) / 2, scale.max]

  return (
    <div className="matrix__legend">
      <span className="matrix__legend-group">
        <span className="matrix__legend-text">{data.legend.lowLabel}</span>
        {stops.map((stop, index) => (
          <span
            key={index}
            className="matrix__swatch"
            style={{ background: cellFill(stop, scale) }}
          />
        ))}
        <span className="matrix__legend-text">{data.legend.highLabel}</span>
      </span>

      {scale.kind === 'divergent' && (
        <span className="matrix__legend-text">
          midpoint {formatValue(scale.midpoint, data.unit)}
        </span>
      )}

      <span className="matrix__legend-group">
        <span className="matrix__swatch matrix__swatch--unobserved" />
        <span className="matrix__legend-text">{data.legend.unobservedLabel}</span>
      </span>
    </div>
  )
}
