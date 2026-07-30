import { getScoreColorVar, getScoreToken, getScoreVerdict } from '@/lib/scoring'

describe('getScoreToken', () => {
  it.each([
    [0, 'red'],
    [40, 'red'],
    [41, 'amber'],
    [65, 'amber'],
    [66, 'blue'],
    [80, 'blue'],
    [81, 'green'],
    [100, 'green'],
  ])('maps %i to the %s band', (score, expected) => {
    expect(getScoreToken(score)).toBe(expected)
  })

  it('clamps values outside 0-100 rather than returning a fallback colour', () => {
    // The previous implementation had no branch for negatives or >100 and fell
    // through to a grey "unknown" colour, which read as a rendering bug.
    expect(getScoreToken(-10)).toBe('red')
    expect(getScoreToken(150)).toBe('green')
  })
})

describe('getScoreColorVar', () => {
  it('returns a CSS custom property reference, never a hex literal', () => {
    expect(getScoreColorVar(72)).toBe('hsl(var(--blue))')
    expect(getScoreColorVar(90)).not.toMatch(/#[0-9a-f]{6}/i)
  })
})

describe('getScoreVerdict', () => {
  it.each([
    [10, 'Weak Match'],
    [50, 'Partial Match'],
    [70, 'Good Match'],
    [95, 'Strong Match'],
  ])('maps %i to "%s"', (score, expected) => {
    expect(getScoreVerdict(score)).toBe(expected)
  })

  it('agrees with the colour band at every boundary', () => {
    const pairs: Array<[number, string]> = [
      [40, 'red'],
      [41, 'amber'],
      [65, 'amber'],
      [66, 'blue'],
      [80, 'blue'],
      [81, 'green'],
    ]
    for (const [score, token] of pairs) {
      expect(getScoreToken(score)).toBe(token)
      expect(getScoreVerdict(score)).toBeTruthy()
    }
  })
})
