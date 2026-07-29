import { DollarSign } from 'lucide-react'
import React from 'react'

import { EmptyState } from '@/components/shared/EmptyState'
import type { AnalysisMode, AnalysisResult } from '@/types'

interface SalaryTabProps {
  result: AnalysisResult
  mode: AnalysisMode
}

export function SalaryTab({ result, mode }: SalaryTabProps) {
  if (mode === 'scholarship') {
    return (
      <div data-testid="salary-tab">
        <EmptyState
          icon={DollarSign}
          title="Salary estimation is not applicable for scholarship applications."
          subtitle="Switch to Job Description mode to see salary estimates for a specific role."
        />
      </div>
    )
  }

  return (
    <div data-testid="salary-tab" className="space-y-3">
      <div className="text-3xl font-bold text-[hsl(var(--amber))]">{result.salary_range}</div>
      <p className="text-sm text-text-muted">Based on JD requirements and your experience level</p>
      <div className="rounded-[var(--radius)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-4 text-sm text-text-primary">
        {result.salary_context}
      </div>
    </div>
  )
}
