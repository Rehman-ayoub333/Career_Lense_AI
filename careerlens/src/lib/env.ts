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
 * Anthropic API key (ADR-22).
 *
 * `ANTHROPIC_API_KEY` is the canonical name — it matches Anthropic's own SDK
 * convention, so the SDK would find it even if this module did not, and it is
 * the only variable required for deployment.
 *
 * No legacy alias is accepted. `GOOGLE_API_KEY`/`GEMINI_API_KEY` are gone rather
 * than tolerated: a stale Google key silently satisfying a configuration check
 * for a provider that can no longer use it is worse than an unset variable,
 * which fails loudly at `/api/health`.
 */
export function getAnthropicApiKey(): string | undefined {
  assertServerOnly()
  return read('ANTHROPIC_API_KEY')
}

/** Model id override. Lets the model be rolled forward without a code change. */
export function getAnthropicModel(): string {
  assertServerOnly()
  return read('ANTHROPIC_MODEL') ?? 'claude-haiku-4-5-20251001'
}

/** Which provider the AI layer should use. Only `anthropic` ships today. */
export function getAiProviderId(): string {
  assertServerOnly()
  return (read('AI_PROVIDER') ?? 'anthropic').toLowerCase()
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

/**
 * Whether this server is permitted to answer in research mode at all.
 *
 * Research mode returns per-claim internals (`match_score`,
 * `hallucination_candidate`) that the product deliberately never shows a user.
 * The request header alone is not authorization — anyone can send a header — so
 * the server must also be configured to allow it. Both are required, which is
 * why this is a getter and not an inference from the header.
 *
 * Accepts `true` or `1`, since the planning documents use both spellings.
 */
export function isResearchModeEnabled(): boolean {
  assertServerOnly()
  const value = read('RESEARCH_MODE_ENABLED')?.toLowerCase()
  return value === 'true' || value === '1'
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}
