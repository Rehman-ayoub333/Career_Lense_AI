import { getAiProviderId } from '@/lib/env'
import { AppError, toAppError } from '@/lib/errors'
import { logger } from '@/lib/logger'
import { getJsonRepairPrompt } from '@/lib/prompts'

import { googleProvider } from './google'
import { parseModelJson } from './json'
import type { AiProvider, JsonSchema } from './types'

export type { AiProvider, AiRequest, AiResponse, JsonSchema } from './types'

/**
 * Provider registry.
 *
 * Google ships today. Adding a vendor is: write a module satisfying `AiProvider`,
 * add one entry here, set `AI_PROVIDER`. No call site changes, no route changes.
 */
const PROVIDERS: Record<string, AiProvider> = {
  google: googleProvider,
}

export function getProvider(): AiProvider {
  const id = getAiProviderId()
  const provider = PROVIDERS[id]

  if (!provider) {
    throw new AppError('CONFIG_ERROR', {
      detail: `AI_PROVIDER="${id}" is not a registered provider. Known: ${Object.keys(PROVIDERS).join(', ')}.`,
    })
  }

  if (!provider.isConfigured()) {
    throw new AppError('CONFIG_ERROR', {
      detail: `Provider "${id}" is missing its credentials. Set GOOGLE_API_KEY.`,
    })
  }

  return provider
}

interface GenerateOptions {
  system: string
  user: string
  maxOutputTokens?: number
  temperature?: number
  signal?: AbortSignal
  /** Included in logs so slow or failing endpoints are identifiable. */
  label: string
}

function logCompletion(label: string, provider: AiProvider, startedAt: number, usage: { inputTokens: number; outputTokens: number }): void {
  logger.info('AI call completed', {
    label,
    provider: provider.id,
    durationMs: Date.now() - startedAt,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
  })
}

/** Free-form prose generation — cover letters, chat replies. */
export async function generateText(options: GenerateOptions): Promise<string> {
  const provider = getProvider()
  const startedAt = Date.now()

  const response = await provider.generate({
    system: options.system,
    user: options.user,
    format: 'text',
    maxOutputTokens: options.maxOutputTokens,
    temperature: options.temperature,
    signal: options.signal,
  })

  logCompletion(options.label, provider, startedAt, response.usage)
  return response.text
}

interface GenerateJsonOptions<T> extends GenerateOptions {
  /** Enforced by the provider's constrained decoder where supported. */
  schema: JsonSchema
  /**
   * Runtime shape check. Constrained decoding guarantees *syntax*, not that every
   * field is populated sensibly, so the result is still validated before use.
   */
  validate: (value: unknown) => value is T
}

/**
 * Structured generation with a two-layer reliability strategy:
 *
 *   1. Constrained decoding — the provider is handed the schema and is unable to
 *      emit non-conforming JSON. This eliminates most failures before they occur,
 *      rather than detecting them afterwards.
 *   2. One repair attempt — if parsing or validation still fails, the request is
 *      re-sent once with an explicit corrective instruction.
 *
 * A second failure is reported as `AI_INVALID_OUTPUT`. Retrying further would burn
 * the user's time and the project's quota for a request that is not converging.
 */
export async function generateJson<T>(options: GenerateJsonOptions<T>): Promise<T> {
  const provider = getProvider()

  async function attempt(user: string, isRepair: boolean): Promise<T> {
    const startedAt = Date.now()
    const response = await provider.generate({
      system: options.system,
      user,
      format: 'json',
      schema: options.schema,
      maxOutputTokens: options.maxOutputTokens,
      temperature: options.temperature,
      signal: options.signal,
    })

    logCompletion(isRepair ? `${options.label}:repair` : options.label, provider, startedAt, response.usage)

    const parsed = parseModelJson<unknown>(response.text)
    if (!options.validate(parsed)) {
      throw new AppError('AI_INVALID_OUTPUT', {
        detail: `Response for "${options.label}" parsed as JSON but failed schema validation.`,
      })
    }
    return parsed
  }

  try {
    return await attempt(options.user, false)
  } catch (firstError) {
    const appError = toAppError(firstError)

    // Only malformed output is repairable. A timeout, a blocked prompt or a
    // credentials problem will not be fixed by asking the model again.
    if (appError.code !== 'AI_INVALID_OUTPUT') throw appError

    logger.warn('AI returned unusable JSON, attempting one repair', {
      label: options.label,
      detail: appError.detail,
    })

    try {
      return await attempt(`${options.user}\n\n${getJsonRepairPrompt()}`, true)
    } catch (repairError) {
      const finalError = toAppError(repairError)
      logger.error('AI JSON repair attempt failed', {
        label: options.label,
        detail: finalError.detail,
      })
      throw new AppError('AI_INVALID_OUTPUT', {
        detail: `"${options.label}" failed on both the initial call and the repair attempt.`,
        cause: repairError,
      })
    }
  }
}
