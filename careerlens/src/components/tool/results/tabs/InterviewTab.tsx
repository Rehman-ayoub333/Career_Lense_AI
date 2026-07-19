import React from 'react'

import { Badge } from '@/components/shared/Badge'
import type { AnalysisResult } from '@/types'

interface InterviewTabProps {
  result: AnalysisResult
}

export function InterviewTab({ result }: InterviewTabProps) {
  return (
    <div data-testid="interview-tab" className="space-y-3">
      <p className="text-sm text-text-muted">Practice these interview questions to close the gap between your CV and the role requirements.</p>
      {result.interview_questions.map((question, index) => (
        <div key={question.question} className="rounded-lg border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-4">
          <div className="mb-3 flex items-center gap-2">
            <Badge label={`Q${index + 1}`} variant="info" />
            <div className="text-sm text-text-muted">{question.skill_tested}</div>
          </div>
          <div className="text-sm font-medium text-text-primary">{question.question}</div>
          <div className="mt-2 text-xs text-text-muted">Tip: {question.tip}</div>
        </div>
      ))}
    </div>
  )
}
