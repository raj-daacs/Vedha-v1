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

/**
 * Fallback dwell for a build step that doesn't author its own — the low-fi's
 * cadence. Slow enough to read. Steps carry `dwellMs` precisely so that this
 * number stops being the cadence of the whole sequence.
 */
export const BUILD_STEP_MS = 720

/**
 * How far a step's dwell is allowed to wander from its authored value, either way.
 *
 * Uniform timing is the tell. Even with per-step dwells the sequence repeats
 * identically on every run, and a operator who composes twice in a row notices —
 * so each step is nudged by up to ±18%. Small enough that the authored weighting
 * still reads (the hero beat is always the long one), large enough that no two runs
 * share a rhythm.
 */
const BUILD_JITTER = 0.18

/**
 * The dwell to actually wait on for one step.
 *
 * Returns 0 under reduced motion so callers can resolve without special-casing,
 * though in practice they skip timers entirely by then.
 */
export function buildDwellMs(authored: number | undefined): number {
  const base = authored ?? BUILD_STEP_MS
  if (prefersReducedMotion()) return 0
  const spread = 1 + (Math.random() * 2 - 1) * BUILD_JITTER
  return Math.round(base * spread)
}

/**
 * The Insight View's section stagger.
 *
 * Tuned by feel, and the first attempt (140ms) was wrong: it read as a fade-in rather
 * than as the agent composing. The section has to land, fill in, and reach its
 * conclusion before the next one starts, or the whole thing is one blur.
 *
 * Each section overlaps the next slightly on purpose: fully sequential would be
 * stop-start, and the overlap is what makes it read as continuous composition.
 *
 * The MEAN rather than the interval — see `viewDwellsMs`, which redistributes around
 * it without changing the sum.
 *
 * RAISED FROM 440, AND THIS OVERRIDES THE NOTE ABOVE. The old value came with a
 * finding: "520 was measurably too slow — it pushed the last takeaway past 2.5s, which
 * reads as waiting rather than watching." That was tuned for a view that should feel
 * *finished fast*, and for an assembly that was pure opacity. Neither holds now: the
 * view generates block by block (see the assembly note in view.css), and a block being
 * written needs long enough for its placeholder to be seen as a placeholder.
 *
 * This is also the dwell the skeleton is on screen for. Under about 900ms the
 * placeholder flickers rather than reads, which looks like a rendering fault. At 1150 a
 * three-section view takes roughly 3.5s and each block visibly gets written: placeholder
 * up, content in, next placeholder.
 *
 * THIS CONSTANT IS THE DIAL. If the assembly reads as waiting rather than generating,
 * lower it; the shape of the sequence does not change with it.
 */
export const VIEW_STAGGER_MS = 1150

/** How far a single section's dwell may stray from the mean. */
const VIEW_SPREAD = 0.34

/**
 * Per-section dwells for one assembly pass.
 *
 * A uniform stagger says "playback". Real composition is uneven, and it is uneven in
 * a direction the operator can predict: a section carrying two panels, a headline and
 * a legend is more work than one that resolves to a sentence. So each section's dwell
 * is scaled by its own weight relative to the view's mean weight.
 *
 * NORMALISED, NOT MULTIPLIED. Scaling dwell by raw weight would inflate the total and
 * spend the tuning behind VIEW_STAGGER_MS, whatever that constant is currently set to.
 * Dividing by the mean keeps the sum at `n × VIEW_STAGGER_MS` and only moves time
 * between sections, which is the part that carries the feel. That separation is the
 * point: the total is one dial, the rhythm is another, and neither disturbs the other.
 *
 * Jitter on top, so two runs of the same view don't share a rhythm.
 */
export function viewDwellsMs(weights: number[]): number[] {
  if (weights.length === 0) return []
  const mean = weights.reduce((a, b) => a + b, 0) / weights.length
  return weights.map((w) => {
    // A zero mean would only happen if every weight were zero; treat as uniform.
    const ratio = mean > 0 ? w / mean : 1
    const clamped = Math.min(Math.max(ratio, 1 - VIEW_SPREAD), 1 + VIEW_SPREAD)
    const jitter = 1 + (Math.random() * 2 - 1) * 0.12
    return Math.round(VIEW_STAGGER_MS * clamped * jitter)
  })
}
