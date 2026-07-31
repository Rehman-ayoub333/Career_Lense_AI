/**
 * Structured server-side logger.
 *
 * CLAUDE.md forbids `console.log` — that rule exists to ban ad-hoc debug prints,
 * not to ban observability. A production service that cannot explain its own
 * failures is unoperable, and the security requirement ("detailed developer logs,
 * generic user messages") is only satisfiable if the detail is written *somewhere*.
 *
 * So logging is centralised here and nowhere else:
 *   - one module, so the redaction rules cannot be bypassed
 *   - `console.error` / `console.warn` only, which every platform (Vercel, Docker,
 *     systemd) already captures as stderr — no dependency, no transport to run
 *   - single-line JSON in production so log drains can parse it; readable in dev
 */

import { isProduction } from './env'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export type LogContext = Record<string, unknown>

/** Values whose keys match these are replaced before anything is written. */
const REDACTED_KEY = /(key|token|secret|password|authorization|cookie|apikey)/i

/** Anything shaped like a Google API key, in case one reaches a message body. */
const SECRET_PATTERN = /\bAIza[0-9A-Za-z_-]{10,}\b/g

function redact(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[truncated]'

  if (typeof value === 'string') {
    return value.replace(SECRET_PATTERN, '[redacted]')
  }

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => redact(item, depth + 1))
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: redact(value.message, depth + 1),
      stack: isProduction() ? undefined : value.stack,
    }
  }

  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {}
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      output[key] = REDACTED_KEY.test(key) ? '[redacted]' : redact(entry, depth + 1)
    }
    return output
  }

  return value
}

function emit(level: LogLevel, message: string, context?: LogContext): void {
  // `debug` is noise in production; drop it rather than pay the serialization cost.
  if (level === 'debug' && isProduction()) return

  const record = {
    level,
    time: new Date().toISOString(),
    message,
    ...(context ? (redact(context) as LogContext) : {}),
  }

  const line = isProduction() ? JSON.stringify(record) : `[${level}] ${message}`
  const extra = isProduction() ? undefined : context ? redact(context) : undefined

  // The single sanctioned console call site in the application; see module docs.
  // Everything else routes through `logger` so output stays structured.
  if (level === 'error') {
    console.error(line, extra ?? '')
  } else {
    console.warn(line, extra ?? '')
  }
}

export const logger = {
  debug: (message: string, context?: LogContext) => emit('debug', message, context),
  info: (message: string, context?: LogContext) => emit('info', message, context),
  warn: (message: string, context?: LogContext) => emit('warn', message, context),
  error: (message: string, context?: LogContext) => emit('error', message, context),
}
