import { generateJson } from '@/lib/ai'
import { AI_TIMEOUT_MS, INPUT_LIMITS, ROUTE_MAX_DURATION_SECONDS } from '@/lib/analysis/constants'
import { isRewriteResult, normalizeRewriteResult } from '@/lib/analysis/guards'
import { REWRITE_SCHEMA } from '@/lib/analysis/schemas'
import { createApiRoute, readJsonBody } from '@/lib/api/route'
import { REWRITE_SYSTEM_PROMPT, getRewritePrompt } from '@/lib/prompts'
import { checkAiRateLimit } from '@/lib/rate-limit'
import { parseObjectBody, parseTextField } from '@/lib/validators'
import type { RewriteResult } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = ROUTE_MAX_DURATION_SECONDS

export const POST = createApiRoute<RewriteResult>({
  name: 'rewrite',
  timeoutMs: AI_TIMEOUT_MS.rewrite,
  rateLimit: { check: checkAiRateLimit, scope: 'ai' },

  async handler(request, { signal }) {
    const body = parseObjectBody(await readJsonBody(request))

    const cvText = parseTextField(body.cvText, { label: 'CV', ...INPUT_LIMITS.cv })
    const jdText = parseTextField(body.jdText, { label: 'job description', ...INPUT_LIMITS.jd })

    const result = await generateJson<RewriteResult>({
      label: 'rewrite',
      system: REWRITE_SYSTEM_PROMPT,
      user: getRewritePrompt(cvText, jdText),
      schema: REWRITE_SCHEMA,
      validate: isRewriteResult,
      // A little warmth: rewriting is a writing task, and temperature 0 makes
      // every bullet collapse into the same sentence template. Re-generate would
      // otherwise return near-identical output and feel broken.
      temperature: 0.4,
      signal,
    })

    return normalizeRewriteResult(result)
  },
})
