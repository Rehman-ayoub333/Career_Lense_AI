import type { ClaimCategory, CoverageSummary, VerifiedClaim } from '@/types'

/**
 * Stage 3 — coverage aggregation.
 *
 * Counts what Stage 2 concluded. Nothing here judges anything, and nothing here
 * is ever asked of the model: `coverage` is the one number on the results screen
 * a reader can recount for themselves from the checklist beside it, which is
 * exactly what earns it a place after six unverifiable sub-scores were removed
 * (Master Plan §16).
 *
 * Pure, like Stage 2, and for the same reason.
 */

/**
 * A ratio, guarded against the zero-claims case.
 *
 * An opportunity too vague to yield any requirement is a defined empty state,
 * not a failure (`FAILURE_MODES_FINAL.md`) — so this has to return a real number
 * rather than `NaN`, which would propagate into the UI as "NaN% verified" and
 * into the research aggregates as a silently poisoned mean.
 */
function ratio(verified: number, total: number): number {
  return total === 0 ? 0 : verified / total
}

/**
 * Summarises a verified claim set.
 *
 * `byCategory` omits categories with no claims rather than recording them as `0`.
 * The distinction is load-bearing: "this opportunity stated no education
 * requirements" and "none of its education requirements were verified" are
 * different facts, and collapsing them to the same `0` would let the UI report a
 * category as failed when it was never asked about. Scholarship-only categories
 * are simply absent in job mode, which is the mechanism that makes that work.
 *
 * The ratios are left as exact division. Rounding is a presentation decision and
 * belongs to whatever renders them; the research scripts want the unrounded
 * value.
 */
export function aggregateCoverage(claims: readonly VerifiedClaim[]): CoverageSummary {
  const total = claims.length

  let verifiedCount = 0
  let uncertainCount = 0
  let unresolvedCount = 0

  /** `[verified, total]` per category, built only for categories actually present. */
  const perCategory = new Map<ClaimCategory, [number, number]>()

  for (const claim of claims) {
    const isVerified = claim.verification === 'verified'

    if (isVerified) verifiedCount += 1
    else if (claim.verification === 'uncertain') uncertainCount += 1
    else unresolvedCount += 1

    const tally = perCategory.get(claim.category) ?? [0, 0]
    tally[0] += isVerified ? 1 : 0
    tally[1] += 1
    perCategory.set(claim.category, tally)
  }

  const byCategory: Partial<Record<ClaimCategory, number>> = {}
  for (const [category, [categoryVerified, categoryTotal]] of perCategory) {
    byCategory[category] = ratio(categoryVerified, categoryTotal)
  }

  return {
    overall: ratio(verifiedCount, total),
    byCategory,
    verifiedCount,
    uncertainCount,
    unresolvedCount,
    total,
  }
}
