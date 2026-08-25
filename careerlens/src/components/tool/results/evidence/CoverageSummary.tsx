import type { CoverageSummary as Coverage } from '@/types'

import { TIER_LABEL } from './tiers'

/**
 * The coverage tally.
 *
 * A literal count, shown as a literal count. No gauge, no ring, no bar — this is
 * the one number on the results screen a reader can recount for themselves from
 * the checklist directly below it, and that is exactly what earns it a place
 * after six unverifiable sub-scores were removed.
 *
 * `byCategory` is deliberately not rendered here. It exists in the data for the
 * research track, and a per-category percentage strip would reintroduce the
 * false precision the fraction avoids: "skills 75%" invites reading a
 * three-of-four count as a competence measure.
 */
export function CoverageSummary({ coverage }: { coverage: Coverage }) {
  const { verifiedCount, uncertainCount, unresolvedCount, total } = coverage

  if (total === 0) {
    return (
      <p data-testid="coverage-summary" className="font-mono text-xs leading-relaxed text-text-muted">
        No specific requirements could be read from this description, so there was nothing to check
        the CV against. Worth confirming the right document is in each box.
      </p>
    )
  }

  const counts: readonly { tier: keyof typeof TIER_LABEL; count: number }[] = [
    { tier: 'verified', count: verifiedCount },
    { tier: 'uncertain', count: uncertainCount },
    { tier: 'unresolved', count: unresolvedCount },
  ]

  return (
    <div data-testid="coverage-summary">
      {/* Stated as a sentence for assistive technology: "14/17" read aloud is
          "fourteen seventeen", which is not the same claim. */}
      <p className="text-sm text-text-secondary">
        <span className="sr-only">
          {verifiedCount} out of {total} requirements verified.
        </span>
        <span aria-hidden="true">
          <span className="tabular text-text-primary">
            {verifiedCount} / {total}
          </span>{' '}
          requirements verified
        </span>
      </p>

      <dl className="mt-4 space-y-1.5">
        {counts.map(({ tier, count }) => (
          <div key={tier} className="flex items-baseline justify-between gap-4 font-mono text-xs">
            <dt className="text-text-muted">{TIER_LABEL[tier]}</dt>
            <dd className="tabular text-text-secondary">{count}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
