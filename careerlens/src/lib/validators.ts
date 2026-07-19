export function stripHtmlTags(value: string): string {
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

export function sanitizeText(value: string, maxLength = 8000): string {
  const withoutTags = stripHtmlTags(value)
  const printableOnly = withoutTags.replace(/[^\x20-\x7E\n\r\t]/g, ' ')
  return printableOnly.trim().slice(0, maxLength)
}

export function isNonEmptyString(value: string): boolean {
  return sanitizeText(value).length > 0
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
