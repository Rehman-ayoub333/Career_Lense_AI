'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

import { buttonClasses } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { MOTION } from '@/config/design-tokens'

/**
 * The closing.
 *
 * The page previously ended at a feature list with no route forward: a visitor
 * who read everything and was convinced had nothing to click. This is that
 * route, and it is the only call to action on the page besides the hero's.
 *
 * Deliberately the emptiest surface in the document. One sentence, one control,
 * one line of terms. Registration marks at the corners close the composition the
 * hero opened.
 */

function Mark({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      className={`absolute h-3.5 w-3.5 text-[hsl(var(--text-muted)/0.55)] ${className}`}
    >
      <circle cx="6" cy="6" r="3.25" stroke="currentColor" strokeWidth="0.75" />
      <path
        d="M6 0v2.25M6 9.75V12M0 6h2.25M9.75 6H12"
        stroke="currentColor"
        strokeWidth="0.75"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function ClosingSection() {
  const reduce = useReducedMotion()

  return (
    <section id="start" className="py-24 lg:py-32">
      <Container>
        <div className="h-px w-full bg-[hsl(var(--border)/0.7)]" aria-hidden="true" />

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: MOTION.duration.slow, ease: MOTION.easeOut }}
          className="relative mt-20 px-6 py-16 lg:mt-24 lg:px-12 lg:py-24"
        >
          <Mark className="left-0 top-0" />
          <Mark className="right-0 top-0" />
          <Mark className="bottom-0 left-0" />
          <Mark className="bottom-0 right-0" />

          <h2 className="max-w-3xl text-balance text-3xl font-semibold text-text-primary sm:text-4xl lg:text-5xl">
            Find out what the software sees.
          </h2>

          <div className="mt-12">
            <Link href="/analyze" className={buttonClasses({ size: 'lg', className: 'group' })}>
              Analyse my CV
              <ArrowRight
                className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none"
                strokeWidth={2}
                aria-hidden="true"
              />
            </Link>
          </div>

          <p className="mt-6 text-sm text-text-secondary">
            Free forever · No account · Your CV is never stored
          </p>
        </motion.div>
      </Container>
    </section>
  )
}
