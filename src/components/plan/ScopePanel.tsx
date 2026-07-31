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
//             metrics + dimensions; a state yields state + benchmark. Same loop.
//   note    — rendered when there is one. Only a spineless shape has something
//             to explain.
//
// Showing available-but-unused chips alongside in-plan ones is deliberate: it
// turns the panel from a legend into an affordance — this is what you could add.
//
// Folded by default. The affordance is worth a lot on first read and very little on
// the fifth, and the plan below is what the operator came for — so the panel opens
// on request rather than on arrival. Its folded line still reports how much it holds
// (`12 fields · 3-step spine`), so nothing is hidden silently.
// ---------------------------------------------------------------------------

import { useState } from 'react'
import type { ScopeModel } from '../../compose/models'
import { ChevronIcon } from '../shell/Icons'
import { SpineStrip } from './SpineStrip'

/** Folded, the panel still has to say how much it is holding back. */
function summarise(scope: ScopeModel): string {
  const chips = scope.facets.reduce((n, f) => n + f.chips.length, 0)
  const parts = [`${chips} ${chips === 1 ? 'field' : 'fields'}`]
  if (scope.spine.length > 0) parts.push(`${scope.spine.length}-step spine`)
  return parts.join(' · ')
}

export function ScopePanel({ scope }: { scope: ScopeModel }) {
  const [open, setOpen] = useState(false)

  return (
    <div className={`scope${open ? '' : ' scope--folded'}`}>
      <button
        type="button"
        className="scope__label scope__toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="scope-body"
      >
        <span className={`scope__caret${open ? ' scope__caret--open' : ''}`}>
          <ChevronIcon size={12} />
        </span>
        {scope.label}
        {!open && <span className="scope__summary">{summarise(scope)}</span>}
      </button>

      {/* Hidden rather than unmounted, so reopening doesn't re-run SpineStrip's
          entrance and the chips don't animate in a second time. */}
      <div id="scope-body" hidden={!open}>
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
    </div>
  )
}
