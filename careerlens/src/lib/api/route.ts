import { NextResponse } from 'next/server'

import { AppError, toAppError } from '@/lib/errors'
import { logger } from '@/lib/logger'
import { getClientKey, type RateLimitResult } from '@/lib/rate-limit'

import type { ApiFailure, ApiSuccess } from './contract'

/**
 * Shared plumbing for every API route.
 *
 * Each of the four AI routes previously repeated the same ~80 lines: rate-limit
 * check, JSON body parse, body-shape guard, timeout race, and a chain of
 * `message.includes(...)` string sniffing to decide the status code. That is four
 * places to fix every bug and four places for a provider error string to escape.
 *
 * Now a route supplies only its own logic. The wrapper owns everything that must
 * be true of *every* endpoint:
 *   - rate limiting, with correct `Retry-After` and `X-RateLimit-*` headers
 *   - a real abort budget, so the upstream call is cancelled rather than orphaned
 *   - one serialisation path, which physically cannot emit an internal message
 *   - one log record per request, carrying the id the client is also given
 */

interface RouteContext {
  /** Aborts when the route's time budget expires. Pass to any upstream call. */
  signal: AbortSignal
  /** Echoed to the client and stamped on the log line. */
  requestId: string
}

interface RouteOptions<TResponse> {
  /** Used in logs and metrics, e.g. `analyze`. */
  name: string
  /** Milliseconds before the request is aborted. Must be under `maxDuration`. */
  timeoutMs: number
  /** Which shared budget applies. Omit for endpoints that need no limiting. */
  rateLimit?: {
    check: (key: string) => RateLimitResult
    scope: string
  }
  handler: (request: Request, context: RouteContext) => Promise<TResponse>
}

function newRequestId(): string {
  return Math.random().toString(36).slice(2, 10)
}

function failure(error: AppError, requestId: string, extraHeaders?: HeadersInit): NextResponse<ApiFailure> {
  const body: ApiFailure = {
    success: false,
    error: error.code,
    // `publicMessage` only. `error.message`, `error.detail` and `error.cause`
    // stay server-side; this is the single place a response body is built, so
    // that guarantee holds for every endpoint by construction.
    message: error.publicMessage,
    requestId,
  }

  if (error.retryAfterSeconds !== undefined) {
    body.retryAfter = error.retryAfterSeconds
  }

  return NextResponse.json(body, {
    status: error.status,
    headers: {
      'Cache-Control': 'no-store',
      ...(error.retryAfterSeconds !== undefined
        ? { 'Retry-After': String(error.retryAfterSeconds) }
        : {}),
      ...extraHeaders,
    },
  })
}

export function createApiRoute<TResponse>(options: RouteOptions<TResponse>) {
  return async function route(request: Request): Promise<NextResponse> {
    const requestId = newRequestId()
    const startedAt = Date.now()

    let rateLimitHeaders: Record<string, string> = {}

    if (options.rateLimit) {
      const key = getClientKey(request.headers, options.rateLimit.scope)
      const result = options.rateLimit.check(key)

      rateLimitHeaders = {
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
      }

      if (!result.allowed) {
        logger.warn('Request rate limited', {
          route: options.name,
          requestId,
          retryAfterSeconds: result.retryAfterSeconds,
        })
        return failure(
          new AppError('RATE_LIMITED', {
            publicMessage: `You've made a lot of requests. Please wait ${result.retryAfterSeconds} seconds and try again.`,
            detail: `Rate limit hit on ${options.name}.`,
            retryAfterSeconds: result.retryAfterSeconds,
          }),
          requestId,
          rateLimitHeaders
        )
      }
    }

    // A real abort budget. The previous `Promise.race` against a `setTimeout`
    // resolved the local promise but left the upstream HTTP request running to
    // completion, still consuming quota nobody would ever read.
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), options.timeoutMs)

    try {
      const data = await options.handler(request, { signal: controller.signal, requestId })

      logger.info('Request completed', {
        route: options.name,
        requestId,
        durationMs: Date.now() - startedAt,
      })

      return NextResponse.json<ApiSuccess<TResponse>>(
        { success: true, data },
        { headers: { 'Cache-Control': 'no-store', ...rateLimitHeaders } }
      )
    } catch (caught) {
      const error = toAppError(caught)

      // 5xx means we broke; 4xx means the caller did. Only the former is an alert.
      const log = error.status >= 500 ? logger.error : logger.warn
      log('Request failed', {
        route: options.name,
        requestId,
        code: error.code,
        status: error.status,
        durationMs: Date.now() - startedAt,
        detail: error.detail,
        cause: error.cause,
      })

      return failure(error, requestId, rateLimitHeaders)
    } finally {
      clearTimeout(timer)
    }
  }
}

/** Parses a JSON request body, converting malformed input into a typed 400. */
export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch (cause) {
    throw new AppError('VALIDATION_ERROR', {
      publicMessage: 'We could not read that request. Please refresh the page and try again.',
      detail: 'Request body was not valid JSON.',
      cause,
    })
  }
}
