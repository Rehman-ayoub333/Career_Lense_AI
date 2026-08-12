'use client'

import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'

import { Container } from '@/components/ui/Container'
import { MOTION } from '@/config/design-tokens'
import { cn } from '@/lib/cn'

/**
 * The landing page's structural unit.
 *
 * Every section on the page is built from this so the vertical rhythm is one
 * decision rather than ten. It carries three things the page previously lacked:
 *
 *  - a **label**, set in mono at marginal size, which is the running head of the
 *    section and the thing that makes an unrelated screen recognisably ours;
 *  - a **folio**, the small reference at the foot, present on every section
 *    including the ones that carry almost nothing;
 *  - a **head rule**, a brass hairline that separates one idea from the next.
 *
 * The previous page had none of these, which is why it read as a continuous
 * scroll of stuff rather than as a document with chapters.
 */

interface SectionProps {
  /** Anchor target. Also the folio's reference. */
  id: string
  /** Mono, caps, marginal size. The section's running head. */
  label: string
  /** Two-digit folio, e.g. "02". */
  folio: string
  children: ReactNode
  /** Alternate ground, used to separate adjacent sections. */
  raised?: boolean
  /** Suppresses the head rule where a section opens a new movement. */
  bare?: boolean
  className?: string
}

export function Section({
  id,
  label,
  folio,
  children,
  raised = false,
  bare = false,
  className,
}: SectionProps) {
  const reduce = useReducedMotion()

  return (
    <section id={id} className={cn('relative', raised && 'bg-surface/40', className)}>
      {/* The head rule sits at the section boundary itself, with no padding
          above it. Placing it inside the section's own vertical padding — as it
          was — stacked the previous section's bottom padding, this section's top
          padding, and the rule's own offset into roughly 250px of dead space
          that read as a rendering fault rather than as breathing room. */}
      {bare ? null : (
        <Container>
          <div className="h-px w-full bg-[hsl(var(--border)/0.7)]" aria-hidden="true" />
        </Container>
      )}

      <Container className={cn('pb-20 lg:pb-24', bare ? 'pt-20 lg:pt-24' : 'pt-16 lg:pt-20')}>
        <motion.p
          initial={reduce ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: MOTION.duration.slow, ease: MOTION.easeOut }}
          className="font-mono text-xs uppercase tracking-[0.18em] text-text-muted"
        >
          {label}
        </motion.p>

        <div className="mt-8">{children}</div>

        {/* The folio. Small, quiet, and on every section — including the ones
            that carry almost nothing. It is the cheapest legibility signal in
            the system and the one most often left out. */}
        <p className="tabular mt-12 font-mono text-xs text-[hsl(var(--text-muted)/0.65)]">
          {folio} — {id.replace(/-/g, ' ')}
        </p>
      </Container>
    </section>
  )
}

/**
 * A section's governing sentence.
 *
 * One per section, never two. Sized below the hero so that the page has exactly
 * one display-tier string, per the type hierarchy.
 */
export function SectionHeading({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion()

  return (
    <motion.h2
      initial={reduce ? false : { opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: MOTION.duration.slow, ease: MOTION.easeOut }}
      className={cn(
        'max-w-2xl text-balance text-3xl font-semibold text-text-primary sm:text-4xl',
        className
      )}
    >
      {children}
    </motion.h2>
  )
}

/** Supporting prose. Never more than three sentences, never wider than 55ch. */
export function SectionLede({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion()

  return (
    <motion.p
      initial={reduce ? false : { opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{
        duration: MOTION.duration.slow,
        delay: MOTION.stagger,
        ease: MOTION.easeOut,
      }}
      className={cn('mt-6 max-w-[55ch] text-pretty text-base text-text-secondary', className)}
    >
      {children}
    </motion.p>
  )
}
