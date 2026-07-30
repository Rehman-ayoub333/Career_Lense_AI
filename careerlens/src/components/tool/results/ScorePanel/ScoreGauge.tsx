'use client'

import { motion, useMotionValue, useMotionValueEvent, useSpring } from 'framer-motion'
import React, { useEffect, useId, useState } from 'react'

import { getScoreColor } from '@/utils/score-color'

interface ScoreGaugeProps {
  score: number
}

export function ScoreGauge({ score }: ScoreGaugeProps) {
  const filterId = useId()
  const normalized = Math.max(0, Math.min(100, score))
  const color = getScoreColor(score)
  const springValue = useSpring(0, { damping: 30, stiffness: 80 })
  const glowValue = useMotionValue(0)
  const [displayedScore, setDisplayedScore] = useState(0)

  useEffect(() => {
    springValue.set(normalized)
    glowValue.set(1)
  }, [springValue, glowValue, normalized])

  useMotionValueEvent(springValue, 'change', (latest) => {
    setDisplayedScore(Math.round(latest))
  })

  return (
    <div
      role="meter"
      aria-valuenow={score}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Match score"
      className="flex flex-col items-center"
    >
      <svg width="180" height="100" viewBox="0 0 180 100" className="overflow-visible">
        <defs>
          <filter id={filterId}>
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Background track */}
        <path
          d="M 12 82 A 78 78 0 0 1 168 82"
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="12"
          strokeLinecap="round"
        />
        {/* Animated score arc with glow */}
        <motion.path
          d="M 12 82 A 78 78 0 0 1 168 82"
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          filter={`url(#${filterId})`}
          initial={{ pathLength: 0, opacity: 0.5 }}
          animate={{ pathLength: normalized / 100, opacity: 1 }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>

      <motion.div
        data-testid="score-number"
        className="mt-[-42px] text-[72px] font-black leading-none"
        style={{ color, fontFamily: 'var(--font-geist)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-2px' }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
      >
        {displayedScore}
      </motion.div>
    </div>
  )
}
