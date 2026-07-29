// AppShell.tsx
// ---------------------------------------------------------------------------
// The permanent frame. Everything Vedha composes is fresh and disposable; this is
// the only part that never regenerates (moodboard, "our shell").
//
// Three fixed parts: the rail, the context label, and the stage. The stage is
// where the current Insight View will render — one at a time, persistent, never a
// message in a thread (brief §5.1).
// ---------------------------------------------------------------------------

import { BuildScreen } from '../build/BuildScreen'
import { CommandPanel } from '../entry/CommandPanel'
import { InsightView } from '../view/InsightView'
import { useComposition } from '../../compose/useComposition'
import { useApp } from '../../state/AppContext'
import { ContextBar } from './ContextBar'
import { LeftRail } from './LeftRail'

/** Rail destinations with no surface yet. Each line goes away as its screen lands. */
const NOT_YET: Record<string, { title: string; note: string }> = {
  views: { title: 'Your views', note: 'the saved-views index arrives in a later phase' },
  search: { title: 'Search', note: 'search across saved views — not built yet' },
  settings: { title: 'Settings', note: 'not built yet' },
}

const SCREENS = {
  entry: CommandPanel,
  thread: BuildScreen,
  view: InsightView,
} as const

export function AppShell() {
  const { state } = useApp()
  const placeholder = state.rail === 'new' ? undefined : NOT_YET[state.rail]
  const Screen = SCREENS[state.screen]

  // The context label rides above every screen except the front door, where the
  // command panel's own chips already carry the context.
  const showContext = !placeholder && state.screen !== 'entry'

  // Set once, here, so the context bar and the stage below it share one accent.
  // Forwarded straight to CSS — tokens.css repoints --accent* for the state
  // family. Absent until a recipe is chosen, which leaves the default (flow, teal).
  const { family } = useComposition()

  return (
    <div className="shell">
      <LeftRail />
      <main className="stage" data-family={family}>
        {showContext && <ContextBar />}
        {placeholder ? (
          <div className="stage__scroll">
            <div className="stage__placeholder">
              <strong>{placeholder.title}</strong>
              {placeholder.note}
            </div>
          </div>
        ) : (
          <Screen />
        )}
      </main>
    </div>
  )
}
