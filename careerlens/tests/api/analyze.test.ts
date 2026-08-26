import type { AiRequest, AiResponse } from '@/lib/ai/types'
import type { AnalysisDraft, AnalysisResult, ResearchAnalysisResult, VerifiedClaim } from '@/types'

/**
 * Integration tests for `/api/analyze`.
 *
 * The provider is mocked rather than `generateJson`, deliberately: mocking
 * `generateJson` would stub out the constrained-decode/parse/validate/repair
 * logic that two of these tests exist to exercise. Mocking one layer lower means
 * the real `generateJson` runs, with its real single-repair rule, and only the
 * network call is replaced.
 */

const generate = jest.fn<Promise<AiResponse>, [AiRequest]>()

jest.mock('@/lib/ai/anthropic', () => ({
  anthropicProvider: {
    id: 'anthropic',
    isConfigured: () => true,
    generate: (request: AiRequest) => generate(request),
  },
}))

/* eslint-disable @typescript-eslint/no-require-imports -- the route must be
   imported after jest.mock is registered, so this cannot be a static import. */
const { POST } = require('@/app/api/analyze/route') as {
  POST: (request: Request) => Promise<Response>
}
/* eslint-enable @typescript-eslint/no-require-imports */

const CV = `Sana Iqbal — Software Engineer.
Built and shipped three production React applications over 4 years.
Led a team of 4 engineers through a migration from REST to GraphQL.
BSc Computer Science, University of the Punjab.`

const JD = 'We need a frontend engineer with production React experience and Docker exposure.'

function modelResponse(text: string): AiResponse {
  return { text, usage: { inputTokens: 100, outputTokens: 200 }, model: 'claude-test' }
}

function draft(overrides: Partial<AnalysisDraft> = {}): AnalysisDraft {
  return {
    score: 73,
    verdict: 'Good Match',
    claims: [
      {
        requirement: 'Production React experience',
        category: 'skill',
        status: 'matched',
        // Verbatim in the CV above — must verify.
        evidence_quote: 'Built and shipped three production React applications over 4 years',
        rationale: 'The CV states four years of production React work.',
      },
      {
        requirement: 'Docker or containerization experience',
        category: 'skill',
        status: 'gap',
        // The sentinel, per ADR-10.
        evidence_quote: '',
        rationale: 'No mention of Docker or containerization appears in the CV.',
      },
      {
        requirement: 'Team leadership',
        category: 'experience',
        status: 'matched',
        // Fabricated headcount — the ADR-17 digit gate must catch this.
        evidence_quote: 'Led a team of 12 engineers through a migration from REST to GraphQL',
        rationale: 'The CV describes leading an engineering team through a migration.',
      },
    ],
    key_actions: ['Add evidence of container work', 'Quantify the migration', 'Name the stack'],
    ats_checks: [{ id: 'headings', label: 'Standard headings', status: 'pass', note: 'Clear.' }],
    salary_range: '$95,000 - $120,000 USD',
    salary_context: 'Reflects mid-level frontend work.',
    interview_questions: [{ question: 'Describe the migration.', skill_tested: 'Delivery', tip: 'Use STAR.' }],
    ...overrides,
  }
}

/** A distinct client key per test, so the shared rate-limit bucket is not shared. */
let clientCounter = 0

function analyzeRequest(headers: Record<string, string> = {}, body?: unknown): Request {
  clientCounter += 1
  return new Request('http://localhost/api/analyze', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': `10.0.0.${clientCounter}`,
      ...headers,
    },
    body: JSON.stringify(body ?? { cvText: CV, jdText: JD, mode: 'job' }),
  })
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>
}

beforeEach(() => {
  generate.mockReset()
  delete process.env.RESEARCH_MODE_ENABLED
})

describe('POST /api/analyze — the happy path, end to end', () => {
  beforeEach(() => {
    generate.mockResolvedValue(modelResponse(JSON.stringify(draft())))
  })

  it('returns 200 with the success envelope', async () => {
    const response = await POST(analyzeRequest())
    expect(response.status).toBe(200)

    const body = await readJson(response)
    expect(body.success).toBe(true)
  })

  it('runs guard-validate -> normalize -> verify -> aggregate, producing verified claims and counted coverage', async () => {
    const body = await readJson(await POST(analyzeRequest()))
    const data = body.data as AnalysisResult

    // Normalize assigned the ids; the model never sent them.
    expect(data.claims.map((claim) => claim.id)).toEqual(['claim-0', 'claim-1', 'claim-2'])

    // Verify ran against the CV: a verbatim quote, a gap with no quote, and a
    // fabricated headcount caught by the digit gate.
    expect(data.claims.map((claim) => claim.verification)).toEqual([
      'verified',
      'unresolved',
      'unresolved',
    ])

    // The sentinel was resolved before anything downstream saw it.
    expect(data.claims[1].evidence_quote).toBeNull()

    // Aggregate counted the tiers rather than asking the model for them.
    expect(data.coverage).toEqual({
      overall: 1 / 3,
      byCategory: { skill: 0.5, experience: 0 },
      verifiedCount: 1,
      uncertainCount: 0,
      unresolvedCount: 2,
      total: 3,
    })
  })

  it('preserves the fields the model owns and clamps the score', async () => {
    generate.mockResolvedValue(modelResponse(JSON.stringify(draft({ score: 142 }))))

    const data = (await readJson(await POST(analyzeRequest()))).data as AnalysisResult

    expect(data.score).toBe(100)
    expect(data.verdict).toBe('Good Match')
    expect(data.key_actions).toHaveLength(3)
    expect(data.interview_questions).toHaveLength(1)
  })

  it('records every ATS check as model-sourced, since no deterministic check exists yet', async () => {
    const data = (await readJson(await POST(analyzeRequest()))).data as AnalysisResult

    expect(data.ats_checks.every((check) => check.source === 'model')).toBe(true)
  })

  it('calls the model exactly once when the first response is valid', async () => {
    await POST(analyzeRequest())
    expect(generate).toHaveBeenCalledTimes(1)
  })

  it('handles a zero-claim response as a defined empty state, not an error', async () => {
    generate.mockResolvedValue(modelResponse(JSON.stringify(draft({ claims: [] }))))

    const response = await POST(analyzeRequest())
    expect(response.status).toBe(200)

    const data = (await readJson(response)).data as AnalysisResult
    expect(data.claims).toEqual([])
    // The zero-division guard: 0, never NaN, which would serialize as null.
    expect(data.coverage.overall).toBe(0)
    expect(data.coverage.total).toBe(0)
  })
})

/**
 * `TESTING_STRATEGY_FINAL.md` §Edge cases: "a CV that is actually a JD pasted
 * into the wrong box (a real user-error case worth a defined message, not a
 * crash)".
 *
 * No detection logic exists for this and none is being added. Stage 1 reads a CV
 * in the description box and finds no requirements to extract, which lands on the
 * zero-claims path `AI_PIPELINE_FINAL.md` already defines as an empty state. The
 * obligation this case actually carries is that the path is *reached* rather than
 * crashed through, and that what the user is then told is not misleading — the
 * copy half is asserted in `tests/components/empty-states.test.tsx`.
 *
 * Guessing at the mixup would be worse than not: the same near-empty result comes
 * from a terse description, a bulleted job ad, and a language the model handled
 * poorly. A message that named the swap as fact would be wrong more often than
 * right, so the surface offers it as the first thing to check and stops there.
 */
describe('POST /api/analyze — the documents swapped between boxes', () => {
  // Long enough to clear both minimums, so the request is well-formed and the
  // failure being tested is semantic rather than a 400 about length.
  const CV_IN_THE_JD_BOX = `Ahmed Raza — Data Analyst
ahmed.raza@example.com | +92 301 7654321

Experience
Built dashboards in Power BI for a retail chain across three regions.
Automated a weekly reporting pipeline that had been assembled by hand.

Education
BSc Statistics, Quaid-i-Azam University, 07/2020.`

  it('returns 200 with a defined empty state rather than crashing', async () => {
    // A CV in the description box gives Stage 1 nothing to extract requirements
    // from, so it legitimately returns zero claims.
    generate.mockResolvedValue(modelResponse(JSON.stringify(draft({ claims: [] }))))

    const response = await POST(
      analyzeRequest({}, { cvText: CV, jdText: CV_IN_THE_JD_BOX, mode: 'job' })
    )

    expect(response.status).toBe(200)

    const data = (await readJson(response)).data as AnalysisResult
    expect(data.claims).toEqual([])
    expect(data.coverage.total).toBe(0)
    expect(data.coverage.overall).toBe(0)
    expect(Number.isNaN(data.coverage.overall)).toBe(false)
  })

  it('still returns every required field, so the results screen has nothing missing to render', async () => {
    generate.mockResolvedValue(modelResponse(JSON.stringify(draft({ claims: [] }))))

    const response = await POST(
      analyzeRequest({}, { cvText: CV, jdText: CV_IN_THE_JD_BOX, mode: 'job' })
    )
    const data = (await readJson(response)).data as AnalysisResult

    // An empty state is a complete response with an empty collection in it, not
    // a partial response. Every panel still has something defined to render.
    expect(Object.keys(data).sort()).toEqual([
      'ats_checks',
      'claims',
      'coverage',
      'interview_questions',
      'key_actions',
      'salary_context',
      'salary_range',
      'score',
      'verdict',
    ])
    expect(data.coverage.byCategory).toEqual({})
  })

  it('does not invent a claim to avoid the empty state', async () => {
    // The failure mode worth guarding: a pipeline that treats "nothing found" as
    // an error condition and pads the result rather than reporting it.
    generate.mockResolvedValue(modelResponse(JSON.stringify(draft({ claims: [] }))))

    await POST(analyzeRequest({}, { cvText: CV, jdText: CV_IN_THE_JD_BOX, mode: 'job' }))

    // One call. No retry, no repair — zero claims is a valid response, not a
    // malformed one.
    expect(generate).toHaveBeenCalledTimes(1)
  })

  it('accepts the swap as well-formed input, since neither box can be validated by shape', async () => {
    // Both documents are free text over the minimum length. There is no shape
    // test that separates a CV from a job description, which is exactly why this
    // reaches the model at all rather than being rejected at the boundary.
    generate.mockResolvedValue(modelResponse(JSON.stringify(draft({ claims: [] }))))

    const response = await POST(
      analyzeRequest({}, { cvText: CV_IN_THE_JD_BOX, jdText: CV, mode: 'job' })
    )

    expect(response.status).toBe(200)
  })
})

describe('POST /api/analyze — response shaping and research mode', () => {
  beforeEach(() => {
    generate.mockResolvedValue(modelResponse(JSON.stringify(draft())))
  })

  it('strips match_score and hallucination_candidate from a standard response', async () => {
    const data = (await readJson(await POST(analyzeRequest()))).data as AnalysisResult

    for (const claim of data.claims) {
      expect(claim).not.toHaveProperty('match_score')
      expect(claim).not.toHaveProperty('hallucination_candidate')
    }
  })

  it('SECURITY: ignores X-Research-Mode when the server flag is unset, leaking no internal fields', async () => {
    // The header is attacker-controlled and authorizes nothing on its own. This
    // is the defence-in-depth default API_CONTRACT_FINAL.md requires be tested,
    // not merely implemented.
    const response = await POST(analyzeRequest({ 'x-research-mode': '1' }))
    const data = (await readJson(response)).data as AnalysisResult

    for (const claim of data.claims) {
      expect(claim).not.toHaveProperty('match_score')
      expect(claim).not.toHaveProperty('hallucination_candidate')
    }

    // Belt and braces: the internal field names must not appear anywhere in the
    // serialized body, including somewhere this loop would not reach.
    const raw = JSON.stringify(data)
    expect(raw).not.toContain('match_score')
    expect(raw).not.toContain('hallucination_candidate')
  })

  it('SECURITY: ignores the server flag when the header is absent', async () => {
    process.env.RESEARCH_MODE_ENABLED = 'true'

    const data = (await readJson(await POST(analyzeRequest()))).data as AnalysisResult

    expect(data.claims[0]).not.toHaveProperty('match_score')
  })

  it('returns the full VerifiedClaim only when the header and the flag agree', async () => {
    process.env.RESEARCH_MODE_ENABLED = 'true'

    const response = await POST(analyzeRequest({ 'x-research-mode': '1' }))
    const data = (await readJson(response)).data as ResearchAnalysisResult
    const claims = data.claims as VerifiedClaim[]

    expect(claims[0].match_score).toBe(1)
    expect(claims[0].hallucination_candidate).toBe(false)

    // The gated fabrication keeps its real overlap score (ADR-17), which is what
    // Experiment 1 reports.
    expect(claims[2].verification).toBe('unresolved')
    expect(claims[2].hallucination_candidate).toBe(true)
    expect(claims[2].match_score).toBeGreaterThan(0.9)
  })

  it('returns the same claims either way — research mode is one pipeline serialized twice, not two pipelines', async () => {
    const standard = (await readJson(await POST(analyzeRequest()))).data as AnalysisResult

    process.env.RESEARCH_MODE_ENABLED = 'true'
    const research = (await readJson(await POST(analyzeRequest({ 'x-research-mode': '1' }))))
      .data as ResearchAnalysisResult

    expect(research.claims.map((claim) => claim.verification)).toEqual(
      standard.claims.map((claim) => claim.verification)
    )
    expect(research.coverage).toEqual(standard.coverage)
  })
})

describe('POST /api/analyze — failure handling', () => {
  it('repairs once when the first response is unparseable, then succeeds', async () => {
    generate
      .mockResolvedValueOnce(modelResponse('I am afraid I cannot do that.'))
      .mockResolvedValueOnce(modelResponse(JSON.stringify(draft())))

    const response = await POST(analyzeRequest())

    expect(response.status).toBe(200)
    expect(generate).toHaveBeenCalledTimes(2)

    // The repair attempt carries the corrective instruction appended to the
    // original prompt, rather than being a bare re-send.
    expect(generate.mock.calls[1][0].user).toContain('could not be used')
  })

  it('repairs once when the first response parses but fails the guard, then succeeds', async () => {
    // Valid JSON, invalid content: a gap claim carrying evidence, which the
    // guard rejects as internally contradictory.
    const contradictory = draft({
      claims: [
        {
          requirement: 'Docker',
          category: 'skill',
          status: 'gap',
          evidence_quote: 'built three React applications',
          rationale: 'No mention of Docker appears in the CV.',
        },
      ],
    })

    generate
      .mockResolvedValueOnce(modelResponse(JSON.stringify(contradictory)))
      .mockResolvedValueOnce(modelResponse(JSON.stringify(draft())))

    const response = await POST(analyzeRequest())

    expect(response.status).toBe(200)
    expect(generate).toHaveBeenCalledTimes(2)
  })

  it('gives up with AI_INVALID_OUTPUT when the repair attempt also fails', async () => {
    generate.mockResolvedValue(modelResponse('still not JSON'))

    const response = await POST(analyzeRequest())
    const body = await readJson(response)

    // Two attempts, then stop — further retries burn quota on a request that is
    // not converging.
    expect(generate).toHaveBeenCalledTimes(2)
    expect(response.status).toBe(502)
    expect(body.success).toBe(false)
    expect(body.error).toBe('AI_INVALID_OUTPUT')
    expect(typeof body.requestId).toBe('string')
  })

  it('never leaks internal detail in an error body', async () => {
    generate.mockResolvedValue(modelResponse(`garbage containing ${CV}`))

    const body = await readJson(await POST(analyzeRequest()))
    const raw = JSON.stringify(body)

    // The CV travelled through the failure; none of it may come back out.
    expect(raw).not.toContain('Sana Iqbal')
    expect(raw).not.toContain('chars)')
    expect(body.message).toBe(
      'We could not produce a complete analysis for this input. Please try again.'
    )
  })
})

describe('POST /api/analyze — request validation', () => {
  it('rejects an unknown mode with 400', async () => {
    const response = await POST(analyzeRequest({}, { cvText: CV, jdText: JD, mode: 'nonsense' }))
    const body = await readJson(response)

    expect(response.status).toBe(400)
    expect(body.error).toBe('VALIDATION_ERROR')
    expect(generate).not.toHaveBeenCalled()
  })

  it('rejects a CV below the minimum length with 400', async () => {
    const response = await POST(analyzeRequest({}, { cvText: 'too short', jdText: JD, mode: 'job' }))

    expect(response.status).toBe(400)
    expect(generate).not.toHaveBeenCalled()
  })

  it('rejects a malformed JSON body with 400', async () => {
    const request = new Request('http://localhost/api/analyze', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.9.9.9' },
      body: '{ not json',
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })
})
