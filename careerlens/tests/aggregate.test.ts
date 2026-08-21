import { aggregateCoverage } from '@/lib/analysis/aggregate'
import type { ClaimCategory, VerificationTier, VerifiedClaim } from '@/types'

function verified(
  verification: VerificationTier,
  category: ClaimCategory = 'skill',
  id = 'claim-0'
): VerifiedClaim {
  return {
    id,
    requirement: 'A requirement',
    category,
    status: verification === 'verified' ? 'matched' : 'gap',
    evidence_quote: verification === 'unresolved' ? null : 'some quote',
    rationale: 'One sentence about the document.',
    verification,
    match_score: verification === 'verified' ? 0.95 : null,
    hallucination_candidate: false,
  }
}

describe('aggregateCoverage — counts', () => {
  it('counts each tier and totals them', () => {
    const summary = aggregateCoverage([
      verified('verified'),
      verified('verified'),
      verified('uncertain'),
      verified('unresolved'),
    ])

    expect(summary.verifiedCount).toBe(2)
    expect(summary.uncertainCount).toBe(1)
    expect(summary.unresolvedCount).toBe(1)
    expect(summary.total).toBe(4)
  })

  it('keeps the three counts summing to total, so the ratio is always recountable', () => {
    const summary = aggregateCoverage([
      verified('verified'),
      verified('uncertain'),
      verified('uncertain'),
      verified('unresolved'),
      verified('unresolved'),
      verified('unresolved'),
    ])

    expect(summary.verifiedCount + summary.uncertainCount + summary.unresolvedCount).toBe(
      summary.total
    )
  })
})

describe('aggregateCoverage — overall ratio', () => {
  it('is verifiedCount / total, exactly', () => {
    const summary = aggregateCoverage([
      verified('verified'),
      verified('verified'),
      verified('verified'),
      verified('uncertain'),
    ])

    expect(summary.overall).toBe(0.75)
  })

  it('counts only verified toward coverage — uncertain does not partially count', () => {
    const summary = aggregateCoverage([verified('verified'), verified('uncertain')])

    expect(summary.overall).toBe(0.5)
  })

  it('is 0 and never NaN when there are no claims at all', () => {
    const summary = aggregateCoverage([])

    // Zero claims is a defined empty state, not a failure — an opportunity too
    // vague to yield requirements. NaN here would reach the UI as "NaN%" and
    // poison any research aggregate that averaged over it.
    expect(summary.overall).toBe(0)
    expect(Number.isNaN(summary.overall)).toBe(false)
    expect(summary).toEqual({
      overall: 0,
      byCategory: {},
      verifiedCount: 0,
      uncertainCount: 0,
      unresolvedCount: 0,
      total: 0,
    })
  })

  it('is 0 when nothing verified, and 1 when everything did', () => {
    expect(aggregateCoverage([verified('unresolved'), verified('unresolved')]).overall).toBe(0)
    expect(aggregateCoverage([verified('verified'), verified('verified')]).overall).toBe(1)
  })
})

describe('aggregateCoverage — byCategory', () => {
  it('scopes the same ratio to each category', () => {
    const summary = aggregateCoverage([
      verified('verified', 'skill', 'claim-0'),
      verified('verified', 'skill', 'claim-1'),
      verified('verified', 'skill', 'claim-2'),
      verified('unresolved', 'skill', 'claim-3'),
      verified('verified', 'experience', 'claim-4'),
      verified('verified', 'experience', 'claim-5'),
    ])

    expect(summary.byCategory).toEqual({ skill: 0.75, experience: 1 })
  })

  it('omits a category with no claims rather than recording it as 0', () => {
    const summary = aggregateCoverage([verified('verified', 'skill')])

    // "No education requirements were stated" and "no education requirement was
    // verified" are different facts. Recording the first as 0 would let the UI
    // report a category as failed that was never asked about.
    expect(summary.byCategory).toEqual({ skill: 1 })
    expect('education' in summary.byCategory).toBe(false)
    expect(summary.byCategory.education).toBeUndefined()
  })

  it('records a category as 0 when it genuinely had claims and none verified', () => {
    const summary = aggregateCoverage([
      verified('verified', 'skill', 'claim-0'),
      verified('unresolved', 'education', 'claim-1'),
    ])

    expect(summary.byCategory).toEqual({ skill: 1, education: 0 })
  })

  it('carries the scholarship-only categories when they are present', () => {
    const summary = aggregateCoverage([
      verified('verified', 'research', 'claim-0'),
      verified('unresolved', 'leadership', 'claim-1'),
      verified('verified', 'academic', 'claim-2'),
    ])

    expect(summary.byCategory).toEqual({ research: 1, leadership: 0, academic: 1 })
  })
})
