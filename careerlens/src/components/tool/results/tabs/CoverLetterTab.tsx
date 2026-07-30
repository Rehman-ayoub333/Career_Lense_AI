import { FileText } from 'lucide-react'

import { CopyButton } from '@/components/ui/CopyButton'
import { EmptyState } from '@/components/ui/Feedback'

export function CoverLetterTab({ coverLetter }: { coverLetter: string | null }) {
  // `null` when the cover-letter generation failed while the analysis itself
  // succeeded — the two run independently so one can outlive the other.
  if (!coverLetter) {
    return (
      <div data-testid="cover-tab">
        <EmptyState
          icon={FileText}
          title="No cover letter was generated"
          description="The analysis succeeded but the cover letter step did not. Start a new analysis to try again."
        />
      </div>
    )
  }

  const wordCount = coverLetter.split(/\s+/).filter(Boolean).length

  return (
    <div data-testid="cover-tab" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-text-secondary">
          <span className="tabular">{wordCount}</span> words
        </span>
        <CopyButton text={coverLetter} label="Copy letter" />
      </div>

      <div className="whitespace-pre-wrap rounded-[var(--radius-md)] border border-border bg-surface-raised p-4 text-sm text-text-primary">
        {coverLetter}
      </div>
    </div>
  )
}
