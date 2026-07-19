import { motion } from 'framer-motion'
import React from 'react'

interface ProgressBarProps {
  value: number
  color: string
  animated?: boolean
}

export function ProgressBar({ value, color, animated = true }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value))

  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
      <motion.div
        data-testid="shared-progress-bar"
        initial={animated ? { width: 0 } : undefined}
        animate={{ width: `${clamped}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
      />
    </div>
  )
}
