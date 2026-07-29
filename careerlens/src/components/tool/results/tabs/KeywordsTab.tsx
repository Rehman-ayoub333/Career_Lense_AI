import { Search } from 'lucide-react'
import React from 'react'

import { EmptyState } from '@/components/shared/EmptyState'
import { Tag } from '@/components/shared/Tag'
import type { AnalysisResult } from '@/types'

interface KeywordsTabProps {
  result: AnalysisResult
}

export function KeywordsTab({ result }: KeywordsTabProps) {
  const hasPresent = result.keywords_present.length > 0
  const hasMissing = result.keywords_missing.length > 0

  if (!hasPresent && !hasMissing) {
    return (
      <div data-testid="keywords-tab">
        <EmptyState
          icon={Search}
          title="No keywords detected"
          subtitle="Try adding more specific technical terms and skills to your CV."
        />
      </div>
    )
  }

  return (
    <div data-testid="keywords-tab" className="space-y-4">
      {hasPresent ? (
        <div>
          <div className="mb-2 text-sm font-semibold text-text-primary">
            Keywords Found ({result.keywords_present.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {result.keywords_present.map((keyword) => (
              <Tag key={keyword} label={keyword} variant="match" />
            ))}
          </div>
        </div>
      ) : null}

      {hasMissing ? (
        <div>
          <div className="mb-2 text-sm font-semibold text-text-primary">
            High-Value Keywords Missing ({result.keywords_missing.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {result.keywords_missing.map((keyword) => (
              <Tag key={keyword} label={keyword} variant="missing" />
            ))}
          </div>
          <p className="mt-3 text-xs text-text-muted">
            Add these naturally to your CV bullets to improve ATS alignment.
          </p>
        </div>
      ) : null}
    </div>
  )
}
