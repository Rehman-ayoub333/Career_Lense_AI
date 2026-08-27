import { logger } from '@/lib/logger'

/**
 * `lib/logger.ts` — redaction.
 *
 * This module had no test coverage at all until now, which is how the false
 * positive below survived: `REDACTED_KEY` matched the substring "token", so the
 * provider's `inputTokens` / `outputTokens` were written as `[redacted]`. The
 * Phase 7 live run found it the hard way — the output-token count was
 * unreadable during the exact test that needed it to confirm nothing had
 * truncated (`LIVE_SMOKE_TEST.md`, Finding 3).
 *
 * The tests are split deliberately. The first group is the narrowing that was
 * asked for; the second is the part that must NOT change, because the risk in a
 * redaction fix is not that it fails to narrow — it is that it quietly widens
 * the hole while doing so.
 *
 * Outside production, `emit` writes `console.warn(line, context)` with the
 * redacted context as the second argument, so that is what these read.
 */

function captured(run: () => void): Record<string, unknown> {
  // `emit` routes error to console.error and everything else to console.warn,
  // so both are captured and whichever fired is read.
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
  const error = jest.spyOn(console, 'error').mockImplementation(() => {})
  try {
    run()
    const call = warn.mock.calls[0] ?? error.mock.calls[0]
    if (!call) throw new Error('logger wrote nothing')
    // [0] is the formatted line; [1] is the redacted context object.
    return call[1] as Record<string, unknown>
  } finally {
    warn.mockRestore()
    error.mockRestore()
  }
}

/** A realistically-shaped Anthropic key. Never a real one. */
const FAKE_KEY = `sk-ant-api03-${'A1b2C3d4E5'.repeat(9)}xyz`
const FAKE_VOYAGE_KEY = `pa-${'Zz9Yy8Xx7W'.repeat(4)}`

describe('token counts are not credentials (the Phase 7 false positive)', () => {
  it('logs inputTokens and outputTokens as real numbers', () => {
    // The exact shape `lib/ai/index.ts`'s logCompletion emits.
    const context = captured(() =>
      logger.info('AI call completed', {
        label: 'analyze:job',
        provider: 'anthropic',
        durationMs: 39269,
        inputTokens: 2847,
        outputTokens: 1912,
      })
    )

    expect(context.inputTokens).toBe(2847)
    expect(context.outputTokens).toBe(1912)
    expect(context.durationMs).toBe(39269)
  })

  it('does not redact other count-shaped fields whose names brush the pattern', () => {
    const context = captured(() =>
      logger.info('usage', { maxTokens: 8192, tokenCount: 44, cacheReadTokens: 0 })
    )

    expect(context.maxTokens).toBe(8192)
    expect(context.tokenCount).toBe(44)
    expect(context.cacheReadTokens).toBe(0)
  })

  it('passes booleans under credential-ish names through as well', () => {
    // `hasApiKey: false` is a configuration signal, not a secret.
    const context = captured(() => logger.info('config', { hasApiKey: false, keyRotated: true }))

    expect(context.hasApiKey).toBe(false)
    expect(context.keyRotated).toBe(true)
  })

  it('redacts a number-named field only when the value is actually a string', () => {
    // The discriminator is the value's type, not the name. A stringified count
    // under a credential-ish name still redacts — over-redacting a number that
    // arrived as text is the safe direction to be wrong in.
    const context = captured(() => logger.info('mixed', { inputTokens: '2847' }))

    expect(context.inputTokens).toBe('[redacted]')
  })
})

describe('what must not have been weakened', () => {
  it('still redacts a string under a credential-shaped field name', () => {
    const context = captured(() => logger.info('cfg', { apiKey: FAKE_KEY }))
    expect(context.apiKey).toBe('[redacted]')
  })

  it('still redacts secrets this app does not own the format of', () => {
    // The reason field-name matching was kept rather than replaced by
    // value-shape matching: none of these match `sk-ant-…` or `pa-…`, and all
    // of them are secrets.
    const context = captured(() =>
      logger.info('inbound', {
        authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.payload.signature',
        cookie: 'session=8f14e45fceea167a5a36dedd4bea2543',
        password: 'hunter2',
        refresh_token_v2: 'rt_9c8b7a6d5e4f',
      })
    )

    expect(context.authorization).toBe('[redacted]')
    expect(context.cookie).toBe('[redacted]')
    expect(context.password).toBe('[redacted]')
    expect(context.refresh_token_v2).toBe('[redacted]')
  })

  it('still redacts a whole object nested under a credential-shaped name', () => {
    // The narrowing gates on number/boolean only, so a structure under a
    // credential name is replaced wholesale rather than walked into — a secret
    // one level down must not escape because its own key looked innocent.
    // `note` is deliberately innocuous: it survives only if the object was
    // walked into rather than replaced.
    const context = captured(() =>
      logger.info('vault', { apiKey: { value: FAKE_KEY, note: 'primary' } })
    )

    expect(context.apiKey).toBe('[redacted]')
    expect(JSON.stringify(context)).not.toContain('primary')
  })

  it('still redacts a key by VALUE shape under an innocuous field name', () => {
    // The other half of the defence, and the one that catches a key which
    // arrived somewhere nobody named it.
    const context = captured(() =>
      logger.info('oops', { detail: `request failed using ${FAKE_KEY} against the API` })
    )

    expect(context.detail).not.toContain(FAKE_KEY)
    expect(context.detail).toContain('[redacted]')
  })

  it('still redacts a Voyage key by value shape', () => {
    const context = captured(() => logger.info('research', { note: `used ${FAKE_VOYAGE_KEY}` }))

    expect(context.note).not.toContain(FAKE_VOYAGE_KEY)
    expect(context.note).toContain('[redacted]')
  })

  it('redacts a key that reaches an Error message — including the stack', () => {
    // This one failed when first written, and the failure was real: `redact`
    // scrubbed `message` and handed `stack` through untouched. A stack's first
    // line is the message repeated, so the key was scrubbed from one field and
    // logged verbatim in the next. Production drops `stack` entirely, so the
    // exposure was development-only — which is still every terminal and dev log
    // drain where output gets pasted around.
    const context = captured(() =>
      logger.error('failed', { cause: new Error(`401 from provider, key ${FAKE_KEY}`) })
    )

    const serialised = JSON.stringify(context)
    expect(serialised).not.toContain(FAKE_KEY)
    expect(serialised).toContain('[redacted]')

    // Asserted specifically, so a future change cannot restore the raw stack
    // and still pass on the message check alone.
    const cause = context.cause as { stack?: string }
    expect(cause.stack).toBeDefined()
    expect(cause.stack).not.toContain(FAKE_KEY)
  })

  it('never emits a raw key anywhere in the serialised record', () => {
    // Belt and braces: the assertion that would fail if any future change let a
    // credential through by a path none of the cases above anticipated.
    const context = captured(() =>
      logger.warn('everything', {
        apiKey: FAKE_KEY,
        nested: { deeper: { detail: `token=${FAKE_KEY}` } },
        list: [`prefix ${FAKE_KEY}`],
        inputTokens: 100,
      })
    )

    const serialised = JSON.stringify(context)
    expect(serialised).not.toContain(FAKE_KEY)
    expect(serialised).not.toContain('sk-ant-api03-')
    // …while the count still came through, which is the whole point.
    expect(context.inputTokens).toBe(100)
  })
})
