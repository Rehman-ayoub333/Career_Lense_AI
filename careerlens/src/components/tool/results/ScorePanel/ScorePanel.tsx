'use client'

import { Download } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Card, Divider, SectionLabel } from '@/components/ui/Card'
import { buildReport, downloadTextFile, reportFilename } from '@/lib/export'
import type { AnalysisSession } from '@/types'

import { BreakdownBars } from './BreakdownBars'
import { KeyActions } from './KeyActions'
import { ScoreGauge } from './ScoreGauge'
import { ShareCard } from './ShareCard'

export function ScorePanel({
  session,
  onNewAnalysis,
}: {
  session: AnalysisSession
  onNewAnalysis: () => void
}) {
  const { result, mode, jobTitle } = session

  return (
    <Card
      as="aside"
      data-testid="score-panel"
      className="space-y-6 p-6 lg:sticky lg:top-20 lg:self-start"
    >
      <ScoreGauge score={result.score} />

      <div className="text-center">
        <div data-testid="score-verdict" className="text-lg font-semibold text-text-primary">
          {result.verdict}
        </div>
        <p className="mt-1 text-sm text-text-secondary">{result.verdict_note}</p>
      </div>

      <Divider />

      <BreakdownBars result={result} mode={mode} />

      <Divider />

      <div>
        <SectionLabel className="mb-3">Key Actions</SectionLabel>
        <KeyActions items={result.key_actions} />
      </div>

      <Divider />

      <div className="grid gap-2">
        <Button
          data-testid="new-analysis-button"
          variant="secondary"
          block
          onClick={onNewAnalysis}
        >
          New Analysis
        </Button>

        <ShareCard session={session} />

        <Button
          data-testid="download-button"
          variant="ghost"
          block
          onClick={() => downloadTextFile(reportFilename(jobTitle), buildReport(session))}
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Download Report
        </Button>
      </div>
    </Card>
  )
}
