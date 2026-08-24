/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'

import ErrorPage from '@/app/error'
import { logger } from '@/lib/logger'

expect.extend(toHaveNoViolations)

/**
 * The route-level error boundary.
 *
 * This is the second of the two violations `TESTING_STRATEGY_FINAL.md`
 * §Accessibility names by hand, and it is tested here rather than in
 * `e2e/accessibility.spec.ts` because the boundary cannot be reached from
 * outside the application. It catches a React *render* throw; there is no route,
 * no state and no API response that produces one on demand, which is exactly why
 * `QA-REPORT.md` recorded it as unverified — "could not trigger a genuine
 * runtime error without modifying code mid-QA". Mounting the component directly
 * is the only honest way to assert its contract, so that is what this does.
 *
 * Three separate obligations are checked, and they fail independently:
 *   - the failure is *announced*, not swapped in silently (the a11y defect);
 *   - the failure is *recorded*, through `logger` and never `console` (Phase 0);
 *   - `error.message` is never rendered (the publicMessage-only discipline the
 *     API's error serialisation follows).
 */

function boom(digest?: string): Error & { digest?: string } {
  const error = new Error('ECONNREFUSED 10.0.0.4:5432 — internal detail that must not be shown')
  if (digest !== undefined) Object.assign(error, { digest })
  return error
}

describe('ErrorPage', () => {
  /**
   * The boundary logs on mount, and `logger` writes to `console.error` by
   * design. Left real, every test in this file would print a stack trace to a
   * passing run. Stubbing it here also sharpens the console assertion below:
   * with `logger` silenced, anything that still reaches `console` came from
   * `error.tsx` itself, which is the rule actually being enforced.
   */
  let recorded: jest.SpyInstance

  beforeEach(() => {
    recorded = jest.spyOn(logger, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('announces the failure assertively rather than swapping in silently', () => {
    // The boundary replaces page content without a navigation, so nothing
    // prompts a screen reader to re-read and focus stays where it was. Without
    // a live region a sighted user sees the failure instantly and a
    // screen-reader user is told nothing at all.
    render(<ErrorPage error={boom()} reset={jest.fn()} />)

    const alert = screen.getByRole('alert')
    expect(alert).toHaveAttribute('aria-live', 'assertive')
    expect(alert).toHaveTextContent('Something went wrong')
  })

  it('keeps the heading inside the announcement, so the page is named when read', () => {
    render(<ErrorPage error={boom()} reset={jest.fn()} />)

    const heading = screen.getByRole('heading', { level: 1, name: 'Something went wrong' })
    expect(screen.getByRole('alert')).toContainElement(heading)
  })

  it('has no axe violations', async () => {
    const { container } = render(<ErrorPage error={boom('a1b2c3')} reset={jest.fn()} />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('never renders error.message, however the boundary was reached', () => {
    render(<ErrorPage error={boom('a1b2c3')} reset={jest.fn()} />)

    expect(screen.queryByText(/ECONNREFUSED/)).not.toBeInTheDocument()
    expect(screen.queryByText(/10\.0\.0\.4/)).not.toBeInTheDocument()
  })

  it('shows the digest as a support reference, since that is what Next generates it for', () => {
    render(<ErrorPage error={boom('a1b2c3')} reset={jest.fn()} />)
    expect(screen.getByText('a1b2c3')).toBeInTheDocument()
  })

  it('omits the reference line entirely when there is no digest', () => {
    // An empty "Reference" with nothing after it is worse than no line: it reads
    // as a missing value the visitor should have been given.
    render(<ErrorPage error={boom()} reset={jest.fn()} />)
    expect(screen.queryByText(/^Reference/)).not.toBeInTheDocument()
  })

  it('records the failure through logger, not console', () => {
    const spies = (['log', 'error', 'warn'] as const).map((method) =>
      jest.spyOn(console, method).mockImplementation(() => {})
    )

    render(<ErrorPage error={boom('a1b2c3')} reset={jest.fn()} />)

    expect(recorded).toHaveBeenCalledTimes(1)
    expect(recorded.mock.calls[0][1]).toMatchObject({ digest: 'a1b2c3' })

    // `logger` is stubbed, so a console call here could only have come from
    // this component reaching past it — the thing CLAUDE.md forbids.
    for (const spy of spies) expect(spy).not.toHaveBeenCalled()
  })

  it('offers a keyboard-reachable retry that calls reset', async () => {
    const reset = jest.fn()
    render(<ErrorPage error={boom()} reset={reset} />)

    const retry = screen.getByRole('button', { name: /Try again/ })
    retry.focus()
    expect(retry).toHaveFocus()

    await userEvent.keyboard('{Enter}')
    expect(reset).toHaveBeenCalledTimes(1)
  })
})
