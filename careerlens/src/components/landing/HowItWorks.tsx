'use client'

import { motion, useReducedMotion } from 'framer-motion'

import { MOTION } from '@/config/design-tokens'

import { Section, SectionHeading, SectionLede } from './Section'

/**
 * The mechanism.
 *
 * Three steps, set as a numbered sequence joined by a hairline rather than as
 * three cards in a row. Cards imply three independent things; a rule implies one
 * process with three moments, which is what this is.
 *
 * The copy states what happens, not what the visitor will feel about it. There
 * is no "in seconds", no "effortless", and no "magic" — the value here is
 * attention, not speed, and claiming speed undersells the only thing the product
 * has that a human reviewer does not: it reads every requirement, every time.
 */

interface Step {
  ordinal: string
  title: string
  detail: string
}

const STEPS: readonly Step[] = [
  {
    ordinal: '01',
    title: 'Paste both documents',
    detail:
      'Your CV, and the job description or scholarship criteria you are applying against. No account, no upload required — plain text is enough.',
  },
  {
    ordinal: '02',
    title: 'The analysis runs',
    detail:
      'Every requirement stated in the description is checked against every passage of your CV, along with the formatting properties an applicant tracking system reads.',
  },
  {
    ordinal: '03',
    title: 'You see what is evidenced',
    detail:
      'Each requirement is marked as answered or not answered, against the exact passage that answers it. Nothing is scored in the abstract.',
  },
]

export function HowItWorks() {
  const reduce = useReducedMotion()

  return (
    <Section id="how-it-works" label="The method" folio="02">
      <SectionHeading>Two documents, compared line by line.</SectionHeading>
      <SectionLede>
        The product does one thing. It reads what an opportunity asks for, reads what your CV
        states, and reports where the two do not meet.
      </SectionLede>

      <ol className="mt-16 border-t border-border">
        {STEPS.map((step, index) => (
          <motion.li
            key={step.ordinal}
            initial={reduce ? false : { opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{
              duration: MOTION.duration.slow,
              delay: index * MOTION.stagger,
              ease: MOTION.easeOut,
            }}
            className="grid gap-4 border-b border-border py-8 lg:grid-cols-[4rem_1fr_1.4fr] lg:gap-8"
          >
            <span className="tabular font-mono text-sm text-text-muted">{step.ordinal}</span>
            <h3 className="text-lg font-semibold text-text-primary">{step.title}</h3>
            <p className="max-w-[52ch] text-sm text-text-secondary">{step.detail}</p>
          </motion.li>
        ))}
      </ol>
    </Section>
  )
}
