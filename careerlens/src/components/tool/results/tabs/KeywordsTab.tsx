import { Search } from 'lucide-react'

import { Tag } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/Feedback'
import type { AnalysisResult } from '@/types'

export function KeywordsTab({ result }: { result: AnalysisResult }) {
  const present = result.keywords_present
  const missing = result.keywords_missing

  if (present.length === 0 && missing.length === 0) {
    return (
      <div data-testid="keywords-tab">
        <EmptyState
          icon={Search}
          title="No keywords detected"
          description="Try adding more specific technical terms and skills to your CV."
        />
      </div>
    )
  }

  return (
    <div data-testid="keywords-tab" className="space-y-4">
      {present.length > 0 ? (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-text-primary">
            Keywords Found ({present.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {present.map((keyword) => (
              <Tag key={keyword} variant="match">
                {keyword}
              </Tag>
            ))}
          </div>
        </div>
      ) : null}

      {missing.length > 0 ? (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-text-primary">
            High-Value Keywords Missing ({missing.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {missing.map((keyword) => (
              <Tag key={keyword} variant="missing">
                {keyword}
              </Tag>
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
