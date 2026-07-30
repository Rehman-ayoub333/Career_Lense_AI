/**
 * Fixed-window rate limiting.
 *
 * ## Known limitation, stated plainly
 *
 * The store is a module-level `Map`, so the limit is enforced *per serverless
 * instance*. On a platform running N concurrent instances the effective ceiling is
 * N x `max`. That is a real weakening, not a theoretical one.
 *
 * It remains the right trade-off here:
 *   - the goal is protecting a free API quota from casual abuse and runaway client
 *     loops, not resisting a determined attacker
 *   - the alternative costs a network round-trip to Redis on every request and adds
 *     an operational dependency to a deliberately zero-infrastructure project
 *
 * `RateLimitStore` exists so that adopting a shared backend later means writing one
 * adapter and passing it to `createRateLimiter` — no call site changes.
 */

export interface RateLimitResult {
  allowed: boolean
  /** Requests still available in the current window. */
  remaining: number
  /** Unix milliseconds at which the window resets. */
  resetAt: number
  /** Whole seconds until a retry is worthwhile. Emitted as `Retry-After`. */
  retryAfterSeconds: number
}

interface Bucket {
  count: number
  resetAt: number
}

export interface RateLimitStore {
  get(key: string): Bucket | undefined
  set(key: string, bucket: Bucket): void
  delete(key: string): void
  entries(): IterableIterator<[string, Bucket]>
  readonly size: number
}

function createMemoryStore(): RateLimitStore {
  const map = new Map<string, Bucket>()
  return {
    get: (key) => map.get(key),
    set: (key, bucket) => {
      map.set(key, bucket)
    },
    delete: (key) => {
      map.delete(key)
    },
    entries: () => map.entries(),
    get size() {
      return map.size
    },
  }
}

interface RateLimiterOptions {
  max: number
  windowMs: number
  store?: RateLimitStore
}

/** Above this many tracked keys, expired buckets are swept on the next request. */
const SWEEP_THRESHOLD = 500

export function createRateLimiter(options: RateLimiterOptions) {
  const store = options.store ?? createMemoryStore()

  return function check(key: string): RateLimitResult {
    const now = Date.now()

    // Opportunistic sweep: no timer to leak, and the cost falls only on the
    // request that happens to find the map oversized.
    if (store.size > SWEEP_THRESHOLD) {
      for (const [existingKey, bucket] of store.entries()) {
        if (bucket.resetAt <= now) store.delete(existingKey)
      }
    }

    const bucket = store.get(key)

    if (!bucket || bucket.resetAt <= now) {
      const resetAt = now + options.windowMs
      store.set(key, { count: 1, resetAt })
      return { allowed: true, remaining: options.max - 1, resetAt, retryAfterSeconds: 0 }
    }

    if (bucket.count >= options.max) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: bucket.resetAt,
        retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
      }
    }

    bucket.count += 1
    store.set(key, bucket)
    return {
      allowed: true,
      remaining: options.max - bucket.count,
      resetAt: bucket.resetAt,
      retryAfterSeconds: 0,
    }
  }
}

/**
 * One shared budget across every AI endpoint.
 *
 * A single analysis fans out to three model calls (analyse + rewrite + cover
 * letter). Per-endpoint limits would let one user issue three times the intended
 * load, whereas a shared bucket makes the limit describe something a user
 * recognises: roughly four full analyses per minute, with headroom to regenerate.
 */
export const checkAiRateLimit = createRateLimiter({ max: 15, windowMs: 60_000 })

/** Uploads consume no model quota, so they get a separate, looser budget. */
export const checkUploadRateLimit = createRateLimiter({ max: 20, windowMs: 60_000 })

/**
 * Derives a client identity from proxy headers.
 *
 * `x-forwarded-for` is a comma-separated chain whose left-most entry is the
 * original client. It is spoofable in general, but the hosting platform this app
 * targets rewrites the header at the edge, which makes it trustworthy here.
 */
export function getClientKey(headers: Headers, scope: string): string {
  const forwarded = headers.get('x-forwarded-for')
  const realIp = headers.get('x-real-ip')
  const ip = forwarded?.split(',')[0]?.trim() || realIp?.trim() || 'unknown'
  return `${scope}:${ip}`
}
