// atoms/Scorecard.tsx
// ---------------------------------------------------------------------------
// Levels and ratios, each flagged against its own bar.
//
// This is the state family's whole answer: there's no flow underneath, so the
// reading is "where does each number sit relative to what it should be". Which is
// why the benchmark isn't a footnote here — it's on the tile.
//
// Grouped rather than flat because levels and ratios are different kinds of fact:
// a level is a count you can't judge without context, a ratio already carries its
// own judgement.
// ---------------------------------------------------------------------------

import type { ScorecardData } from '../../compose/viewModels'

export function Scorecard({ data }: { data: ScorecardData }) {
  return (
    <div className="scorecard">
      {data.groups.map((group) => (
        <div key={group.label} className="scorecard__group">
          <div className="panel__label">{group.label}</div>
          <div className="scorecard__tiles">
            {group.tiles.map((tile) => (
              <div
                key={tile.label}
                className={`tile${tile.emphasis ? ' tile--accent' : ''}`}
              >
                <div className="tile__value">{tile.value}</div>
                <div className="tile__label">
                  {tile.label}
                  {tile.delta && (
                    <span className={`tile__delta tile__delta--${tile.delta.direction}`}>
                      {tile.delta.direction === 'up' ? '▲' : '▼'} {tile.delta.text}
                    </span>
                  )}
                  {tile.benchmark && (
                    <span
                      className={`tile__bench tile__bench--${tile.benchmark.clears ? 'clears' : 'misses'}`}
                    >
                      {tile.benchmark.clears ? '✓' : '▼'} {tile.benchmark.text}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
