import type { PublicVerifiedClaim } from '@/types'

/**
 * Locating evidence quotes inside the original CV text, for display.
 *
 * This is a *presentation* concern and nothing more. Whether a quote is real was
 * decided server-side by `grounding.ts`, against normalized text, and that answer
 * is already in `claim.verification`. This module only works out where to draw a
 * highlight in the raw string the user actually pasted.
 *
 * The two never disagree in a way that matters: a claim can verify here and
 * still fail to locate — normalization collapses whitespace and strips
 * punctuation, so a quote that matched a normalized token stream may have no
 * exact counterpart in the original. That is a defined degradation. The claim
 * keeps its tier and stays in the checklist; it simply gets no inline marker.
 * What must never happen is the reverse — this file cannot upgrade, downgrade or
 * second-guess a verification result, and has no access to one.
 */

/** A run of CV text, optionally attributable to one claim. */
export interface DocumentSegment {
  text: string
  /** `null` for ordinary prose between markers. */
  claim: PublicVerifiedClaim | null
}

interface Located {
  claim: PublicVerifiedClaim
  start: number
  end: number
}

/**
 * Finds a quote in the source.
 *
 * Exact first, then case-insensitive. The widening is deliberately that narrow:
 * it matches the same span, at the same length, and only forgives the casing a
 * model routinely changes when it re-types a line. Anything looser would start
 * highlighting text the model did not actually quote, which is worse than
 * highlighting nothing — the document is the evidence, so a marker in the wrong
 * place is a false claim about where support was found.
 */
function findQuote(sourceText: string, quote: string): { start: number; end: number } | null {
  if (quote.length === 0) return null

  const exact = sourceText.indexOf(quote)
  if (exact !== -1) return { start: exact, end: exact + quote.length }

  const insensitive = sourceText.toLowerCase().indexOf(quote.toLowerCase())
  if (insensitive !== -1) return { start: insensitive, end: insensitive + quote.length }

  return null
}

/**
 * Splits the CV into segments, marking the ones a claim cites.
 *
 * Only `verified` and `uncertain` claims are marked. `unresolved` claims have no
 * span to highlight — nothing was found, and inventing a location for "not
 * found" would be the document asserting something it cannot support. They
 * appear in the checklist only.
 *
 * Overlapping matches keep the earlier one. Two claims citing overlapping text
 * is rare, but a nested marker would produce ambiguous highlighting and there is
 * no principled basis for preferring one claim over the other.
 */
export function buildDocumentSegments(
  cvText: string,
  claims: readonly PublicVerifiedClaim[]
): DocumentSegment[] {
  const located: Located[] = []

  for (const claim of claims) {
    if (claim.verification === 'unresolved') continue
    if (claim.evidence_quote === null) continue

    const position = findQuote(cvText, claim.evidence_quote)
    if (position === null) continue

    located.push({ claim, start: position.start, end: position.end })
  }

  located.sort((a, b) => a.start - b.start || b.end - a.end)

  const segments: DocumentSegment[] = []
  let cursor = 0

  for (const match of located) {
    if (match.start < cursor) continue

    if (match.start > cursor) {
      segments.push({ text: cvText.slice(cursor, match.start), claim: null })
    }

    segments.push({ text: cvText.slice(match.start, match.end), claim: match.claim })
    cursor = match.end
  }

  if (cursor < cvText.length) {
    segments.push({ text: cvText.slice(cursor), claim: null })
  }

  return segments
}

/** The claim ids that got an inline marker, for the checklist to cross-reference. */
export function locatableClaimIds(
  cvText: string,
  claims: readonly PublicVerifiedClaim[]
): Set<string> {
  return new Set(
    buildDocumentSegments(cvText, claims)
      .filter((segment) => segment.claim !== null)
      .map((segment) => (segment.claim as PublicVerifiedClaim).id)
  )
}
