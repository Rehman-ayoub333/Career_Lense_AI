import type { MatchVerdict } from '@/types'

/**
 * Score presentation.
 *
 * Previously `utils/score-color.ts`, which was the only file in `utils/` — an
 * arbitrary split from `lib/` that gave a reader two places to look for the same
 * kind of code. Merged into `lib/` so every non-component module has one home.
 */

export type ScoreToken = 'red' | 'amber' | 'blue' | 'green'

interface ScoreBand {
  /** Inclusive lower bound. */
  min: number
  token: ScoreToken
  verdict: MatchVerdict
}

/** Ordered high to low so the first match wins. */
const BANDS: readonly ScoreBand[] = [
  { min: 81, token: 'green', verdict: 'Strong Match' },
  { min: 66, token: 'blue', verdict: 'Good Match' },
  { min: 41, token: 'amber', verdict: 'Partial Match' },
  { min: 0, token: 'red', verdict: 'Weak Match' },
]

function bandFor(score: number): ScoreBand {
  const clamped = Math.max(0, Math.min(100, score))
  return BANDS.find((band) => clamped >= band.min) ?? BANDS[BANDS.length - 1]
}

/**
 * Returns the design-system colour *token* for a score, not a hex literal.
 *
 * The previous implementation returned hard-coded hex values (`#F43F5E`, …) that
 * duplicated globals.css and drifted from it the moment the palette changed —
 * and were invisible to the theme. Callers now resolve the token through CSS
 * custom properties, so a palette change propagates everywhere at once.
 */
export function getScoreToken(score: number): ScoreToken {
  return bandFor(score).token
}

/** CSS colour expression for inline styles and SVG `stroke`/`fill`. */
export function getScoreColorVar(score: number): string {
  return `hsl(var(--${getScoreToken(score)}))`
}

/**
 * The accessible sibling of `getScoreColorVar`, for text.
 *
 * The base tokens are fill colours — `--green` measures 2.9:1 on the raised
 * surface — so a score rendered as a numeral or a label must use the `-text`
 * variant, which clears AA on every surface in the palette.
 */
export function getScoreTextColorVar(score: number): string {
  return `hsl(var(--${getScoreToken(score)}-text))`
}

/**
 * The verdict a score implies.
 *
 * The model supplies its own verdict string; this is used to sanity-check that
 * the verdict and the number agree, and as a fallback for locally derived scores.
 */
export function getScoreVerdict(score: number): MatchVerdict {
  return bandFor(score).verdict
}
