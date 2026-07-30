'use client'

import { motion } from 'framer-motion'
import { MessagesSquare } from 'lucide-react'

import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/Feedback'
import { MOTION } from '@/config/design-tokens'
import type { AnalysisResult } from '@/types'

export function InterviewTab({ result }: { result: AnalysisResult }) {
  if (result.interview_questions.length === 0) {
    return (
      <div data-testid="interview-tab">
        <EmptyState
          icon={MessagesSquare}
          title="No interview questions generated"
          description="Re-run the analysis with a more detailed job description to get targeted questions."
        />
      </div>
    )
  }

  return (
    <div data-testid="interview-tab" className="space-y-3">
      <p className="text-sm text-text-secondary">
        Practice these to close the gap between your CV and the role requirements.
      </p>

      {result.interview_questions.map((question, index) => (
        <motion.article
          key={question.question}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: MOTION.duration.base,
            delay: index * MOTION.stagger,
            ease: MOTION.easeOut,
          }}
          className="rounded-[var(--radius-md)] border border-border bg-surface-raised p-4"
        >
          <div className="mb-3 flex items-center gap-2">
            <Badge variant="info">Q{index + 1}</Badge>
            <span className="text-sm text-text-secondary">{question.skill_tested}</span>
          </div>
          <p className="text-sm font-medium text-text-primary">{question.question}</p>
          <p className="mt-2 text-xs text-text-muted">Tip: {question.tip}</p>
        </motion.article>
      ))}
    </div>
  )
}
