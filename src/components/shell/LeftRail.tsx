// LeftRail.tsx
// ---------------------------------------------------------------------------
// The rail: wordmark · four destinations · saved views · you.
// 236px, fixed — it never collapses (design source has no collapsed state).
// ---------------------------------------------------------------------------

import type { ComponentType } from 'react'
import { useApp } from '../../state/AppContext'
import type { RailKey } from '../../state/types'
import type { IconProps } from './Icons'
import { ListIcon, PlusIcon, SearchIcon, SettingsIcon, VedhaMark } from './Icons'

const DESTINATIONS: Array<{ key: RailKey; label: string; Icon: ComponentType<IconProps> }> = [
  { key: 'new', label: 'New', Icon: PlusIcon },
  { key: 'views', label: 'Your views', Icon: ListIcon },
  { key: 'search', label: 'Search', Icon: SearchIcon },
  { key: 'settings', label: 'Settings', Icon: SettingsIcon },
]

/**
 * Illustrative only — the saved-views index is out of scope this session
 * (design brief §3, "optional if time allows").
 */
const SAVED_VIEWS = ['Weekly activation review', 'Board readout — Q3', 'Product stickiness']

export function LeftRail() {
  const { state, dispatch } = useApp()

  return (
    <nav className="rail" aria-label="Vedha">
      <div className="rail__wordmark">
        <VedhaMark />
        Vedha
      </div>

      {DESTINATIONS.map(({ key, label, Icon }) => (
        <button
          key={key}
          type="button"
          className="rail__item"
          aria-current={state.rail === key ? 'page' : undefined}
          onClick={() =>
            key === 'new'
              ? dispatch({ type: 'NEW' })
              : dispatch({ type: 'SET_RAIL', rail: key })
          }
        >
          <Icon />
          {label}
        </button>
      ))}

      <div className="rail__spacer" />

      <div className="rail__eyebrow">Saved views</div>
      <div className="rail__saved">
        {SAVED_VIEWS.map((name) => (
          <button key={name} type="button" className="rail__saved-item">
            {name}
          </button>
        ))}
      </div>

      <div className="rail__you">
        <span className="rail__avatar" />
        Priya · Ops
      </div>
    </nav>
  )
}
