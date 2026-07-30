import { getGoogleApiKey, getGoogleModel } from '@/lib/env'
import { AppError } from '@/lib/errors'
import { logger } from '@/lib/logger'

import type { AiProvider, AiRequest, AiResponse, JsonSchema } from './types'

/**
 * Google Gemini provider, over the REST API.
 *
 * Implemented with `fetch` rather than the vendor SDK deliberately:
 *   - the surface we need is a single `generateContent` call (~1 request shape)
 *   - it keeps the serverless bundle small and cold starts short
 *   - it avoids adding a dependency, per the project's dependency policy
 *   - the same code runs unchanged on the Node and Edge runtimes
 */

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

/** Statuses where retrying can plausibly succeed. 4xx (except 429) cannot. */
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504])
const MAX_ATTEMPTS = 3
const BASE_BACKOFF_MS = 400

/**
 * CV and job-description text is routinely flagged by naive content filters —
 * military service, medical roles, criminal-justice work, and non-English names
 * all produce false positives at the default thresholds. Raising every category
 * to BLOCK_ONLY_HIGH keeps genuine abuse blocked while letting real CVs through.
 */
const SAFETY_SETTINGS = [
  'HARM_CATEGORY_HARASSMENT',
  'HARM_CATEGORY_HATE_SPEECH',
  'HARM_CATEGORY_SEXUALLY_EXPLICIT',
  'HARM_CATEGORY_DANGEROUS_CONTENT',
].map((category) => ({ category, threshold: 'BLOCK_ONLY_HIGH' }))

/** Gemini expects OpenAPI-style uppercase type names. */
function toGeminiSchema(schema: JsonSchema): Record<string, unknown> {
  switch (schema.type) {
    case 'object':
      return {
        type: 'OBJECT',
        description: schema.description,
        properties: Object.fromEntries(
          Object.entries(schema.properties).map(([key, value]) => [key, toGeminiSchema(value)])
        ),
        required: schema.required ? [...schema.required] : undefined,
        // Fixing key order measurably improves adherence for wide objects.
        propertyOrdering: Object.keys(schema.properties),
      }
    case 'array':
      return {
        type: 'ARRAY',
        description: schema.description,
        items: toGeminiSchema(schema.items),
        minItems: schema.minItems,
        maxItems: schema.maxItems,
      }
    case 'string':
      return { type: 'STRING', description: schema.description, enum: schema.enum ? [...schema.enum] : undefined }
    case 'integer':
      return { type: 'INTEGER', description: schema.description, minimum: schema.minimum, maximum: schema.maximum }
    case 'number':
      return { type: 'NUMBER', description: schema.description }
    case 'boolean':
      return { type: 'BOOLEAN', description: schema.description }
  }
}

interface GeminiResponseBody {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> }
    finishReason?: string
  }>
  promptFeedback?: { blockReason?: string }
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(new AppError('AI_TIMEOUT', { detail: 'Aborted while backing off between retries.' }))
      },
      { once: true }
    )
  })
}

/**
 * Maps an upstream failure onto our taxonomy.
 *
 * The upstream body is recorded in `detail` (server logs only). It is never used
 * as a user-facing message, because Google's error strings name the model, the
 * quota metric, and a documentation URL — all of which Phase 7 forbids exposing.
 */
function mapHttpFailure(status: number, body: string, model: string): AppError {
  const detail = `Gemini ${status} for model ${model}: ${body.slice(0, 500)}`

  if (status === 400) {
    return new AppError('CONFIG_ERROR', { detail: `Malformed request. ${detail}` })
  }
  if (status === 401 || status === 403) {
    return new AppError('CONFIG_ERROR', { detail: `Credentials rejected. ${detail}` })
  }
  if (status === 404) {
    return new AppError('CONFIG_ERROR', { detail: `Unknown model. ${detail}` })
  }
  if (status === 429) {
    return new AppError('AI_UNAVAILABLE', { detail: `Quota exhausted. ${detail}`, retryAfterSeconds: 30 })
  }
  return new AppError('AI_UNAVAILABLE', { detail })
}

export const googleProvider: AiProvider = {
  id: 'google',

  isConfigured(): boolean {
    return Boolean(getGoogleApiKey())
  },

  async generate(request: AiRequest): Promise<AiResponse> {
    const apiKey = getGoogleApiKey()
    if (!apiKey) {
      throw new AppError('CONFIG_ERROR', {
        detail: 'GOOGLE_API_KEY is not set. The AI provider cannot start.',
      })
    }

    const model = getGoogleModel()

    const generationConfig: Record<string, unknown> = {
      temperature: request.temperature ?? 0,
      maxOutputTokens: request.maxOutputTokens ?? 4096,
    }

    // Constrained decoding — only for JSON turns. Applying it to prose endpoints
    // (cover letter, chat) would force those replies into JSON and corrupt them.
    if (request.format === 'json') {
      generationConfig.responseMimeType = 'application/json'
      if (request.schema) {
        generationConfig.responseSchema = toGeminiSchema(request.schema)
      }
    }

    // Gemini 2.5 reasons before answering by default. For deterministic extraction
    // that adds several seconds of latency and can consume the whole output budget,
    // yielding an empty candidate. Disable it; the task needs no deliberation.
    if (model.includes('2.5')) {
      generationConfig.thinkingConfig = { thinkingBudget: 0 }
    }

    const payload = {
      systemInstruction: { parts: [{ text: request.system }] },
      contents: [{ role: 'user', parts: [{ text: request.user }] }],
      generationConfig,
      safetySettings: SAFETY_SETTINGS,
    }

    let lastError: AppError | undefined

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      if (request.signal?.aborted) {
        throw new AppError('AI_TIMEOUT', { detail: 'Request aborted before dispatch.' })
      }

      let response: Response
      try {
        response = await fetch(`${API_BASE}/${encodeURIComponent(model)}:generateContent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Sent as a header, never as a `?key=` query parameter: URLs are
            // recorded by proxies, CDNs and access logs; headers are not.
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify(payload),
          signal: request.signal,
          cache: 'no-store',
        })
      } catch (cause) {
        if (request.signal?.aborted) {
          throw new AppError('AI_TIMEOUT', { detail: 'Upstream request aborted.', cause })
        }
        lastError = new AppError('AI_UNAVAILABLE', {
          detail: `Network failure reaching the AI provider (attempt ${attempt}).`,
          cause,
        })
        if (attempt < MAX_ATTEMPTS) {
          await sleep(BASE_BACKOFF_MS * 2 ** (attempt - 1) + Math.random() * 200, request.signal)
          continue
        }
        throw lastError
      }

      if (!response.ok) {
        const body = await response.text().catch(() => '<unreadable>')
        lastError = mapHttpFailure(response.status, body, model)

        if (RETRYABLE_STATUSES.has(response.status) && attempt < MAX_ATTEMPTS) {
          // Honour the server's own pacing hint when it sends one.
          const retryAfter = Number(response.headers.get('retry-after'))
          const delay = Number.isFinite(retryAfter) && retryAfter > 0
            ? Math.min(retryAfter * 1000, 5000)
            : BASE_BACKOFF_MS * 2 ** (attempt - 1) + Math.random() * 200

          logger.warn('AI request failed, retrying', {
            provider: 'google',
            status: response.status,
            attempt,
            delayMs: Math.round(delay),
          })
          await sleep(delay, request.signal)
          continue
        }

        throw lastError
      }

      const body = (await response.json()) as GeminiResponseBody

      // The prompt itself was rejected — no candidate will ever be produced.
      if (body.promptFeedback?.blockReason) {
        throw new AppError('AI_CONTENT_BLOCKED', {
          detail: `Prompt blocked upstream: ${body.promptFeedback.blockReason}`,
        })
      }

      const candidate = body.candidates?.[0]
      const finishReason = candidate?.finishReason

      if (finishReason === 'SAFETY' || finishReason === 'PROHIBITED_CONTENT' || finishReason === 'RECITATION') {
        throw new AppError('AI_CONTENT_BLOCKED', {
          detail: `Candidate suppressed upstream: ${finishReason}`,
        })
      }

      const text = candidate?.content?.parts?.map((part) => part.text ?? '').join('').trim() ?? ''

      if (!text) {
        // An empty candidate on a successful call is almost always a truncated
        // response; surfacing it as invalid output triggers the caller's repair path.
        throw new AppError('AI_INVALID_OUTPUT', {
          detail: `Empty candidate returned (finishReason=${finishReason ?? 'none'}).`,
        })
      }

      if (finishReason === 'MAX_TOKENS') {
        logger.warn('AI response hit the output token ceiling', { provider: 'google', model })
      }

      return {
        text,
        model,
        usage: {
          inputTokens: body.usageMetadata?.promptTokenCount ?? 0,
          outputTokens: body.usageMetadata?.candidatesTokenCount ?? 0,
        },
      }
    }

    throw lastError ?? new AppError('AI_UNAVAILABLE', { detail: 'Exhausted all attempts.' })
  },
}
