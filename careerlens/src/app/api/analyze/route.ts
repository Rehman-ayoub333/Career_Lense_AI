import { NextRequest, NextResponse } from 'next/server'

import { callClaudeJSON } from '@/lib/claude'
import { ANALYSIS_SYSTEM_PROMPT, getJobAnalysisPrompt, getScholarshipAnalysisPrompt } from '@/lib/prompts'
import { checkRateLimit, getAIRateLimitKey } from '@/lib/rate-limit'
import { isValidAnalysisMode, validateTextInput } from '@/lib/validators'
import type { AnalysisResult } from '@/types'

const ANALYSIS_SCHEMA = `{
  "score": 0,
  "skills_score": 0,
  "experience_score": 0,
  "education_score": 0,
  "verdict": "Weak Match",
  "verdict_note": "",
  "key_actions": [""],
  "skills_matched": [""],
  "skills_missing": [""],
  "skills_extra": [""],
  "keywords_present": [""],
  "keywords_missing": [""],
  "ats_checks": [{"id": "headings", "label": "Standard section headings", "status": "pass", "note": ""}],
  "salary_range": "",
  "salary_context": "",
  "interview_questions": [{"question": "", "skill_tested": "", "tip": ""}]
}`

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isATSCheck(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  const c = value as Record<string, unknown>
  return typeof c.id === 'string' && typeof c.label === 'string' && typeof c.status === 'string' && typeof c.note === 'string'
}

function isInterviewQuestion(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  const c = value as Record<string, unknown>
  return typeof c.question === 'string' && typeof c.skill_tested === 'string' && typeof c.tip === 'string'
}

function isAnalysisResult(value: unknown): value is AnalysisResult {
  if (!value || typeof value !== 'object') return false

  const candidate = value as Record<string, unknown>

  return (
    typeof candidate.score === 'number' &&
    typeof candidate.skills_score === 'number' &&
    typeof candidate.experience_score === 'number' &&
    typeof candidate.education_score === 'number' &&
    typeof candidate.verdict === 'string' &&
    typeof candidate.verdict_note === 'string' &&
    isStringArray(candidate.key_actions) &&
    isStringArray(candidate.skills_matched) &&
    isStringArray(candidate.skills_missing) &&
    isStringArray(candidate.skills_extra) &&
    isStringArray(candidate.keywords_present) &&
    isStringArray(candidate.keywords_missing) &&
    Array.isArray(candidate.ats_checks) &&
    candidate.ats_checks.length > 0 &&
    candidate.ats_checks.every(isATSCheck) &&
    typeof candidate.salary_range === 'string' &&
    typeof candidate.salary_context === 'string' &&
    Array.isArray(candidate.interview_questions) &&
    candidate.interview_questions.length > 0 &&
    candidate.interview_questions.every(isInterviewQuestion)
  )
}

export async function POST(req: NextRequest) {
  const rateLimit = checkRateLimit(getAIRateLimitKey(req))

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: 'RATE_LIMIT',
        message: 'Too many requests. Please wait 30 seconds.',
      },
      { status: 429 }
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Invalid JSON body supplied.',
      },
      { status: 400 }
    )
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json(
      {
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Request body must be a JSON object.',
      },
      { status: 400 }
    )
  }

  const candidate = body as Record<string, unknown>
  const { cvText, jdText, mode } = candidate

  if (!isValidAnalysisMode(mode)) {
    return NextResponse.json(
      {
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Mode must be either job or scholarship.',
      },
      { status: 400 }
    )
  }

  try {
    const safeCvText = validateTextInput(String(cvText ?? ''), 100, 8000)
    const safeJdText = validateTextInput(String(jdText ?? ''), 50, 4000)

    const prompt = mode === 'job'
      ? getJobAnalysisPrompt(safeCvText, safeJdText)
      : getScholarshipAnalysisPrompt(safeCvText, safeJdText)

    const result = await Promise.race([
      callClaudeJSON<AnalysisResult>(ANALYSIS_SYSTEM_PROMPT, prompt, ANALYSIS_SCHEMA),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('AI_TIMEOUT')), 25_000)
      }),
    ])

    if (!isAnalysisResult(result)) {
      return NextResponse.json(
        {
          success: false,
          error: 'AI_ERROR',
          message: 'Our AI returned an incomplete response. Please try again.',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error.'

    if (message === 'AI_TIMEOUT') {
      return NextResponse.json(
        {
          success: false,
          error: 'TIMEOUT',
          message: 'Analysis took too long. Please try again.',
        },
        { status: 503 }
      )
    }

    if (message.includes('Input must be at least')) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: 'AI_ERROR',
        message,
      },
      { status: 500 }
    )
  }
}
