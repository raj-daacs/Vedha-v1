// atoms/Recommendation.tsx
// ---------------------------------------------------------------------------
// The do-beat. A stated CALL rather than a reading.
//
// Every other atom in this app reports: here is what the data says, draw your own
// conclusion. This one commits — "raise the price to $52" — which is what the response
// family's `extend` fit looks like when it reaches the screen. It's the only atom that
// could be wrong in a way the operator would hold against you, so it carries its own
// cost and its own confidence rather than leaving either to be inferred.
//
// NOT A CHART, and deliberately not built like one. No SVG, no scale, no axis: a
// recommendation is prose with figures in it. Set in the display serif because it is
// the one sentence on the page that a person said rather than a series produced.
//
// THREE TILES, AND THE MIDDLE ONE IS THE POINT. Upside, cost, confidence — in that
// order, because a recommendation that shows only its upside is advertising. The risk
// tile is never optional for that reason.
// ---------------------------------------------------------------------------

import type { RecommendationData } from '../../compose/viewModels'

export function Recommendation({ data }: { data: RecommendationData }) {
  return (
    <div className="recommend">
      <div className="recommend__eyebrow">recommended move</div>
      <div className="recommend__move">{data.move}</div>

      <div className="recommend__effects">
        {/* Upside. Takes the family accent via the same "good" tone the headline
            deltas use, so it bends rather than hardcoding a hue. */}
        <div className="tile recommend__tile">
          <div className="tile__label recommend__tile-label">expected Δ revenue</div>
          <div className="recommend__tile-value recommend__tile-value--gain">
            {data.deltaRevenue}
          </div>
        </div>

        {/* Cost. Amber, which is this app's colour for "attention" everywhere else —
            a status colour, so it stays put across families. */}
        <div className="tile recommend__tile">
          <div className="tile__label recommend__tile-label">{data.riskLabel}</div>
          <div className="recommend__tile-value recommend__tile-value--risk">
            {data.riskValue}
          </div>
        </div>

        {/* Confidence, stated rather than implied. See RecommendationData.confidence:
            a call about a price nobody has charged yet cannot be from data. */}
        <div className="tile recommend__tile">
          <div className="tile__label recommend__tile-label">confidence</div>
          <div className="recommend__tile-value recommend__tile-value--confidence">
            {data.confidence}
          </div>
        </div>

        {data.note && <div className="recommend__note">{data.note}</div>}
      </div>
    </div>
  )
}
