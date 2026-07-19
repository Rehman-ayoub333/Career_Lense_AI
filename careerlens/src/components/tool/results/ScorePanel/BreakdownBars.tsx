import React from 'react'

import { ProgressBar } from '@/components/shared/ProgressBar'

interface BreakdownBarsProps {
  skillsScore: number
  experienceScore: number
  educationScore: number
}

export function BreakdownBars({ skillsScore, experienceScore, educationScore }: BreakdownBarsProps) {
  const rows = [
    { label: 'Skills', value: skillsScore, color: '#3B82F6', testId: 'breakdown-skills' },
    { label: 'Experience', value: experienceScore, color: '#F59E0B', testId: 'breakdown-experience' },
    { label: 'Education', value: educationScore, color: '#10B981', testId: 'breakdown-education' },
  ]

  return (
    <div className="space-y-4" data-testid="breakdown-bars">
      {rows.map((row, index) => (
        <div key={row.label} className="space-y-2" style={{ animationDelay: `${index * 200}ms` }}>
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>{row.label}</span>
            <span data-testid={row.testId}>{row.value}%</span>
          </div>
          <ProgressBar value={row.value} color={row.color} animated />
        </div>
      ))}
    </div>
  )
}
