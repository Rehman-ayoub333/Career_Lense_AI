'use client'

import { motion, useMotionValue, useMotionValueEvent } from 'framer-motion'
import React, { useEffect, useState } from 'react'

import { getScoreColor } from '@/utils/score-color'

interface ScoreGaugeProps {
  score: number
}

export function ScoreGauge({ score }: ScoreGaugeProps) {
  const animatedScore = useMotionValue(0)
  const [displayedScore, setDisplayedScore] = useState(0)
  const color = getScoreColor(score)
  const normalized = Math.max(0, Math.min(100, score))

  useEffect(() => {
    animatedScore.set(normalized)
  }, [animatedScore, normalized])

  useMotionValueEvent(animatedScore, 'change', (latest) => {
    setDisplayedScore(Math.round(latest))
  })

  return (
    <div
      role="meter"
      aria-valuenow={score}
      aria-valuemin={0}
      aria-valuemax={100}
      className="flex flex-col items-center"
    >
      <svg width="180" height="90" viewBox="0 0 180 90" className="overflow-visible">
        <path
          d="M 12 78 A 78 78 0 0 1 168 78"
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <motion.path
          d="M 12 78 A 78 78 0 0 1 168 78"
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: normalized / 100 }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        />
      </svg>

      <div
        data-testid="score-number"
        className="mt-[-38px] text-[72px] leading-none"
        style={{ color, fontFamily: 'var(--font-geist)', fontVariantNumeric: 'tabular-nums' }}
      >
        {displayedScore}
      </div>
    </div>
  )
}
