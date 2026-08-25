import type { AiRequest, AiResponse } from '@/lib/ai/types'

/**
 * Rate limiting **at the route boundary**.
 *
 * `tests/rate-limit.test.ts` already covers the limiter itself — windows, sweeps,
 * key isolation — but it calls `createRateLimiter` directly. Nothing drove a real
 * endpoint past its threshold, so nothing asserted the part a client actually
 * meets: the 429, the `Retry-After` header, the `X-RateLimit-*` headers, and the
 * fact that a blocked request never reaches the model.
 *
 * `TESTING_STRATEGY_FINAL.md` names this twice — §API ("rate-limit 429 after the
 * existing threshold") and §Security ("existing 15/min AI, 20/min upload
 * thresholds, still enforced after this plan's changes"). This is that test.
 *
 * The store is a module-level Map shared by every route in the process, so each
 * scenario below uses its own client IP. That is not a workaround; it is the same
 * isolation real clients get, and mixing them would make these tests depend on
 * each other's ordering.
 */

const generate = jest.fn<Promise<AiResponse>, [AiRequest]>()

jest.mock('@/lib/ai/google', () => ({
  googleProvider: {
    id: 'google',
    isConfigured: () => true,
    generate: (request: AiRequest) => generate(request),
  },
}))

/* eslint-disable @typescript-eslint/no-require-imports -- must import after jest.mock. */
const chatRoute = require('@/app/api/chat/route') as {
  POST: (request: Request) => Promise<Response>
}
const coverLetterRoute = require('@/app/api/cover-letter/route') as {
  POST: (request: Request) => Promise<Response>
}
const uploadRoute = require('@/app/api/upload/route') as {
  POST: (request: Request) => Promise<Response>
}
/* eslint-enable @typescript-eslint/no-require-imports */

/** The documented budgets. Hard-coded on purpose: importing them from the module
 *  under test would let a change to the limit silently update its own test. */
const AI_LIMIT = 15
const UPLOAD_LIMIT = 20

const CV = `Sana Iqbal — Software Engineer.
Built and shipped three production React applications over 4 years.
Led a team of 4 engineers through a migration from REST to GraphQL.
BSc Computer Science, University of the Punjab.`

const JD = 'We need a frontend engineer with production React experience and Docker exposure.'

function chatFrom(ip: string): Request {
  return new Request('http://localhost/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify({ message: 'What should I fix first?', cvText: CV, jdText: JD }),
  })
}

function coverLetterFrom(ip: string): Request {
  return new Request('http://localhost/api/cover-letter', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify({ cvText: CV, jdText: JD }),
  })
}

function uploadFrom(ip: string): Request {
  const form = new FormData()
  form.append('file', new File(['too short to be a CV'], 'cv.txt', { type: 'text/plain' }))
  return new Request('http://localhost/api/upload', {
    method: 'POST',
    headers: { 'x-forwarded-for': ip },
    body: form,
  })
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>
}

/** Drives a route n times from one address, sequentially, returning every status. */
async function drive(
  route: { POST: (request: Request) => Promise<Response> },
  build: (ip: string) => Request,
  ip: string,
  times: number
): Promise<number[]> {
  const statuses: number[] = []
  for (let i = 0; i < times; i += 1) {
    statuses.push((await route.POST(build(ip))).status)
  }
  return statuses
}

beforeEach(() => {
  generate.mockReset()
  generate.mockResolvedValue({
    text: 'A reply long enough to clear the cover-letter floor. '.repeat(8),
    usage: { inputTokens: 10, outputTokens: 20 },
    model: 'gemini-test',
  })
})

describe('the AI budget, at the route', () => {
  it(`allows ${AI_LIMIT} requests and answers 429 on the next one`, async () => {
    const ip = '172.20.0.1'
    const allowed = await drive(chatRoute, chatFrom, ip, AI_LIMIT)

    expect(allowed).toEqual(Array(AI_LIMIT).fill(200))
    expect((await chatRoute.POST(chatFrom(ip))).status).toBe(429)
  })

  it('sends Retry-After and a matching retryAfter in the body', async () => {
    const ip = '172.20.0.2'
    await drive(chatRoute, chatFrom, ip, AI_LIMIT)

    const blocked = await chatRoute.POST(chatFrom(ip))
    const body = await readJson(blocked)

    const header = blocked.headers.get('Retry-After')
    expect(header).not.toBeNull()

    const seconds = Number(header)
    expect(Number.isInteger(seconds)).toBe(true)
    // A window is 60s and some of it has elapsed, so this is a real remainder,
    // never 0 — a `Retry-After: 0` invites an immediate retry that also fails.
    expect(seconds).toBeGreaterThan(0)
    expect(seconds).toBeLessThanOrEqual(60)
    expect(body.retryAfter).toBe(seconds)
  })

  it('returns the RATE_LIMITED envelope with a requestId and no internal detail', async () => {
    const ip = '172.20.0.3'
    await drive(chatRoute, chatFrom, ip, AI_LIMIT)

    const body = await readJson(await chatRoute.POST(chatFrom(ip)))

    expect(body.success).toBe(false)
    expect(body.error).toBe('RATE_LIMITED')
    expect(body.requestId).toEqual(expect.any(String))
    expect(String(body.message)).toMatch(/wait \d+ seconds/)
    // `detail` is 'Rate limit hit on chat.' — a route name is not for the client.
    expect(JSON.stringify(body)).not.toContain('Rate limit hit')
  })

  it('never calls the model for a blocked request', async () => {
    const ip = '172.20.0.4'
    await drive(chatRoute, chatFrom, ip, AI_LIMIT)

    const callsBefore = generate.mock.calls.length
    const blocked = await chatRoute.POST(chatFrom(ip))

    expect(blocked.status).toBe(429)
    // The point of the limiter. Rate limiting runs before body parsing and
    // before the handler, so a blocked request costs no quota at all.
    expect(generate.mock.calls).toHaveLength(callsBefore)
  })

  it('counts down X-RateLimit-Remaining and reports 0 when blocked', async () => {
    const ip = '172.20.0.5'

    const first = await chatRoute.POST(chatFrom(ip))
    expect(first.headers.get('X-RateLimit-Remaining')).toBe(String(AI_LIMIT - 1))

    const second = await chatRoute.POST(chatFrom(ip))
    expect(second.headers.get('X-RateLimit-Remaining')).toBe(String(AI_LIMIT - 2))

    await drive(chatRoute, chatFrom, ip, AI_LIMIT - 2)
    const blocked = await chatRoute.POST(chatFrom(ip))

    expect(blocked.status).toBe(429)
    expect(blocked.headers.get('X-RateLimit-Remaining')).toBe('0')
    expect(Number(blocked.headers.get('X-RateLimit-Reset'))).toBeGreaterThan(0)
  })

  it('isolates one client from another', async () => {
    const exhausted = '172.20.0.6'
    await drive(chatRoute, chatFrom, exhausted, AI_LIMIT)

    expect((await chatRoute.POST(chatFrom(exhausted))).status).toBe(429)
    expect((await chatRoute.POST(chatFrom('172.20.0.7'))).status).toBe(200)
  })
})

describe('the AI budget is shared across endpoints, as designed', () => {
  it('spends the same bucket from /api/chat and /api/cover-letter', async () => {
    // One analysis fans out to several model calls. Per-endpoint limits would let
    // one user issue several times the intended load, so the bucket is shared and
    // the limit describes something a user recognises.
    const ip = '172.21.0.1'
    await drive(chatRoute, chatFrom, ip, AI_LIMIT)

    const blocked = await coverLetterRoute.POST(coverLetterFrom(ip))
    expect(blocked.status).toBe(429)
  })

  it('blocks in whichever order the endpoints are called', async () => {
    const ip = '172.21.0.2'
    await drive(coverLetterRoute, coverLetterFrom, ip, AI_LIMIT)

    expect((await chatRoute.POST(chatFrom(ip))).status).toBe(429)
  })
})

describe('uploads get their own, looser budget', () => {
  it('is not spent by AI calls, since an upload consumes no model quota', async () => {
    const ip = '172.22.0.1'
    await drive(chatRoute, chatFrom, ip, AI_LIMIT)
    expect((await chatRoute.POST(chatFrom(ip))).status).toBe(429)

    // Same client, different scope: `upload:<ip>` is a different key entirely.
    const upload = await uploadRoute.POST(uploadFrom(ip))
    expect(upload.status).not.toBe(429)
  })

  it(`allows ${UPLOAD_LIMIT} uploads and answers 429 on the next one`, async () => {
    const ip = '172.22.0.2'
    const statuses = await drive(uploadRoute, uploadFrom, ip, UPLOAD_LIMIT)

    // Every one is a 422 — the fixture is deliberately too short to be a CV.
    // A rejected request still spends a token, which is the correct behaviour:
    // otherwise an attacker hammers the endpoint with invalid files for free.
    expect(statuses.every((status) => status === 422)).toBe(true)

    const blocked = await uploadRoute.POST(uploadFrom(ip))
    expect(blocked.status).toBe(429)
    expect(blocked.headers.get('Retry-After')).not.toBeNull()
  })
})
