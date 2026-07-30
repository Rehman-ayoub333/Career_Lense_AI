import { AppError, ERROR_CODES, toAppError } from '@/lib/errors'

describe('AppError', () => {
  it('separates the developer message from the user message', () => {
    const error = new AppError('AI_UNAVAILABLE', {
      detail: 'Gemini 429 for model gemini-2.5-flash: quota metric generate_content_free_tier',
    })

    expect(error.message).toContain('gemini-2.5-flash')
    expect(error.publicMessage).not.toContain('gemini')
    expect(error.publicMessage).not.toContain('429')
    expect(error.publicMessage).not.toContain('quota')
  })

  it('maps each code to a sensible status', () => {
    expect(new AppError('VALIDATION_ERROR').status).toBe(400)
    expect(new AppError('RATE_LIMITED').status).toBe(429)
    expect(new AppError('AI_TIMEOUT').status).toBe(504)
    expect(new AppError('INTERNAL_ERROR').status).toBe(500)
  })

  it('gives every code user-safe default copy', () => {
    // No default message may name a vendor, a model, a protocol or a URL.
    const forbidden = /gemini|google|anthropic|claude|openai|http|api key|token|https?:\/\//i
    for (const code of ERROR_CODES) {
      const message = new AppError(code).publicMessage
      expect(message.length).toBeGreaterThan(10)
      expect(message).not.toMatch(forbidden)
    }
  })
})

describe('toAppError', () => {
  it('passes AppError instances through unchanged', () => {
    const original = new AppError('RATE_LIMITED')
    expect(toAppError(original)).toBe(original)
  })

  it('collapses an unknown Error to a generic internal error', () => {
    const converted = toAppError(new Error('ECONNREFUSED 10.0.0.5:443 upstream pool exhausted'))
    expect(converted.code).toBe('INTERNAL_ERROR')
    // The detail is kept for logs...
    expect(converted.detail).toContain('ECONNREFUSED')
    // ...but must never reach the user.
    expect(converted.publicMessage).not.toContain('ECONNREFUSED')
    expect(converted.publicMessage).not.toContain('10.0.0.5')
  })

  it('treats an abort as a timeout, which is what the user experienced', () => {
    const abort = new Error('The operation was aborted')
    abort.name = 'AbortError'
    expect(toAppError(abort).code).toBe('AI_TIMEOUT')
  })

  it('handles non-Error throws without leaking their contents', () => {
    const converted = toAppError({ secret: 'sk-live-abc123' })
    expect(converted.code).toBe('INTERNAL_ERROR')
    expect(converted.publicMessage).not.toContain('sk-live')
  })
})
