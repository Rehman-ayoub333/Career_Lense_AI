import { AppError } from '@/lib/errors'
import { isAnalysisMode, parseObjectBody, parseStringArray, parseTextField, sanitizeText } from '@/lib/validators'

const ZWSP = String.fromCharCode(0x200b)
const RLO = String.fromCharCode(0x202e)
const NUL = String.fromCharCode(0x00)
const BELL = String.fromCharCode(0x07)

describe('sanitizeText', () => {
  it('preserves tabs and newlines, which carry CV structure', () => {
    expect(sanitizeText('Experience\n\tLed a team', 8000)).toBe('Experience\n\tLed a team')
  })

  it('removes control characters', () => {
    expect(sanitizeText(`A${NUL}B${BELL}C`, 8000)).toBe('A B C')
  })

  it('removes zero-width and bidi-override characters used to hide instructions', () => {
    expect(sanitizeText(`Sen${ZWSP}ior Eng${RLO}ineer`, 8000)).toBe('Senior Engineer')
  })

  it('strips HTML tags', () => {
    expect(sanitizeText('Built <b>fast</b> APIs', 8000)).toBe('Built fast APIs')
  })

  it('keeps numeric comparisons that the old tag regex destroyed', () => {
    // Regression guard: `<[^>]*>` deleted everything from `<100ms` to the next
    // `>`, silently removing quantified achievements.
    const input = 'Cut p99 latency <100ms while serving >5k req/s'
    expect(sanitizeText(input, 8000)).toBe(input)
  })

  it('collapses runaway blank lines', () => {
    expect(sanitizeText('A\n\n\n\n\nB', 8000)).toBe('A\n\nB')
  })

  it('truncates to the requested length', () => {
    expect(sanitizeText('abcdefghij', 5)).toBe('abcde')
  })
})

describe('parseTextField', () => {
  const options = { label: 'CV', min: 10, max: 100 }

  it('returns sanitised text when valid', () => {
    expect(parseTextField('  a valid enough CV body  ', options)).toBe('a valid enough CV body')
  })

  it('rejects non-strings with a field-specific message', () => {
    expect(() => parseTextField(42, options)).toThrow(AppError)
    try {
      parseTextField(undefined, options)
    } catch (error) {
      expect((error as AppError).code).toBe('VALIDATION_ERROR')
      expect((error as AppError).publicMessage).toContain('CV')
    }
  })

  it('measures length after sanitisation, not before', () => {
    // 60 characters of markup collapses to well under the minimum.
    const markup = '<div><span></span></div><p></p><section></section><em></em>'
    expect(markup.length).toBeGreaterThan(options.min)
    expect(() => parseTextField(markup, options)).toThrow(AppError)
  })

  it('tells the user how many more characters are needed', () => {
    try {
      parseTextField('short', options)
    } catch (error) {
      expect((error as AppError).publicMessage).toContain('5 more characters')
    }
  })

  it('never exposes internal detail in the public message', () => {
    try {
      parseTextField('short', options)
    } catch (error) {
      const appError = error as AppError
      expect(appError.detail).toContain('sanitisation')
      expect(appError.publicMessage).not.toContain('sanitisation')
    }
  })
})

describe('parseObjectBody', () => {
  it('accepts plain objects', () => {
    expect(parseObjectBody({ a: 1 })).toEqual({ a: 1 })
  })

  it.each([[null], [undefined], ['string'], [42], [[1, 2]]])('rejects %p', (value) => {
    expect(() => parseObjectBody(value)).toThrow(AppError)
  })
})

describe('parseStringArray', () => {
  it('keeps only non-empty strings and trims them', () => {
    expect(parseStringArray([' React ', '', 42, null, 'SQL'])).toEqual(['React', 'SQL'])
  })

  it('returns an empty array for non-arrays', () => {
    expect(parseStringArray('React')).toEqual([])
  })

  it('bounds the result', () => {
    expect(parseStringArray(Array(100).fill('x'), 5)).toHaveLength(5)
  })
})

describe('isAnalysisMode', () => {
  it('accepts only the two supported modes', () => {
    expect(isAnalysisMode('job')).toBe(true)
    expect(isAnalysisMode('scholarship')).toBe(true)
    expect(isAnalysisMode('JOB')).toBe(false)
    expect(isAnalysisMode(undefined)).toBe(false)
  })
})
