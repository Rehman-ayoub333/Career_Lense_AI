import { AppError } from './errors'

/**
 * Input sanitisation and validation for everything crossing the API boundary.
 */

/**
 * Matches HTML tags.
 *
 * The pattern requires a letter or `/` after `<`, so genuine CV content such as
 * "reduced latency <100ms" or "handled >5k req/s" survives. The previous
 * `<[^>]*>` pattern deleted those spans, quietly removing the exact quantified
 * achievements this tool exists to surface.
 */
const HTML_TAGS = /<\/?[a-zA-Z][^>]*>/g

/**
 * Control characters, excluding tab and newline which carry CV structure.
 * Built from escape sequences rather than literals so the source file stays
 * pure ASCII and survives any editor or diff tool.
 */
const CONTROL_CHARS = new RegExp('[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F]', 'g')

/**
 * Zero-width, bidi-override and other invisible formatting characters.
 * These render as nothing in the UI but are perfectly visible to the model,
 * which makes them a natural hiding place for injected instructions.
 */
const INVISIBLE_CHARS = new RegExp('[\\u200B-\\u200F\\u202A-\\u202E\\u2060-\\u2064\\uFEFF]', 'g')

export function stripHtmlTags(value: string): string {
  return value.replace(HTML_TAGS, ' ')
}

/**
 * Normalises free text: removes markup and invisible characters, collapses
 * runaway whitespace, then truncates.
 *
 * Unicode letters are preserved deliberately — accented names and non-Latin
 * scripts are the common case for this audience, not an edge case.
 */
export function sanitizeText(value: string, maxLength: number): string {
  return value
    .replace(CONTROL_CHARS, ' ')
    .replace(INVISIBLE_CHARS, '')
    .replace(HTML_TAGS, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, maxLength)
}

export function isAnalysisMode(value: unknown): value is 'job' | 'scholarship' {
  return value === 'job' || value === 'scholarship'
}

interface TextFieldOptions {
  /** Shown to the user, so it must read naturally: "CV", "job description". */
  label: string
  min: number
  max: number
}

/**
 * Validates and sanitises one text field.
 *
 * Length is checked *after* sanitisation, so the threshold matches what the model
 * actually receives, and the error names the field so the user knows which box to
 * fix — the previous shared message ("Input must be at least 100 characters")
 * could not tell the CV box from the job description box.
 *
 * @throws {AppError} `VALIDATION_ERROR`
 */
export function parseTextField(value: unknown, options: TextFieldOptions): string {
  if (typeof value !== 'string') {
    throw new AppError('VALIDATION_ERROR', {
      publicMessage: `Please provide your ${options.label}.`,
      detail: `Field "${options.label}" was ${typeof value}, expected string.`,
    })
  }

  const sanitized = sanitizeText(value, options.max)

  if (sanitized.length < options.min) {
    throw new AppError('VALIDATION_ERROR', {
      publicMessage: `Your ${options.label} is too short. Please add at least ${options.min - sanitized.length} more characters.`,
      detail: `Field "${options.label}" was ${sanitized.length} chars after sanitisation, minimum ${options.min}.`,
    })
  }

  return sanitized
}

/** Narrows a parsed request body to an object without asserting its contents. */
export function parseObjectBody(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new AppError('VALIDATION_ERROR', {
      detail: `Request body was ${Array.isArray(value) ? 'an array' : typeof value}, expected an object.`,
    })
  }
  return value as Record<string, unknown>
}

/** Coerces an unknown value into a bounded array of non-empty strings. */
export function parseStringArray(value: unknown, maxItems = 50): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, maxItems)
}
