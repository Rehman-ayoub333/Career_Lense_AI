import type { AnalysisMode } from '@/types'

/**
 * Presentation of dates and modes.
 *
 * Both appear in three places — the results apparatus, the history register, and
 * every exported artefact — and each had been formatting them independently.
 */

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

/**
 * Day, month in full, year: `14 August 2026`.
 *
 * The month is never abbreviated and never numeric. `14/08/2026` and `08/14/2026`
 * are the same nine characters and mean different days, and this product's
 * readers are spread across conventions that disagree about which is which.
 *
 * No time of day is rendered, anywhere. The product retains nothing, so a
 * timestamp would imply a record that does not exist.
 */
export function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

/** The canonical name of each mode. Used verbatim wherever a mode is named. */
export const MODE_LABEL: Record<AnalysisMode, string> = {
  job: 'Job description',
  scholarship: 'Scholarship criteria',
}

/**
 * What the score was measured against.
 *
 * A band rendered without this asserts nothing: `WEAK` on its own reads as a
 * judgement of the reader, and `WEAK` beside the requirement it was matched to
 * reads as the measurement it actually is. The two are never separated.
 */
export function analysisReference(mode: AnalysisMode, iso: string): string {
  return `Analysis · ${MODE_LABEL[mode]} · ${formatDate(iso)}`
}
