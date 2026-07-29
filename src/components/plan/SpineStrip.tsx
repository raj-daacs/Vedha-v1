// SpineStrip.tsx
// ---------------------------------------------------------------------------
// The input → work → output backbone.
//
// A metric is a measure, not the work. The operator's job is a spine, and plans
// are spine-first (brief §2) — so this renders before the beats that sit on it.
//
// It maps an array. When a recipe declared no spine the array is empty and the
// caller doesn't render this at all; there is no "state variant" of this file.
// ---------------------------------------------------------------------------

import type { SpineNode } from '../../compose/models'

export function SpineStrip({ nodes }: { nodes: SpineNode[] }) {
  return (
    <div className="spine">
      {nodes.map((node, index) => (
        <span key={node.label} className="spine__seg">
          {index > 0 && (
            <span className="spine__arrow" aria-hidden="true">
              →
            </span>
          )}
          <span className={`spine__node spine__node--${node.emphasis}`}>{node.label}</span>
        </span>
      ))}
    </div>
  )
}
