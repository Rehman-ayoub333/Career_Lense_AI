export function sanitizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

export function isNonEmptyString(value: string): boolean {
  return sanitizeText(value).length > 0
}
