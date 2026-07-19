import { Download, Share2 } from 'lucide-react'
import React from 'react'

import type { AnalysisSession } from '@/types'

import { BreakdownBars } from './BreakdownBars'
import { KeyActions } from './KeyActions'
import { ScoreGauge } from './ScoreGauge'

interface ScorePanelProps {
  session: AnalysisSession
  onNewAnalysis: () => void
}

export function ScorePanel({ session, onNewAnalysis }: ScorePanelProps) {
  const { result } = session

  return (
    <aside data-testid="score-panel" className="rounded-[var(--radius-lg)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-4 lg:sticky lg:top-20 lg:w-[300px]">
      <div className="space-y-4">
        <ScoreGauge score={result.score} />
        <div>
          <div data-testid="score-verdict" className="text-lg font-semibold text-text-primary">{result.verdict}</div>
          <p className="mt-1 text-sm text-text-muted">{result.verdict_note}</p>
        </div>

        <BreakdownBars
          skillsScore={result.skills_score}
          experienceScore={result.experience_score}
          educationScore={result.education_score}
        />

        <div>
          <div className="mb-2 text-sm font-semibold text-text-primary">Key actions</div>
          <KeyActions items={result.key_actions} />
        </div>

        <div className="grid gap-2">
          <button data-testid="new-analysis-button" type="button" onClick={onNewAnalysis} className="rounded-full border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] px-3 py-2 text-sm font-semibold text-text-primary">
            New Analysis
          </button>
          <button data-testid="share-button" type="button" className="inline-flex items-center justify-center gap-2 rounded-full border border-violet/40 bg-transparent px-3 py-2 text-sm font-semibold text-violet">
            <Share2 className="h-4 w-4" />
            Share Result
          </button>
          <button data-testid="download-button" type="button" className="inline-flex items-center justify-center gap-2 rounded-full border border-[hsl(var(--card-border))] bg-transparent px-3 py-2 text-sm font-semibold text-text-muted">
            <Download className="h-4 w-4" />
            Download CV
          </button>
        </div>
      </div>
    </aside>
  )
}
