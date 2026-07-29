type RateLimitEntry = {
  count: number
  resetAt: number
}

const buckets = new Map<string, RateLimitEntry>()

const DEFAULT_WINDOW_MS = 60_000
const DEFAULT_MAX_REQUESTS = 10

export function checkRateLimit(key: string, maxRequests = DEFAULT_MAX_REQUESTS, windowMs = DEFAULT_WINDOW_MS): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now()
  const existing = buckets.get(key)

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, retryAfterMs: 0 }
  }

  if (existing.count >= maxRequests) {
    return { allowed: false, retryAfterMs: Math.max(0, existing.resetAt - now) }
  }

  existing.count += 1
  return { allowed: true, retryAfterMs: 0 }
}

/**
 * Shared rate-limit key for all AI-consuming endpoints.
 * One analysis = 3 API calls (analyze + rewrite + cover-letter).
 * Limit of 10/minute allows ~3 full analyses plus a regeneration.
 */
export function getAIRateLimitKey(req: { headers: { get(name: string): string | null } }): string {
  const ip = req.headers.get('x-forwarded-for') ?? 'local'
  return `ai:${ip}`
}
