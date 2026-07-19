import React from 'react'

import { Tag } from '@/components/shared/Tag'
import type { AnalysisResult } from '@/types'

interface KeywordsTabProps {
  result: AnalysisResult
}

export function KeywordsTab({ result }: KeywordsTabProps) {
  return (
    <div data-testid="keywords-tab" className="space-y-4">
      <div>
        <div className="mb-2 text-sm font-semibold text-text-primary">Keywords Found in Your CV</div>
        <div className="flex flex-wrap gap-2">
          {result.keywords_present.map((keyword) => (
            <Tag key={keyword} label={keyword} variant="match" />
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 text-sm font-semibold text-text-primary">High-Value Keywords Missing</div>
        <div className="flex flex-wrap gap-2">
          {result.keywords_missing.map((keyword) => (
            <Tag key={keyword} label={keyword} variant="missing" />
          ))}
        </div>
        <p className="mt-3 text-xs text-text-muted">Add these naturally to your CV bullets to improve ATS alignment.</p>
      </div>
    </div>
  )
}
