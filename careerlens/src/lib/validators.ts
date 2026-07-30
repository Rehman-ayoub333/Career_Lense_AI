export function stripHtmlTags(value: string): string {
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

export function sanitizeText(value: string, maxLength = 8000): string {
  const withoutTags = stripHtmlTags(value)
  // Allow Unicode letters/numbers (accented names, non-Latin scripts) while
  // stripping control characters except whitespace.
  const noControlChars = withoutTags.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ')
  return noControlChars.trim().slice(0, maxLength)
}

export function isValidAnalysisMode(value: unknown): value is 'job' | 'scholarship' {
  return value === 'job' || value === 'scholarship'
}

export function validateTextInput(value: string, minLength: number, maxLength: number): string {
  const sanitized = sanitizeText(value, maxLength)

  if (sanitized.length < minLength) {
    throw new Error(`Input must be at least ${minLength} characters.`)
  }

  return sanitized
}
