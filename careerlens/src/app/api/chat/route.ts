import { generateText } from '@/lib/ai'
import { AI_TIMEOUT_MS, INPUT_LIMITS } from '@/lib/analysis/constants'
import type { ChatResponse } from '@/lib/api/contract'
import { createApiRoute, readJsonBody } from '@/lib/api/route'
import { CHAT_SYSTEM_PROMPT, getChatPrompt } from '@/lib/prompts'
import { checkAiRateLimit } from '@/lib/rate-limit'
import { parseObjectBody, parseStringArray, parseTextField, sanitizeText } from '@/lib/validators'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * Context sent with each chat turn.
 *
 * Trimmed deliberately: the full CV would be re-sent on every message, which
 * multiplies input tokens across a conversation for little added answer quality.
 * These windows keep the model grounded while holding the per-turn cost flat.
 */
const CHAT_CONTEXT_LIMITS = { cv: 3000, jd: 1500 } as const

export const POST = createApiRoute<ChatResponse>({
  name: 'chat',
  timeoutMs: AI_TIMEOUT_MS.chat,
  rateLimit: { check: checkAiRateLimit, scope: 'ai' },

  async handler(request, { signal }) {
    const body = parseObjectBody(await readJsonBody(request))

    const question = parseTextField(body.message, {
      label: 'question',
      min: INPUT_LIMITS.chatMessage.min,
      max: INPUT_LIMITS.chatMessage.max,
      // The one field deliberately left truncating when `parseTextField` moved
      // to rejecting (D1). A chat question is not evidence: nothing grounds
      // against it, no claim cites it, and the 500-character ceiling is a cost
      // budget on the highest-frequency endpoint rather than a correctness
      // boundary. Changing it would alter behaviour on a field the D1 finding
      // did not concern, so it is held at the existing behaviour pending an
      // explicit decision.
      //
      // Worth revisiting on its own: truncating a question mid-sentence and
      // answering the fragment is arguably its own small correctness problem.
      onOverflow: 'truncate',
    })

    const reply = await generateText({
      label: 'chat',
      system: CHAT_SYSTEM_PROMPT,
      user: getChatPrompt({
        cvText: sanitizeText(String(body.cvText ?? ''), CHAT_CONTEXT_LIMITS.cv),
        jdText: sanitizeText(String(body.jdText ?? ''), CHAT_CONTEXT_LIMITS.jd),
        score: typeof body.score === 'number' && Number.isFinite(body.score) ? body.score : 0,
        verdict: sanitizeText(String(body.verdict ?? ''), 40),
        missingSkills: parseStringArray(body.missingSkills, 20),
        question,
      }),
      temperature: 0.5,
      // Two to three sentences. A tight ceiling also caps the cost of the
      // highest-frequency endpoint in the app.
      maxOutputTokens: 512,
      signal,
    })

    return { reply: reply.trim() }
  },
})
