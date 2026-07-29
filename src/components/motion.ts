// components/motion.ts
// ---------------------------------------------------------------------------
// Shared motion facts: the one reduced-motion check, and the cadences.
//
// Both narrated sequences — the build steps and the view assembling itself — read
// the same helper, so they cannot drift on what "reduced motion" means. The CSS side
// is handled independently by the global @media block in global.css; this is only the
// JS half, which decides whether a timer runs at all.
// ---------------------------------------------------------------------------

/**
 * Read once per call rather than subscribed: both sequences are under a second, and
 * a user toggling the OS setting mid-animation isn't a case worth a listener for.
 */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/** The narrated build's step interval — the low-fi's cadence. Slow enough to read. */
export const BUILD_STEP_MS = 720

/**
 * The Insight View's section stagger. Much quicker than a build step: the build is
 * something you read, whereas this is the view arriving — it should feel composed,
 * not narrated. Four sections land in well under a second.
 */
export const VIEW_STAGGER_MS = 140
