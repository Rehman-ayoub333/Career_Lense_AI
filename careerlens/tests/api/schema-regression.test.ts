import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import type { AiRequest, AiResponse } from '@/lib/ai/types'
import type { AnalysisDraft } from '@/types'

/**
 * The structural regression `TESTING_STRATEGY_FINAL.md` §Regression demands:
 * **no reintroduction of a flat `skills_missing` field in any API response**,
 * "protected by a schema test not just a convention".
 *
 * Until now it was protected by exactly the convention that clause was written
 * to rule out — a prose comment in `ChatTab.tsx` saying the field no longer
 * exists. Nothing failed if it came back. This file is what that comment
 * pointed at.
 *
 * `skills_missing` was a flat `string[]` of requirements the model asserted were
 * absent. `DATA_CONTRACTS_FINAL.md` removed it because a bare string cites
 * nothing: there is no quote to check, no tier, and no way to tell a requirement
 * the CV genuinely never mentions from one the model simply failed to find.
 * `claims[]` replaced it (ADR-13), and every consumer that wanted the old list
 * now derives it from `status: 'gap'`. Reintroducing the flat field would
 * reintroduce an uncheckable assertion straight into the wire format.
 *
 * Three independent layers, because one alone is escapable:
 *   1. the live response, walked to any depth — the thing clients actually read;
 *   2. the model's own response schema and the declared wire types — where a
 *      reintroduction would have to be written before it could reach layer 1;
 *   3. a model that emits the field anyway — the path no source scan can see.
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
const { POST } = require('@/app/api/analyze/route') as {
  POST: (request: Request) => Promise<Response>
}
/* eslint-enable @typescript-eslint/no-require-imports */

/** The field itself, and the two shapes a careless reintroduction would take. */
const BANNED_KEYS = ['skills_missing', 'skillsMissing', 'missing_skills'] as const

const CV = `Sana Iqbal — Software Engineer.
Built and shipped three production React applications over 4 years.
BSc Computer Science, University of the Punjab.`

const JD = 'We need a frontend engineer with production React experience and Docker exposure.'

function draft(overrides: Partial<AnalysisDraft> = {}): AnalysisDraft {
  return {
    score: 73,
    verdict: 'Good Match',
    claims: [
      {
        requirement: 'Production React experience',
        category: 'skill',
        status: 'matched',
        evidence_quote: 'Built and shipped three production React applications over 4 years',
        rationale: 'The CV states four years of production React work.',
      },
      {
        requirement: 'Docker or containerization experience',
        category: 'skill',
        status: 'gap',
        evidence_quote: '',
        rationale: 'No mention of Docker or containerization appears in the CV.',
      },
    ],
    key_actions: ['Add evidence of container work', 'Quantify the migration', 'Name the stack'],
    ats_checks: [{ id: 'headings', label: 'Standard headings', status: 'pass', note: 'Clear.' }],
    salary_range: '$95,000 - $120,000 USD',
    salary_context: 'Reflects mid-level frontend work.',
    interview_questions: [
      { question: 'Describe the migration.', skill_tested: 'Delivery', tip: 'Use STAR.' },
    ],
    ...overrides,
  }
}

let clientCounter = 0

function analyzeRequest(headers: Record<string, string> = {}): Request {
  clientCounter += 1
  return new Request('http://localhost/api/analyze', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': `10.9.0.${clientCounter}`,
      ...headers,
    },
    body: JSON.stringify({ cvText: CV, jdText: JD, mode: 'job' }),
  })
}

/**
 * Every key in an object graph, at any depth, with the path that reached it.
 *
 * Walking rather than checking `data.skills_missing` is the whole point: the
 * field could come back nested inside `coverage`, or on each claim, and a
 * top-level check would pass while the wire format carried it.
 */
function keyPaths(value: unknown, path = '$'): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => keyPaths(item, `${path}[${index}]`))
  }
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, child]) => [
      `${path}.${key}`,
      ...keyPaths(child, `${path}.${key}`),
    ])
  }
  return []
}

function offendingPaths(value: unknown): string[] {
  return keyPaths(value).filter((path) => {
    const key = path.split('.').pop() ?? ''
    return BANNED_KEYS.some((banned) => banned.toLowerCase() === key.toLowerCase())
  })
}

beforeEach(() => {
  generate.mockReset()
  delete process.env.RESEARCH_MODE_ENABLED
  generate.mockResolvedValue({
    text: JSON.stringify(draft()),
    usage: { inputTokens: 100, outputTokens: 200 },
    model: 'gemini-test',
  })
})

describe('the key walker itself', () => {
  // A regression test whose detector is broken passes forever and protects
  // nothing. This is the one test here that is allowed to find something.
  it('finds a banned key nested at depth, not just at the top level', () => {
    expect(offendingPaths({ data: { coverage: { skills_missing: ['React'] } } })).toEqual([
      '$.data.coverage.skills_missing',
    ])
  })

  it('finds one buried inside an array element', () => {
    expect(offendingPaths({ claims: [{ ok: 1 }, { skillsMissing: [] }] })).toEqual([
      '$.claims[1].skillsMissing',
    ])
  })

  it('is not fooled by a value that merely contains the string', () => {
    expect(offendingPaths({ rationale: 'no skills_missing field is emitted' })).toEqual([])
  })
})

describe('the live /api/analyze response carries no flat skills list', () => {
  it('has none at any depth in a standard response', async () => {
    const response = await POST(analyzeRequest())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(offendingPaths(body)).toEqual([])
  })

  it('has none at any depth in a research-mode response either', async () => {
    // Research mode leaves internal per-claim fields in. More fields on the wire
    // is more surface for the old one to reappear on, so it is walked too.
    process.env.RESEARCH_MODE_ENABLED = '1'

    const response = await POST(analyzeRequest({ 'x-research-mode': '1' }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(offendingPaths(body)).toEqual([])
  })

  it('still has none when the model puts the field in its own output', async () => {
    // The path no source scan can see. A model that emits an extra field must
    // not have it forwarded: the route rebuilds the result from the fields it
    // knows, so anything unrecognised is dropped rather than passed through.
    generate.mockResolvedValue({
      text: JSON.stringify({ ...draft(), skills_missing: ['Docker', 'Kubernetes'] }),
      usage: { inputTokens: 100, outputTokens: 200 },
      model: 'gemini-test',
    })

    const response = await POST(analyzeRequest())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(offendingPaths(body)).toEqual([])
    expect(JSON.stringify(body)).not.toContain('Kubernetes')
  })

  it('exposes exactly the AnalysisResult keys and no others', async () => {
    // The positive half. Asserting only the absence of one banned name would not
    // notice a differently-spelled flat list arriving next to it.
    const response = await POST(analyzeRequest())
    const body = (await response.json()) as { data: Record<string, unknown> }

    expect(Object.keys(body.data).sort()).toEqual([
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
  })
})

describe('the declared shapes cannot bring it back', () => {
  const ROOT = join(__dirname, '..', '..', 'src')

  /**
   * TypeScript types are erased at runtime, so the response walk above cannot
   * see a field that was declared but never populated. Reading the source is how
   * a *type* gets asserted about — and these three modules are the only places a
   * reintroduction could be written and still reach a response.
   */
  const SHAPE_MODULES = [
    join('types', 'index.ts'),
    join('lib', 'api', 'contract.ts'),
    join('lib', 'analysis', 'schemas.ts'),
    join('lib', 'analysis', 'guards.ts'),
  ]

  it.each(SHAPE_MODULES)('%s declares no flat skills list', (relative) => {
    const source = readFileSync(join(ROOT, relative), 'utf8')

    for (const banned of BANNED_KEYS) {
      expect(source).not.toContain(banned)
    }
  })

  it("is absent from the model's own response schema, so it is never asked for", () => {
    // schemas.ts is handed to the provider's constrained decoder. A property
    // here is a property the model is instructed to produce.
    const source = readFileSync(join(ROOT, 'lib', 'analysis', 'schemas.ts'), 'utf8')

    expect(source).toContain('claims')
    for (const banned of BANNED_KEYS) {
      expect(source).not.toContain(banned)
    }
  })
})
