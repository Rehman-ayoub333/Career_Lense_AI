import { buildDocumentSegments, locatableClaimIds } from '@/lib/analysis/locate'
import type { PublicVerifiedClaim, VerificationTier } from '@/types'

/**
 * Quote location for the evidence document.
 *
 * Display logic only. Every test here is about *where a highlight is drawn*,
 * never about whether a claim is true — that was settled in `grounding.ts`, and
 * the last test in this file pins the fact that this module cannot revisit it.
 */

const CV = `Sana Iqbal — Software Engineer

Built and shipped three production React applications over 4 years.
Led a team of 4 engineers through a migration from REST to GraphQL.`

function claim(
  overrides: Partial<PublicVerifiedClaim> & { verification: VerificationTier }
): PublicVerifiedClaim {
  return {
    id: 'claim-0',
    requirement: 'Production React experience',
    category: 'skill',
    status: 'matched',
    evidence_quote: null,
    rationale: 'The CV states four years of React work.',
    ...overrides,
  }
}

describe('buildDocumentSegments', () => {
  it('splits the CV around a located quote, preserving every character', () => {
    const quote = 'Led a team of 4 engineers'
    const segments = buildDocumentSegments(CV, [
      claim({ verification: 'verified', evidence_quote: quote }),
    ])

    const marked = segments.filter((segment) => segment.claim !== null)
    expect(marked).toHaveLength(1)
    expect(marked[0].text).toBe(quote)

    // Nothing added, nothing dropped — the document under examination must not
    // be reformatted by the act of marking it.
    expect(segments.map((segment) => segment.text).join('')).toBe(CV)
  })

  it('matches case-insensitively when an exact match fails', () => {
    const segments = buildDocumentSegments(CV, [
      claim({ verification: 'verified', evidence_quote: 'LED A TEAM OF 4 ENGINEERS' }),
    ])

    const marked = segments.filter((segment) => segment.claim !== null)
    expect(marked).toHaveLength(1)
    // The CV's own casing is rendered, not the model's.
    expect(marked[0].text).toBe('Led a team of 4 engineers')
  })

  it('marks nothing when the quote is not in the document, without crashing', () => {
    const segments = buildDocumentSegments(CV, [
      claim({ verification: 'verified', evidence_quote: 'ten years of Kubernetes at scale' }),
    ])

    expect(segments.filter((segment) => segment.claim !== null)).toHaveLength(0)
    // The defined degradation: the whole document still renders as prose.
    expect(segments.map((segment) => segment.text).join('')).toBe(CV)
  })

  it('never marks an unresolved claim, even if its quote would be findable', () => {
    // Contrived — normalization means an unresolved claim's quote is usually
    // absent — but the rule must hold on the mechanism, not on the odds. Nothing
    // was found, so there is no location to assert.
    const segments = buildDocumentSegments(CV, [
      claim({ verification: 'unresolved', evidence_quote: 'Led a team of 4 engineers' }),
    ])

    expect(segments.filter((segment) => segment.claim !== null)).toHaveLength(0)
  })

  it('skips a claim with no quote', () => {
    const segments = buildDocumentSegments(CV, [claim({ verification: 'verified' })])
    expect(segments.filter((segment) => segment.claim !== null)).toHaveLength(0)
  })

  it('marks uncertain claims alongside verified ones', () => {
    const segments = buildDocumentSegments(CV, [
      claim({ id: 'claim-0', verification: 'verified', evidence_quote: 'Led a team of 4 engineers' }),
      claim({
        id: 'claim-1',
        verification: 'uncertain',
        evidence_quote: 'three production React applications',
      }),
    ])

    const marked = segments.filter((segment) => segment.claim !== null)
    expect(marked.map((segment) => segment.claim?.verification).sort()).toEqual([
      'uncertain',
      'verified',
    ])
  })

  it('returns segments in document order regardless of claim order', () => {
    const segments = buildDocumentSegments(CV, [
      claim({ id: 'claim-0', verification: 'verified', evidence_quote: 'Led a team of 4 engineers' }),
      claim({
        id: 'claim-1',
        verification: 'verified',
        evidence_quote: 'three production React applications',
      }),
    ])

    const markedIds = segments.filter((s) => s.claim !== null).map((s) => s.claim?.id)
    // claim-1's text appears earlier in the CV than claim-0's.
    expect(markedIds).toEqual(['claim-1', 'claim-0'])
  })

  it('keeps the first of two overlapping matches rather than nesting them', () => {
    const segments = buildDocumentSegments(CV, [
      claim({ id: 'claim-0', verification: 'verified', evidence_quote: 'Led a team of 4 engineers' }),
      claim({ id: 'claim-1', verification: 'verified', evidence_quote: 'a team of 4' }),
    ])

    expect(segments.filter((segment) => segment.claim !== null)).toHaveLength(1)
    expect(segments.map((segment) => segment.text).join('')).toBe(CV)
  })

  it('handles an empty claim list and an empty document', () => {
    expect(buildDocumentSegments(CV, [])).toEqual([{ text: CV, claim: null }])
    expect(buildDocumentSegments('', [])).toEqual([])
  })

  it('does not read or alter verification — it only locates', () => {
    const input = claim({ verification: 'uncertain', evidence_quote: 'Led a team of 4 engineers' })
    const [marked] = buildDocumentSegments(CV, [input]).filter((s) => s.claim !== null)

    // The tier travels through untouched. This module has no mechanism to change
    // it and must never acquire one.
    expect(marked.claim).toBe(input)
    expect(marked.claim?.verification).toBe('uncertain')
  })
})

describe('locatableClaimIds', () => {
  it('reports only the claims that actually got a marker', () => {
    const ids = locatableClaimIds(CV, [
      claim({ id: 'claim-0', verification: 'verified', evidence_quote: 'Led a team of 4 engineers' }),
      claim({ id: 'claim-1', verification: 'verified', evidence_quote: 'not in the document' }),
      claim({ id: 'claim-2', verification: 'unresolved' }),
    ])

    expect([...ids]).toEqual(['claim-0'])
  })
})
