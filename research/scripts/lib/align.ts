import { normalizeForMatching, tokenize } from '../../../careerlens/src/lib/analysis/grounding.ts'
import type { GoldClaim } from './dataset.ts'

/**
 * Aligning pipeline claims to gold claims.
 *
 * The pipeline extracts requirements in its own words, so "3+ years of React"
 * and "Production React experience" may be the same requirement stated twice.
 * Every metric that compares a claim to its gold label depends on getting this
 * pairing right, which makes it the quietest way for the whole evaluation to be
 * wrong: a bad alignment shows up as a plausible-looking accuracy number rather
 * than as an error.
 *
 * So it is deliberately conservative. Greedy best-match above a threshold, and
 * anything below it is left unaligned — an unaligned claim is reported as
 * exactly that, never silently paired with its nearest neighbour.
 *
 * The overlap uses the production verifier's own normalization, imported
 * directly. That is the one sanctioned cross-boundary import (ADR-08), and it is
 * the right call here for the same reason it is for the ablation: measuring
 * agreement with a second, subtly different normalizer would introduce a
 * difference that belongs to the measuring instrument rather than the system.
 */

/** Symmetric token overlap. Not the verifier's windowed score — these are two labels, not a span in a document. */
export function requirementSimilarity(a: string, b: string): number {
  const tokensA = new Set(tokenize(normalizeForMatching(a)))
  const tokensB = new Set(tokenize(normalizeForMatching(b)))

  if (tokensA.size === 0 || tokensB.size === 0) return 0

  let shared = 0
  for (const token of tokensA) if (tokensB.has(token)) shared += 1

  // Jaccard: penalises a long claim that happens to contain a short gold label.
  return shared / (tokensA.size + tokensB.size - shared)
}

/** Span overlap, for evidence-extraction accuracy. Same normalization. */
export function spanOverlap(a: string, b: string): number {
  return requirementSimilarity(a, b)
}

export interface Alignment<T> {
  claim: T
  gold: GoldClaim | null
  similarity: number
}

/**
 * Pairs each claim with at most one gold claim, and each gold claim with at most
 * one claim.
 *
 * Greedy over all pairs sorted by similarity, which is not optimal assignment —
 * a Hungarian solve would be — but at the handful of claims per item this
 * produces, the difference is vanishingly rare and the greedy version is
 * inspectable by a human reading the raw output, which matters more here.
 */
export function alignClaims<T extends { requirement: string }>(
  claims: readonly T[],
  goldClaims: readonly GoldClaim[],
  threshold = 0.34
): Alignment<T>[] {
  const pairs: { claimIndex: number; goldIndex: number; similarity: number }[] = []

  for (const [claimIndex, claim] of claims.entries()) {
    for (const [goldIndex, gold] of goldClaims.entries()) {
      const similarity = requirementSimilarity(claim.requirement, gold.requirement)
      if (similarity >= threshold) pairs.push({ claimIndex, goldIndex, similarity })
    }
  }

  pairs.sort((a, b) => b.similarity - a.similarity)

  const takenClaims = new Set<number>()
  const takenGold = new Set<number>()
  const chosen = new Map<number, { goldIndex: number; similarity: number }>()

  for (const pair of pairs) {
    if (takenClaims.has(pair.claimIndex) || takenGold.has(pair.goldIndex)) continue
    takenClaims.add(pair.claimIndex)
    takenGold.add(pair.goldIndex)
    chosen.set(pair.claimIndex, { goldIndex: pair.goldIndex, similarity: pair.similarity })
  }

  return claims.map((claim, index) => {
    const match = chosen.get(index)
    return {
      claim,
      gold: match === undefined ? null : goldClaims[match.goldIndex],
      similarity: match?.similarity ?? 0,
    }
  })
}
