import type { JsonSchema } from '@/lib/ai'

import { ATS_STATUSES, EXPECTED_COUNTS, MATCH_VERDICTS } from './constants'

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

const ANALYSIS_PROPERTIES: Record<string, JsonSchema> = {
  score: score('Overall match, 0-100. Be honest; do not inflate.'),
  skills_score: score('Skills alignment, 0-100.'),
  experience_score: score('Experience alignment, 0-100.'),
  education_score: score('Education alignment, 0-100.'),
  verdict: { type: 'string', description: 'Band matching the overall score.', enum: MATCH_VERDICTS },
  verdict_note: { type: 'string', description: 'One sentence specific to this CV and this opportunity.' },
  key_actions: stringArray(
    `Exactly ${EXPECTED_COUNTS.keyActions} actions, most impactful first. Each must be concrete and doable this week.`,
    EXPECTED_COUNTS.keyActions
  ),
  skills_matched: stringArray('Skills the CV genuinely evidences that the opportunity requires.'),
  skills_missing: stringArray('Required skills with no evidence in the CV.'),
  skills_extra: stringArray('Notable skills the CV has that the opportunity does not ask for.'),
  keywords_present: stringArray('Exact keyword phrases from the description that appear in the CV.'),
  keywords_missing: stringArray('High-value keyword phrases from the description absent from the CV.'),
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
}

const ANALYSIS_REQUIRED = Object.keys(ANALYSIS_PROPERTIES)

export const ANALYSIS_SCHEMA: JsonSchema = {
  type: 'object',
  properties: ANALYSIS_PROPERTIES,
  required: ANALYSIS_REQUIRED,
}

/**
 * Scholarship mode reuses the analysis contract and adds committee-specific axes.
 * Keeping one result type means every results tab renders both modes without a
 * parallel component tree.
 */
const SCHOLARSHIP_PROPERTIES: Record<string, JsonSchema> = {
  ...ANALYSIS_PROPERTIES,
  research_score: score('Evidence of academic and research capability, 0-100.'),
  leadership_score: score('Leadership roles and community impact, 0-100.'),
  academic_score: score('Academic record, institution and course relevance, 0-100.'),
  scholarship_specific_tips: stringArray(
    'Three tips specific to this named programme, never generic scholarship advice.',
    3
  ),
}

export const SCHOLARSHIP_ANALYSIS_SCHEMA: JsonSchema = {
  type: 'object',
  properties: SCHOLARSHIP_PROPERTIES,
  required: Object.keys(SCHOLARSHIP_PROPERTIES),
}

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
