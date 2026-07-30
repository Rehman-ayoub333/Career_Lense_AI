import { AppError } from '@/lib/errors'

/**
 * Tolerant JSON extraction.
 *
 * When the provider supports constrained decoding (`responseSchema`) the output is
 * already clean and `JSON.parse` succeeds on the first line of this function. This
 * module exists for the residual cases — a provider without schema support, a
 * safety-truncated response, or a model that wraps output in a markdown fence
 * despite instructions.
 *
 * It recovers what is mechanically recoverable and refuses to guess beyond that.
 */

/** Removes ```json ... ``` fences, with or without a language tag. */
function stripCodeFence(input: string): string {
  const fenced = input.match(/^\s*```(?:json|JSON)?\s*\n?([\s\S]*?)\n?\s*```\s*$/)
  return fenced?.[1] ?? input
}

/**
 * Extracts the outermost balanced `{...}` or `[...]`, ignoring braces that appear
 * inside string literals. Handles preamble/postamble like "Here is the JSON: {...}".
 */
function extractBalanced(input: string): string | null {
  const start = input.search(/[{[]/)
  if (start === -1) return null

  const opener = input[start]
  const closer = opener === '{' ? '}' : ']'
  let depth = 0
  let inString = false
  let escaped = false

  for (let i = start; i < input.length; i += 1) {
    const char = input[i]

    if (escaped) {
      escaped = false
      continue
    }
    if (char === '\\') {
      escaped = true
      continue
    }
    if (char === '"') {
      inString = !inString
      continue
    }
    if (inString) continue

    if (char === opener) depth += 1
    else if (char === closer) {
      depth -= 1
      if (depth === 0) return input.slice(start, i + 1)
    }
  }

  return null
}

/**
 * Parses model output into `T`.
 *
 * @throws {AppError} `AI_INVALID_OUTPUT` — never leaks the raw model text, which
 *   contains the user's CV and must not travel back through an error message.
 */
export function parseModelJson<T>(raw: string): T {
  const candidates = [raw.trim(), stripCodeFence(raw).trim()]

  const balanced = extractBalanced(stripCodeFence(raw))
  if (balanced) candidates.push(balanced)

  for (const candidate of candidates) {
    if (!candidate) continue
    try {
      return JSON.parse(candidate) as T
    } catch {
      // Try the next, more aggressive, extraction strategy.
    }
  }

  throw new AppError('AI_INVALID_OUTPUT', {
    // Length only — the body is user CV content and stays out of the logs.
    detail: `Model output was not parseable as JSON (${raw.length} chars).`,
  })
}
