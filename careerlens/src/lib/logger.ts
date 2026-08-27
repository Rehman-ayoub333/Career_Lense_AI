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

/**
 * Field names whose values are replaced before anything is written.
 *
 * Substring matching, deliberately broad: a field called `refresh_token_v2` or
 * `x-api-key-header` should redact, and enumerating every spelling is a losing
 * game against a name nobody predicted.
 *
 * The breadth had one false positive, found during the Phase 7 live run:
 * `inputTokens` and `outputTokens` contain "token", so the provider's usage
 * figures were written as `[redacted]` — hiding cost attribution on every call,
 * and hiding the exact output-token count during the very test that needed it to
 * confirm nothing had truncated. See `NEVER_A_CREDENTIAL` below for the fix.
 */
const CREDENTIAL_KEY = /(key|token|secret|password|authorization|cookie|apikey)/i

/**
 * Value types that cannot be a credential, whatever the field is called.
 *
 * A secret is a string. A number is a count, a duration, a status code, or a
 * token *tally* — never the token itself. Gating name-based redaction on this
 * fixes the `inputTokens` false positive exactly, and cannot cause a leak: no
 * credential has ever been a `number` or a `boolean`.
 *
 * Note what is deliberately NOT done here — the redaction rule is not reduced to
 * value-shape matching (`sk-ant-…` / `pa-…`) alone. That would drop coverage for
 * every secret this app does not own the format of: a `Bearer` token under
 * `authorization`, a session value under `cookie`, a third-party key under
 * `apiKey`. Narrowing a false positive must not become a narrowing of what
 * counts as a secret, so strings, objects and arrays under a credential-shaped
 * name still redact whole, exactly as before.
 */
function isNeverACredential(value: unknown): boolean {
  return typeof value === 'number' || typeof value === 'boolean'
}

/**
 * Anything shaped like a provider credential, in case one reaches a message body.
 *
 * Updated with the provider (ADR-22/23). This previously matched only Google's
 * `AIza…` shape, which after the swap would have matched nothing this app can
 * hold — an Anthropic key in a log body would have gone out unredacted. Keyed on
 * shape rather than on a variable name because the point is to catch a key that
 * arrived somewhere it was never named.
 *
 *   `sk-ant-…`  Anthropic  (ANTHROPIC_API_KEY)
 *   `pa-…`      Voyage AI  (VOYAGE_API_KEY, research/ only — matched anyway,
 *               since redacting a key that cannot appear costs nothing and the
 *               reverse is a leak)
 */
const SECRET_PATTERN = /\b(?:sk-ant-[0-9A-Za-z_-]{10,}|pa-[0-9A-Za-z_-]{20,})\b/g

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
      // The stack is redacted too, which it previously was not. Its first line
      // is the message repeated verbatim, so scrubbing `message` alone and
      // handing the raw stack straight through defeated the point: a credential
      // in an error message still reached the log, one field further down.
      //
      // Production was never exposed — `stack` is dropped entirely there — so
      // this was a development-only leak, into exactly the terminals and dev log
      // drains where people paste output around. Found by the test added with
      // this change; `logger.ts` had no coverage before it.
      stack: isProduction() ? undefined : (redact(value.stack, depth + 1) as string | undefined),
    }
  }

  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {}
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      const redactByName = CREDENTIAL_KEY.test(key) && !isNeverACredential(entry)
      output[key] = redactByName ? '[redacted]' : redact(entry, depth + 1)
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
