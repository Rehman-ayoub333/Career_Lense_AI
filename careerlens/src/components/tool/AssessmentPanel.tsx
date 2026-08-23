'use client'

import { Download } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Hallmark } from '@/components/ui/Hallmark'
import { buildReport, downloadTextFile, reportFilename } from '@/lib/export'
import { analysisReference } from '@/lib/format'
import type { AnalysisSession } from '@/types'

import { ATSChecklist } from './results/evidence/ATSChecklist'
import { CompensationSummary } from './results/evidence/CompensationSummary'
import { CoverageSummary } from './results/evidence/CoverageSummary'
import { RequirementChecklist } from './results/evidence/RequirementChecklist'
import { Summary } from './results/ScorePanel/KeyActions'
import { ShareCard } from './results/ScorePanel/ShareCard'

/**
 * The apparatus field.
 *
 * Replaces `ScorePanel` in the same slot, keeping its sticky behaviour, its
 * three-action footer and the share card. What changed is what sits between the
 * hallmark and the actions: the score is now followed immediately by the count
 * that accounts for it, and then by every requirement that was checked.
 *
 * The order is the argument. The hallmark states an interpretive judgement; the
 * coverage tally states a literal count the reader can verify against the list
 * below it; the checklist states what was actually looked for. Each step is more
 * checkable than the one above, so the least defensible number is never left as
 * the only thing on the page.
 */
export function AssessmentPanel({
  session,
  onNewAnalysis,
  activeClaimId,
  onClaimSelect,
}: {
  session: AnalysisSession
  onNewAnalysis: () => void
  activeClaimId: string | null
  onClaimSelect: (id: string | null) => void
}) {
  const { result, mode, jobTitle, date } = session

  return (
    <aside data-testid="assessment-panel" className="lg:sticky lg:top-20 lg:self-start">
      <Hallmark score={result.score} reference={analysisReference(mode, date)} />

      <div className="mt-12 border-t border-border pt-6">
        <h2 className="font-mono text-xs uppercase tracking-[0.16em] text-text-muted">Coverage</h2>
        <div className="mt-4">
          <CoverageSummary coverage={result.coverage} />
        </div>
      </div>

      <div className="mt-12 border-t border-border pt-6">
        <h2 className="font-mono text-xs uppercase tracking-[0.16em] text-text-muted">
          Requirements
        </h2>
        <div className="mt-4">
          <RequirementChecklist
            claims={result.claims}
            activeClaimId={activeClaimId}
            onClaimSelect={onClaimSelect}
          />
        </div>
      </div>

      {/* Formatting and compensation sit below the requirements and above the
          actions (ADR-19). Both are assessment output rather than generated
          content, so they belong beside the coverage stats — not as a fifth
          entry in a Tools strip that is deliberately four tools wide. */}
      <div className="mt-12 border-t border-border pt-6">
        <h2 className="font-mono text-xs uppercase tracking-[0.16em] text-text-muted">
          Formatting
        </h2>
        <div className="mt-4">
          <ATSChecklist checks={result.ats_checks} />
        </div>
      </div>

      <div className="mt-12 border-t border-border pt-6">
        <h2 className="font-mono text-xs uppercase tracking-[0.16em] text-text-muted">
          Compensation
        </h2>
        <div className="mt-4">
          <CompensationSummary
            salary_range={result.salary_range}
            salary_context={result.salary_context}
          />
        </div>
      </div>

      <div className="mt-12 border-t border-border pt-6">
        <h2 className="font-mono text-xs uppercase tracking-[0.16em] text-text-muted">Findings</h2>
        <Summary items={result.key_actions} />
      </div>

      <div className="mt-12 grid gap-2 border-t border-border pt-6">
        <Button
          data-testid="new-analysis-button"
          variant="secondary"
          block
          onClick={onNewAnalysis}
        >
          New analysis
        </Button>

        <ShareCard session={session} />

        <Button
          data-testid="download-button"
          variant="ghost"
          block
          onClick={() => downloadTextFile(reportFilename(jobTitle), buildReport(session))}
        >
          <Download className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          Download report
        </Button>
      </div>
    </aside>
  )
}
