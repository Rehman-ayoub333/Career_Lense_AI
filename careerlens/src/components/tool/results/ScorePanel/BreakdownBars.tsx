import { motion } from 'framer-motion'
import React from 'react'

import { ProgressBar } from '@/components/shared/ProgressBar'
import type { AnalysisMode, AnalysisResult } from '@/types'

interface BreakdownBarsProps {
  result: AnalysisResult
  mode: AnalysisMode
}

export function BreakdownBars({ result, mode }: BreakdownBarsProps) {
  const rows =
    mode === 'scholarship'
      ? [
          { label: 'Research', value: result.research_score ?? 0, color: 'hsl(var(--blue))', testId: 'breakdown-research' },
          { label: 'Leadership', value: result.leadership_score ?? 0, color: 'hsl(var(--violet))', testId: 'breakdown-leadership' },
          { label: 'Academic', value: result.academic_score ?? 0, color: 'hsl(var(--green))', testId: 'breakdown-academic' },
        ]
      : [
          { label: 'Skills', value: result.skills_score, color: 'hsl(var(--blue))', testId: 'breakdown-skills' },
          { label: 'Experience', value: result.experience_score, color: 'hsl(var(--amber))', testId: 'breakdown-experience' },
          { label: 'Education', value: result.education_score, color: 'hsl(var(--green))', testId: 'breakdown-education' },
        ]

  return (
    <div className="space-y-4" data-testid="breakdown-bars">
      {rows.map((row, index) => (
        <motion.div
          key={row.label}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.6 + index * 0.15, ease: 'easeOut' }}
          className="space-y-2"
        >
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>{row.label}</span>
            <span data-testid={row.testId}>{row.value}%</span>
          </div>
          <ProgressBar value={row.value} color={row.color} animated />
        </motion.div>
      ))}
    </div>
  )
}
