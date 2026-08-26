import type { AiRequest, AiResponse } from '@/lib/ai/types'

/**
 * `/api/cover-letter`.
 *
 * The endpoint whose previous implementation applied a JSON response format to
 * every provider call, so a Gemini-only deployment returned a JSON-encoded
 * string here instead of a letter. That regression has a test now: the request
 * must ask for prose.
 *
 * It is also the only AI route with a post-generation quality gate — a
 * three-paragraph letter that comes back under 200 characters is a truncated
 * generation, not a short letter, and is reported as a failure rather than
 * handed to the user.
 */

const generate = jest.fn<Promise<AiResponse>, [AiRequest]>()

jest.mock('@/lib/ai/anthropic', () => ({
  anthropicProvider: {
    id: 'anthropic',
    isConfigured: () => true,
    generate: (request: AiRequest) => generate(request),
  },
}))

/* eslint-disable @typescript-eslint/no-require-imports -- must import after jest.mock. */
const { POST } = require('@/app/api/cover-letter/route') as {
  POST: (request: Request) => Promise<Response>
}
/* eslint-enable @typescript-eslint/no-require-imports */

const CV = `Sana Iqbal — Software Engineer.
Built and shipped three production React applications over 4 years.
Led a team of 4 engineers through a migration from REST to GraphQL.
BSc Computer Science, University of the Punjab.`

const JD = 'We need a frontend engineer with production React experience and Docker exposure.'

const LETTER = `Dear hiring team,

I have spent four years building production React applications, most recently
leading a team of four engineers through a REST to GraphQL migration.

That work maps closely onto what this role asks for, and I would like to bring
it to your team.

Sincerely,
Sana Iqbal`

let clientCounter = 0

function coverLetterRequest(body: unknown): Request {
  clientCounter += 1
  return new Request('http://localhost/api/cover-letter', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': `10.3.0.${clientCounter}`,
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

function lastRequest(): AiRequest {
  return generate.mock.calls[generate.mock.calls.length - 1][0]
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>
}

beforeEach(() => {
  generate.mockReset()
  generate.mockResolvedValue({
    text: `\n${LETTER}\n`,
    usage: { inputTokens: 200, outputTokens: 300 },
    model: 'claude-test',
  })
})

describe('POST /api/cover-letter — the 2xx shape', () => {
  it('returns 200 with the success envelope and a trimmed letter', async () => {
    const response = await POST(coverLetterRequest({ cvText: CV, jdText: JD }))
    const body = await readJson(response)

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data).toEqual({ coverLetter: LETTER })
  })

  it('exposes only the coverLetter field', async () => {
    const body = await readJson(await POST(coverLetterRequest({ cvText: CV, jdText: JD })))
    expect(Object.keys(body.data as object)).toEqual(['coverLetter'])
  })

  it('REGRESSION: asks the provider for prose, not JSON', async () => {
    // The exact bug this route carried: a JSON response format on every call
    // meant a Gemini-only deployment returned a JSON-encoded string, not a letter.
    await POST(coverLetterRequest({ cvText: CV, jdText: JD }))
    expect(lastRequest().format).toBe('text')
  })

  it('generates with temperature above zero, since a deterministic letter reads like a form', async () => {
    await POST(coverLetterRequest({ cvText: CV, jdText: JD }))
    expect(lastRequest().temperature).toBeGreaterThan(0)
  })
})

describe('POST /api/cover-letter — validation', () => {
  it('rejects a CV below the minimum length with 400', async () => {
    const response = await POST(coverLetterRequest({ cvText: 'too short', jdText: JD }))
    const body = await readJson(response)

    expect(response.status).toBe(400)
    expect(body.error).toBe('VALIDATION_ERROR')
    expect(generate).not.toHaveBeenCalled()
  })

  it('rejects a missing job description with 400 and names the field', async () => {
    const response = await POST(coverLetterRequest({ cvText: CV }))
    const body = await readJson(response)

    expect(response.status).toBe(400)
    expect(String(body.message)).toContain('job description')
  })

  it('rejects a malformed JSON body with 400 rather than a 500', async () => {
    const response = await POST(coverLetterRequest('{"cvText":'))
    expect(response.status).toBe(400)
  })

  it('rejects a non-object body with 400', async () => {
    const response = await POST(coverLetterRequest(['cv', 'jd']))
    expect(response.status).toBe(400)
  })
})

describe('POST /api/cover-letter — SECURITY', () => {
  it('wraps both documents in nonce delimiters', async () => {
    await POST(coverLetterRequest({ cvText: CV, jdText: JD }))

    const prompt = lastRequest().user
    const nonce = /<<<CV:([a-z0-9]+)>>>/.exec(prompt)?.[1]

    expect(nonce).toBeDefined()
    expect(prompt).toContain(`<<<END_CV:${nonce}>>>`)
    expect(prompt).toContain(`<<<JOB_DESCRIPTION:${nonce}>>>`)
    expect(prompt).toContain(`<<<END_JOB_DESCRIPTION:${nonce}>>>`)
  })

  it('never returns the provider error detail to the caller', async () => {
    const { AppError } = jest.requireActual<typeof import('@/lib/errors')>('@/lib/errors')
    generate.mockRejectedValue(
      new AppError('AI_UNAVAILABLE', { detail: 'project quota 998877 exhausted on claude-haiku-4-5-20251001' })
    )

    const response = await POST(coverLetterRequest({ cvText: CV, jdText: JD }))
    const raw = JSON.stringify(await readJson(response))

    expect(response.status).toBe(503)
    expect(raw).not.toContain('998877')
    expect(raw).not.toContain('claude')
  })
})

describe('POST /api/cover-letter — the truncated-generation gate', () => {
  it('reports a too-short letter as a failure rather than returning it', async () => {
    generate.mockResolvedValue({
      text: 'Dear hiring team, I am interested.',
      usage: { inputTokens: 200, outputTokens: 8 },
      model: 'claude-test',
    })

    const response = await POST(coverLetterRequest({ cvText: CV, jdText: JD }))
    const body = await readJson(response)

    expect(response.status).toBe(502)
    expect(body.error).toBe('AI_INVALID_OUTPUT')
    expect(body.success).toBe(false)
  })

  it('does not leak the measured length into the public message', async () => {
    // "Cover letter was only 33 characters" is a developer detail.
    generate.mockResolvedValue({
      text: 'Too short.',
      usage: { inputTokens: 200, outputTokens: 3 },
      model: 'claude-test',
    })

    const body = await readJson(await POST(coverLetterRequest({ cvText: CV, jdText: JD })))
    expect(String(body.message)).not.toMatch(/\d+ characters/)
  })

  it('accepts a letter that clears the floor', async () => {
    const response = await POST(coverLetterRequest({ cvText: CV, jdText: JD }))
    expect(response.status).toBe(200)
  })
})
