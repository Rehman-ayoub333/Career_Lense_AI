'use client'

import { FileText } from 'lucide-react'

import { EmptyState } from '@/components/ui/Feedback'
import { buildDocumentSegments } from '@/lib/analysis/locate'
import type { PublicVerifiedClaim } from '@/types'

import { ClaimMarker } from './ClaimMarker'

/**
 * The CV, with the evidence marked in it.
 *
 * This is the primary results surface, and the ordering is the argument: the
 * document the user wrote comes first, and the system's findings are annotations
 * *on* it. The previous design put eight tabs of generated content at equal
 * weight, which implied the rewrite and the cover letter were as well-founded as
 * the evidence — they are not, and conflating them overstates both.
 *
 * Only `verified` and `uncertain` claims appear here. An `unresolved` claim has
 * no span to attach to; it lives in the checklist, where "not found" can be
 * stated plainly instead of implied by an absence the reader has to notice.
 */
export function EvidenceDocument({
  cvText,
  claims,
  activeClaimId,
  onClaimSelect,
}: {
  cvText: string
  claims: PublicVerifiedClaim[]
  /** Shared with the checklist so both surfaces open the same claim. */
  activeClaimId: string | null
  onClaimSelect: (id: string | null) => void
}) {
  const segments = buildDocumentSegments(cvText, claims)
  const markedCount = segments.filter((segment) => segment.claim !== null).length

  return (
    <section data-testid="evidence-document" aria-labelledby="evidence-document-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2
          id="evidence-document-heading"
          className="font-mono text-xs uppercase tracking-[0.16em] text-text-muted"
        >
          Your CV, with evidence marked
        </h2>

        <p className="font-mono text-xs text-text-muted">
          {markedCount === 1 ? '1 passage marked' : `${markedCount} passages marked`}
        </p>
      </div>

      {markedCount === 0 ? (
        <EmptyState
          className="mt-4"
          icon={FileText}
          title="No passages could be marked in your CV"
          // Honest about which of the two reasons applies being unknowable here,
          // rather than picking one and sounding certain.
          description="Either no requirement was matched to specific text, or the quoted text could not be located in the document exactly. The requirement list beside this shows what was checked."
        />
      ) : (
        // `whitespace-pre-wrap`: the CV's own line breaks carry its structure, and
        // collapsing them would reformat the very document under examination.
        <div className="mt-4 whitespace-pre-wrap break-words font-mono text-sm leading-loose text-text-secondary">
          {segments.map((segment, index) =>
            segment.claim === null ? (
              <span key={index}>{segment.text}</span>
            ) : (
              <ClaimMarker
                key={segment.claim.id}
                claim={segment.claim}
                text={segment.text}
                expanded={activeClaimId === segment.claim.id}
                onToggle={() =>
                  onClaimSelect(activeClaimId === segment.claim?.id ? null : (segment.claim?.id ?? null))
                }
              />
            )
          )}
        </div>
      )}
    </section>
  )
}
