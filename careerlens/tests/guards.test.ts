import {
  isAnalysisResult,
  isRewriteResult,
  normalizeAnalysisResult,
  normalizeRewriteResult,
} from '@/lib/analysis/guards'
import type { AnalysisResult } from '@/types'

function validResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    score: 72,
    skills_score: 78,
    experience_score: 64,
    education_score: 82,
    verdict: 'Good Match',
    verdict_note: 'Solid overlap with a gap in infrastructure work.',
    key_actions: ['Add Kubernetes', 'Quantify impact', 'Reorder sections'],
    skills_matched: ['TypeScript'],
    skills_missing: ['Kubernetes'],
    skills_extra: ['SQL'],
    keywords_present: ['React'],
    keywords_missing: ['CI/CD'],
    ats_checks: [{ id: 'headings', label: 'Standard headings', status: 'pass', note: 'Clear.' }],
    salary_range: '$90,000 - $120,000',
    salary_context: 'Reflects mid-level frontend work in a major metro.',
    interview_questions: [{ question: 'Describe a rollout.', skill_tested: 'Delivery', tip: 'Use STAR.' }],
    ...overrides,
  }
}

describe('isAnalysisResult', () => {
  it('accepts a complete result', () => {
    expect(isAnalysisResult(validResult())).toBe(true)
  })

  it.each([[null], [undefined], ['{}'], [42], [[]]])('rejects %p', (value) => {
    expect(isAnalysisResult(value)).toBe(false)
  })

  it('rejects a verdict outside the allowed set', () => {
    expect(isAnalysisResult(validResult({ verdict: 'Excellent Match' as never }))).toBe(false)
  })

  it('rejects an ATS check with an unknown status', () => {
    const broken = validResult({
      ats_checks: [{ id: 'headings', label: 'Headings', status: 'maybe' as never, note: 'x' }],
    })
    expect(isAnalysisResult(broken)).toBe(false)
  })

  it('rejects a score that is not a finite number', () => {
    expect(isAnalysisResult(validResult({ score: Number.NaN }))).toBe(false)
    expect(isAnalysisResult(validResult({ score: '72' as never }))).toBe(false)
  })

  it('rejects empty required collections that would render as blank panels', () => {
    expect(isAnalysisResult(validResult({ ats_checks: [] }))).toBe(false)
    expect(isAnalysisResult(validResult({ interview_questions: [] }))).toBe(false)
    expect(isAnalysisResult(validResult({ key_actions: [] }))).toBe(false)
  })
})

describe('normalizeAnalysisResult', () => {
  it('clamps out-of-range scores to 0-100 integers', () => {
    const result = normalizeAnalysisResult(validResult({ score: 142, skills_score: -8 }))
    expect(result.score).toBe(100)
    expect(result.skills_score).toBe(0)
  })

  it('rounds fractional scores', () => {
    expect(normalizeAnalysisResult(validResult({ score: 71.6 })).score).toBe(72)
  })

  it('drops blank entries that would render as empty chips', () => {
    const result = normalizeAnalysisResult(validResult({ skills_matched: ['React', '', '   ', 'SQL'] }))
    expect(result.skills_matched).toEqual(['React', 'SQL'])
  })

  it('leaves scholarship-only fields undefined in job mode', () => {
    const result = normalizeAnalysisResult(validResult())
    expect(result.research_score).toBeUndefined()
    expect(result.scholarship_specific_tips).toBeUndefined()
  })

  it('clamps scholarship scores when present', () => {
    const result = normalizeAnalysisResult(validResult({ research_score: 120, leadership_score: -5 }))
    expect(result.research_score).toBe(100)
    expect(result.leadership_score).toBe(0)
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
