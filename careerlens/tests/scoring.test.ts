import { BANDS, bandForScore } from '@/lib/scoring'
import { MATCH_VERDICTS } from '@/lib/analysis/constants'

describe('bandForScore', () => {
  it.each([
    [0, 'WEAK'],
    [40, 'WEAK'],
    [41, 'PARTIAL'],
    [65, 'PARTIAL'],
    [66, 'GOOD'],
    [80, 'GOOD'],
    [81, 'STRONG'],
    [100, 'STRONG'],
  ])('maps %i to %s', (score, expected) => {
    expect(bandForScore(score)).toBe(expected)
  })

  it('clamps values outside 0-100 rather than returning a fallback', () => {
    // The previous implementation had no branch for negatives or >100 and fell
    // through to a grey "unknown", which read as a rendering bug.
    expect(bandForScore(-10)).toBe('WEAK')
    expect(bandForScore(150)).toBe('STRONG')
  })

  it('never returns undefined for any integer in range', () => {
    for (let score = 0; score <= 100; score += 1) {
      expect(bandForScore(score)).toBeTruthy()
    }
  })
})

describe('BANDS — single source of truth', () => {
  it('covers 0-100 with no gap and no overlap', () => {
    const ordered = [...BANDS].sort((a, b) => a.min - b.min)

    expect(ordered[0].min).toBe(0)
    expect(ordered[ordered.length - 1].max).toBe(100)

    for (let i = 1; i < ordered.length; i += 1) {
      expect(ordered[i].min).toBe(ordered[i - 1].max + 1)
    }
  })

  it('has one band per verdict the model may return', () => {
    // The band words and the verdict strings are two vocabularies for the same
    // four ranges; if one grows and the other does not, they have drifted.
    expect(BANDS).toHaveLength(MATCH_VERDICTS.length)
  })
})

describe('no colour-by-score API survives', () => {
  it('exports no function mapping a score to a colour', async () => {
    // A regression guard, not a tautology: `getScoreToken`, `getScoreColorVar`
    // and `getScoreTextColorVar` returned red below 41 and green above 81, and
    // existed to paint the ring gauge and the share-card numeral. Both are gone.
    // Re-adding any of them would be re-adding the ability to paint a person red.
    const scoring: Record<string, unknown> = await import('@/lib/scoring')

    for (const name of ['getScoreToken', 'getScoreColorVar', 'getScoreTextColorVar']) {
      expect(scoring[name]).toBeUndefined()
    }
  })

  it('exposes only the band vocabulary', async () => {
    const scoring: Record<string, unknown> = await import('@/lib/scoring')
    expect(Object.keys(scoring).sort()).toEqual(['BANDS', 'bandForScore'])
  })
})
