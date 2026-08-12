'use client'

import { motion, useReducedMotion } from 'framer-motion'

import { MOTION } from '@/config/design-tokens'
import { AUTHOR } from '@/config/site'

import { Section } from './Section'

/**
 * The founder.
 *
 * This is the strongest asset the product has and it previously appeared as a
 * twelve-pixel byline in the footer. It is the only section on the page written
 * in the first person, and that is deliberate: everywhere else the apparatus
 * speaks about a document, and here a person speaks about why the apparatus
 * exists.
 *
 * Set at a proper reading measure, in the editorial face, with almost no motion.
 * Animation here would cheapen it.
 */

const CREDENTIALS = [
  'GC University Faisalabad',
  'Aspire Leaders Program, Cohort 2026',
  'PIAIC Certified Agentic AI Engineer',
] as const

export function FounderSection() {
  const reduce = useReducedMotion()

  return (
    <Section id="who-built-this" label="The maker" folio="07" raised>
      <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
        <motion.div
          initial={reduce ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: MOTION.duration.slow, ease: MOTION.easeOut }}
        >
          <p className="font-display text-2xl italic leading-tight text-text-primary sm:text-3xl">
            {AUTHOR.name}
          </p>
          <p className="mt-3 font-mono text-xs uppercase tracking-[0.16em] text-text-muted">
            Faisalabad, {AUTHOR.location}
          </p>

          <ul className="mt-8 space-y-2">
            {CREDENTIALS.map((credential) => (
              <li key={credential} className="text-sm text-text-secondary">
                {credential}
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          initial={reduce ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{
            duration: MOTION.duration.slow,
            delay: MOTION.stagger,
            ease: MOTION.easeOut,
          }}
          className="max-w-[62ch] space-y-6 text-base leading-relaxed text-text-secondary"
        >
          <p>
            I am a final-year computer science student in Faisalabad, applying for European
            master’s scholarships — DAAD, Stipendium Hungaricum, and the rest of the list every
            applicant here knows by heart.
          </p>
          <p>
            I tried every CV tool I could find. All of them were written for American corporate
            hiring. They looked for years of experience in a technology stack and told me my
            keyword density was low. None of them had any idea what a scholarship committee reads
            for, and none of them could tell me why my applications kept going quiet.
          </p>
          <p className="text-text-primary">
            So I built the tool I needed, and then I gave it away.
          </p>
          <p>
            It is free because the people who need it most are the people least able to pay forty
            dollars a month to find out why a machine rejected them. It stores nothing because I
            would not hand my own CV to a stranger’s database. And it will never invent experience
            you do not have, because you are the one who has to sign the document.
          </p>
        </motion.div>
      </div>
    </Section>
  )
}
