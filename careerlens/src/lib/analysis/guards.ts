import type { AnalysisResult, ATSCheck, InterviewQuestion, RewriteResult } from '@/types'

import { ATS_STATUSES, MATCH_VERDICTS } from './constants'

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

function isATSCheck(value: unknown): value is ATSCheck {
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

function isInterviewQuestion(value: unknown): value is InterviewQuestion {
  if (!value || typeof value !== 'object') return false
  const question = value as Record<string, unknown>
  return (
    typeof question.question === 'string' &&
    typeof question.skill_tested === 'string' &&
    typeof question.tip === 'string'
  )
}

export function isAnalysisResult(value: unknown): value is AnalysisResult {
  if (!value || typeof value !== 'object') return false
  const result = value as Record<string, unknown>

  return (
    isFiniteNumber(result.score) &&
    isFiniteNumber(result.skills_score) &&
    isFiniteNumber(result.experience_score) &&
    isFiniteNumber(result.education_score) &&
    typeof result.verdict === 'string' &&
    (MATCH_VERDICTS as readonly string[]).includes(result.verdict) &&
    typeof result.verdict_note === 'string' &&
    isStringArray(result.key_actions) &&
    result.key_actions.length > 0 &&
    isStringArray(result.skills_matched) &&
    isStringArray(result.skills_missing) &&
    isStringArray(result.skills_extra) &&
    isStringArray(result.keywords_present) &&
    isStringArray(result.keywords_missing) &&
    Array.isArray(result.ats_checks) &&
    result.ats_checks.length > 0 &&
    result.ats_checks.every(isATSCheck) &&
    typeof result.salary_range === 'string' &&
    typeof result.salary_context === 'string' &&
    Array.isArray(result.interview_questions) &&
    result.interview_questions.length > 0 &&
    result.interview_questions.every(isInterviewQuestion)
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
 * Brings a validated result into a state the UI can render unconditionally:
 * scores clamped to 0-100 integers, and empty strings dropped from tag lists so
 * the results tabs never paint a blank chip.
 */
export function normalizeAnalysisResult(result: AnalysisResult): AnalysisResult {
  const cleanList = (items: string[]): string[] =>
    items.map((item) => item.trim()).filter((item) => item.length > 0)

  return {
    ...result,
    score: clampScore(result.score),
    skills_score: clampScore(result.skills_score),
    experience_score: clampScore(result.experience_score),
    education_score: clampScore(result.education_score),
    research_score: result.research_score === undefined ? undefined : clampScore(result.research_score),
    leadership_score: result.leadership_score === undefined ? undefined : clampScore(result.leadership_score),
    academic_score: result.academic_score === undefined ? undefined : clampScore(result.academic_score),
    key_actions: cleanList(result.key_actions),
    skills_matched: cleanList(result.skills_matched),
    skills_missing: cleanList(result.skills_missing),
    skills_extra: cleanList(result.skills_extra),
    keywords_present: cleanList(result.keywords_present),
    keywords_missing: cleanList(result.keywords_missing),
    scholarship_specific_tips: result.scholarship_specific_tips
      ? cleanList(result.scholarship_specific_tips)
      : undefined,
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
