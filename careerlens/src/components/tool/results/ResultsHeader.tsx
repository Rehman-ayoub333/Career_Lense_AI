import React from 'react'

interface ResultsHeaderProps {
  onNewAnalysis: () => void
}

export function ResultsHeader({ onNewAnalysis }: ResultsHeaderProps) {
  return (
    <div data-testid="results-header" className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="text-sm text-text-muted">Analysis complete</div>
      <div className="flex items-center gap-2">
        <button
          data-testid="new-analysis-button"
          type="button"
          onClick={onNewAnalysis}
          className="rounded-full border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] px-3 py-2 text-xs font-semibold text-text-primary"
        >
          New Analysis
        </button>
        <button data-testid="share-button" type="button" className="rounded-full border border-violet/40 bg-transparent px-3 py-2 text-xs font-semibold text-violet">
          Share Result
        </button>
        <button data-testid="download-button" type="button" className="rounded-full border border-[hsl(var(--card-border))] bg-transparent px-3 py-2 text-xs font-semibold text-text-muted">
          Download CV
        </button>
      </div>
    </div>
  )
}
