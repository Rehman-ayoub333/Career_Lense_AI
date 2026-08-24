import { expect, type Page } from '@playwright/test'

/**
 * Shared fixtures and drivers for the end-to-end suites.
 *
 * `analyze.spec.ts` and `accessibility.spec.ts` must exercise *the same*
 * rendered result — an accessibility pass over a different fixture than the
 * behavioural pass proves nothing about the screen users actually see. Keeping
 * one copy here is what makes that guarantee structural rather than a habit.
 *
 * `/api/analyze` is intercepted; everything else is the real application. That
 * is not a workaround for the missing key: an end-to-end test against a live
 * model is non-deterministic by construction, so no assertion about what the
 * document marks could be stable.
 */

export const CV = `Sana Iqbal — Software Engineer
sana.iqbal@example.com | +92 300 1234567

Experience
Built and shipped three production React applications over 4 years.
Led a team of 4 engineers through a migration from REST to GraphQL.
Maintained the internal component library and its documentation.

Education
BSc Computer Science, University of the Punjab, 06/2019.`

export const JD = `We are looking for a frontend engineer with strong production React
experience, exposure to GraphQL, and comfort with Docker and container
orchestration. You will work across product and engineering teams.`

/** One verified, one uncertain, one unresolved — all three tiers on screen. */
export const ANALYSIS = {
  success: true,
  data: {
    score: 73,
    verdict: 'Good Match',
    claims: [
      {
        id: 'claim-0',
        requirement: 'Production React experience',
        category: 'skill',
        status: 'matched',
        evidence_quote: 'Built and shipped three production React applications over 4 years',
        rationale: 'The CV states four years of production React work.',
        verification: 'verified',
      },
      {
        id: 'claim-1',
        requirement: 'GraphQL exposure',
        category: 'skill',
        status: 'partial',
        evidence_quote: 'a migration from REST to GraphQL',
        rationale: 'The CV mentions a GraphQL migration without describing depth of use.',
        verification: 'uncertain',
      },
      {
        id: 'claim-2',
        requirement: 'Docker or container orchestration',
        category: 'skill',
        status: 'gap',
        evidence_quote: null,
        rationale: 'No mention of Docker or containerisation appears in the CV.',
        verification: 'unresolved',
      },
    ],
    coverage: {
      overall: 1 / 3,
      byCategory: { skill: 1 / 3 },
      verifiedCount: 1,
      uncertainCount: 1,
      unresolvedCount: 1,
      total: 3,
    },
    key_actions: [
      'Add evidence of container work, even from a personal project.',
      'Quantify the GraphQL migration.',
      'Name the component library and its consumers.',
    ],
    salary_range: '$95,000 - $120,000 USD',
    salary_context: 'Reflects mid-level frontend work at growth-stage companies.',
    interview_questions: [
      { question: 'Describe the REST to GraphQL migration.', skill_tested: 'Delivery', tip: 'Use STAR.' },
    ],
    ats_checks: [
      { id: 'dates', label: 'Consistent date format', status: 'pass', note: 'All dates use MM/YYYY.', source: 'deterministic' },
      { id: 'contact', label: 'Contact details in body', status: 'pass', note: 'Email and phone found.', source: 'deterministic' },
      { id: 'tables', label: 'No tables', status: 'pass', note: 'Single linear column.', source: 'deterministic' },
      { id: 'headings', label: 'Standard headings', status: 'warn', note: 'Consider adding a Skills heading.', source: 'model' },
      { id: 'keywords', label: 'Keywords present', status: 'pass', note: 'React and GraphQL both appear.', source: 'model' },
      { id: 'graphics', label: 'No images or icons', status: 'pass', note: 'None detected.', source: 'model' },
      { id: 'length', label: 'Appropriate length', status: 'pass', note: 'One page equivalent.', source: 'model' },
      { id: 'fonts', label: 'Standard fonts', status: 'pass', note: 'Nothing unusual.', source: 'model' },
    ],
  },
}

export const REWRITE = {
  success: true,
  data: {
    original_bullets: ['Built and shipped three production React applications over 4 years.'],
    rewritten_bullets: ['Delivered three production React applications over four years.'],
  },
}

export const COVER_LETTER = { success: true, data: { coverLetter: 'Dear hiring team,\n\nI am writing…' } }

export async function stubApi(page: Page): Promise<void> {
  await page.route('**/api/analyze', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ANALYSIS) })
  )
  await page.route('**/api/rewrite', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(REWRITE) })
  )
  await page.route('**/api/cover-letter', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(COVER_LETTER) })
  )
}

export async function runAnalysis(page: Page): Promise<void> {
  await stubApi(page)
  await page.goto('/analyze')

  await page.getByTestId('cv-textarea').fill(CV)
  await page.getByTestId('jd-textarea').fill(JD)
  await page.getByTestId('analyze-button').click()

  await expect(page.getByTestId('assessment-panel')).toBeVisible({ timeout: 30_000 })
}
