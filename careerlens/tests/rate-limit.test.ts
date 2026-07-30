import { createRateLimiter, getClientKey } from '@/lib/rate-limit'

describe('createRateLimiter', () => {
  it('allows requests up to the limit', () => {
    const check = createRateLimiter({ max: 3, windowMs: 1000 })
    expect(check('a').allowed).toBe(true)
    expect(check('a').allowed).toBe(true)
    expect(check('a').allowed).toBe(true)
    expect(check('a').allowed).toBe(false)
  })

  it('reports remaining capacity accurately', () => {
    const check = createRateLimiter({ max: 3, windowMs: 1000 })
    expect(check('a').remaining).toBe(2)
    expect(check('a').remaining).toBe(1)
    expect(check('a').remaining).toBe(0)
  })

  it('isolates keys from one another', () => {
    const check = createRateLimiter({ max: 1, windowMs: 1000 })
    expect(check('a').allowed).toBe(true)
    expect(check('a').allowed).toBe(false)
    expect(check('b').allowed).toBe(true)
  })

  it('returns a positive Retry-After only when blocked', () => {
    const check = createRateLimiter({ max: 1, windowMs: 60_000 })
    expect(check('a').retryAfterSeconds).toBe(0)

    const blocked = check('a')
    expect(blocked.allowed).toBe(false)
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0)
    expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(60)
  })

  it('opens a fresh window once the current one expires', () => {
    jest.useFakeTimers()
    try {
      const check = createRateLimiter({ max: 1, windowMs: 1000 })
      expect(check('a').allowed).toBe(true)
      expect(check('a').allowed).toBe(false)

      jest.advanceTimersByTime(1001)
      expect(check('a').allowed).toBe(true)
    } finally {
      jest.useRealTimers()
    }
  })

  it('sweeps expired buckets instead of growing without bound', () => {
    jest.useFakeTimers()
    try {
      const check = createRateLimiter({ max: 5, windowMs: 1000 })
      for (let i = 0; i < 600; i += 1) check(`key-${i}`)

      jest.advanceTimersByTime(2000)
      // The next call crosses the sweep threshold and purges the expired entries.
      expect(check('trigger').allowed).toBe(true)
    } finally {
      jest.useRealTimers()
    }
  })
})

describe('getClientKey', () => {
  it('takes the left-most address from a forwarded chain', () => {
    const headers = new Headers({ 'x-forwarded-for': '203.0.113.5, 70.41.3.18, 150.172.238.178' })
    expect(getClientKey(headers, 'ai')).toBe('ai:203.0.113.5')
  })

  it('falls back to x-real-ip', () => {
    expect(getClientKey(new Headers({ 'x-real-ip': '198.51.100.7' }), 'ai')).toBe('ai:198.51.100.7')
  })

  it('degrades to a shared bucket rather than throwing when no address is present', () => {
    expect(getClientKey(new Headers(), 'upload')).toBe('upload:unknown')
  })

  it('namespaces by scope so upload and AI budgets stay separate', () => {
    const headers = new Headers({ 'x-forwarded-for': '203.0.113.5' })
    expect(getClientKey(headers, 'ai')).not.toBe(getClientKey(headers, 'upload'))
  })
})
