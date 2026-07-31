// view/SectionSkeleton.tsx
// ---------------------------------------------------------------------------
// The card that exists before its contents do.
//
// This is the piece that makes the assembly read as generation rather than as a
// reveal. The previous approach rendered every section at final size and faded it up
// from opacity 0 — which meant the whole view was already laid out and the operator
// was watching a dimmer switch, not an agent. The give-away is that nothing ever
// changes size: real generation doesn't know how tall a block will be until it has
// written it.
//
// So an unwritten section isn't in the document at all. The one being written is THIS
// — a shorter card carrying shimmer bars where its parts will go. When the real
// section lands it replaces this outright, at its own height, and the page grows.
//
// SHAPED, NOT GENERIC. The bars are drawn from the section model's own presence flags,
// so a section that will carry a headline and two panels skeletons differently from
// one that resolves to a sentence. A single generic placeholder would telegraph that
// every block is the same block, which is the same tell in a different costume.
// ---------------------------------------------------------------------------

import type { ViewSection as ViewSectionModel } from '../../compose/viewModels'

export function SectionSkeleton({ section }: { section: ViewSectionModel }) {
  const { beatView } = section
  const split = beatView.panels.length > 1

  return (
    // aria-hidden: there is nothing here to read yet. The "composing n of m" pill is
    // the live region that announces progress, so this stays out of the tree.
    <div className="vskel" aria-hidden="true">
      <div className="vskel__bar vskel__bar--eyebrow" />
      <div className="vskel__bar vskel__bar--title" />

      {beatView.headline && <div className="vskel__bar vskel__bar--headline" />}

      {beatView.panels.length > 0 && (
        <div className={`vskel__panels${split ? ' vskel__panels--split' : ''}`}>
          {beatView.panels.map((spec, index) => (
            <div key={`${spec.atom}-${index}`} className="vskel__panel" />
          ))}
        </div>
      )}

      <div className="vskel__bar vskel__bar--takeaway" />
    </div>
  )
}
