'use client'

import { motion, useReducedMotion } from 'framer-motion'

import { MOTION } from '@/config/design-tokens'
import { cn } from '@/lib/cn'

import {
  REGISTRATION_COUNTS,
  REGISTRATION_GROUPS,
  REGISTRATION_OFFSET,
  REGISTRATION_TIMING as T,
  type RegistrationLine,
} from './registration'

/**
 * The hero artwork. See `registration.ts` for the idea and the choreography.
 *
 * Composed entirely from DOM and one small inline SVG: no image, no canvas, no
 * 3D, no additional dependency. Every animated property is `opacity` or
 * `transform`, so the whole sequence stays on the compositor — an earlier
 * concept animated `filter: blur()`, which is not compositor-cheap and drops
 * frames on mid-range laptops, exactly the hardware this audience uses.
 *
 * `will-change` is deliberately absent. The sequence runs once, and hinting it
 * would keep several layers promoted to their own textures for the lifetime of
 * the page in exchange for a few milliseconds on first paint.
 *
 * The whole composition is `aria-hidden`. Its figures are illustrative, and a
 * screen reader announcing "8 matched, 3 gaps" on the landing page would be
 * describing an analysis the visitor has not run. The hero's prose carries the
 * meaning instead.
 */

/** Heading rules are structure; requirement rules are lighter and thinner. */
function ruleShape(line: RegistrationLine): string {
  return cn('rounded-full', line.heading ? 'h-2' : 'h-1.5')
}

/**
 * A print registration mark: ringed crosshair, the symbol a press operator lines
 * up to. Hand-drawn rather than taken from Lucide, which has no equivalent — and
 * this is artwork rather than an icon, so the icon size and stroke scale in
 * CLAUDE.md do not apply to it.
 *
 * Stroked with `--border-strong`, not a dimmed text token. It is `aria-hidden`
 * decoration, so WCAG 1.4.11 exempts it from the 3:1 rule and no contrast fix
 * was owed here — but "a quiet non-text rule" is exactly what the border family
 * is for, and reaching into the text ramp for it is what produced the
 * alpha-composited mess Phase 10b cleaned up. Right family, real token, no alpha.
 */
function RegistrationMark({ className, delay }: { className: string; delay: number }) {
  const reduce = useReducedMotion()

  return (
    <motion.svg
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      className={cn('absolute h-3.5 w-3.5 text-border-strong', className)}
      initial={reduce ? false : { opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: MOTION.duration.slow, delay, ease: MOTION.easeOut }}
    >
      <circle cx="6" cy="6" r="3.25" stroke="currentColor" strokeWidth="0.75" />
      <path
        d="M6 0v2.25M6 9.75V12M0 6h2.25M9.75 6H12"
        stroke="currentColor"
        strokeWidth="0.75"
        strokeLinecap="round"
      />
    </motion.svg>
  )
}

/**
 * One of the two out-of-register copies.
 *
 * Both render the document complete — before the layers are compared there is no
 * way to know what is missing, so the gaps must not be visible yet. They appear
 * only once registration has happened, which is the point of the whole piece.
 */
function OffsetLayer({
  tone,
  offset,
}: {
  tone: string
  offset: { x: number; y: number }
}) {
  const reduce = useReducedMotion()

  return (
    <motion.div
      aria-hidden="true"
      className="absolute inset-0 flex flex-col gap-6"
      initial={reduce ? false : { x: offset.x, y: offset.y, opacity: 1 }}
      // Converging and dissolving are one gesture: the copies do not slide into
      // place and then vanish, they resolve *by* coming together.
      animate={{ x: 0, y: 0, opacity: 0 }}
      transition={{ duration: T.convergeDuration, delay: T.converge, ease: MOTION.easeOut }}
    >
      {REGISTRATION_GROUPS.map((group, groupIndex) => (
        <div key={groupIndex} className="flex flex-col gap-2">
          {group.map((line, lineIndex) => (
            <div
              key={lineIndex}
              className={cn(ruleShape(line), tone)}
              style={{ width: `${line.width}%` }}
            />
          ))}
        </div>
      ))}
    </motion.div>
  )
}

/** The registered result: clean strokes, and hollows where nothing matched. */
function ResolvedLayer() {
  const reduce = useReducedMotion()

  return (
    <div className="relative flex flex-col gap-6">
      {REGISTRATION_GROUPS.map((group, groupIndex) => (
        <div key={groupIndex} className="flex flex-col gap-2">
          {group.map((line, lineIndex) => {
            const isGap = line.gapIndex !== null

            return (
              <motion.div
                key={lineIndex}
                className={cn(
                  ruleShape(line),
                  isGap
                    ? 'border border-[hsl(var(--amber)/0.7)] bg-[hsl(var(--amber)/0.09)]'
                    : line.heading
                      ? 'bg-[hsl(var(--text-primary)/0.85)]'
                      : 'bg-[hsl(var(--text-primary)/0.6)]'
                )}
                style={{ width: `${line.width}%` }}
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{
                  duration: T.resolveDuration,
                  // Matched rules land together as the layers meet. Gaps arrive
                  // afterwards, one at a time, so the reading is "all of this
                  // aligned — except these".
                  delay: isGap ? T.gaps + (line.gapIndex ?? 0) * T.gapStagger : T.resolve,
                  ease: MOTION.easeOut,
                }}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}

export function RegistrationField({ className }: { className?: string }) {
  const reduce = useReducedMotion()

  return (
    <div
      aria-hidden="true"
      className={cn('relative w-full max-w-[26rem] select-none p-6', className)}
    >
      <RegistrationMark className="left-0 top-0" delay={T.marks} />
      <RegistrationMark className="right-0 top-0" delay={T.marks + MOTION.stagger} />
      <RegistrationMark className="bottom-0 left-0" delay={T.marks + MOTION.stagger * 2} />
      <RegistrationMark className="bottom-0 right-0" delay={T.marks + MOTION.stagger * 3} />

      {/* The resolved layer sits in flow and establishes the height; the two
          offset copies are absolutely positioned over it. Identical content
          means identical intrinsic height, so nothing can shift. */}
      <div className="relative">
        <ResolvedLayer />
        <OffsetLayer tone="bg-[hsl(var(--blue)/0.4)]" offset={REGISTRATION_OFFSET.cool} />
        <OffsetLayer tone="bg-[hsl(var(--amber)/0.32)]" offset={REGISTRATION_OFFSET.warm} />
      </div>

      <motion.p
        className="tabular mt-6 font-mono text-xs text-text-muted"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: MOTION.duration.slow, delay: T.caption, ease: MOTION.easeOut }}
      >
        {REGISTRATION_COUNTS.requirements} requirements
        <span aria-hidden="true" className="mx-2 text-[hsl(var(--text-muted)/0.4)]">/</span>
        {REGISTRATION_COUNTS.matched} matched
        <span aria-hidden="true" className="mx-2 text-[hsl(var(--text-muted)/0.4)]">/</span>
        <span className="text-amber-text">{REGISTRATION_COUNTS.gaps} gaps</span>
      </motion.p>
    </div>
  )
}
