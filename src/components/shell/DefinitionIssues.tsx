// shell/DefinitionIssues.tsx
// ---------------------------------------------------------------------------
// What the app had to assume about the workflow definitions.
//
// The definitions file is swapped in whole, and everything downstream degrades
// rather than crashing — resampled figures, fallback dimension values, inferred
// recipe eligibility. That resilience is only honest if the assumptions are
// visible: a chart rendering interpolated numbers with nothing saying so is worse
// than the crash it replaced.
//
// DEV ONLY. It reads as a developer tool because it is one — the audience is
// whoever just edited the JSON, not an operator. `import.meta.env.DEV` keeps it out
// of the production bundle entirely, so a deployed demo never shows it.
//
// Collapsed to a single line by default. A file with twelve harmless notes should
// cost one line of screen, not twelve.
// ---------------------------------------------------------------------------

import { useState } from 'react'
import { definitionIssues, definitionSource } from '../../data/definitionRegistry'
import { derivationIssueList } from '../../data/semanticModel'
import type { Issue } from '../../data/definitionSchema'

const SEVERITY_ORDER: Record<Issue['severity'], number> = { error: 0, warning: 1, note: 2 }

export function DefinitionIssues() {
  const [open, setOpen] = useState(false)
  if (!import.meta.env.DEV) return null

  // Parse issues come from reading the file; derivation issues come from the app
  // asking it for something it doesn't have. Both are "what we assumed", so they
  // read as one list.
  const issues = [...definitionIssues(), ...derivationIssueList()].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  )

  const source = definitionSource()
  const errors = issues.filter((issue) => issue.severity === 'error').length
  const warnings = issues.filter((issue) => issue.severity === 'warning').length

  // A clean fetched file is the expected state and deserves no chrome at all.
  if (issues.length === 0 && source === 'fetched') return null

  const tone = errors > 0 ? 'error' : warnings > 0 ? 'warning' : 'note'
  const notes = issues.length - errors - warnings
  const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`
  const counts = [
    errors > 0 ? plural(errors, 'error') : null,
    warnings > 0 ? plural(warnings, 'warning') : null,
    notes > 0 ? plural(notes, 'note') : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className={`defissues defissues--${tone}`}>
      <button
        type="button"
        className="defissues__summary"
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        aria-expanded={open}
      >
        <span className="defissues__badge">
          {source === 'bundled' ? 'bundled definitions' : 'workflows.json'}
        </span>
        {counts || 'loaded cleanly'}
        <span className="defissues__chevron">{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <ul className="defissues__list">
          {source === 'bundled' && (
            <li className="defissues__item defissues__item--note">
              <span className="defissues__where">source</span>
              running on the copy bundled into the build. Drop a file at{' '}
              <code>public/workflows.json</code> and hard-refresh to use your own.
            </li>
          )}
          {issues.map((issue, index) => (
            <li
              key={`${issue.where}-${index}`}
              className={`defissues__item defissues__item--${issue.severity}`}
            >
              <span className="defissues__where">{issue.where}</span>
              {issue.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
