'use client'

import { motion, useReducedMotion } from 'framer-motion'

import { MOTION } from '@/config/design-tokens'

import { Section, SectionHeading, SectionLede } from './Section'

/**
 * The wedge.
 *
 * This is the only capability in the product that no competitor offers, and on
 * the previous page it occupied one third of one row, styled identically to a
 * feature every competitor ships. It now has a section of its own and a
 * different tonal register — greener, quieter, more institutional — because it
 * addresses a different reader in a different situation.
 *
 * The programmes are named. Specificity is the entire proof here: anyone can
 * claim scholarship support, and only someone who has actually applied writes
 * the comparison in the second half correctly.
 */

const PROGRAMMES = [
  'DAAD',
  'Stipendium Hungaricum',
  'Chevening',
  'Erasmus Mundus',
  'Commonwealth',
  'Fulbright',
] as const

const DIFFERENCES: readonly { corporate: string; committee: string }[] = [
  {
    corporate: 'Years of experience in a named technology',
    committee: 'Evidence of academic standing and trajectory',
  },
  {
    corporate: 'Keyword density against the job description',
    committee: 'Alignment with the programme’s stated development goals',
  },
  {
    corporate: 'Immediate availability and location',
    committee: 'Demonstrated intent to return and contribute',
  },
  {
    corporate: 'Quantified commercial outcomes',
    committee: 'Leadership, service, and research contribution',
  },
]

export function ScholarshipSection() {
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
    <Section id="scholarships" label="Scholarship mode" folio="05" raised>
      <SectionHeading>
        A committee is not a{' '}
        <span className="font-display font-normal italic text-green-text">recruiter</span>.
      </SectionHeading>
      <SectionLede>
        Every CV tool on the market is built for corporate hiring in the United States. Paste
        scholarship criteria into one and it will look for years of experience in a technology
        stack. That is not what a committee reads for.
      </SectionLede>

      <motion.ul
        {...rise(1)}
        className="mt-12 flex flex-wrap gap-x-6 gap-y-3 font-mono text-xs uppercase tracking-[0.14em] text-text-secondary"
      >
        {PROGRAMMES.map((programme) => (
          <li key={programme} className="flex items-center gap-2">
            <span
              className="h-1 w-1 rounded-full bg-[hsl(var(--green)/0.8)]"
              aria-hidden="true"
            />
            {programme}
          </li>
        ))}
      </motion.ul>

      <div className="mt-16 border-t border-border">
        <div className="grid gap-4 py-4 font-mono text-xs uppercase tracking-[0.16em] text-text-muted sm:grid-cols-2 sm:gap-8">
          <p>A recruiter looks for</p>
          <p>A committee looks for</p>
        </div>

        {DIFFERENCES.map((row, index) => (
          <motion.div
            key={row.corporate}
            {...rise(index)}
            className="grid gap-2 border-t border-border py-6 sm:grid-cols-2 sm:gap-8"
          >
            <p className="text-sm text-text-muted">{row.corporate}</p>
            <p className="text-sm text-text-primary">{row.committee}</p>
          </motion.div>
        ))}
      </div>

      <p className="mt-12 max-w-[55ch] text-sm text-text-secondary">
        Scholarship mode changes what the analysis looks for. Paste the criteria from the programme
        page and the requirements are read as a committee states them, not as a hiring manager
        would.
      </p>
    </Section>
  )
}
