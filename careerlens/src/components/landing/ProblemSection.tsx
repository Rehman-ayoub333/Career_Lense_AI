'use client'

import { motion, useReducedMotion } from 'framer-motion'

import { MOTION } from '@/config/design-tokens'

import { Section, SectionHeading } from './Section'

/**
 * The stakes.
 *
 * The page previously went from the hero straight to a feature list, which asked
 * the visitor to want a solution before they had been shown a problem. This
 * section is the missing beat, and it is deliberately the least designed one on
 * the page: three figures, one sentence, and a source line.
 *
 * Every figure carries an attribution. An unsourced statistic on a landing page
 * is indistinguishable from an invented one, and this product's entire argument
 * is that claims should be checkable.
 */

interface Fact {
  figure: string
  unit: string
  statement: string
}

const FACTS: readonly Fact[] = [
  {
    figure: '75',
    unit: '%',
    statement: 'of CVs are rejected by software before a person opens them.',
  },
  {
    figure: '7',
    unit: 's',
    statement: 'is the average time a recruiter spends on a CV that reaches them.',
  },
  {
    figure: '250',
    unit: '',
    statement: 'applications arrive for a typical advertised role.',
  },
]

export function ProblemSection() {
  const reduce = useReducedMotion()

  return (
    <Section id="the-filter" label="The problem" folio="01" raised bare>
      <SectionHeading>
        You were not unqualified.
        <br />
        You were{' '}
        <span className="font-display font-normal italic text-amber-text">unread</span>.
      </SectionHeading>

      <div className="mt-16 grid gap-12 lg:grid-cols-3 lg:gap-8">
        {FACTS.map((fact, index) => (
          <motion.div
            key={fact.figure}
            initial={reduce ? false : { opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{
              duration: MOTION.duration.slow,
              delay: index * MOTION.stagger,
              ease: MOTION.easeOut,
            }}
          >
            <div className="flex items-baseline gap-1">
              <span className="tabular text-5xl font-semibold leading-none text-text-primary">
                {fact.figure}
              </span>
              <span className="text-2xl font-medium text-text-muted">{fact.unit}</span>
            </div>
            <div
              className="mt-6 h-px w-12 bg-[hsl(var(--amber)/0.5)]"
              aria-hidden="true"
            />
            <p className="mt-6 max-w-[32ch] text-sm text-text-secondary">{fact.statement}</p>
          </motion.div>
        ))}
      </div>

      <p className="mt-16 max-w-[55ch] font-mono text-xs leading-relaxed text-text-muted">
        Sources: Jobscan ATS research, 2024 · Ladders eye-tracking study, 2018 · Glassdoor
        recruiting benchmarks. Figures are industry estimates and are quoted, not measured by this
        product.
      </p>
    </Section>
  )
}
