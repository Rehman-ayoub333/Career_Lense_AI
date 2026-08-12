'use client'

import { motion, useReducedMotion } from 'framer-motion'

import { MOTION } from '@/config/design-tokens'
import { cn } from '@/lib/cn'

/**
 * The match score, rendered as an assay hallmark.
 *
 * A hallmark is the struck certification an assay office applies to silver. It
 * has worked for six hundred years because it is small, permanent, and
 * unarguable, and it is the correct construction for this figure — which is a
 * judgement passed on a document, not a performance metric.
 *
 * This replaces the ring gauge, the radial arc, and the animated counter, each
 * of which frames a score as a leaderboard position. The consequences of that
 * framing are not abstract: this number is shown to people who have already been
 * rejected repeatedly, and a dial that sweeps up to a low figure is a slot
 * machine landing on a loss.
 *
 * Accordingly:
 *  - the numeral arrives at full value in one strike and never counts up;
 *  - the band is carried by a **word**, never by a colour, so a low score is not
 *    rendered in red and a high one is not rendered in green;
 *  - the construction is identical at every band. Only the figure, the word, and
 *    the depth of the strike change.
 */

export type Band = 'WEAK' | 'PARTIAL' | 'GOOD' | 'STRONG'

/** Fixed and published, so the band is reconstructible from the score. */
export const BAND_RANGES: readonly { band: Band; min: number; max: number }[] = [
  { band: 'WEAK', min: 0, max: 40 },
  { band: 'PARTIAL', min: 41, max: 65 },
  { band: 'GOOD', min: 66, max: 80 },
  { band: 'STRONG', min: 81, max: 100 },
]

export function bandForScore(score: number): Band {
  const match = BAND_RANGES.find((range) => score >= range.min && score <= range.max)
  // The ranges are exhaustive over 0–100; the fallback exists only to satisfy
  // the type, and a score outside that interval is a defect upstream.
  return match?.band ?? 'WEAK'
}

/**
 * Depth of strike, one step per band.
 *
 * Purely material: it carries nothing to assistive technology, and a reader who
 * cannot perceive it loses no information because the band word states it.
 */
const DEPTH: Record<Band, string> = {
  WEAK: 'inset 0 1px 2px hsl(222 60% 2% / 0.5)',
  PARTIAL: 'inset 0 2px 4px hsl(222 60% 2% / 0.55)',
  GOOD: 'inset 0 3px 6px hsl(222 60% 2% / 0.6)',
  STRONG: 'inset 0 4px 9px hsl(222 60% 2% / 0.68)',
}

interface HallmarkProps {
  score: number
  /** What was examined. A band without its reference asserts nothing. */
  reference: string
  /** Reduced register for registers, tables and history lists. */
  compact?: boolean
  className?: string
}

export function Hallmark({ score, reference, compact = false, className }: HallmarkProps) {
  const reduce = useReducedMotion()
  const band = bandForScore(score)

  return (
    <div className={cn('inline-block', className)}>
      <motion.div
        initial={reduce ? false : { opacity: 0, y: -6 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: MOTION.duration.base, ease: MOTION.easeOut }}
        style={{ boxShadow: DEPTH[band] }}
        className={cn(
          'flex items-center justify-center rounded-[var(--radius-md)] bg-[hsl(var(--bg)/0.6)]',
          compact ? 'h-16 w-20' : 'h-24 w-32'
        )}
      >
        <span
          className={cn(
            'tabular font-semibold leading-none text-text-primary',
            compact ? 'text-3xl' : 'text-5xl'
          )}
        >
          {score}
        </span>
      </motion.div>

      <div
        className={cn(
          'mt-3 flex items-baseline justify-between gap-4 font-mono uppercase tracking-[0.16em]',
          compact ? 'text-[0.6875rem]' : 'text-xs'
        )}
      >
        <span className="text-text-muted">Match</span>
        <span className="text-text-primary">{band}</span>
      </div>

      {compact ? null : (
        <p className="mt-3 max-w-[18rem] font-mono text-xs leading-relaxed text-[hsl(var(--text-muted)/0.75)]">
          {reference}
        </p>
      )}
    </div>
  )
}
