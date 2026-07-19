import React from 'react'

import { CopyButton } from '@/components/shared/CopyButton'

interface CoverLetterTabProps {
  coverLetter: string
}

export function CoverLetterTab({ coverLetter }: CoverLetterTabProps) {
  return (
    <div data-testid="cover-tab" className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-text-muted">{coverLetter.split(/\s+/).filter(Boolean).length} words</div>
        <CopyButton textToCopy={coverLetter} />
      </div>
      <pre className="whitespace-pre-wrap rounded-lg border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-4 text-sm text-text-primary">{coverLetter}</pre>
    </div>
  )
}
