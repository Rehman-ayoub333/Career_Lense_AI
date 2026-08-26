import type { JsonSchema } from '@/lib/ai'

import {
  ATS_STATUSES,
  CLAIM_STATUSES,
  EXPECTED_COUNTS,
  JOB_CLAIM_CATEGORIES,
  MATCH_VERDICTS,
  SCHOLARSHIP_CLAIM_CATEGORIES,
} from './constants'

/**
 * Response schemas handed to the provider's constrained decoder.
 *
 * This replaces the previous approach of pasting a JSON template into the prompt
 * and hoping. Describing the contract as a schema means the model is *unable* to
 * emit a missing field, a wrong type, or an out-of-range verdict string — the
 * failure mode is prevented at decode time instead of caught at parse time.
 *
 * `description` values double as field-level instructions, so the guidance that
 * used to bloat the prompt now travels with the field it constrains.
 */

const stringArray = (description: string, minItems?: number): JsonSchema => ({
  type: 'array',
  description,
  items: { type: 'string' },
  minItems,
})

const score = (description: string): JsonSchema => ({
  type: 'integer',
  description,
  minimum: 0,
  maximum: 100,
})

/**
 * Note the absence of `source`: which mechanism decided a check is recorded
 * server-side, not asserted by the model.
 */
const atsCheck: JsonSchema = {
  type: 'object',
  description: 'One ATS compatibility check.',
  properties: {
    id: { type: 'string', description: 'Stable identifier for this check.' },
    label: { type: 'string', description: 'Short human-readable name of the check.' },
    status: { type: 'string', description: 'Outcome of the check.', enum: ATS_STATUSES },
    note: { type: 'string', description: 'One specific sentence about this CV, not generic advice.' },
  },
  required: ['id', 'label', 'status', 'note'],
}

/**
 * One requirement claim.
 *
 * Four fields the final `VerifiedClaim` carries are deliberately absent here,
 * because the model must not be able to produce any of them: `id` (assigned from
 * the array index server-side, so it cannot collide), and `verification` /
 * `match_score` / `hallucination_candidate` (all three computed by the
 * deterministic Stage 2 check). The model's vocabulary is `status` —
 * matched/partial/gap — and nothing in this schema lets it say "verified".
 *
 * ## `evidence_quote` and the empty-string sentinel
 *
 * The canonical type is `string | null`. `JsonSchema` in `lib/ai/types.ts` has no
 * way to express a nullable field — its variants carry a single concrete `type`
 * and no `nullable` flag — so the provider cannot be asked for `null` here
 * without widening the provider contract and the request builder that consumes
 * it, both of which are explicitly out of scope.
 *
 * **Note, post-ADR-22.** The original reason this was impossible was a Gemini
 * limitation: `responseSchema` had no nullable or union form. Anthropic's strict
 * mode *does* — `{"anyOf": [{"type": "string"}, {"type": "null"}]}` — so the
 * sentinel now survives as a workaround for a constraint that no longer exists.
 * It was deliberately not removed during the provider swap, because doing so is a
 * cross-cutting change to `JsonSchema`, this file, `guards.ts` and its tests, not
 * a clean find. See `ADR_10_NULLABLE_INVESTIGATION.md` for the full reasoning and
 * the recommendation to revisit it as its own change after the live-key run.
 *
 * The documented fallback is therefore taken: the model emits an empty string to
 * mean "no evidence offered", and `guards.ts` coerces `""` to `null` at the
 * validation boundary, before anything downstream sees it. Nothing past that
 * boundary knows the sentinel exists — `grounding.ts` receives `string | null`
 * exactly as specified, and the empty-string case never reaches it.
 */
const claimProperties = (categories: readonly string[]): Record<string, JsonSchema> => ({
  requirement: {
    type: 'string',
    description:
      'One specific requirement stated by the opportunity, in its own language. Under 200 characters.',
  },
  category: {
    type: 'string',
    description: 'Which axis of the opportunity this requirement belongs to.',
    enum: categories,
  },
  status: {
    type: 'string',
    description:
      'Your judgement of whether the CV evidences this requirement. Use "gap" when the CV does not address it at all.',
    enum: CLAIM_STATUSES,
  },
  evidence_quote: {
    type: 'string',
    description:
      'The span of text from the CV that supports this requirement, copied near-verbatim — never from the job description, never summarised, never invented. Use an empty string when status is "gap", or whenever you cannot quote real supporting text.',
  },
  rationale: {
    type: 'string',
    description:
      'One sentence, under 240 characters, about what this CV does or does not state. Describe the document, never the person: write "no mention of Docker appears in the CV", never "the candidate lacks Docker".',
  },
})

const claim = (categories: readonly string[]): JsonSchema => ({
  type: 'object',
  description: 'One requirement from the opportunity, judged against the CV.',
  properties: claimProperties(categories),
  required: ['requirement', 'category', 'status', 'evidence_quote', 'rationale'],
})

/**
 * No `minItems`: zero claims is a defined empty state, not a failure. An
 * opportunity description too vague to yield requirements should produce an empty
 * array and a dedicated message, not a decoder that pads the array to satisfy a
 * floor we imposed.
 */
const claims = (categories: readonly string[]): JsonSchema => ({
  type: 'array',
  description:
    'Every distinct requirement the opportunity states, each judged against the CV. Extract them from the opportunity text; do not invent requirements it does not state.',
  items: claim(categories),
})

const interviewQuestion: JsonSchema = {
  type: 'object',
  description: 'A likely interview question derived from a real gap in this CV.',
  properties: {
    question: { type: 'string', description: 'The question an interviewer would actually ask.' },
    skill_tested: { type: 'string', description: 'The specific skill or competency being probed.' },
    tip: { type: 'string', description: 'One sentence on how to answer well.' },
  },
  required: ['question', 'skill_tested', 'tip'],
}

/**
 * Six sub-scores and `verdict_note` are gone from this schema, not merely unused
 * downstream. They were generated on every call, rendered nowhere, and
 * unverifiable by construction — a number the user cannot recount is exactly what
 * this design removes. `coverage`, which replaces them, is not requested from the
 * model at all: it is counted from the verified claims.
 */
const analysisProperties = (categories: readonly string[]): Record<string, JsonSchema> => ({
  score: score('Overall match, 0-100. Be honest; do not inflate.'),
  verdict: { type: 'string', description: 'Band matching the overall score.', enum: MATCH_VERDICTS },
  claims: claims(categories),
  key_actions: stringArray(
    `Exactly ${EXPECTED_COUNTS.keyActions} actions, most impactful first, drawn preferentially from the requirements you marked "gap". Each must be concrete and doable this week. Phrase each as something to add or clarify in the CV — "add evidence of X", never "you do not have X".`,
    EXPECTED_COUNTS.keyActions
  ),
  ats_checks: {
    type: 'array',
    description: `Exactly ${EXPECTED_COUNTS.atsChecks} checks, using the ids given in the instructions and in that order.`,
    items: atsCheck,
    minItems: EXPECTED_COUNTS.atsChecks,
    maxItems: EXPECTED_COUNTS.atsChecks,
  },
  salary_range: { type: 'string', description: 'Realistic range with currency, or "N/A" for scholarships.' },
  salary_context: { type: 'string', description: 'One sentence on what drives the range.' },
  interview_questions: {
    type: 'array',
    description: `Exactly ${EXPECTED_COUNTS.interviewQuestions} questions.`,
    items: interviewQuestion,
    minItems: EXPECTED_COUNTS.interviewQuestions,
    maxItems: EXPECTED_COUNTS.interviewQuestions,
  },
})

const analysisSchema = (categories: readonly string[]): JsonSchema => {
  const properties = analysisProperties(categories)
  return { type: 'object', properties, required: Object.keys(properties) }
}

export const ANALYSIS_SCHEMA: JsonSchema = analysisSchema(JOB_CLAIM_CATEGORIES)

/**
 * Scholarship mode reuses the analysis contract exactly, and differs in one
 * place: the `category` enum widens to admit the three committee axes.
 *
 * It previously differed by carrying three further sub-scores plus a separate
 * tips array. Those are gone with the rest of the sub-scores — the committee axes
 * are now assessed the same way every other axis is, as claims that cite evidence,
 * which is both one code path instead of two and the only version of the
 * distinction a reader can check for themselves.
 */
export const SCHOLARSHIP_ANALYSIS_SCHEMA: JsonSchema = analysisSchema(
  SCHOLARSHIP_CLAIM_CATEGORIES
)

export const REWRITE_SCHEMA: JsonSchema = {
  type: 'object',
  properties: {
    original_bullets: stringArray(
      `Exactly ${EXPECTED_COUNTS.rewriteBullets} bullets copied verbatim from the CV.`,
      EXPECTED_COUNTS.rewriteBullets
    ),
    rewritten_bullets: stringArray(
      `Exactly ${EXPECTED_COUNTS.rewriteBullets} rewrites, index-aligned with original_bullets.`,
      EXPECTED_COUNTS.rewriteBullets
    ),
  },
  required: ['original_bullets', 'rewritten_bullets'],
}
