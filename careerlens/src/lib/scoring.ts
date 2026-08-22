/**
 * The score bands. One table, and this is it.
 *
 * There were three: `BANDS` here, `SCORE_BANDS` in `lib/analysis/constants.ts`,
 * and `BAND_RANGES` in `components/ui/Hallmark.tsx`. All three described the same
 * four ranges, independently, so the boundary between "Partial" and "Good" was
 * three decisions that happened to agree. They are now one, and the other two
 * files import from here.
 *
 * ## What is deliberately absent
 *
 * There is no longer a function mapping a score to a colour. `getScoreToken`,
 * `getScoreColorVar` and `getScoreTextColorVar` returned `red` below 41 and
 * `green` above 81, and they existed to paint the ring gauge and the share
 * card's numeral — both now removed. Nothing in the product colours a figure by
 * its value any more, and there is no helper here to make it easy to start
 * again. The band is carried by a word, at identical weight whatever it says.
 */

/** The band word. Uppercase because it is struck, not written. */
export type Band = 'WEAK' | 'PARTIAL' | 'GOOD' | 'STRONG'

export interface ScoreBand {
  band: Band
  /** Inclusive. */
  min: number
  /** Inclusive. */
  max: number
}

/** Fixed and published, so a band is reconstructible from a score. */
export const BANDS: readonly ScoreBand[] = [
  { band: 'WEAK', min: 0, max: 40 },
  { band: 'PARTIAL', min: 41, max: 65 },
  { band: 'GOOD', min: 66, max: 80 },
  { band: 'STRONG', min: 81, max: 100 },
]

export function bandForScore(score: number): Band {
  const clamped = Math.max(0, Math.min(100, score))
  const match = BANDS.find((range) => clamped >= range.min && clamped <= range.max)

  // The ranges are exhaustive over 0-100 and the score is clamped into that
  // interval, so the fallback exists only to satisfy the type.
  return match?.band ?? 'WEAK'
}
