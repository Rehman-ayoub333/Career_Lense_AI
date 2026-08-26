import type { AiRequest, AiResponse } from '@/lib/ai/types'
import type { ClaimReference } from '@/lib/api/contract'
import type { RewriteResult } from '@/types'

/**
 * `/api/rewrite`'s optional `claims` field (ADR-18).
 *
 * Asserted through the real route rather than by calling `getRewritePrompt`
 * directly, so these cover the wiring — body parsing, validation, prompt
 * construction — and not just the string builder in isolation. The prompt the
 * model would have received is read back off the captured provider call.
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
const { POST } = require('@/app/api/rewrite/route') as {
  POST: (request: Request) => Promise<Response>
}
/* eslint-enable @typescript-eslint/no-require-imports */

const CV = `Sana Iqbal — Software Engineer.
Built and shipped three production React applications over 4 years.
Led a team of 4 engineers through a migration from REST to GraphQL.
Maintained the internal component library and its documentation.
Ran the on-call rotation for the checkout service.
BSc Computer Science, University of the Punjab.`

const JD = 'We need a frontend engineer with production React experience and Docker exposure.'

const REWRITE: RewriteResult = {
  original_bullets: ['a', 'b', 'c', 'd', 'e'],
  rewritten_bullets: ['A', 'B', 'C', 'D', 'E'],
}

const CLAIMS: ClaimReference[] = [
  { requirement: 'Docker or containerization experience', category: 'skill', verification: 'unresolved' },
  { requirement: 'Mentoring junior engineers', category: 'experience', verification: 'uncertain' },
]

let clientCounter = 0

function rewriteRequest(body: Record<string, unknown>): Request {
  clientCounter += 1
  return new Request('http://localhost/api/rewrite', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': `10.1.0.${clientCounter}`,
    },
    body: JSON.stringify(body),
  })
}

/** The user-turn prompt the provider was handed on the most recent call. */
function lastPrompt(): string {
  return generate.mock.calls[generate.mock.calls.length - 1][0].user
}

beforeEach(() => {
  generate.mockReset()
  generate.mockResolvedValue({
    text: JSON.stringify(REWRITE),
    usage: { inputTokens: 10, outputTokens: 20 },
    model: 'claude-test',
  })
})

describe('POST /api/rewrite — with claims', () => {
  it('names the unresolved and uncertain requirements in the prompt, so the rewrite aims at them', async () => {
    await POST(rewriteRequest({ cvText: CV, jdText: JD, claims: CLAIMS }))

    const prompt = lastPrompt()
    expect(prompt).toContain('Prioritise bullets that touch these areas')
    expect(prompt).toContain('Docker or containerization experience')
    expect(prompt).toContain('Mentoring junior engineers')
    // The category and tier travel with each requirement.
    expect(prompt).toContain('(skill, unresolved)')
    expect(prompt).toContain('(experience, uncertain)')
  })

  it('keeps the generic framing as well, rather than replacing it', async () => {
    await POST(rewriteRequest({ cvText: CV, jdText: JD, claims: CLAIMS }))

    expect(lastPrompt()).toContain('with the most room to improve')
  })

  it('SECURITY: wraps the claims in the same nonce delimiters as the CV', async () => {
    // These strings arrive in a request body. That the server produced them
    // originally is not evidence they are unmodified now.
    await POST(rewriteRequest({ cvText: CV, jdText: JD, claims: CLAIMS }))

    const prompt = lastPrompt()
    const nonce = /<<<CV:([a-z0-9]+)>>>/.exec(prompt)?.[1]

    expect(nonce).toBeDefined()
    expect(prompt).toContain(`<<<WEAK_REQUIREMENTS:${nonce}>>>`)
    expect(prompt).toContain(`<<<END_WEAK_REQUIREMENTS:${nonce}>>>`)
  })

  it('drops entries with an invalid category or tier instead of failing the request', async () => {
    const response = await POST(
      rewriteRequest({
        cvText: CV,
        jdText: JD,
        claims: [
          ...CLAIMS,
          { requirement: 'Injected', category: 'not-a-category', verification: 'unresolved' },
          { requirement: 'Also injected', category: 'skill', verification: 'verified-ish' },
          { requirement: '', category: 'skill', verification: 'unresolved' },
          'not an object',
        ],
      })
    )

    expect(response.status).toBe(200)

    const prompt = lastPrompt()
    expect(prompt).toContain('Docker or containerization experience')
    expect(prompt).not.toContain('Injected')
    expect(prompt).not.toContain('not-a-category')
  })
})

describe('POST /api/rewrite — without claims', () => {
  it('falls back to the generic framing and adds no weak-requirements block', async () => {
    await POST(rewriteRequest({ cvText: CV, jdText: JD }))

    const prompt = lastPrompt()
    expect(prompt).toContain('with the most room to improve')
    expect(prompt).not.toContain('Prioritise bullets that touch these areas')
    expect(prompt).not.toContain('WEAK_REQUIREMENTS')
  })

  it('treats an empty claims array as absent', async () => {
    await POST(rewriteRequest({ cvText: CV, jdText: JD, claims: [] }))

    expect(lastPrompt()).not.toContain('WEAK_REQUIREMENTS')
  })

  it('accepts a request from a caller that has never heard of the field', async () => {
    // The field is optional precisely so this keeps working (ADR-18).
    const response = await POST(rewriteRequest({ cvText: CV, jdText: JD }))
    expect(response.status).toBe(200)
  })
})

describe('POST /api/rewrite — response shape is unaffected either way', () => {
  async function readData(body: Record<string, unknown>): Promise<unknown> {
    const response = await POST(rewriteRequest(body))
    const parsed = (await response.json()) as { success: boolean; data: unknown }
    expect(parsed.success).toBe(true)
    return parsed.data
  }

  it('returns the same RewriteResult with and without claims', async () => {
    const without = await readData({ cvText: CV, jdText: JD })
    const with_ = await readData({ cvText: CV, jdText: JD, claims: CLAIMS })

    expect(without).toEqual(REWRITE)
    expect(with_).toEqual(REWRITE)
    expect(with_).toEqual(without)
  })

  it('ADR-25: carries its own examined output budget, not analyze\'s', async () => {
    // The point of the ADR-25 clause: every call site sets a value sized to its
    // own output shape. Ten bullets is a few hundred tokens, so 2048 rather than
    // the 8192 /api/analyze needs. Asserted as a distinct number so a copy-paste
    // of analyze's budget onto this route fails rather than passing quietly.
    await POST(rewriteRequest({ cvText: CV, jdText: JD }))

    const request = generate.mock.calls[generate.mock.calls.length - 1][0]
    expect(request.maxOutputTokens).toBe(2048)
  })

  it('adds no claims field to the response', async () => {
    const data = (await readData({ cvText: CV, jdText: JD, claims: CLAIMS })) as Record<
      string,
      unknown
    >

    expect(Object.keys(data).sort()).toEqual(['original_bullets', 'rewritten_bullets'])
  })
})
