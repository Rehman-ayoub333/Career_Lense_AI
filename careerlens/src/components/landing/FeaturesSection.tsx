'use client'

import { motion, useReducedMotion } from 'framer-motion'
import {
  FileText,
  KeyRound,
  ListChecks,
  MessageSquare,
  PenLine,
  Route,
  ScanLine,
  type LucideIcon,
} from 'lucide-react'

import { MOTION } from '@/config/design-tokens'
import { cn } from '@/lib/cn'

import { Section, SectionHeading, SectionLede } from './Section'

/**
 * What the analysis produces.
 *
 * Deliberately not three equal cards in a row, which is the most recognisable
 * template layout in software and which forces every capability to claim the
 * same weight. The grid here is asymmetric: the compatibility check is the
 * thing most readers do not know they need, so it is given the space, and the
 * remainder are set as a plain ruled index.
 */

interface Capability {
  icon: LucideIcon
  title: string
  detail: string
}

const PRINCIPAL: Capability = {
  icon: ScanLine,
  title: 'Applicant tracking check',
  detail:
    'The formatting properties that decide whether your CV is machine-readable at all: columns, tables, headers, embedded images, and the section names screening software looks for. Most rejections happen here, before any human judgement is applied.',
}

const SECONDARY: readonly Capability[] = [
  {
    icon: ListChecks,
    title: 'Requirement match',
    detail: 'Each stated requirement marked against the passage that answers it, or left empty.',
  },
  {
    icon: PenLine,
    title: 'Rewrite',
    detail:
      'Passages restated more plainly. Nothing is added — the rewrite never invents experience you do not have.',
  },
  {
    icon: KeyRound,
    title: 'Keywords',
    detail: 'The terms the description uses, and which of them your CV uses back.',
  },
  {
    icon: FileText,
    title: 'Covering letter',
    detail: 'A first draft, derived from your own material and the requirement.',
  },
  {
    icon: MessageSquare,
    title: 'Interview questions',
    detail: 'The questions your gaps invite, so they are not asked cold.',
  },
  {
    icon: Route,
    title: 'Learning path',
    detail: 'For requirements you cannot evidence yet, what closing them would take.',
  },
]

export function FeaturesSection() {
  const reduce = useReducedMotion()

  const rise = (index: number) => ({
    initial: reduce ? false : { opacity: 0, y: 12 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-60px' },
    transition: {
      duration: MOTION.duration.slow,
      delay: Math.min(index, 4) * MOTION.stagger,
      ease: MOTION.easeOut,
    },
  })

  return (
    <Section id="what-you-get" label="The analysis" folio="04">
      <SectionHeading>One paste. Nine examinations.</SectionHeading>
      <SectionLede>
        Every examination reports against your own document. None of them scores you in the
        abstract, and none of them compares you to another applicant.
      </SectionLede>

      <motion.div
        {...rise(0)}
        className="mt-16 rounded-[var(--radius-lg)] border border-border bg-surface/50 p-6 sm:p-8 lg:p-12"
      >
        <PRINCIPAL.icon
          className="h-8 w-8 text-blue-text"
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <h3 className="mt-6 text-xl font-semibold text-text-primary sm:text-2xl">
          {PRINCIPAL.title}
        </h3>
        <p className="mt-4 max-w-[58ch] text-base text-text-secondary">{PRINCIPAL.detail}</p>
      </motion.div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECONDARY.map((capability, index) => (
          <motion.article
            key={capability.title}
            {...rise(index + 1)}
            className={cn(
              'rounded-[var(--radius-lg)] border border-border bg-surface/30 p-6',
              'transition-colors duration-200 ease-out hover:border-border-strong'
            )}
          >
            <capability.icon
              className="h-5 w-5 text-text-muted"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <h3 className="mt-4 text-base font-semibold text-text-primary">{capability.title}</h3>
            <p className="mt-2 text-sm text-text-secondary">{capability.detail}</p>
          </motion.article>
        ))}
      </div>
    </Section>
  )
}
