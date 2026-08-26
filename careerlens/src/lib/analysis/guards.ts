import type {
  AnalysisDraft,
  ATSCheckDraft,
  ClaimDraft,
  InterviewQuestion,
  NormalizedAnalysisDraft,
  RequirementClaim,
  RewriteResult,
} from '@/types'

import {
  ATS_STATUSES,
  CLAIM_CATEGORIES,
  CLAIM_STATUSES,
  EXPECTED_COUNTS,
  MATCH_VERDICTS,
} from './constants'

/**
 * Runtime shape validation for model output.
 *
 * Constrained decoding makes malformed output rare, but "rare" is not "impossible"
 * and this data is rendered directly into the UI. These guards are the boundary
 * where untrusted model output becomes a trusted domain type — every field the UI
 * dereferences is checked here, so no component needs a defensive `?.` fallback.
 *
 * Previously this logic lived inline in two route files; it now lives once, next
 * to the schema that produces the data it validates.
 */

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

/**
 * Exactly `count` items — not "at least one".
 *
 * These counts used to be impossible to violate: Gemini's constrained decoder
 * was handed `minItems`/`maxItems` and would not emit a non-conforming array.
 * Anthropic's strict mode does not accept those keywords (ADR-22), so
 * `toAnthropicSchema` drops them and the guarantee has to be re-made here or it
 * does not exist at all.
 *
 * Until this was added the guard only checked `length > 0`, which meant an
 * analysis with one ATS check instead of eight passed validation and rendered a
 * near-empty panel. `EXPECTED_COUNTS` is the same constant the prompt text and
 * the schema descriptions are built from, so there is one number per contract
 * rather than three copies that can drift.
 *
 * The trade-off is deliberate and worth naming: a count deviation now costs a
 * repair attempt and, if it repeats, the whole analysis. That is louder than
 * silently under-delivering a contract the product documents — but it is louder,
 * and if live testing shows the model routinely returning 7 checks, the right
 * answer is to relax the contract, not to weaken the guard back to `> 0`.
 */
function hasExactly(value: unknown, count: number): boolean {
  return Array.isArray(value) && value.length === count
}

/** No `source`: which mechanism decided is recorded downstream, never claimed here. */
function isATSCheckDraft(value: unknown): value is ATSCheckDraft {
  if (!value || typeof value !== 'object') return false
  const check = value as Record<string, unknown>
  return (
    typeof check.id === 'string' &&
    typeof check.label === 'string' &&
    typeof check.note === 'string' &&
    typeof check.status === 'string' &&
    (ATS_STATUSES as readonly string[]).includes(check.status)
  )
}

/**
 * One claim as the model emits it — no `id`, no verification fields.
 *
 * `evidence_quote` arrives as a plain string because the provider's schema type
 * cannot express `null` (see `schemas.ts`); the empty string is the agreed
 * sentinel for "no evidence offered" and is resolved to `null` by
 * `normalizeAnalysisDraft`, one step later.
 *
 * The `gap` rule is enforced here rather than there: a claim that says a
 * requirement is unaddressed while simultaneously quoting evidence for it is
 * internally contradictory, and there is no honest way to repair it locally —
 * dropping the quote and dropping the status are equally arbitrary. Rejecting
 * routes it into `generateJson`'s existing single repair attempt, which is the
 * mechanism that already exists for exactly this.
 */
function isClaimDraft(value: unknown): value is ClaimDraft {
  if (!value || typeof value !== 'object') return false
  const claim = value as Record<string, unknown>

  if (
    typeof claim.requirement !== 'string' ||
    typeof claim.rationale !== 'string' ||
    typeof claim.category !== 'string' ||
    !(CLAIM_CATEGORIES as readonly string[]).includes(claim.category) ||
    typeof claim.status !== 'string' ||
    !(CLAIM_STATUSES as readonly string[]).includes(claim.status) ||
    typeof claim.evidence_quote !== 'string'
  ) {
    return false
  }

  return claim.status !== 'gap' || claim.evidence_quote.trim().length === 0
}

function isInterviewQuestion(value: unknown): value is InterviewQuestion {
  if (!value || typeof value !== 'object') return false
  const question = value as Record<string, unknown>
  return (
    typeof question.question === 'string' &&
    typeof question.skill_tested === 'string' &&
    typeof question.tip === 'string'
  )
}

/**
 * Validates Stage 1's raw output.
 *
 * Note what is *not* checked, because the model never sends it: `coverage`,
 * `verification`, `match_score`, `hallucination_candidate`, claim `id`s, or
 * `ATSCheck.source`. A payload carrying any of those is not more trustworthy for
 * having them — they are simply ignored, and the downstream types make it a
 * compile error to read them off a draft.
 */
export function isAnalysisDraft(value: unknown): value is AnalysisDraft {
  if (!value || typeof value !== 'object') return false
  const result = value as Record<string, unknown>

  return (
    isFiniteNumber(result.score) &&
    typeof result.verdict === 'string' &&
    (MATCH_VERDICTS as readonly string[]).includes(result.verdict) &&
    isStringArray(result.key_actions) &&
    hasExactly(result.key_actions, EXPECTED_COUNTS.keyActions) &&
    // An empty claims array is valid: an opportunity description too vague to
    // yield requirements is a defined empty state, not a malformed response.
    // This is the one collection with no expected count, deliberately — see the
    // `claims` note in `schemas.ts`.
    Array.isArray(result.claims) &&
    result.claims.every(isClaimDraft) &&
    hasExactly(result.ats_checks, EXPECTED_COUNTS.atsChecks) &&
    (result.ats_checks as unknown[]).every(isATSCheckDraft) &&
    typeof result.salary_range === 'string' &&
    typeof result.salary_context === 'string' &&
    hasExactly(result.interview_questions, EXPECTED_COUNTS.interviewQuestions) &&
    (result.interview_questions as unknown[]).every(isInterviewQuestion)
  )
}

export function isRewriteResult(value: unknown): value is RewriteResult {
  if (!value || typeof value !== 'object') return false
  const result = value as Record<string, unknown>

  return (
    isStringArray(result.original_bullets) &&
    result.original_bullets.length > 0 &&
    isStringArray(result.rewritten_bullets) &&
    result.rewritten_bullets.length > 0
  )
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

/**
 * Brings a validated draft into the state Stage 2 expects.
 *
 * Three jobs, all of them mechanical:
 *
 *  1. **Clamp the score** to a 0-100 integer, as before.
 *  2. **Assign claim ids** from the array index. The model is never asked for
 *     these — an id it chose could repeat, and this one is relied on as a React
 *     key and as the anchor an evidence marker cites.
 *  3. **Resolve the evidence sentinel.** `""` (or whitespace) becomes `null`,
 *     which is the canonical "no evidence offered" value. This is the single
 *     place the sentinel is understood: `grounding.ts` receives `string | null`
 *     and has no knowledge that an empty string ever meant anything.
 *
 * Nothing here verifies anything. Deciding whether a quote is real is Stage 2's
 * only job, and it happens after this function returns.
 */
export function normalizeAnalysisDraft(draft: AnalysisDraft): NormalizedAnalysisDraft {
  const cleanList = (items: string[]): string[] =>
    items.map((item) => item.trim()).filter((item) => item.length > 0)

  const claims: RequirementClaim[] = draft.claims.map((claim, index) => {
    const quote = claim.evidence_quote?.trim() ?? ''
    return {
      ...claim,
      id: `claim-${index}`,
      requirement: claim.requirement.trim(),
      rationale: claim.rationale.trim(),
      evidence_quote: quote.length > 0 ? quote : null,
    }
  })

  return {
    ...draft,
    score: clampScore(draft.score),
    key_actions: cleanList(draft.key_actions),
    claims,
  }
}

/**
 * Trims the rewrite to matching pairs.
 *
 * The two arrays are rendered side by side and read as index-aligned. If the model
 * returns four originals and five rewrites, showing all five would silently pair
 * the wrong sentences together — worse than showing four.
 */
export function normalizeRewriteResult(result: RewriteResult): RewriteResult {
  const pairs = Math.min(result.original_bullets.length, result.rewritten_bullets.length)
  return {
    original_bullets: result.original_bullets.slice(0, pairs),
    rewritten_bullets: result.rewritten_bullets.slice(0, pairs),
  }
}
