import {
  isAnalysisDraft,
  isRewriteResult,
  normalizeAnalysisDraft,
  normalizeRewriteResult,
} from '@/lib/analysis/guards'
import type { AnalysisDraft, ClaimDraft } from '@/types'

function claimDraft(overrides: Partial<ClaimDraft> = {}): ClaimDraft {
  return {
    requirement: '3+ years of production React experience',
    category: 'skill',
    status: 'matched',
    evidence_quote: '4 years building React applications',
    rationale: 'The CV states four years of React work.',
    ...overrides,
  }
}

function validDraft(overrides: Partial<AnalysisDraft> = {}): AnalysisDraft {
  return {
    score: 72,
    verdict: 'Good Match',
    claims: [claimDraft()],
    key_actions: ['Add Kubernetes', 'Quantify impact', 'Reorder sections'],
    ats_checks: [{ id: 'headings', label: 'Standard headings', status: 'pass', note: 'Clear.' }],
    salary_range: '$90,000 - $120,000',
    salary_context: 'Reflects mid-level frontend work in a major metro.',
    interview_questions: [{ question: 'Describe a rollout.', skill_tested: 'Delivery', tip: 'Use STAR.' }],
    ...overrides,
  }
}

describe('isAnalysisDraft', () => {
  it('accepts a complete draft', () => {
    expect(isAnalysisDraft(validDraft())).toBe(true)
  })

  it.each([[null], [undefined], ['{}'], [42], [[]]])('rejects %p', (value) => {
    expect(isAnalysisDraft(value)).toBe(false)
  })

  it('rejects a verdict outside the allowed set', () => {
    expect(isAnalysisDraft(validDraft({ verdict: 'Excellent Match' as never }))).toBe(false)
  })

  it('rejects an ATS check with an unknown status', () => {
    const broken = validDraft({
      ats_checks: [{ id: 'headings', label: 'Headings', status: 'maybe' as never, note: 'x' }],
    })
    expect(isAnalysisDraft(broken)).toBe(false)
  })

  it('rejects a score that is not a finite number', () => {
    expect(isAnalysisDraft(validDraft({ score: Number.NaN }))).toBe(false)
    expect(isAnalysisDraft(validDraft({ score: '72' as never }))).toBe(false)
  })

  it('rejects empty required collections that would render as blank panels', () => {
    expect(isAnalysisDraft(validDraft({ ats_checks: [] }))).toBe(false)
    expect(isAnalysisDraft(validDraft({ interview_questions: [] }))).toBe(false)
    expect(isAnalysisDraft(validDraft({ key_actions: [] }))).toBe(false)
  })

  it('accepts an empty claims array — zero requirements is a defined empty state, not a malformed response', () => {
    // An opportunity description too vague to yield requirements produces this.
    // FAILURE_MODES_FINAL.md is explicit that it is not an error.
    expect(isAnalysisDraft(validDraft({ claims: [] }))).toBe(true)
  })
})

describe('isAnalysisDraft — claim validation', () => {
  it('rejects a claim with a category outside the allowed set', () => {
    expect(
      isAnalysisDraft(validDraft({ claims: [claimDraft({ category: 'vibes' as never })] }))
    ).toBe(false)
  })

  it('rejects a claim with a status outside the model vocabulary', () => {
    // "verified" is the mechanical verdict, not something the model may assert.
    // The schema has no field it could put it in, and this is the second lock.
    expect(
      isAnalysisDraft(validDraft({ claims: [claimDraft({ status: 'verified' as never })] }))
    ).toBe(false)
  })

  it('rejects a claim whose evidence_quote is null rather than the empty-string sentinel', () => {
    // Stage 1 speaks in the sentinel (ADR-10); null only exists after
    // normalization. A null here means the response did not come from the schema.
    expect(
      isAnalysisDraft(validDraft({ claims: [claimDraft({ evidence_quote: null as never })] }))
    ).toBe(false)
  })

  it.each([['requirement'], ['rationale'], ['category'], ['status'], ['evidence_quote']])(
    'rejects a claim missing %s',
    (field) => {
      const incomplete = { ...claimDraft() } as Record<string, unknown>
      delete incomplete[field]
      expect(isAnalysisDraft(validDraft({ claims: [incomplete as never] }))).toBe(false)
    }
  )

  it('rejects the whole draft when any one claim is malformed', () => {
    const draft = validDraft({
      claims: [claimDraft(), claimDraft({ category: 'nonsense' as never }), claimDraft()],
    })
    expect(isAnalysisDraft(draft)).toBe(false)
  })
})

describe('isAnalysisDraft — the gap-with-non-null-quote rejection rule', () => {
  // A claim saying a requirement is unaddressed while quoting evidence for it is
  // internally contradictory. Dropping the quote and dropping the status are
  // equally arbitrary repairs, so it is rejected and routed into generateJson's
  // existing single repair attempt (AI_PIPELINE_FINAL.md §Schema validation).

  it('rejects a gap claim that carries an evidence quote', () => {
    const draft = validDraft({
      claims: [claimDraft({ status: 'gap', evidence_quote: 'built three React applications' })],
    })
    expect(isAnalysisDraft(draft)).toBe(false)
  })

  it('accepts a gap claim with the empty-string sentinel', () => {
    expect(
      isAnalysisDraft(validDraft({ claims: [claimDraft({ status: 'gap', evidence_quote: '' })] }))
    ).toBe(true)
  })

  it('accepts a gap claim whose quote is whitespace only, since that carries no evidence either', () => {
    expect(
      isAnalysisDraft(
        validDraft({ claims: [claimDraft({ status: 'gap', evidence_quote: '   \n ' })] })
      )
    ).toBe(true)
  })

  it('does not apply the rule to matched or partial claims', () => {
    // Only `gap` asserts the absence of evidence, so only `gap` contradicts a quote.
    for (const status of ['matched', 'partial'] as const) {
      expect(isAnalysisDraft(validDraft({ claims: [claimDraft({ status })] }))).toBe(true)
      expect(
        isAnalysisDraft(validDraft({ claims: [claimDraft({ status, evidence_quote: '' })] }))
      ).toBe(true)
    }
  })
})

describe('normalizeAnalysisDraft', () => {
  it('clamps out-of-range scores to 0-100 integers', () => {
    expect(normalizeAnalysisDraft(validDraft({ score: 142 })).score).toBe(100)
    expect(normalizeAnalysisDraft(validDraft({ score: -8 })).score).toBe(0)
  })

  it('rounds fractional scores', () => {
    expect(normalizeAnalysisDraft(validDraft({ score: 71.6 })).score).toBe(72)
  })

  it('drops blank key actions that would render as empty rows', () => {
    const result = normalizeAnalysisDraft(
      validDraft({ key_actions: ['Add Kubernetes', '', '   ', 'Quantify impact'] })
    )
    expect(result.key_actions).toEqual(['Add Kubernetes', 'Quantify impact'])
  })

  it('assigns claim ids from the array index, never from the model', () => {
    const result = normalizeAnalysisDraft(
      validDraft({ claims: [claimDraft(), claimDraft(), claimDraft()] })
    )
    // Stable, unique, and usable as both a React key and a citation anchor.
    expect(result.claims.map((claim) => claim.id)).toEqual(['claim-0', 'claim-1', 'claim-2'])
  })

  it('resolves the empty-string evidence sentinel to null (ADR-10)', () => {
    const result = normalizeAnalysisDraft(
      validDraft({
        claims: [
          claimDraft({ status: 'gap', evidence_quote: '' }),
          claimDraft({ status: 'gap', evidence_quote: '  \t ' }),
          claimDraft({ evidence_quote: 'four years of React' }),
        ],
      })
    )

    // Nothing downstream ever sees the sentinel — grounding.ts is specified to
    // receive `string | null` and this is the one place that is made true.
    expect(result.claims[0].evidence_quote).toBeNull()
    expect(result.claims[1].evidence_quote).toBeNull()
    expect(result.claims[2].evidence_quote).toBe('four years of React')
  })

  it('trims the quote, requirement and rationale', () => {
    const result = normalizeAnalysisDraft(
      validDraft({
        claims: [
          claimDraft({
            requirement: '  React experience  ',
            rationale: '  The CV says so.  ',
            evidence_quote: '  four years of React  ',
          }),
        ],
      })
    )

    expect(result.claims[0].requirement).toBe('React experience')
    expect(result.claims[0].rationale).toBe('The CV says so.')
    expect(result.claims[0].evidence_quote).toBe('four years of React')
  })

  it('adds no verification fields — that is Stage 2 alone', () => {
    const [claim] = normalizeAnalysisDraft(validDraft()).claims
    const keys = Object.keys(claim).sort()

    expect(keys).toEqual([
      'category',
      'evidence_quote',
      'id',
      'rationale',
      'requirement',
      'status',
    ])
  })

  it('handles an empty claims array without inventing one', () => {
    expect(normalizeAnalysisDraft(validDraft({ claims: [] })).claims).toEqual([])
  })
})

describe('isRewriteResult', () => {
  it('accepts matching arrays', () => {
    expect(isRewriteResult({ original_bullets: ['a'], rewritten_bullets: ['b'] })).toBe(true)
  })

  it('rejects empty arrays', () => {
    expect(isRewriteResult({ original_bullets: [], rewritten_bullets: ['b'] })).toBe(false)
  })

  it('rejects non-string members', () => {
    expect(isRewriteResult({ original_bullets: [1], rewritten_bullets: ['b'] })).toBe(false)
  })
})

describe('normalizeRewriteResult', () => {
  it('trims to matching pairs so the side-by-side view never misaligns', () => {
    const result = normalizeRewriteResult({
      original_bullets: ['a', 'b', 'c'],
      rewritten_bullets: ['A', 'B'],
    })
    expect(result.original_bullets).toEqual(['a', 'b'])
    expect(result.rewritten_bullets).toEqual(['A', 'B'])
  })

  it('leaves an already-aligned pair untouched', () => {
    const input = { original_bullets: ['a', 'b'], rewritten_bullets: ['A', 'B'] }
    expect(normalizeRewriteResult(input)).toEqual(input)
  })
})
