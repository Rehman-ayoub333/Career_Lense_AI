import { expect, test } from '@playwright/test'

import { runAnalysis } from './fixtures'

/**
 * The analyse flow, end to end.
 *
 * Covers what `IMPLEMENTATION_ROADMAP_FINAL.md` requires of Phase 5: paste,
 * submit, results render, evidence markers present, a tools tab reachable — plus
 * the doctrine assertion that nothing in a rendered result is red.
 *
 * Fixtures and the API interception live in `fixtures.ts`, shared with
 * `accessibility.spec.ts` so both suites judge the same rendered screen.
 */

test.describe('analyse flow', () => {
  test('the page has one main and a real heading', async ({ page }) => {
    await page.goto('/analyze')

    await expect(page.getByRole('heading', { level: 1, name: 'Analyse your CV' })).toBeVisible()
    await expect(page.locator('main')).toHaveCount(1)
  })

  test('paste, submit, and the evidence experience renders', async ({ page }) => {
    await runAnalysis(page)

    await expect(page.getByTestId('assessment-panel')).toBeVisible()
    await expect(page.getByTestId('evidence-document')).toBeVisible()
    await expect(page.getByTestId('requirement-checklist')).toBeVisible()
    await expect(page.getByTestId('coverage-summary')).toBeVisible()

    // The score is stated, not performed.
    await expect(page.getByText('Match 73 out of 100, band GOOD.')).toBeAttached()
  })

  test('the document marks the verified and uncertain passages', async ({ page }) => {
    await runAnalysis(page)

    const document = page.getByTestId('evidence-document')
    await expect(document.getByRole('button', { name: /^Verified:/ })).toBeVisible()
    await expect(document.getByRole('button', { name: /^Uncertain:/ })).toBeVisible()

    // Nothing was found for the unresolved claim, so nothing is marked for it.
    await expect(document.getByRole('button', { name: /^Not found in your CV:/ })).toHaveCount(0)
  })

  test('a marker opens its rationale and closes again', async ({ page }) => {
    await runAnalysis(page)

    const marker = page.getByTestId('evidence-document').getByRole('button', { name: /^Verified:/ })
    await expect(marker).toHaveAttribute('aria-expanded', 'false')

    await marker.click()
    await expect(marker).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByText('The CV states four years of production React work.')).toBeVisible()

    await marker.click()
    await expect(marker).toHaveAttribute('aria-expanded', 'false')
  })

  test('the checklist lists all three tiers, including the unresolved one', async ({ page }) => {
    await runAnalysis(page)

    const checklist = page.getByTestId('requirement-checklist')
    await expect(checklist.getByText('Evidence found')).toBeVisible()
    await expect(checklist.getByText('Evidence unclear')).toBeVisible()
    await expect(checklist.getByText('Not found in your CV')).toBeVisible()
    await expect(checklist.getByText(/not a judgement about your experience/i)).toBeVisible()
  })

  test('DOCTRINE: no element in a rendered result is painted red', async ({ page }) => {
    await runAnalysis(page)

    // Resolved styles rather than class names, so a hardcoded colour that never
    // went through the token map is caught too.
    //
    // Detection is by hue, not by "is the red channel dominant". Amber is
    // hsl(38 92% 50%) — rgb(245, 159, 10) — so a channel-dominance test flags
    // every legitimate `uncertain` element as red. `--red` is hue 352; amber is
    // hue 38. Only the red end of the wheel counts.
    const offenders = await page
      .locator('[data-testid="assessment-panel"] *, [data-testid="evidence-document"] *')
      .evaluateAll((elements) => {
        function isRed(value: string): boolean {
          const match = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/.exec(value)
          if (!match) return false

          const alpha = match[4] === undefined ? 1 : Number(match[4])
          if (alpha < 0.05) return false

          const [r, g, b] = [Number(match[1]) / 255, Number(match[2]) / 255, Number(match[3]) / 255]
          const max = Math.max(r, g, b)
          const min = Math.min(r, g, b)
          const delta = max - min
          if (delta < 0.15) return false

          let hue = 0
          if (max === r) hue = 60 * (((g - b) / delta) % 6)
          else if (max === g) hue = 60 * ((b - r) / delta + 2)
          else hue = 60 * ((r - g) / delta + 4)
          if (hue < 0) hue += 360

          return hue >= 330 || hue <= 12
        }

        return elements.flatMap((element) => {
          const style = getComputedStyle(element)
          const found = [style.color, style.backgroundColor, style.borderTopColor].filter(isRed)
          return found.length > 0
            ? [`${element.tagName.toLowerCase()}.${element.className}: ${found.join(', ')}`]
            : []
        })
      })

    // Reported, not just counted: a failure here means the product has started
    // painting a judgement, and the next person needs to know which element.
    expect(offenders).toEqual([])
  })

  test('the tools strip offers exactly the four generated-content tools', async ({ page }) => {
    await runAnalysis(page)

    const tabs = page.getByTestId('results-tabs').getByRole('tab')
    await expect(tabs).toHaveCount(4)
    await expect(tabs).toHaveText(['CV Rewrite', 'Cover Letter', 'Interview Prep', 'Chat CV'])
  })

  test('a tools tab is reachable and renders its content', async ({ page }) => {
    await runAnalysis(page)

    await page.getByRole('tab', { name: 'Interview Prep' }).click()
    await expect(page.getByText('Describe the REST to GraphQL migration.')).toBeVisible()
  })

  test('every marker and tab is reachable by keyboard alone', async ({ page }) => {
    await runAnalysis(page)

    const marker = page.getByTestId('evidence-document').getByRole('button', { name: /^Verified:/ })
    await marker.focus()
    await expect(marker).toBeFocused()

    await page.keyboard.press('Enter')
    await expect(marker).toHaveAttribute('aria-expanded', 'true')
  })

  test('formatting and compensation are on screen, not download-only', async ({ page }) => {
    await runAnalysis(page)

    await expect(page.getByTestId('ats-checklist')).toBeVisible()
    await expect(page.getByTestId('compensation-summary')).toBeVisible()
    // The transparency label distinguishes a measurement from the model's guess.
    await expect(page.getByText('Checked in your CV text').first()).toBeVisible()
    await expect(page.getByText('Assessed by the model').first()).toBeVisible()
  })
})

test.describe('recovery pages', () => {
  test('the not-found page renders and links home', async ({ page }) => {
    await page.goto('/this-route-does-not-exist')

    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
    await expect(page.getByRole('link', { name: /Back to home/ })).toBeVisible()
    await expect(page.locator('main')).toHaveCount(1)
  })

  test('the privacy page renders exactly one main', async ({ page }) => {
    await page.goto('/privacy')

    await expect(page.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeVisible()
    await expect(page.locator('main')).toHaveCount(1)
  })
})
