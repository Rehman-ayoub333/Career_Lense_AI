/**
 * Validated, server-only environment access.
 *
 * Every `process.env` read in the codebase goes through this module so that:
 *   - misconfiguration surfaces as one clear error instead of a runtime `undefined`
 *   - secrets can never be imported into a Client Component by accident
 *   - the accepted variable names are documented in exactly one place
 */

/** Guard against a secret-bearing module being pulled into the browser bundle. */
function assertServerOnly(): void {
  if (typeof window !== 'undefined') {
    throw new Error('env.ts is server-only and must never be imported by a Client Component.')
  }
}

function read(name: string): string | undefined {
  const value = process.env[name]
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

/**
 * Google AI Studio API key.
 *
 * `GOOGLE_API_KEY` is the canonical name (matches Google's own SDK convention and
 * is the only variable required for deployment). `GEMINI_API_KEY` is accepted as a
 * legacy alias so existing deployments keep working without an env migration.
 */
export function getGoogleApiKey(): string | undefined {
  assertServerOnly()
  return read('GOOGLE_API_KEY') ?? read('GEMINI_API_KEY')
}

/** Model id override. Lets the model be rolled forward without a code change. */
export function getGoogleModel(): string {
  assertServerOnly()
  return read('GOOGLE_MODEL') ?? 'gemini-2.5-flash'
}

/** Which provider the AI layer should use. Only `google` ships today. */
export function getAiProviderId(): string {
  assertServerOnly()
  return (read('AI_PROVIDER') ?? 'google').toLowerCase()
}

/**
 * Public site origin, used for canonical URLs, OG images, sitemap and robots.
 * Falls back to the Vercel-provided origin so preview deployments self-describe
 * correctly instead of advertising the production domain.
 */
export function getSiteUrl(): string {
  const explicit = read('NEXT_PUBLIC_SITE_URL')
  if (explicit) return explicit.replace(/\/$/, '')

  const vercel = read('VERCEL_PROJECT_PRODUCTION_URL') ?? read('VERCEL_URL')
  if (vercel) return `https://${vercel.replace(/\/$/, '')}`

  return 'http://localhost:3000'
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}
