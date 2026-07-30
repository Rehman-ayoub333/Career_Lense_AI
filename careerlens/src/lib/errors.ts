/**
 * Error taxonomy.
 *
 * The single rule this module enforces: **the message a user sees and the message
 * a developer sees are different strings.**
 *
 * `publicMessage` is written for a stressed job applicant — plain, calm, actionable,
 * and free of provider names, model ids, quota URLs, HTTP semantics and stack traces.
 * `detail` is written for whoever is on call and never crosses the network boundary.
 */

export const ERROR_CODES = [
  'VALIDATION_ERROR',
  'RATE_LIMITED',
  'AI_UNAVAILABLE',
  'AI_TIMEOUT',
  'AI_INVALID_OUTPUT',
  'AI_CONTENT_BLOCKED',
  'CONFIG_ERROR',
  'FILE_INVALID',
  'FILE_UNREADABLE',
  'INTERNAL_ERROR',
] as const

export type ErrorCode = (typeof ERROR_CODES)[number]

/**
 * Default user-facing copy per code. Individual throw sites may override with
 * something more specific (e.g. which field failed validation), but they can
 * never accidentally fall through to a raw exception message.
 */
const PUBLIC_MESSAGES: Record<ErrorCode, string> = {
  VALIDATION_ERROR: 'Please check your input and try again.',
  RATE_LIMITED: "You've made a lot of requests in a short time. Please wait a moment and try again.",
  AI_UNAVAILABLE: 'Our analysis service is busy right now. Please try again in a few moments.',
  AI_TIMEOUT: 'That took longer than expected. Please try again — shortening your CV or job description usually helps.',
  AI_INVALID_OUTPUT: 'We could not produce a complete analysis for this input. Please try again.',
  AI_CONTENT_BLOCKED: 'We were unable to process this text. Please review your CV and job description, then try again.',
  CONFIG_ERROR: 'The service is temporarily unavailable. Please try again later.',
  FILE_INVALID: 'Please upload a PDF or TXT file under 4 MB.',
  FILE_UNREADABLE: 'We could not read that file. It may be a scanned image — please paste your CV text instead.',
  INTERNAL_ERROR: 'Something went wrong on our side. Please try again.',
}

const STATUS_CODES: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  RATE_LIMITED: 429,
  AI_UNAVAILABLE: 503,
  AI_TIMEOUT: 504,
  AI_INVALID_OUTPUT: 502,
  AI_CONTENT_BLOCKED: 422,
  CONFIG_ERROR: 503,
  FILE_INVALID: 400,
  FILE_UNREADABLE: 422,
  INTERNAL_ERROR: 500,
}

interface AppErrorOptions {
  /** Overrides the default user-facing copy. Must stay free of technical detail. */
  publicMessage?: string
  /** Developer-only context. Logged, never serialized to a response. */
  detail?: string
  /** Original error, preserved for the log's stack trace. */
  cause?: unknown
  /** Seconds until the client may retry. Emitted as a `Retry-After` header. */
  retryAfterSeconds?: number
}

export class AppError extends Error {
  readonly code: ErrorCode
  readonly status: number
  readonly publicMessage: string
  readonly detail?: string
  readonly retryAfterSeconds?: number

  constructor(code: ErrorCode, options: AppErrorOptions = {}) {
    // `message` is the developer-facing string; it is what shows up in logs.
    super(options.detail ?? code, { cause: options.cause })
    this.name = 'AppError'
    this.code = code
    this.status = STATUS_CODES[code]
    this.publicMessage = options.publicMessage ?? PUBLIC_MESSAGES[code]
    this.detail = options.detail
    this.retryAfterSeconds = options.retryAfterSeconds
  }
}

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError
}

/**
 * Coerces anything thrown into an `AppError`.
 *
 * Unknown throws collapse to `INTERNAL_ERROR` with generic public copy, so an
 * unanticipated exception can never exfiltrate its message to the client. The
 * original value is retained as `cause` for the logs.
 */
export function toAppError(value: unknown): AppError {
  if (isAppError(value)) return value

  if (value instanceof Error) {
    // A caller-initiated abort is a timeout from the user's point of view.
    if (value.name === 'AbortError' || value.name === 'TimeoutError') {
      return new AppError('AI_TIMEOUT', { detail: `Aborted: ${value.message}`, cause: value })
    }
    return new AppError('INTERNAL_ERROR', { detail: value.message, cause: value })
  }

  return new AppError('INTERNAL_ERROR', { detail: `Non-error thrown: ${String(value)}` })
}
