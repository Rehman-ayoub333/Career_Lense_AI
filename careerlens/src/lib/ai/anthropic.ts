import Anthropic from '@anthropic-ai/sdk'

import { getAnthropicApiKey, getAnthropicModel } from '@/lib/env'
import { AppError } from '@/lib/errors'
import { logger } from '@/lib/logger'

import type { AiProvider, AiRequest, AiResponse, JsonSchema } from './types'

/**
 * Anthropic Claude provider (ADR-22), over the official SDK.
 *
 * This replaces `google.ts`, which spoke to Gemini over raw `fetch`. The SDK is
 * used here rather than `fetch` for a reason the Gemini module did not have:
 * structured output is expressed as *forced tool use*, whose request and
 * response shapes are considerably more intricate than a `responseSchema` field,
 * and hand-rolling the content-block union is exactly the kind of thing a
 * generated client should own. The SDK also brings retry-with-backoff that
 * honours `retry-after`, which `google.ts` implemented by hand.
 *
 * ## Structured output
 *
 * Gemini constrained the decoder directly. Anthropic has no equivalent for a
 * bare JSON response, so a `json` request is expressed as a single tool whose
 * `input_schema` is the caller's schema, with `tool_choice` pinned to that tool:
 *
 *   - forcing the choice guarantees the tool is called at all;
 *   - `strict: true` on the tool guarantees the arguments validate.
 *
 * The provider then returns `JSON.stringify(block.input)` as `text`. That keeps
 * `AiResponse` unchanged and leaves `generateJson`'s parse → validate → repair
 * chain in place untouched: the caller cannot tell whether the JSON came from a
 * decoder or a tool call, which is the whole point of the seam.
 *
 * ## What did not survive the swap
 *
 * Gemini's per-category safety thresholds (`BLOCK_ONLY_HIGH`) have no Anthropic
 * counterpart — safety is applied by the provider and is not caller-tunable. See
 * `SECURITY_PRIVACY_SPEC.md` §Content-safety settings, which records that as a
 * real loss rather than a no-op. All this module can still do is *react*, which
 * it does by mapping a refusal onto `AI_CONTENT_BLOCKED`.
 *
 * `thinkingConfig: { thinkingBudget: 0 }` also has no counterpart: Haiku 4.5 has
 * no extended thinking to disable. No `thinking` parameter is set here, and per
 * ADR-22 none should be added for this call path at any tier — manual extended
 * thinking is incompatible with a forced `tool_choice`.
 */

/** The one tool a `json` request exposes. Named, not schema-derived, because the provider is given a schema and no name for it. */
const RESULT_TOOL_NAME = 'emit_structured_result'

/**
 * Translates the provider-neutral `JsonSchema` into an Anthropic `input_schema`.
 *
 * Two differences from `toGeminiSchema`, both required by strict mode rather
 * than chosen:
 *
 * 1. **`additionalProperties: false` on every object.** Strict validation
 *    rejects a schema without it. Added here rather than in `schemas.ts` so the
 *    schema definitions stay provider-neutral — the same reason the Gemini
 *    module owned `propertyOrdering`.
 *
 * 2. **Numeric and array-count constraints are dropped.** Anthropic's strict
 *    subset does not accept `minimum`/`maximum` or `minItems`/`maxItems`, so
 *    sending them risks a 400 on every call. They are omitted, and the
 *    obligations they carried — a 0-100 score, exactly 8 ATS checks, 5 interview
 *    questions, 3 key actions, 5 rewrite bullets — now rest on `guards.ts`, the
 *    single repair attempt, and the counts stated in the prompt text.
 *
 *    That is a genuine weakening: under Gemini those counts were impossible to
 *    violate, and now they are merely validated. The safety net already existed
 *    and is unchanged; what changed is that it became load-bearing.
 *    `AI_PIPELINE_FINAL.md` §Structured output records it.
 */
function toAnthropicSchema(schema: JsonSchema): Record<string, unknown> {
  switch (schema.type) {
    case 'object':
      return {
        type: 'object',
        description: schema.description,
        properties: Object.fromEntries(
          Object.entries(schema.properties).map(([key, value]) => [key, toAnthropicSchema(value)])
        ),
        required: schema.required ? [...schema.required] : Object.keys(schema.properties),
        additionalProperties: false,
      }
    case 'array':
      // minItems/maxItems deliberately dropped — see the note above.
      return { type: 'array', description: schema.description, items: toAnthropicSchema(schema.items) }
    case 'string':
      return {
        type: 'string',
        description: schema.description,
        enum: schema.enum ? [...schema.enum] : undefined,
      }
    case 'integer':
      // minimum/maximum deliberately dropped — see the note above.
      return { type: 'integer', description: schema.description }
    case 'number':
      return { type: 'number', description: schema.description }
    case 'boolean':
      return { type: 'boolean', description: schema.description }
  }
}

/**
 * Maps an SDK error onto our taxonomy.
 *
 * The upstream message goes into `detail` (server logs only) and never into a
 * user-facing string, for the same reason it did under Gemini: Anthropic's error
 * bodies name the model, the account and the rate-limit metric.
 */
function mapApiFailure(error: InstanceType<typeof Anthropic.APIError>, model: string): AppError {
  const detail = `Anthropic ${error.status ?? '???'} for model ${model}: ${String(error.message).slice(0, 500)}`

  if (error.status === 400) {
    return new AppError('CONFIG_ERROR', { detail: `Malformed request. ${detail}`, cause: error })
  }
  if (error.status === 401 || error.status === 403) {
    return new AppError('CONFIG_ERROR', { detail: `Credentials rejected. ${detail}`, cause: error })
  }
  if (error.status === 404) {
    return new AppError('CONFIG_ERROR', { detail: `Unknown model. ${detail}`, cause: error })
  }
  if (error.status === 429) {
    return new AppError('AI_UNAVAILABLE', {
      detail: `Rate limited. ${detail}`,
      retryAfterSeconds: 30,
      cause: error,
    })
  }
  return new AppError('AI_UNAVAILABLE', { detail, cause: error })
}

/**
 * One client per key, built lazily.
 *
 * `maxRetries: 2` gives three total attempts, matching the hand-rolled
 * `MAX_ATTEMPTS` the Gemini module used. The SDK retries 408/409/429/5xx and
 * connection errors with exponential backoff and honours `retry-after`, which is
 * the behaviour `google.ts` spent forty lines implementing.
 */
let cached: { key: string; client: Anthropic } | undefined

function getClient(apiKey: string): Anthropic {
  if (cached?.key !== apiKey) {
    cached = { key: apiKey, client: new Anthropic({ apiKey, maxRetries: 2 }) }
  }
  return cached.client
}

export const anthropicProvider: AiProvider = {
  id: 'anthropic',

  isConfigured(): boolean {
    return Boolean(getAnthropicApiKey())
  },

  async generate(request: AiRequest): Promise<AiResponse> {
    const apiKey = getAnthropicApiKey()
    if (!apiKey) {
      throw new AppError('CONFIG_ERROR', {
        detail: 'ANTHROPIC_API_KEY is not set. The AI provider cannot start.',
      })
    }

    const model = getAnthropicModel()
    const client = getClient(apiKey)

    // Forced tool use, only for JSON turns. Applying it to the prose endpoints
    // (cover letter, chat) would force those replies into a tool call and
    // corrupt them — the same reason `responseMimeType` was gated before.
    const structured =
      request.format === 'json' && request.schema
        ? {
            tools: [
              {
                name: RESULT_TOOL_NAME,
                description:
                  'Return the result as structured arguments. Every field is required and the schema is enforced.',
                input_schema: toAnthropicSchema(request.schema) as Anthropic.Tool.InputSchema,
                strict: true,
              },
            ],
            tool_choice: { type: 'tool' as const, name: RESULT_TOOL_NAME },
          }
        : {}

    let message: Anthropic.Message
    try {
      message = await client.messages.create(
        {
          model,
          // Anthropic requires max_tokens; Gemini treated it as optional. The
          // 4096 default is carried over unchanged rather than re-tuned here.
          max_tokens: request.maxOutputTokens ?? 4096,
          temperature: request.temperature ?? 0,
          system: request.system,
          messages: [{ role: 'user', content: request.user }],
          ...structured,
        },
        { signal: request.signal }
      )
    } catch (cause) {
      if (request.signal?.aborted || cause instanceof Anthropic.APIUserAbortError) {
        throw new AppError('AI_TIMEOUT', { detail: 'Upstream request aborted.', cause })
      }
      if (cause instanceof Anthropic.APIConnectionError) {
        throw new AppError('AI_UNAVAILABLE', {
          detail: 'Network failure reaching the AI provider.',
          cause,
        })
      }
      if (cause instanceof Anthropic.APIError) {
        throw mapApiFailure(cause, model)
      }
      throw new AppError('AI_UNAVAILABLE', { detail: 'Unrecognised provider failure.', cause })
    }

    // A safety decline arrives as a successful response, not an exception. This
    // is the only remaining safety lever the app has — see the header note.
    if (message.stop_reason === 'refusal') {
      throw new AppError('AI_CONTENT_BLOCKED', {
        detail: 'Provider declined the request (stop_reason=refusal).',
      })
    }

    if (message.stop_reason === 'max_tokens') {
      logger.warn('AI response hit the output token ceiling', { provider: 'anthropic', model })
    }

    const usage = {
      inputTokens: message.usage?.input_tokens ?? 0,
      outputTokens: message.usage?.output_tokens ?? 0,
    }

    if (request.format === 'json' && request.schema) {
      const toolUse = message.content.find(
        (block): block is Anthropic.ToolUseBlock =>
          block.type === 'tool_use' && block.name === RESULT_TOOL_NAME
      )

      if (!toolUse) {
        // Forced tool_choice makes this close to impossible, which is precisely
        // why it is reported as invalid output rather than swallowed: it means
        // the contract this provider is built on did not hold.
        throw new AppError('AI_INVALID_OUTPUT', {
          detail: `Forced tool call absent (stop_reason=${message.stop_reason ?? 'none'}).`,
        })
      }

      // Serialised so `AiResponse.text` stays a string and `generateJson`'s
      // parse/validate/repair chain runs unchanged against a tool result.
      return { text: JSON.stringify(toolUse.input), model, usage }
    }

    const text = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('')
      .trim()

    if (!text) {
      // Empty prose on a successful call is almost always a truncated response;
      // surfacing it as invalid output triggers the caller's repair path.
      throw new AppError('AI_INVALID_OUTPUT', {
        detail: `Empty response returned (stop_reason=${message.stop_reason ?? 'none'}).`,
      })
    }

    return { text, model, usage }
  },
}
