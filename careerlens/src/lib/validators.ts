import type { ClaimReference } from './api/contract'
import { CLAIM_CATEGORIES, VERIFICATION_TIERS } from './analysis/constants'
import { AppError } from './errors'
import type { ClaimCategory, VerificationTier } from '@/types'

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
export function sanitizeText(value: string, maxLength: number = Number.MAX_SAFE_INTEGER): string {
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
  /**
   * What to do when the field is longer than `max`. Defaults to `'reject'`.
   *
   * This used to be truncation, unconditionally and silently, and it was wrong
   * for the fields that matter most. `cvText` is the document `grounding.ts`
   * searches for evidence: clipping it at 8000 characters means a claim can cite
   * a quote that lived at character 8500, the verifier cannot find it, and the
   * claim is reported `unresolved` — indistinguishable, to the reader, from the
   * CV genuinely not supporting it. The product's central promise is that an
   * unresolved claim is a fact about the document; silent truncation makes it a
   * fact about a limit the user was never told about.
   *
   * Rejecting is also the kinder failure. A user who pasted too much can delete
   * some; a user whose evidence was clipped away has no idea anything happened.
   *
   * `'truncate'` remains available for fields where the content is not evidence
   * and the ceiling is a deliberate budget rather than a correctness boundary.
   */
  onOverflow?: 'reject' | 'truncate'
}

/**
 * Validates and sanitises one text field.
 *
 * Length is checked *after* sanitisation, so the threshold matches what the model
 * actually receives, and the error names the field so the user knows which box to
 * fix — the previous shared message ("Input must be at least 100 characters")
 * could not tell the CV box from the job description box.
 *
 * Sanitisation no longer truncates on the way in: the length is measured against
 * the whole submitted document, so an over-long CV is caught rather than quietly
 * clipped to fit. See `onOverflow`.
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

  const sanitized = sanitizeText(value)

  if (sanitized.length < options.min) {
    throw new AppError('VALIDATION_ERROR', {
      publicMessage: `Your ${options.label} is too short. Please add at least ${options.min - sanitized.length} more characters.`,
      detail: `Field "${options.label}" was ${sanitized.length} chars after sanitisation, minimum ${options.min}.`,
    })
  }

  if (sanitized.length > options.max) {
    if (options.onOverflow === 'truncate') return sanitized.slice(0, options.max)

    const excess = sanitized.length - options.max
    throw new AppError('VALIDATION_ERROR', {
      // Actionable: how much to remove, and what the ceiling is. "Too long" on
      // its own leaves the user guessing at both.
      publicMessage: `Your ${options.label} is too long by ${excess} characters. The limit is ${options.max} — please shorten it and try again.`,
      detail: `Field "${options.label}" was ${sanitized.length} chars after sanitisation, maximum ${options.max}.`,
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

/** Longest requirement string accepted from a client, matching the schema's soft cap. */
const MAX_REQUIREMENT_LENGTH = 200

/**
 * Coerces an unknown value into a bounded array of claim references.
 *
 * These arrive from the client, which received them from `/api/analyze` — but
 * "we sent it originally" is not a reason to trust it coming back. A caller can
 * put anything in `requirement`, and that string reaches a prompt, so it is
 * sanitised like any other free text and the enum fields are checked against
 * their allowed values rather than passed through.
 *
 * Drops malformed entries rather than rejecting the request: this field is
 * optional and only sharpens the prompt's focus, so a bad entry costs the user a
 * slightly less targeted rewrite, not an error page.
 */
export function parseClaimReferences(value: unknown, maxItems = 20): ClaimReference[] {
  if (!Array.isArray(value)) return []

  const references: ClaimReference[] = []

  for (const item of value) {
    if (references.length >= maxItems) break
    if (!item || typeof item !== 'object') continue

    const candidate = item as Record<string, unknown>
    if (
      typeof candidate.requirement !== 'string' ||
      typeof candidate.category !== 'string' ||
      !(CLAIM_CATEGORIES as readonly string[]).includes(candidate.category) ||
      typeof candidate.verification !== 'string' ||
      !(VERIFICATION_TIERS as readonly string[]).includes(candidate.verification)
    ) {
      continue
    }

    const requirement = sanitizeText(candidate.requirement, MAX_REQUIREMENT_LENGTH)
    if (requirement.length === 0) continue

    references.push({
      requirement,
      category: candidate.category as ClaimCategory,
      verification: candidate.verification as VerificationTier,
    })
  }

  return references
}
