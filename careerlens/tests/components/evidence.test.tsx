/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'

import { ATSChecklist } from '@/components/tool/results/evidence/ATSChecklist'
import { ClaimMarker } from '@/components/tool/results/evidence/ClaimMarker'
import { CompensationSummary } from '@/components/tool/results/evidence/CompensationSummary'
import { CoverageSummary } from '@/components/tool/results/evidence/CoverageSummary'
import { EvidenceDocument } from '@/components/tool/results/evidence/EvidenceDocument'
import { RequirementChecklist } from '@/components/tool/results/evidence/RequirementChecklist'
import type { ATSCheck, CoverageSummary as Coverage, PublicVerifiedClaim } from '@/types'

expect.extend(toHaveNoViolations)

/**
 * Rendered component tests for the evidence surface.
 *
 * The doctrine assertions here are the rendered counterpart to
 * `tests/doctrine.test.ts`, which pins the same rules at the token-map level.
 * Both are worth having: the map test catches a bad mapping, this one catches a
 * component that bypasses the map and hardcodes a colour anyway.
 */

function claim(overrides: Partial<PublicVerifiedClaim> = {}): PublicVerifiedClaim {
  return {
    id: 'claim-0',
    requirement: 'Production React experience',
    category: 'skill',
    status: 'matched',
    evidence_quote: 'four years building React applications',
    rationale: 'The CV states four years of React work.',
    verification: 'verified',
    ...overrides,
  }
}

/** Every element in the tree, so a hardcoded colour anywhere is caught. */
function allClassNames(container: HTMLElement): string {
  return [...container.querySelectorAll('*')]
    .map((element) => element.getAttribute('class') ?? '')
    .join(' ')
}

describe('RequirementChecklist', () => {
  const claims = [
    claim({ id: 'claim-0', verification: 'verified', requirement: 'React experience' }),
    claim({ id: 'claim-1', verification: 'uncertain', requirement: 'GraphQL exposure' }),
    claim({
      id: 'claim-2',
      verification: 'unresolved',
      status: 'gap',
      evidence_quote: null,
      requirement: 'Docker experience',
    }),
  ]

  it('renders all three tiers with their counts', () => {
    render(<RequirementChecklist claims={claims} activeClaimId={null} onClaimSelect={() => {}} />)

    expect(screen.getByText('Evidence found')).toBeInTheDocument()
    expect(screen.getByText('Evidence unclear')).toBeInTheDocument()
    expect(screen.getByText('Not found in your CV')).toBeInTheDocument()
  })

  it('DOCTRINE: renders no red anywhere, including for the unresolved group', () => {
    const { container } = render(
      <RequirementChecklist claims={claims} activeClaimId={null} onClaimSelect={() => {}} />
    )

    expect(allClassNames(container)).not.toContain('--red')
    expect(allClassNames(container)).not.toContain('red-text')
  })

  it('DOCTRINE: renders unresolved with the dedicated slate token', () => {
    const { container } = render(
      <RequirementChecklist
        claims={[claims[2]]}
        activeClaimId={null}
        onClaimSelect={() => {}}
      />
    )

    expect(allClassNames(container)).toContain('--unresolved')
  })

  it('DOCTRINE: states that unresolved is not a judgement, in visible text', () => {
    render(
      <RequirementChecklist claims={[claims[2]]} activeClaimId={null} onClaimSelect={() => {}} />
    )

    expect(screen.getByText(/not a judgement about your experience/i)).toBeInTheDocument()
  })

  it('gives every requirement a text label naming its tier, not colour alone', () => {
    render(<RequirementChecklist claims={claims} activeClaimId={null} onClaimSelect={() => {}} />)

    expect(
      screen.getByRole('button', { name: 'Not found in your CV: Docker experience' })
    ).toBeInTheDocument()
  })

  it('selects a claim on click and reports it pressed when active', async () => {
    const onClaimSelect = jest.fn()
    const user = userEvent.setup()

    const { rerender } = render(
      <RequirementChecklist claims={claims} activeClaimId={null} onClaimSelect={onClaimSelect} />
    )

    await user.click(screen.getByRole('button', { name: /Docker experience/ }))
    expect(onClaimSelect).toHaveBeenCalledWith('claim-2')

    rerender(
      <RequirementChecklist claims={claims} activeClaimId="claim-2" onClaimSelect={onClaimSelect} />
    )
    expect(screen.getByRole('button', { name: /Docker experience/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
  })

  it('shows a specific empty state rather than a blank region', () => {
    render(<RequirementChecklist claims={[]} activeClaimId={null} onClaimSelect={() => {}} />)

    expect(screen.getByText(/No specific requirements could be read/i)).toBeInTheDocument()
  })

  it('has no axe violations', async () => {
    const { container } = render(
      <RequirementChecklist claims={claims} activeClaimId={null} onClaimSelect={() => {}} />
    )

    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('ClaimMarker', () => {
  it('names the tier and requirement in its accessible label', () => {
    render(
      <ClaimMarker claim={claim()} text="four years building React" expanded={false} onToggle={() => {}} />
    )

    expect(
      screen.getByRole('button', {
        name: 'Verified: Production React experience. Press to see why.',
      })
    ).toBeInTheDocument()
  })

  it('exposes the disclosure state via aria-expanded', async () => {
    const onToggle = jest.fn()
    const user = userEvent.setup()

    const { rerender } = render(
      <ClaimMarker claim={claim()} text="four years" expanded={false} onToggle={onToggle} />
    )

    const marker = screen.getByRole('button')
    expect(marker).toHaveAttribute('aria-expanded', 'false')

    await user.click(marker)
    expect(onToggle).toHaveBeenCalled()

    rerender(<ClaimMarker claim={claim()} text="four years" expanded onToggle={onToggle} />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true')
  })

  it('is reachable and operable by keyboard alone', async () => {
    const onToggle = jest.fn()
    const user = userEvent.setup()

    render(<ClaimMarker claim={claim()} text="four years" expanded={false} onToggle={onToggle} />)

    await user.tab()
    expect(screen.getByRole('button')).toHaveFocus()

    await user.keyboard('{Enter}')
    await user.keyboard(' ')
    expect(onToggle).toHaveBeenCalledTimes(2)
  })

  it('shows the rationale only when expanded', () => {
    const { rerender } = render(
      <ClaimMarker claim={claim()} text="four years" expanded={false} onToggle={() => {}} />
    )
    expect(screen.queryByText(/The CV states four years/)).not.toBeInTheDocument()

    rerender(<ClaimMarker claim={claim()} text="four years" expanded onToggle={() => {}} />)
    expect(screen.getByText(/The CV states four years/)).toBeInTheDocument()
  })

  it('renders the CV text verbatim, not the model requirement string', () => {
    render(
      <ClaimMarker claim={claim()} text="four years building React" expanded={false} onToggle={() => {}} />
    )

    expect(screen.getByRole('button')).toHaveTextContent('four years building React')
  })
})

describe('EvidenceDocument', () => {
  const CV = 'Sana Iqbal.\nfour years building React applications.\nNo container work listed.'

  it('marks a located quote and leaves the rest as prose', () => {
    const { container } = render(
      <EvidenceDocument
        cvText={CV}
        claims={[claim()]}
        activeClaimId={null}
        onClaimSelect={() => {}}
      />
    )

    expect(screen.getByRole('button', { name: /Verified/ })).toBeInTheDocument()
    expect(container).toHaveTextContent('Sana Iqbal')
    expect(screen.getByText('1 passage marked')).toBeInTheDocument()
  })

  it('DOCTRINE: never marks an unresolved claim in the document', () => {
    render(
      <EvidenceDocument
        cvText={CV}
        claims={[claim({ verification: 'unresolved', evidence_quote: null })]}
        activeClaimId={null}
        onClaimSelect={() => {}}
      />
    )

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('degrades to an explained empty state when nothing could be located', () => {
    render(
      <EvidenceDocument
        cvText={CV}
        claims={[claim({ evidence_quote: 'text that is not in the CV' })]}
        activeClaimId={null}
        onClaimSelect={() => {}}
      />
    )

    expect(screen.getByText(/No passages could be marked/i)).toBeInTheDocument()
  })

  it('has no axe violations', async () => {
    const { container } = render(
      <EvidenceDocument
        cvText={CV}
        claims={[claim()]}
        activeClaimId={null}
        onClaimSelect={() => {}}
      />
    )

    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('CoverageSummary', () => {
  const coverage: Coverage = {
    overall: 14 / 17,
    byCategory: { skill: 0.75 },
    verifiedCount: 14,
    uncertainCount: 2,
    unresolvedCount: 1,
    total: 17,
  }

  it('states the fraction as a sentence for screen readers', () => {
    render(<CoverageSummary coverage={coverage} />)

    // "14/17" read aloud is "fourteen seventeen", which is a different claim.
    expect(screen.getByText('14 out of 17 requirements verified.')).toBeInTheDocument()
  })

  it('renders no chart, gauge or progressbar', () => {
    const { container } = render(<CoverageSummary coverage={coverage} />)

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    expect(container.querySelector('svg')).toBeNull()
  })

  it('explains the zero-claims case instead of showing 0/0', () => {
    render(
      <CoverageSummary
        coverage={{ ...coverage, verifiedCount: 0, uncertainCount: 0, unresolvedCount: 0, total: 0 }}
      />
    )

    expect(screen.getByText(/No specific requirements could be read/i)).toBeInTheDocument()
  })
})

describe('ATSChecklist', () => {
  const checks: ATSCheck[] = [
    { id: 'dates', label: 'Consistent dates', status: 'pass', note: 'All MM/YYYY.', source: 'deterministic' },
    { id: 'headings', label: 'Standard headings', status: 'warn', note: 'Two are unusual.', source: 'model' },
  ]

  it('shows which mechanism decided each check', () => {
    render(<ATSChecklist checks={checks} />)

    expect(screen.getByText('Checked in your CV text')).toBeInTheDocument()
    expect(screen.getByText('Assessed by the model')).toBeInTheDocument()
  })

  it('carries status as a word, not colour alone', () => {
    render(<ATSChecklist checks={checks} />)

    expect(screen.getByText('Pass')).toBeInTheDocument()
    expect(screen.getByText('Check')).toBeInTheDocument()
  })

  it('has no axe violations', async () => {
    const { container } = render(<ATSChecklist checks={checks} />)
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('CompensationSummary', () => {
  it('labels the figure as an unchecked estimate', () => {
    render(
      <CompensationSummary
        salary_range="$95,000 - $120,000 USD"
        salary_context="Mid-level frontend work."
      />
    )

    expect(screen.getByText('$95,000 - $120,000 USD')).toBeInTheDocument()
    expect(screen.getByText(/not checked against market data/i)).toBeInTheDocument()
  })

  it('renders no range bar or chart', () => {
    const { container } = render(
      <CompensationSummary salary_range="$95,000 - $120,000" salary_context="Context." />
    )

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    expect(container.querySelector('svg')).toBeNull()
  })

  it('handles an absent estimate without rendering an empty region', () => {
    render(<CompensationSummary salary_range="" salary_context="" />)
    expect(screen.getByText(/No salary estimate was produced/i)).toBeInTheDocument()
  })
})
