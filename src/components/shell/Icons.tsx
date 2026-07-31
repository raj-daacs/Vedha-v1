// Icons.tsx
// ---------------------------------------------------------------------------
// Hand-rolled SVG icons, paths taken verbatim from the design source. All draw
// in `currentColor` at stroke-width 2 so the rail's active/resting ink carries
// straight through — no per-state icon variants.
// ---------------------------------------------------------------------------

import type { ReactNode } from 'react'

export interface IconProps {
  /** px. The rail uses 17; the design has no other size. */
  size?: number
}

function Icon({ size = 17, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      width={size}
      height={size}
      style={{ flex: 'none' }}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

export function PlusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  )
}

/** Disclosure caret. Points right when shut, rotated down by CSS when open. */
export function ChevronIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 6l6 6-6 6" />
    </Icon>
  )
}

/** The rail's collapse/expand affordance. Not in the design source — the source
    has no collapsed state, so this is the one icon drawn to match rather than copy. */
export function PanelIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 5h18v14H3zM9 5v14" />
    </Icon>
  )
}

export function ListIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 6h16M4 12h16M4 18h10" />
    </Icon>
  )
}

export function SearchIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4-4" />
    </Icon>
  )
}

export function SettingsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
    </Icon>
  )
}

/**
 * The Vedha mark — a half-filled circle. Purely a CSS conic-gradient in the
 * source, so it stays one, not an SVG: the fill follows --teal-deep.
 */
export function VedhaMark() {
  return <span className="rail__mark" aria-hidden="true" />
}
