/**
 * `/api/health`.
 *
 * A liveness and readiness probe, and the one endpoint whose *non*-behaviour is
 * the point: it must not call the provider. A health check that consumes model
 * quota is a health check that causes the outage it exists to detect.
 *
 * It reports the single failure mode that silently breaks every feature after a
 * deploy — a missing credential — without disclosing which provider is behind
 * it. Both halves are asserted here, because "degraded" leaking the vendor name
 * would make this the most-scraped page in the app.
 */

const generate = jest.fn()
const isConfigured = jest.fn<boolean, []>()

jest.mock('@/lib/ai/google', () => ({
  googleProvider: {
    id: 'google',
    isConfigured: () => isConfigured(),
    generate,
  },
}))

/* eslint-disable @typescript-eslint/no-require-imports -- must import after jest.mock. */
const { GET } = require('@/app/api/health/route') as { GET: () => Promise<Response> }
/* eslint-enable @typescript-eslint/no-require-imports */

interface HealthBody {
  status: string
  ready: boolean
  timestamp: string
}

async function readHealth(response: Response): Promise<HealthBody> {
  return (await response.json()) as HealthBody
}

beforeEach(() => {
  generate.mockReset()
  isConfigured.mockReset()
})

describe('GET /api/health — ready', () => {
  beforeEach(() => {
    isConfigured.mockReturnValue(true)
  })

  it('returns 200 and ok when the provider is configured', async () => {
    const response = await GET()
    const body = await readHealth(response)

    expect(response.status).toBe(200)
    expect(body.status).toBe('ok')
    expect(body.ready).toBe(true)
  })

  it('stamps a parseable ISO timestamp', async () => {
    const body = await readHealth(await GET())
    expect(Number.isNaN(Date.parse(body.timestamp))).toBe(false)
  })

  it('is never cached, so a stale ok cannot outlive the outage', async () => {
    expect((await GET()).headers.get('Cache-Control')).toBe('no-store')
  })
})

describe('GET /api/health — degraded', () => {
  beforeEach(() => {
    isConfigured.mockReturnValue(false)
  })

  it('returns 503 and degraded when credentials are missing', async () => {
    const response = await GET()
    const body = await readHealth(response)

    // 503 rather than 200-with-a-flag: an orchestrator reads the status code,
    // and a body nobody parses is not a readiness probe.
    expect(response.status).toBe(503)
    expect(body.status).toBe('degraded')
    expect(body.ready).toBe(false)
  })

  it('is still no-store when degraded', async () => {
    expect((await GET()).headers.get('Cache-Control')).toBe('no-store')
  })

  it('SECURITY: does not disclose the provider, the variable name or the reason', async () => {
    // `getProvider` throws with `detail: 'Provider "google" is missing its
    // credentials. Set GOOGLE_API_KEY.'` — useful in a log, and an unauthenticated
    // fingerprint of the stack if it reached the body.
    const raw = JSON.stringify(await readHealth(await GET()))

    expect(raw).not.toContain('google')
    expect(raw).not.toContain('GOOGLE_API_KEY')
    expect(raw).not.toContain('credentials')
    expect(raw).not.toContain('CONFIG_ERROR')
  })

  it('exposes exactly three fields and no error object', async () => {
    const body = await readHealth(await GET())
    expect(Object.keys(body).sort()).toEqual(['ready', 'status', 'timestamp'])
  })
})

describe('GET /api/health — costs nothing', () => {
  it('never calls the provider, in either state', async () => {
    isConfigured.mockReturnValue(true)
    await GET()

    isConfigured.mockReturnValue(false)
    await GET()

    // The whole reason this route checks configuration rather than making a
    // round trip.
    expect(generate).not.toHaveBeenCalled()
  })

  it('answers without throwing when the provider registry itself is unhappy', async () => {
    isConfigured.mockImplementation(() => {
      throw new Error('registry exploded')
    })

    // A probe that 500s on an unexpected internal error tells a load balancer
    // nothing useful. It should still answer, and answer "not ready".
    const response = await GET()
    expect(response.status).toBe(503)
    expect((await readHealth(response)).ready).toBe(false)
  })
})
