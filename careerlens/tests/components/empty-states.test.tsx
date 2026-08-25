/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'

import { CoverageSummary } from '@/components/tool/results/evidence/CoverageSummary'
import { RequirementChecklist } from '@/components/tool/results/evidence/RequirementChecklist'
import type { CoverageSummary as Coverage } from '@/types'

expect.extend(toHaveNoViolations)

/**
 * The zero-requirements empty state, and the user error it has to cover.
 *
 * `TESTING_STRATEGY_FINAL.md` §Edge cases asks for "a CV that is actually a JD
 * pasted into the wrong box (a real user-error case worth a defined message, not
 * a crash)". No detection logic exists for this and none was added: a CV in the
 * description box gives Stage 1 nothing to extract, which lands on the zero-claims
 * path `AI_PIPELINE_FINAL.md` already defines. `tests/api/analyze.test.ts` covers
 * that the path is reached; this file covers what the reader is then told.
 *
 * The copy previously said only "Try pasting the full text, including the
 * responsibilities and qualifications sections" — advice that is actively wrong
 * for a swap, since re-pasting a description that was never in the box cannot
 * help. It now names the swap first and keeps the incomplete-description advice
 * second, because both causes produce exactly the same result and nothing
 * downstream can tell them apart.
 *
 * What it deliberately does not do is *assert* the swap. The same near-empty
 * result comes from a terse description, a bulleted ad, or a language the model
 * handled poorly, so a message stating the mixup as fact would be wrong more
 * often than right.
 */

const EMPTY_COVERAGE: Coverage = {
  overall: 0,
  byCategory: {},
  verifiedCount: 0,
  uncertainCount: 0,
  unresolvedCount: 0,
  total: 0,
}

describe('RequirementChecklist — nothing to check against', () => {
  function renderEmpty() {
    return render(
      <RequirementChecklist claims={[]} activeClaimId={null} onClaimSelect={() => {}} />
    )
  }

  it('renders a specific message rather than a blank region', () => {
    renderEmpty()
    expect(screen.getByTestId('requirement-checklist')).toHaveTextContent(
      /No specific requirements could be read/
    )
  })

  it('tells the reader to check the boxes hold the right documents', () => {
    // The swapped-documents case, covered without claiming to have detected it.
    renderEmpty()
    expect(screen.getByTestId('requirement-checklist')).toHaveTextContent(
      /Check that each box holds the right document/
    )
  })

  it('names a CV in the description box as the usual cause', () => {
    renderEmpty()
    expect(screen.getByTestId('requirement-checklist')).toHaveTextContent(
      /a CV in the description box/
    )
  })

  it('keeps the incomplete-description advice as well, since both causes are live', () => {
    renderEmpty()
    expect(screen.getByTestId('requirement-checklist')).toHaveTextContent(
      /responsibilities and qualifications/
    )
  })

  it('does not state the swap as fact', () => {
    // Asserting a cause the system cannot observe would be wrong more often than
    // right. "Check that" is an invitation; "you have swapped" would be a claim.
    const text = renderEmpty().container.textContent ?? ''

    expect(text).not.toMatch(/you (have )?swapped/i)
    expect(text).not.toMatch(/wrong box/i)
  })

  it('renders no list, no headings and no empty group scaffolding', () => {
    renderEmpty()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })

  it('has no axe violations in the empty state', async () => {
    const { container } = renderEmpty()
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('CoverageSummary — nothing to count', () => {
  function renderEmpty() {
    return render(<CoverageSummary coverage={EMPTY_COVERAGE} />)
  }

  it('explains the case instead of rendering 0 / 0', () => {
    renderEmpty()

    const summary = screen.getByTestId('coverage-summary')
    expect(summary).toHaveTextContent(/nothing to check the CV against/)
    expect(summary).not.toHaveTextContent('0 / 0')
  })

  it('points at the same first thing to check as the checklist does', () => {
    // Two surfaces, one diagnosis. A reader who looks at either should be sent
    // to the same place.
    renderEmpty()
    expect(screen.getByTestId('coverage-summary')).toHaveTextContent(
      /right document is in each box/
    )
  })

  it('renders no tier breakdown, since there are no tiers to break down', () => {
    renderEmpty()
    expect(screen.queryByRole('definition')).not.toBeInTheDocument()
  })

  it('renders no chart, gauge or progressbar in the empty state either', () => {
    const { container } = renderEmpty()

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    expect(container.querySelector('svg')).toBeNull()
  })

  it('has no axe violations in the empty state', async () => {
    const { container } = renderEmpty()
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('the two empty states agree with each other', () => {
  it('both name the document mix-up, so neither surface contradicts the other', () => {
    const checklist = render(
      <RequirementChecklist claims={[]} activeClaimId={null} onClaimSelect={() => {}} />
    ).container.textContent
    const coverage = render(<CoverageSummary coverage={EMPTY_COVERAGE} />).container.textContent

    for (const text of [checklist, coverage]) {
      expect(text).toMatch(/box/)
      expect(text).toMatch(/document/)
    }
  })

  it('neither blames the candidate for the empty result', () => {
    // The doctrine that governs every other surface applies here too: the copy
    // is about the documents, never about the person.
    const checklist = render(
      <RequirementChecklist claims={[]} activeClaimId={null} onClaimSelect={() => {}} />
    ).container.textContent
    const coverage = render(<CoverageSummary coverage={EMPTY_COVERAGE} />).container.textContent

    for (const text of [checklist, coverage]) {
      expect(text).not.toMatch(/you (do not|don't|lack|failed)/i)
      expect(text).not.toMatch(/your mistake/i)
    }
  })
})
