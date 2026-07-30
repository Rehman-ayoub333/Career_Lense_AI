'use client'

import { motion } from 'framer-motion'
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
        <motion.div
          key={question.question}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: index * 0.08, ease: 'easeOut' }}
          className="rounded-[var(--radius)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-4 transition-colors hover:bg-[hsl(var(--card-hover))]"
        >
          <div className="mb-3 flex items-center gap-2">
            <Badge label={`Q${index + 1}`} variant="info" />
            <div className="text-sm text-text-muted">{question.skill_tested}</div>
          </div>
          <div className="text-sm font-medium text-text-primary">{question.question}</div>
          <div className="mt-2 text-xs text-text-muted">Tip: {question.tip}</div>
        </motion.div>
      ))}
    </div>
  )
}
