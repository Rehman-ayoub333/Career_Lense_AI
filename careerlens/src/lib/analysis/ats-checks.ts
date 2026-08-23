import type { ATSCheck, ATSCheckDraft, ATSStatus } from '@/types'

/**
 * Deterministic ATS checks.
 *
 * Three of the eight ATS ids are decidable from the CV text by plain string
 * work, so the model should not be the authority on them. Same reasoning as
 * ADR-03, applied to a different field: where code can check, code checks.
 *
 * ## Why this is not in `grounding.ts`
 *
 * A stale Master Plan line said this logic "moves to grounding.ts" when the old
 * ATS tab was deleted. It describes something that never existed, and it should
 * not be built there. `grounding.ts` answers exactly one question — is this
 * quote in this CV — and the entire research contribution rests on that module
 * being narrow enough to reason about. Document formatting is an unrelated
 * concern, and folding it in would blur the boundary for no gain (ADR-20).
 *
 * ## What "conclusive" means, and why it matters
 *
 * These checks run on text extracted from a PDF, which has already lost most of
 * its layout. A check that cannot see enough to decide returns `null` and the
 * model's answer stands, marked `source: 'model'`. Only a real determination
 * overrides, marked `source: 'deterministic'`.
 *
 * That distinction is the whole point of the `source` field: a guess and a
 * measurement must stay distinguishable to whoever reads the result. Returning
 * a confident-looking `pass` from an inconclusive check would be exactly the
 * false precision this project keeps removing.
 */

/** The three ids with real logic behind them. The other five stay the model's. */
export const DETERMINISTIC_ATS_IDS = ['dates', 'contact', 'tables'] as const

export type DeterministicAtsId = (typeof DETERMINISTIC_ATS_IDS)[number]

export interface DeterministicVerdict {
  status: ATSStatus
  note: string
}

/* ── dates ────────────────────────────────────────────────────────────────── */

/**
 * Date formats a CV realistically uses, each with a name for the note.
 *
 * Deliberately not exhaustive: the check is "are the formats consistent", so an
 * unrecognised format simply contributes no evidence rather than counting as a
 * violation. A CV written in a convention this list does not know should come
 * back inconclusive, not fail.
 */
const DATE_PATTERNS: readonly { name: string; pattern: RegExp }[] = [
  { name: 'MM/YYYY', pattern: /\b(0?[1-9]|1[0-2])\/(19|20)\d{2}\b/g },
  { name: 'YYYY-MM', pattern: /\b(19|20)\d{2}-(0[1-9]|1[0-2])\b/g },
  {
    name: 'Month YYYY',
    pattern:
      /\b(jan(uary)?|feb(ruary)?|mar(ch)?|apr(il)?|may|jun(e)?|jul(y)?|aug(ust)?|sep(t)?(ember)?|oct(ober)?|nov(ember)?|dec(ember)?)\s+(19|20)\d{2}\b/gi,
  },
]

/** Bare four-digit years, which are a valid style on their own. */
const BARE_YEAR = /\b(19|20)\d{2}\b/g

function checkDates(cvText: string): DeterministicVerdict | null {
  const used = DATE_PATTERNS.map((format) => ({
    name: format.name,
    count: (cvText.match(format.pattern) ?? []).length,
  })).filter((format) => format.count > 0)

  const bareYears = (cvText.match(BARE_YEAR) ?? []).length

  // Fewer than two dates anywhere: there is nothing for consistency to be about.
  if (used.length === 0 && bareYears < 2) return null

  if (used.length === 0) {
    return {
      status: 'pass',
      note: `Dates appear as bare years throughout, which is consistent and machine-readable.`,
    }
  }

  const total = used.reduce((sum, format) => sum + format.count, 0)
  if (total < 2) return null

  if (used.length === 1) {
    return {
      status: 'pass',
      note: `All ${total} dates use ${used[0].name} consistently.`,
    }
  }

  const names = used.map((format) => `${format.name} (${format.count})`).join(', ')
  return {
    status: 'warn',
    note: `Dates mix ${used.length} formats — ${names}. Pick one and use it throughout.`,
  }
}

/* ── contact ──────────────────────────────────────────────────────────────── */

const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]{2,}/
/** Seven or more digits allowing spaces, dashes, dots and parentheses. */
const PHONE = /(?:\+\d{1,3}[\s.-]?)?(?:\(\d{1,4}\)[\s.-]?)?\d(?:[\s.-]?\d){6,}/

function checkContact(cvText: string): DeterministicVerdict {
  const hasEmail = EMAIL.test(cvText)
  const hasPhone = PHONE.test(cvText)

  if (hasEmail && hasPhone) {
    return { status: 'pass', note: 'Both an email address and a phone number appear in the body text.' }
  }

  if (hasEmail) {
    return {
      status: 'warn',
      note: 'An email address is present, but no phone number was found in the body text.',
    }
  }

  if (hasPhone) {
    return {
      status: 'warn',
      note: 'A phone number is present, but no email address was found in the body text.',
    }
  }

  // Always conclusive: neither pattern appearing anywhere in the extracted text
  // is itself the finding. If they were in a header or footer, extraction
  // dropped them — which is exactly the failure this check exists to catch.
  return {
    status: 'fail',
    note: 'No email address or phone number was found in the extracted text. If they are in a header or footer, applicant tracking systems will not read them.',
  }
}

/* ── tables ───────────────────────────────────────────────────────────────── */

/** Characters that survive extraction from a drawn table or a bordered layout. */
const TABLE_GLYPHS = /[|│┃┆┊╎┌┐└┘├┤┬┴┼─━]/g

/** Three or more consecutive spaces mid-line: the residue of a column gutter. */
const COLUMN_GUTTER = /\S {3,}\S/

function checkTables(cvText: string): DeterministicVerdict | null {
  const lines = cvText.split('\n').filter((line) => line.trim().length > 0)
  if (lines.length < 5) return null

  const glyphCount = (cvText.match(TABLE_GLYPHS) ?? []).length
  const gutterLines = lines.filter((line) => COLUMN_GUTTER.test(line)).length
  const gutterRatio = gutterLines / lines.length

  if (glyphCount >= 4) {
    return {
      status: 'fail',
      note: `Found ${glyphCount} table or border characters. Tables often reorder or merge when parsed — use plain paragraphs and bullet lists instead.`,
    }
  }

  if (gutterRatio >= 0.3) {
    return {
      status: 'warn',
      note: `${gutterLines} of ${lines.length} lines have wide internal gaps, which is what a multi-column layout leaves behind after extraction.`,
    }
  }

  if (glyphCount === 0 && gutterRatio < 0.1) {
    return {
      status: 'pass',
      note: 'No table characters or column gutters found — the document reads as a single linear column.',
    }
  }

  // Some signal, not enough to call either way. Say so by saying nothing.
  return null
}

const CHECKS: Record<DeterministicAtsId, (cvText: string) => DeterministicVerdict | null> = {
  dates: checkDates,
  contact: checkContact,
  tables: checkTables,
}

/** Runs the three checks. A `null` entry means "could not decide". */
export function runDeterministicAtsChecks(
  cvText: string
): Partial<Record<DeterministicAtsId, DeterministicVerdict>> {
  const results: Partial<Record<DeterministicAtsId, DeterministicVerdict>> = {}

  for (const id of DETERMINISTIC_ATS_IDS) {
    const verdict = CHECKS[id](cvText)
    if (verdict !== null) results[id] = verdict
  }

  return results
}

/**
 * Merges the deterministic verdicts over the model's checks.
 *
 * Every check gets a `source`, and it is always the truth about which mechanism
 * produced the `status` sitting next to it. The model's answer survives for the
 * five ids with no deterministic check, and for any of the three where the check
 * came back inconclusive.
 */
export function attributeAtsChecks(checks: readonly ATSCheckDraft[], cvText: string): ATSCheck[] {
  const deterministic = runDeterministicAtsChecks(cvText)

  return checks.map((check) => {
    const verdict = deterministic[check.id as DeterministicAtsId]

    return verdict === undefined
      ? { ...check, source: 'model' }
      : { ...check, status: verdict.status, note: verdict.note, source: 'deterministic' }
  })
}
