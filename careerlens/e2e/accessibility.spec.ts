import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { CV, JD, runAnalysis } from './fixtures'

/**
 * Automated accessibility pass — `TESTING_STRATEGY_FINAL.md` §Accessibility.
 *
 * That section asks for two distinct things, and this file does both, because
 * only one of them is what axe is actually good at.
 *
 * **The sweep.** axe-core over the analyse page and the results screen. It is a
 * floor, not a ceiling: axe catches roughly the machine-checkable third of WCAG
 * — contrast, names, roles, landmarks, duplicate ids — and cannot judge whether
 * a label is *meaningful* or a reading order sensible. A green run here is not a
 * claim that the product is accessible, and this file should not be cited as
 * one.
 *
 * **The two named violations.** `Hallmark`'s missing role/label and `error.tsx`'s
 * absent error announcement. These get explicit attribute-level assertions
 * *next to* the sweep, deliberately duplicating it — the sweep would pass just
 * as green if someone deleted the `sr-only` sentence and axe happened not to
 * flag the replacement. Per §Regression tests: "assert the attributes exist,
 * not just that the component renders".
 *
 * `tests/components/evidence.test.tsx` already runs jest-axe over four evidence
 * components in isolation. This is the complement, not the duplicate: a
 * component can be clean alone and still collide with the page it renders into
 * — duplicate landmarks, a heading level that skips, contrast against an actual
 * background rather than a test harness's white.
 */

/** WCAG 2.1 A and AA. The level the design system's own contrast rules target. */
const STANDARD = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] as const

async function scan(page: Page, selector?: string) {
  const builder = new AxeBuilder({ page }).withTags([...STANDARD])
  return (selector === undefined ? builder : builder.include(selector)).analyze()
}

/**
 * Reports the rule and the offending element, not just a count.
 *
 * A bare `toEqual([])` on a violation array prints an unreadable wall of axe's
 * internal shape. The next person needs to know which element, on which page.
 */
function summarise(violations: Awaited<ReturnType<typeof scan>>['violations']): string[] {
  return violations.flatMap((violation) =>
    violation.nodes.map((node) => `[${violation.id}] ${node.target.join(' ')} — ${violation.help}`)
  )
}

test.describe('automated axe sweep', () => {
  test('the analyse page, before anything is submitted', async ({ page }) => {
    await page.goto('/analyze')
    await expect(page.getByTestId('cv-textarea')).toBeVisible()

    expect(summarise((await scan(page)).violations)).toEqual([])
  })

  test('the results screen, with all three evidence tiers on it', async ({ page }) => {
    await runAnalysis(page)

    expect(summarise((await scan(page)).violations)).toEqual([])
  })

  test('the results screen with a marker expanded', async ({ page }) => {
    // The rationale popover is rendered on demand, so a scan of the collapsed
    // screen never sees it. Disclosure content is exactly where an unlabelled
    // control or an orphaned `aria-controls` tends to survive unnoticed.
    await runAnalysis(page)
    await page.getByTestId('evidence-document').getByRole('button', { name: /^Verified:/ }).click()

    expect(summarise((await scan(page)).violations)).toEqual([])
  })

  test('each tools tab, since three of the four never render until selected', async ({ page }) => {
    await runAnalysis(page)

    for (const name of ['CV Rewrite', 'Cover Letter', 'Interview Prep', 'Chat CV']) {
      await page.getByRole('tab', { name }).click()
      const violations = summarise((await scan(page, '[data-testid="results-tabs"]')).violations)
      expect(violations, `tab: ${name}`).toEqual([])
    }
  })

  test('the landing page', async ({ page }) => {
    await page.goto('/')
    expect(summarise((await scan(page)).violations)).toEqual([])
  })

  test('the privacy page', async ({ page }) => {
    await page.goto('/privacy')
    expect(summarise((await scan(page)).violations)).toEqual([])
  })

  test('the not-found page', async ({ page }) => {
    await page.goto('/this-route-does-not-exist')
    expect(summarise((await scan(page)).violations)).toEqual([])
  })
})

test.describe('the two violations TESTING_STRATEGY_FINAL.md names by hand', () => {
  test('Hallmark states the score, its denominator and its band in one sentence', async ({
    page,
  }) => {
    await runAnalysis(page)

    // Before Phase 0 the three visible fragments reached the accessibility tree
    // separately and announced as "73 Match GOOD" — no denominator, and no
    // stated relationship between the number and the word.
    await expect(page.getByText('Match 73 out of 100, band GOOD.')).toBeAttached()

    // And the fragments themselves are gone from the tree, not merely
    // supplemented. Asserting only the sentence would still pass if the old
    // fragments were announced after it.
    const hallmark = page.getByText('Match 73 out of 100, band GOOD.').locator('..')
    const exposed = hallmark.locator(':scope > *:not([aria-hidden="true"]):not(.sr-only)')
    await expect(exposed.filter({ hasText: /^GOOD$/ })).toHaveCount(0)
  })

  test('the error boundary announces itself instead of swapping in silently', async ({ page }) => {
    // The QA pass could not reach this boundary — "could not trigger a genuine
    // runtime error without modifying code mid-QA". A React render throw is not
    // reachable from the outside by construction, so the announcement contract
    // is asserted where the component can actually be rendered:
    // `tests/components/error-page.test.tsx`, which mounts it directly and runs
    // axe over it.
    //
    // What *is* checkable from here is that the convention this boundary follows
    // is the one the rest of the app follows, so the two cannot drift: an error
    // that reaches the inline surface is announced assertively.
    await page.route('**/api/analyze', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: { code: 'INTERNAL', message: 'Something went wrong. Please try again.' },
        }),
      })
    )

    // The real fixtures, not a short string: the submit button stays disabled
    // below 100 characters of CV and 50 of description.
    await page.goto('/analyze')
    await page.getByTestId('cv-textarea').fill(CV)
    await page.getByTestId('jd-textarea').fill(JD)
    await page.getByTestId('analyze-button').click()

    const alert = page.getByRole('alert')
    await expect(alert).toBeVisible({ timeout: 30_000 })
    await expect(alert).toHaveAttribute('aria-live', 'assertive')

    // A failed page is still a page: the sweep runs over the error state too.
    expect(summarise((await scan(page)).violations)).toEqual([])
  })
})
