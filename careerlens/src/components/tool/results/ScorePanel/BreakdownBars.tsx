'use client'

import { motion } from 'framer-motion'

import { LabelledMeter } from '@/components/ui/Feedback'
import { MOTION } from '@/config/design-tokens'
import type { AnalysisMode, AnalysisResult } from '@/types'

interface Row {
  label: string
  value: number
  colorVar: string
  valueTestId: string
}

function rowsFor(result: AnalysisResult, mode: AnalysisMode): Row[] {
  if (mode === 'scholarship') {
    return [
      {
        label: 'Research',
        value: result.research_score ?? 0,
        colorVar: 'hsl(var(--blue))',
        valueTestId: 'breakdown-research',
      },
      {
        label: 'Leadership',
        value: result.leadership_score ?? 0,
        colorVar: 'hsl(var(--violet))',
        valueTestId: 'breakdown-leadership',
      },
      {
        label: 'Academic',
        value: result.academic_score ?? 0,
        colorVar: 'hsl(var(--green))',
        valueTestId: 'breakdown-academic',
      },
    ]
  }

  return [
    {
      label: 'Skills',
      value: result.skills_score,
      colorVar: 'hsl(var(--blue))',
      valueTestId: 'breakdown-skills',
    },
    {
      label: 'Experience',
      value: result.experience_score,
      colorVar: 'hsl(var(--amber))',
      valueTestId: 'breakdown-experience',
    },
    {
      label: 'Education',
      value: result.education_score,
      colorVar: 'hsl(var(--green))',
      valueTestId: 'breakdown-education',
    },
  ]
}

export function BreakdownBars({ result, mode }: { result: AnalysisResult; mode: AnalysisMode }) {
  return (
    <div className="space-y-4" data-testid="breakdown-bars">
      {rowsFor(result, mode).map((row, index) => (
        <motion.div
          key={row.label}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            duration: MOTION.duration.base,
            delay: index * MOTION.stagger,
            ease: MOTION.easeOut,
          }}
        >
          <LabelledMeter {...row} />
        </motion.div>
      ))}
    </div>
  )
}
