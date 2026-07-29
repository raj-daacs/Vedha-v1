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
 * The Insight View's section stagger.
 *
 * Tuned by feel, and the first attempt (140ms) was wrong: it read as a fade-in rather
 * than as the agent composing. The section has to land, fill in, and reach its
 * conclusion before the next one starts, or the whole thing is one blur.
 *
 * At 440ms a three-section view settles in roughly 2s end to end, including each
 * section's internal cascade. 520 was measurably too slow — it pushed the last
 * takeaway past 2.5s, which reads as waiting rather than watching. Much under 400 and
 * the cascade inside each section has no room to be seen.
 *
 * Each section overlaps the next slightly on purpose: fully sequential would be
 * stop-start, and the overlap is what makes it read as continuous composition.
 */
export const VIEW_STAGGER_MS = 440
