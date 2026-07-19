import React from 'react'

import type { AnalysisResult } from '@/types'

interface SalaryTabProps {
  result: AnalysisResult
}

export function SalaryTab({ result }: SalaryTabProps) {
  return (
    <div data-testid="salary-tab" className="space-y-3">
      <div className="text-3xl font-bold text-amber">{result.salary_range}</div>
      <p className="text-sm text-text-muted">Based on JD requirements and your experience level</p>
      <div className="rounded-lg border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-4 text-sm text-text-primary">
        {result.salary_context}
      </div>
    </div>
  )
}
