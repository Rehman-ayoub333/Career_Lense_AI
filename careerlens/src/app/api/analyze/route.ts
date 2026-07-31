import { generateJson } from '@/lib/ai'
import { AI_TIMEOUT_MS, INPUT_LIMITS } from '@/lib/analysis/constants'
import { isAnalysisResult, normalizeAnalysisResult } from '@/lib/analysis/guards'
import { ANALYSIS_SCHEMA, SCHOLARSHIP_ANALYSIS_SCHEMA } from '@/lib/analysis/schemas'
import { createApiRoute, readJsonBody } from '@/lib/api/route'
import { AppError } from '@/lib/errors'
import {
  ANALYSIS_SYSTEM_PROMPT,
  SCHOLARSHIP_SYSTEM_PROMPT,
  getJobAnalysisPrompt,
  getScholarshipAnalysisPrompt,
} from '@/lib/prompts'
import { checkAiRateLimit } from '@/lib/rate-limit'
import { isAnalysisMode, parseObjectBody, parseTextField } from '@/lib/validators'
import type { AnalysisResult } from '@/types'

/** The AI client and env access need Node APIs; pin the runtime explicitly. */
export const runtime = 'nodejs'

/**
 * Declared so the platform's function ceiling sits *above* our own budget.
 * Without it the host's default (10s on several plans) fires first, and the
 * browser receives an opaque gateway error page instead of our timeout message.
 *
 * Must be a literal: Next only statically analyses literal segment configs, and
 * an imported constant here fails the build. Kept in step with `AI_TIMEOUT_MS`.
 */
export const maxDuration = 60

export const POST = createApiRoute<AnalysisResult>({
  name: 'analyze',
  timeoutMs: AI_TIMEOUT_MS.analyze,
  rateLimit: { check: checkAiRateLimit, scope: 'ai' },

  async handler(request, { signal }) {
    const body = parseObjectBody(await readJsonBody(request))
    const { mode } = body

    if (!isAnalysisMode(mode)) {
      throw new AppError('VALIDATION_ERROR', {
        publicMessage: 'Please choose either job description or scholarship mode.',
        detail: `Mode was ${JSON.stringify(mode)}.`,
      })
    }

    const isScholarship = mode === 'scholarship'

    const cvText = parseTextField(body.cvText, { label: 'CV', ...INPUT_LIMITS.cv })
    const jdText = parseTextField(body.jdText, {
      label: isScholarship ? 'scholarship criteria' : 'job description',
      ...INPUT_LIMITS.jd,
    })

    const result = await generateJson<AnalysisResult>({
      label: `analyze:${mode}`,
      system: isScholarship ? SCHOLARSHIP_SYSTEM_PROMPT : ANALYSIS_SYSTEM_PROMPT,
      user: isScholarship
        ? getScholarshipAnalysisPrompt(cvText, jdText)
        : getJobAnalysisPrompt(cvText, jdText),
      schema: isScholarship ? SCHOLARSHIP_ANALYSIS_SCHEMA : ANALYSIS_SCHEMA,
      validate: isAnalysisResult,
      signal,
    })

    return normalizeAnalysisResult(result)
  },
})
