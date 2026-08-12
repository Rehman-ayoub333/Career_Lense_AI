/**
 * The hero artwork's content and choreography.
 *
 * ── The idea ──────────────────────────────────────────────────────────────
 * *Registration* is the print term for two layers of a run lining up. Out of
 * register, a sheet prints doubled and colour-fringed and reads as a mistake;
 * in register it resolves into one crisp image. That is this product's whole
 * argument — a CV is rarely bad, it is out of register with what was asked for
 * — so the artwork performs it rather than illustrating it.
 *
 * Two tinted copies of a document converge, and where they meet they consolidate
 * into single clean strokes. Where a requirement has no counterpart in the CV, an
 * empty outline is left behind: the shape of what is missing.
 *
 * The sequence deliberately ends imperfect. Three gaps stay open, because a
 * satisfying full resolve would misrepresent what the tool does — its value is
 * naming the gaps, so the artwork's final state is the product's real output.
 *
 * Data lives here rather than in the component so the artwork's *shape* can be
 * adjusted without touching its motion, and so the caption counts are derived
 * from the same source that draws the lines and cannot drift from them.
 */

interface RegistrationLineSpec {
  /** Width as a percentage of the field, mimicking ragged document measure. */
  width: number
  /** A section heading rather than a requirement — structure, never a gap. */
  heading?: boolean
  /** A requirement the CV does not answer. Rendered as a hollow outline. */
  gap?: boolean
}

export interface RegistrationLine extends RegistrationLineSpec {
  /**
   * Position among the gaps, or `null` for everything else.
   *
   * Gaps resolve after the matched lines have settled and stagger among
   * themselves, so the eye reads "all of this aligned… except these". Computing
   * the order here keeps the component from having to carry a counter through
   * two levels of `map`.
   */
  gapIndex: number | null
}

/**
 * Three groups standing in for a CV's sections. Widths are hand-set rather than
 * random: a regenerating document would flicker on every render, and real pages
 * have rhythm — long runs broken by a short line where a paragraph ends.
 */
const SPEC: readonly (readonly RegistrationLineSpec[])[] = [
  [
    { width: 34, heading: true },
    { width: 97 },
    { width: 91 },
    { width: 94, gap: true },
    { width: 58 },
  ],
  [
    { width: 27, heading: true },
    { width: 88 },
    { width: 96, gap: true },
    { width: 83 },
    { width: 46 },
  ],
  [
    { width: 39, heading: true },
    { width: 92 },
    { width: 76, gap: true },
    { width: 63 },
  ],
]

/** Assigns each gap its place in the closing stagger, once, at module load. */
function withGapOrder(
  groups: readonly (readonly RegistrationLineSpec[])[]
): readonly (readonly RegistrationLine[])[] {
  let seen = 0

  return groups.map((group) =>
    group.map((line) => ({ ...line, gapIndex: line.gap ? seen++ : null }))
  )
}

export const REGISTRATION_GROUPS = withGapOrder(SPEC)

const ALL_LINES = REGISTRATION_GROUPS.flat()

/**
 * The caption's figures, derived rather than written down.
 *
 * Headings are structure, not requirements, so they are excluded from the count.
 */
export const REGISTRATION_COUNTS = {
  requirements: ALL_LINES.filter((line) => !line.heading).length,
  gaps: ALL_LINES.filter((line) => line.gap).length,
  get matched() {
    return this.requirements - this.gaps
  },
} as const

/**
 * How far out of register the two layers start, in pixels.
 *
 * Small enough to read as a printing fault rather than as two separate objects —
 * past roughly 10px the eye stops seeing one misaligned document and starts
 * seeing two documents, which is a different and much less interesting idea.
 */
export const REGISTRATION_OFFSET = {
  cool: { x: -7, y: -5 },
  warm: { x: 7, y: 5 },
} as const

/**
 * Beats, in seconds.
 *
 * Every one of them answers "why is this moving?" with the same answer: this is
 * the product working. Nothing here moves to fill time.
 */
export const REGISTRATION_TIMING = {
  /** Corner marks establish the field before anything happens inside it. */
  marks: 0.15,
  /** The convergence — the load-bearing beat. */
  converge: 0.45,
  convergeDuration: 0.95,
  /** Clean strokes arrive under the fading offset layers. */
  resolve: 0.7,
  resolveDuration: 0.5,
  /** Then, last, what is missing. */
  gaps: 1.35,
  gapStagger: 0.12,
  /** The figures, once the picture they describe is finished. */
  caption: 1.75,
} as const
