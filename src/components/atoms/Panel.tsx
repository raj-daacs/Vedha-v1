// atoms/Panel.tsx
// ---------------------------------------------------------------------------
// Renders one panel of a section by dispatching on its atom tag.
//
// This switch is a RENDERER LOOKUP, not a shape decision. The fixture names the
// atom it wants, so there is exactly one component per tag and no inference. It is
// the only switch in the view layer, and it never sees a family, a recipe, or a
// spine — swapping the funnel view for the scorecard view changes which tags arrive
// here, not what this file does with them.
//
// The union is exhaustive: adding an atom to PanelSpec without handling it here is
// a type error, not a silently blank panel.
// ---------------------------------------------------------------------------

import type { PanelSpec } from '../../compose/viewModels'
import { Bridge } from './Bridge'
import { CohortMatrix } from './CohortMatrix'
import { Funnel } from './Funnel'
import { NrrCurve } from './NrrCurve'
import { RankedBars } from './RankedBars'
import { Scorecard } from './Scorecard'
import { StickinessTrend } from './StickinessTrend'
import { Trend } from './Trend'

function AtomBody({ spec }: { spec: PanelSpec }) {
  switch (spec.atom) {
    case 'trend':
      return <Trend data={spec.data} />
    case 'cohortMatrix':
      return <CohortMatrix data={spec.data} />
    case 'funnel':
      return <Funnel data={spec.data} />
    case 'rankedBars':
      return <RankedBars data={spec.data} />
    case 'scorecard':
      return <Scorecard data={spec.data} />
    case 'stickinessTrend':
      return <StickinessTrend data={spec.data} />
    case 'nrrCurve':
      return <NrrCurve data={spec.data} />
    case 'bridge':
      return <Bridge data={spec.data} />
  }
}

export function Panel({ spec }: { spec: PanelSpec }) {
  return (
    <div className="panel">
      {spec.label && <div className="panel__label">{spec.label}</div>}
      <AtomBody spec={spec} />
    </div>
  )
}
