'use client'

import { motion, useReducedMotion } from 'framer-motion'
import Link from 'next/link'

import { MOTION } from '@/config/design-tokens'

import { Section } from './Section'

/**
 * The terms, stated plainly.
 *
 * Three positions, each a fact rather than a promise, and each checkable. The
 * data-handling statement names the processor — Anthropic's Claude API — because
 * a privacy claim that says "our AI provider" is not a claim at all. It named
 * Google's Gemini API until ADR-22; if the provider ever changes again, this
 * string, `/privacy` and `SECURITY_PRIVACY_SPEC.md` change in the same commit.
 *
 * No conditional constructions appear here. A product that says it *may* retain
 * something is a product that does.
 */

const POSITIONS: readonly { heading: string; body: string }[] = [
  {
    heading: 'Free, permanently',
    body: 'There is no paid tier, no trial, no credit limit, and no plan to introduce one. There is no funding behind this and nothing to sell you later.',
  },
  {
    heading: 'Nothing is stored',
    body: 'Your CV and the requirement are sent to Anthropic’s Claude API for the analysis and are not retained by this product afterwards. There is no database. Your history is kept in your own browser and clearing it removes it.',
  },
  {
    heading: 'The working is public',
    body: 'The source code, the prompts, and the design specification are all published. If a finding looks wrong, the method that produced it can be read.',
  },
]

export function MissionSection() {
  const reduce = useReducedMotion()

  return (
    <Section id="the-terms" label="The terms" folio="08">
      <div className="grid gap-12 lg:grid-cols-3 lg:gap-8">
        {POSITIONS.map((position, index) => (
          <motion.div
            key={position.heading}
            initial={reduce ? false : { opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{
              duration: MOTION.duration.slow,
              delay: index * MOTION.stagger,
              ease: MOTION.easeOut,
            }}
          >
            <h3 className="text-lg font-semibold text-text-primary">{position.heading}</h3>
            <p className="mt-4 max-w-[42ch] text-sm leading-relaxed text-text-secondary">
              {position.body}
            </p>
          </motion.div>
        ))}
      </div>

      <p className="mt-12 text-sm text-text-secondary">
        The full statement is on the{' '}
        <Link
          href="/privacy"
          className="text-text-primary underline decoration-[hsl(var(--border-strong))] underline-offset-4 transition-colors duration-200 hover:decoration-[hsl(var(--text-primary))]"
        >
          privacy page
        </Link>
        .
      </p>
    </Section>
  )
}
