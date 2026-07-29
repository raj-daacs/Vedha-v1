// ScopePanel.tsx
// ---------------------------------------------------------------------------
// "What I'm working with · from the recipe" — the scope the plan will read.
//
// This is the file where the two report families would normally fork, and it
// doesn't. It renders three things in order, each driven by presence rather than
// by family:
//
//   spine   — rendered when there are nodes. A state shape has none.
//   facets  — whatever groups the recipe's declaration produced. A flow yields
//             metrics + slice by; a state yields state + benchmark. Same loop.
//   note    — rendered when there is one. Only a spineless shape has something
//             to explain.
//
// Showing available-but-unused chips alongside in-plan ones is deliberate: it
// turns the panel from a legend into an affordance — this is what you could add.
// ---------------------------------------------------------------------------

import type { ScopeModel } from '../../compose/models'
import { SpineStrip } from './SpineStrip'

export function ScopePanel({ scope }: { scope: ScopeModel }) {
  return (
    <div className="scope">
      <div className="scope__label">{scope.label}</div>

      {scope.spine.length > 0 && <SpineStrip nodes={scope.spine} />}

      {scope.facets.map((facet) => (
        <div key={facet.label} className="scope__facet">
          <span className="scope__facet-label">{facet.label}</span>
          {facet.chips.map((chip) => (
            <span key={chip.label} className={`token token--${chip.state}`}>
              {chip.label}
            </span>
          ))}
        </div>
      ))}

      {scope.note && <div className="scope__note">{scope.note}</div>}
    </div>
  )
}
