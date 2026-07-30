'use client'

import { motion } from 'framer-motion'
import { DollarSign } from 'lucide-react'

import { EmptyState } from '@/components/ui/Feedback'
import { MOTION } from '@/config/design-tokens'
import type { AnalysisMode, AnalysisResult } from '@/types'

export function SalaryTab({ result, mode }: { result: AnalysisResult; mode: AnalysisMode }) {
  if (mode === 'scholarship') {
    return (
      <div data-testid="salary-tab">
        <EmptyState
          icon={DollarSign}
          title="Salary estimation does not apply to scholarships"
          description="Switch to Job Description mode to see salary estimates for a specific role."
        />
      </div>
    )
  }

  return (
    <div data-testid="salary-tab" className="space-y-3">
      <motion.p
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: MOTION.duration.base, ease: MOTION.easeOut }}
        className="tabular text-2xl font-bold text-amber-text"
      >
        {result.salary_range}
      </motion.p>
      <p className="text-sm text-text-secondary">
        Based on the description&apos;s requirements and your experience level
      </p>
      <div className="rounded-[var(--radius-md)] border border-border bg-surface-raised p-4 text-sm text-text-primary">
        {result.salary_context}
      </div>
    </div>
  )
}
