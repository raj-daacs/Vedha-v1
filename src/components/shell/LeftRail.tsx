// LeftRail.tsx
// ---------------------------------------------------------------------------
// The rail: wordmark · four destinations · saved views · you.
//
// Two widths. Collapsed (the default) is a 64px icon-only strip; expanded is the
// design source's 236px. Expanding overlays the stage rather than pushing it —
// the strip's width is reserved by the shell at all times, so opening the rail
// never reflows the view underneath it.
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState, type ComponentType } from 'react'
import { useApp } from '../../state/AppContext'
import type { RailKey } from '../../state/types'
import type { IconProps } from './Icons'
import { ListIcon, PanelIcon, PlusIcon, SearchIcon, SettingsIcon, VedhaMark } from './Icons'

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
  const [open, setOpen] = useState(false)
  const railRef = useRef<HTMLElement>(null)

  // An expanded rail sits over the stage, so it has to yield the way any overlay
  // does: Escape, or a click landing outside it. Both are no-ops while collapsed.
  useEffect(() => {
    if (!open) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onPointer = (e: PointerEvent) => {
      if (!railRef.current?.contains(e.target as Node)) setOpen(false)
    }

    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [open])

  return (
    <nav
      ref={railRef}
      className={`rail${open ? ' rail--open' : ''}`}
      aria-label="Vedha"
      data-open={open}
    >
      <div className="rail__head">
        <div className="rail__wordmark">
          <VedhaMark />
          <span className="rail__label">Vedha</span>
        </div>
        <button
          type="button"
          className="rail__toggle"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? 'Collapse navigation' : 'Expand navigation'}
          title={open ? 'Collapse navigation' : 'Expand navigation'}
        >
          <PanelIcon />
        </button>
      </div>

      {DESTINATIONS.map(({ key, label, Icon }) => (
        <button
          key={key}
          type="button"
          className="rail__item"
          aria-current={state.rail === key ? 'page' : undefined}
          // Collapsed, the label is the only thing naming the button, so it has to
          // move onto the element itself or the icon ships unlabelled.
          aria-label={label}
          title={open ? undefined : label}
          onClick={() =>
            key === 'new'
              ? dispatch({ type: 'NEW' })
              : dispatch({ type: 'SET_RAIL', rail: key })
          }
        >
          <Icon />
          <span className="rail__label">{label}</span>
        </button>
      ))}

      <div className="rail__spacer" />

      <div className="rail__eyebrow rail__label">Saved views</div>
      <div className="rail__saved">
        {SAVED_VIEWS.map((name) => (
          <button key={name} type="button" className="rail__saved-item rail__label">
            {name}
          </button>
        ))}
      </div>

      <div className="rail__you">
        <span className="rail__avatar" />
        <span className="rail__label">Priya · Ops</span>
      </div>
    </nav>
  )
}
