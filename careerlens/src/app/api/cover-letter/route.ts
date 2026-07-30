import { generateText } from '@/lib/ai'
import { AI_TIMEOUT_MS, INPUT_LIMITS, ROUTE_MAX_DURATION_SECONDS } from '@/lib/analysis/constants'
import type { CoverLetterResponse } from '@/lib/api/contract'
import { createApiRoute, readJsonBody } from '@/lib/api/route'
import { AppError } from '@/lib/errors'
import { COVER_LETTER_SYSTEM_PROMPT, getCoverLetterPrompt } from '@/lib/prompts'
import { checkAiRateLimit } from '@/lib/rate-limit'
import { parseObjectBody, parseTextField } from '@/lib/validators'

export const runtime = 'nodejs'
export const maxDuration = ROUTE_MAX_DURATION_SECONDS

/** A three-paragraph letter that comes back this short is a truncated generation. */
const MIN_LETTER_CHARS = 200

export const POST = createApiRoute<CoverLetterResponse>({
  name: 'cover-letter',
  timeoutMs: AI_TIMEOUT_MS.coverLetter,
  rateLimit: { check: checkAiRateLimit, scope: 'ai' },

  async handler(request, { signal }) {
    const body = parseObjectBody(await readJsonBody(request))

    const cvText = parseTextField(body.cvText, { label: 'CV', ...INPUT_LIMITS.cv })
    const jdText = parseTextField(body.jdText, { label: 'job description', ...INPUT_LIMITS.jd })

    // `generateText` requests prose. This is the endpoint the previous
    // implementation broke: it applied a JSON response format to every provider
    // call, so a Gemini-only deployment returned a JSON-encoded string here
    // instead of a letter.
    const coverLetter = await generateText({
      label: 'cover-letter',
      system: COVER_LETTER_SYSTEM_PROMPT,
      user: getCoverLetterPrompt(cvText, jdText),
      // Prose needs variation; a deterministic letter reads like a form response.
      temperature: 0.7,
      maxOutputTokens: 1024,
      signal,
    })

    const trimmed = coverLetter.trim()

    if (trimmed.length < MIN_LETTER_CHARS) {
      throw new AppError('AI_INVALID_OUTPUT', {
        publicMessage: 'We could not draft a complete cover letter this time. Please try again.',
        detail: `Cover letter was only ${trimmed.length} characters.`,
      })
    }

    return { coverLetter: trimmed }
  },
})
