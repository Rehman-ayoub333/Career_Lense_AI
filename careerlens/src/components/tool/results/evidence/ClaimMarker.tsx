'use client'

import { Tag } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'
import type { PublicVerifiedClaim } from '@/types'

import { TIER_LABEL, TIER_MARKER_CLASS, TIER_TAG_VARIANT } from './tiers'

/**
 * One marked span in the document, plus the annotation it opens.
 *
 * The span is a real `<button>` rather than a `<mark>` with handlers bolted on:
 * it is operable, so it needs to be operable by construction — focusable, in the
 * tab order, and activated by Enter and Space without any of that being
 * reimplemented. `aria-expanded` names the disclosure relationship, which is the
 * second of the two patterns the component spec permits.
 *
 * The accessible name states the tier in words before the quoted text, so the
 * meaning of the highlight never depends on seeing its colour.
 */
export function ClaimMarker({
  claim,
  text,
  expanded,
  onToggle,
}: {
  claim: PublicVerifiedClaim
  /** The CV's own text, rendered verbatim — never the model's paraphrase of it. */
  text: string
  expanded: boolean
  onToggle: () => void
}) {
  // `unresolved` claims never reach this component: nothing was found, so there
  // is no span to mark. The cast is safe because `buildDocumentSegments` filters
  // them out before a segment is ever attributed to a claim.
  const tier = claim.verification as Exclude<PublicVerifiedClaim['verification'], 'unresolved'>

  return (
    <span className="relative">
      <button
        type="button"
        id={`marker-${claim.id}`}
        aria-expanded={expanded}
        aria-label={`${TIER_LABEL[tier]}: ${claim.requirement}. Press to see why.`}
        onClick={onToggle}
        className={cn(
          'cursor-pointer rounded-[var(--radius-sm)] px-0.5 underline decoration-2 underline-offset-4',
          'transition-colors duration-150',
          TIER_MARKER_CLASS[tier]
        )}
      >
        {text}
      </button>

      {expanded ? (
        <span
          role="note"
          className={cn(
            'absolute left-0 top-full z-10 mt-2 block w-80 max-w-[calc(100vw-3rem)]',
            'rounded-[var(--radius-md)] border border-border bg-surface-raised p-4 text-left',
            'shadow-[var(--shadow-lg)]'
          )}
        >
          <Tag variant={TIER_TAG_VARIANT[tier]}>{TIER_LABEL[tier]}</Tag>

          <span className="mt-3 block text-sm font-medium text-text-primary">
            {claim.requirement}
          </span>

          {/* The model's reasoning, about the document. Kept visually secondary
              to the requirement: the claim is the fact, this is the account of it. */}
          <span className="mt-2 block text-sm leading-relaxed text-text-secondary">
            {claim.rationale}
          </span>
        </span>
      ) : null}
    </span>
  )
}
