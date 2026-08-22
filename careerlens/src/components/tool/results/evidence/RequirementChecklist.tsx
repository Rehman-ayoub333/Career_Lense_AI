'use client'

import { cn } from '@/lib/cn'
import type { PublicVerifiedClaim, VerificationTier } from '@/types'

import { TIER_DESCRIPTION, TIER_HEADING, TIER_ORDER } from './tiers'

/**
 * Every requirement that was checked, grouped by what the check found.
 *
 * All three groups are rendered at the same visual weight, in a fixed order, and
 * the `unresolved` group carries the same construction as the other two — the
 * same type, the same spacing, no icon, no colour escalation. That sameness is
 * the point. A requirement the CV did not address is a fact about the document
 * of exactly the same kind as one it did, and rendering it as an exception would
 * reintroduce the judgement the tier vocabulary was built to remove.
 *
 * Each group states in a sentence what its tier means, once, so the meaning does
 * not live only in a colour or a word a reader has to infer.
 */
export function RequirementChecklist({
  claims,
  activeClaimId,
  onClaimSelect,
}: {
  claims: PublicVerifiedClaim[]
  activeClaimId: string | null
  onClaimSelect: (id: string | null) => void
}) {
  if (claims.length === 0) {
    return (
      <p data-testid="requirement-checklist" className="text-sm leading-relaxed text-text-muted">
        No specific requirements could be read from the description you provided. Try pasting the
        full text, including the responsibilities and qualifications sections.
      </p>
    )
  }

  const grouped = TIER_ORDER.map((tier) => ({
    tier,
    items: claims.filter((claim) => claim.verification === tier),
  })).filter((group) => group.items.length > 0)

  return (
    <div data-testid="requirement-checklist" className="space-y-6">
      {grouped.map(({ tier, items }) => (
        <section key={tier} aria-labelledby={`checklist-${tier}`}>
          <h3
            id={`checklist-${tier}`}
            className="flex items-baseline justify-between gap-3 font-mono text-xs uppercase tracking-[0.16em] text-text-muted"
          >
            <span>{TIER_HEADING[tier]}</span>
            <span className="tabular">{items.length}</span>
          </h3>

          <p className="mt-1.5 text-xs leading-relaxed text-[hsl(var(--text-muted)/0.8)]">
            {TIER_DESCRIPTION[tier]}
          </p>

          <ul className="mt-3 space-y-1">
            {items.map((claim) => (
              <ChecklistItem
                key={claim.id}
                claim={claim}
                tier={tier}
                active={activeClaimId === claim.id}
                onSelect={() => onClaimSelect(activeClaimId === claim.id ? null : claim.id)}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

/** The tier's colour, as a left rule. Never a fill, and never red. */
const TIER_RULE: Record<VerificationTier, string> = {
  verified: 'border-l-[hsl(var(--green)/0.5)]',
  uncertain: 'border-l-[hsl(var(--amber)/0.5)]',
  unresolved: 'border-l-[hsl(var(--unresolved)/0.5)]',
}

function ChecklistItem({
  claim,
  tier,
  active,
  onSelect,
}: {
  claim: PublicVerifiedClaim
  tier: VerificationTier
  active: boolean
  onSelect: () => void
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={active}
        // Names the tier in the accessible label as well as showing it, so the
        // grouping survives for anyone reading item by item out of context.
        aria-label={`${TIER_HEADING[tier]}: ${claim.requirement}`}
        className={cn(
          'w-full border-l-2 py-1.5 pl-3 pr-2 text-left text-sm leading-relaxed transition-colors duration-150',
          'rounded-r-[var(--radius-sm)] hover:bg-surface-hover',
          TIER_RULE[tier],
          active ? 'bg-surface-hover text-text-primary' : 'text-text-secondary'
        )}
      >
        {claim.requirement}
      </button>
    </li>
  )
}
