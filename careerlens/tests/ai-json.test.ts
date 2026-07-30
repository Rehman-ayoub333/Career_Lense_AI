import { parseModelJson } from '@/lib/ai/json'
import { AppError } from '@/lib/errors'

describe('parseModelJson', () => {
  it('parses clean JSON', () => {
    expect(parseModelJson('{"score":72}')).toEqual({ score: 72 })
  })

  it('parses JSON wrapped in a markdown fence', () => {
    expect(parseModelJson('```json\n{"score":72}\n```')).toEqual({ score: 72 })
  })

  it('parses a fence without a language tag', () => {
    expect(parseModelJson('```\n{"score":72}\n```')).toEqual({ score: 72 })
  })

  it('recovers JSON surrounded by conversational padding', () => {
    const raw = 'Sure! Here is the analysis:\n{"score":72}\nLet me know if you need more.'
    expect(parseModelJson(raw)).toEqual({ score: 72 })
  })

  it('handles arrays as the top-level value', () => {
    expect(parseModelJson('[1,2,3]')).toEqual([1, 2, 3])
  })

  it('does not mistake braces inside string values for structure', () => {
    const raw = '{"note":"Use {placeholders} carefully","score":50}'
    expect(parseModelJson(raw)).toEqual({ note: 'Use {placeholders} carefully', score: 50 })
  })

  it('handles escaped quotes inside strings', () => {
    const raw = '{"note":"He said \\"hello\\" once","score":1}'
    expect(parseModelJson(raw)).toEqual({ note: 'He said "hello" once', score: 1 })
  })

  it('throws a typed error when nothing is recoverable', () => {
    expect(() => parseModelJson('I cannot help with that request.')).toThrow(AppError)
  })

  it('never puts the model output — which contains the CV — into the error', () => {
    const cvBody = 'CONFIDENTIAL: Jane Doe, jane@example.com, +44 7700 900000'
    try {
      parseModelJson(cvBody)
      throw new Error('expected a throw')
    } catch (error) {
      const appError = error as AppError
      expect(appError.code).toBe('AI_INVALID_OUTPUT')
      expect(appError.detail).not.toContain('Jane Doe')
      expect(appError.detail).not.toContain('example.com')
      expect(appError.publicMessage).not.toContain('Jane Doe')
    }
  })

  it('throws rather than returning partial data for truncated JSON', () => {
    expect(() => parseModelJson('{"score":72,"verdict":"Good')).toThrow(AppError)
  })
})
