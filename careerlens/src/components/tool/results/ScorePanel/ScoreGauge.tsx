'use client'

import { motion, useMotionValueEvent, useReducedMotion, useSpring } from 'framer-motion'
import { useEffect, useId, useState } from 'react'

import { CANVAS_TOKENS, MOTION } from '@/config/design-tokens'
import { getScoreColorVar, getScoreTextColorVar } from '@/lib/scoring'

/** Semicircular arc, 78px radius, drawn left to right across a 180×100 box. */
const ARC = 'M 12 82 A 78 78 0 0 1 168 82'

export function ScoreGauge({ score }: { score: number }) {
  const filterId = useId()
  const normalized = Math.max(0, Math.min(100, score))
  const reduceMotion = useReducedMotion()

  const arcColor = getScoreColorVar(normalized)
  const numeralColor = getScoreTextColorVar(normalized)

  // Drives the count-up. `softSpring` rather than a tween because the number and
  // the arc must arrive together without either being scheduled against a clock.
  const springValue = useSpring(0, MOTION.softSpring)
  const [animatedScore, setAnimatedScore] = useState(0)

  // Derived, not stored: with reduced motion there is nothing to count up to, so
  // the final value is read directly rather than written into state by an effect.
  const displayedScore = reduceMotion ? normalized : animatedScore

  useEffect(() => {
    if (!reduceMotion) springValue.set(normalized)
  }, [springValue, normalized, reduceMotion])

  // A motion value is an external store, so this callback is a subscription
  // rather than a synchronous setState inside the effect body.
  useMotionValueEvent(springValue, 'change', (latest) => {
    setAnimatedScore(Math.round(latest))
  })

  return (
    <div
      role="meter"
      aria-valuenow={normalized}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Match score"
      className="flex flex-col items-center"
    >
      <svg
        width="180"
        height="100"
        viewBox="0 0 180 100"
        className="overflow-visible"
        aria-hidden="true"
      >
        <defs>
          <filter id={filterId}>
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Track. `trackFill` is the tokenised form of the literal
            `rgba(255,255,255,0.06)` this replaces. */}
        <path
          d={ARC}
          fill="none"
          stroke={CANVAS_TOKENS.trackFill}
          strokeWidth="12"
          strokeLinecap="round"
        />

        <motion.path
          d={ARC}
          fill="none"
          stroke={arcColor}
          strokeWidth="12"
          strokeLinecap="round"
          filter={`url(#${filterId})`}
          initial={reduceMotion ? false : { pathLength: 0, opacity: 0.5 }}
          animate={{ pathLength: normalized / 100, opacity: 1 }}
          transition={reduceMotion ? { duration: 0 } : MOTION.softSpring}
        />
      </svg>

      <motion.div
        data-testid="score-number"
        // Pulled up into the arc's mouth. The gauge is a fixed-size graphic, so
        // the offset can be absolute without breaking at any viewport.
        className="tabular mt-[-42px] text-display font-bold"
        style={{ color: numeralColor }}
        initial={reduceMotion ? false : { opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { duration: MOTION.duration.slow, delay: 0.3, ease: MOTION.easeOut }
        }
      >
        {displayedScore}
      </motion.div>
    </div>
  )
}
