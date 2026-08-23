import type { GoldClaim } from './dataset.ts'

/**
 * The metrics table from `RESEARCH_EVALUATION_FINAL.md`, as pure functions.
 *
 * Separate from the scripts that call the API so they can be tested without one,
 * and so re-scoring a completed run with a corrected formula does not mean
 * re-calling the model — which is the same reason
 * `RESEARCH_ARCHITECTURE_FINAL.md` requires raw per-item output to be written
 * before any aggregate.
 *
 * Every rate returns `null` rather than 0 when its denominator is empty. Zero
 * would be a claim ("nothing was faithful"); null is the truth ("nothing was
 * measured"), and averaging a fabricated 0 across items would drag every
 * aggregate down silently.
 */

export type VerificationTier = 'verified' | 'uncertain' | 'unresolved'

/** One claim as the pipeline returned it, paired with its gold label if matched. */
export interface ScoredClaim {
  requirement: string
  status: 'matched' | 'partial' | 'gap'
  evidence_quote: string | null
  verification: VerificationTier
  hallucination_candidate: boolean
  match_score: number | null
  /** The gold claim this was aligned to, or null when the pipeline invented it. */
  gold: GoldClaim | null
}

export interface Rate {
  numerator: number
  denominator: number
  /** `null` when the denominator is 0 — not measured, as distinct from zero. */
  value: number | null
}

export function rate(numerator: number, denominator: number): Rate {
  return { numerator, denominator, value: denominator === 0 ? null : numerator / denominator }
}

/** When the system says verified, is it actually right (RQ1). */
export function faithfulnessRate(claims: readonly ScoredClaim[]): Rate {
  const verified = claims.filter((claim) => claim.verification === 'verified')
  const correct = verified.filter((claim) => claim.gold?.gold_status === 'matched')
  return rate(correct.length, verified.length)
}

/** Quoted evidence the deterministic check could not find (RQ1). */
export function hallucinationRate(claims: readonly ScoredClaim[]): Rate {
  const quoted = claims.filter((claim) => claim.evidence_quote !== null)
  const flagged = quoted.filter((claim) => claim.hallucination_candidate)
  return rate(flagged.length, quoted.length)
}

/**
 * The headline comparison: claims the model called matched that the check could
 * not support. This number does not exist at all in the ungrounded pipeline.
 */
export function unsupportedClaimRate(claims: readonly ScoredClaim[]): Rate {
  const matched = claims.filter((claim) => claim.status === 'matched')
  const unsupported = matched.filter((claim) => claim.verification === 'unresolved')
  return rate(unsupported.length, matched.length)
}

export interface PrecisionRecallF1 {
  truePositives: number
  falsePositives: number
  falseNegatives: number
  precision: number | null
  recall: number | null
  f1: number | null
}

/**
 * Claim-level precision/recall/F1, `verified` treated as the positive class and
 * gold `matched` as truth.
 */
export function precisionRecallF1(
  claims: readonly ScoredClaim[],
  goldClaims: readonly GoldClaim[]
): PrecisionRecallF1 {
  const predictedPositive = claims.filter((claim) => claim.verification === 'verified')
  const truePositives = predictedPositive.filter((c) => c.gold?.gold_status === 'matched').length
  const falsePositives = predictedPositive.length - truePositives

  const goldMatched = goldClaims.filter((gold) => gold.gold_status === 'matched')
  const falseNegatives = Math.max(0, goldMatched.length - truePositives)

  const precision = predictedPositive.length === 0 ? null : truePositives / predictedPositive.length
  const recall = goldMatched.length === 0 ? null : truePositives / goldMatched.length

  const f1 =
    precision === null || recall === null || precision + recall === 0
      ? null
      : (2 * precision * recall) / (precision + recall)

  return { truePositives, falsePositives, falseNegatives, precision, recall, f1 }
}

/**
 * Did the model quote the right *sentence*, not merely name the right
 * requirement.
 *
 * Overlap uses the same normalization the production verifier uses, so a
 * disagreement here is measured with the yardstick the system itself applies
 * rather than a second, subtly different one.
 */
export function evidenceExtractionAccuracy(
  claims: readonly ScoredClaim[],
  overlap: (a: string, b: string) => number,
  threshold = 0.5
): Rate {
  const comparable = claims.filter(
    (claim) =>
      claim.evidence_quote !== null &&
      claim.gold?.gold_status === 'matched' &&
      claim.gold.gold_evidence_span !== null
  )

  const aligned = comparable.filter(
    (claim) => overlap(claim.evidence_quote as string, claim.gold?.gold_evidence_span as string) >= threshold
  )

  return rate(aligned.length, comparable.length)
}

/* ── Statistics ───────────────────────────────────────────────────────────── */

export function mean(values: readonly number[]): number | null {
  return values.length === 0 ? null : values.reduce((sum, v) => sum + v, 0) / values.length
}

/** Sample standard deviation (n-1). Experiment 2's dependent variable. */
export function standardDeviation(values: readonly number[]): number | null {
  if (values.length < 2) return null
  const average = mean(values) as number
  const variance =
    values.reduce((sum, value) => sum + (value - average) ** 2, 0) / (values.length - 1)
  return Math.sqrt(variance)
}

/**
 * Wilson score interval for a proportion.
 *
 * Wilson rather than the normal approximation because at n = 60-150, and for
 * rates near 0 or 1 (which a hallucination rate should be), the normal interval
 * produces bounds outside [0, 1] and understates uncertainty. This is the
 * smallest defensible choice at this sample size, which is the standard
 * `RESEARCH_EVALUATION_FINAL.md` sets.
 */
export function wilsonInterval(successes: number, total: number, z = 1.96): [number, number] | null {
  if (total === 0) return null

  const p = successes / total
  const denominator = 1 + (z * z) / total
  const centre = p + (z * z) / (2 * total)
  const spread = z * Math.sqrt((p * (1 - p)) / total + (z * z) / (4 * total * total))

  return [
    Math.max(0, (centre - spread) / denominator),
    Math.min(1, (centre + spread) / denominator),
  ]
}

/**
 * Cohen's κ for two labellers over a categorical field.
 *
 * Raw agreement overstates chance-level agreement on an imbalanced label set,
 * which `gold_status` certainly is — most requirements in a realistic CV are
 * `matched`, so two labellers guessing would agree often.
 */
export function cohensKappa(a: readonly string[], b: readonly string[]): number | null {
  if (a.length !== b.length) {
    throw new Error(`Labeller arrays differ in length: ${a.length} vs ${b.length}.`)
  }
  if (a.length === 0) return null

  const categories = [...new Set([...a, ...b])]
  const observed = a.filter((label, index) => label === b[index]).length / a.length

  const expected = categories.reduce((sum, category) => {
    const pA = a.filter((label) => label === category).length / a.length
    const pB = b.filter((label) => label === category).length / b.length
    return sum + pA * pB
  }, 0)

  return expected === 1 ? null : (observed - expected) / (1 - expected)
}
