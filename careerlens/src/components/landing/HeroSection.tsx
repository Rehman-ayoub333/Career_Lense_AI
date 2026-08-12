'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

import { RegistrationField } from '@/components/landing/hero/RegistrationField'
import { buttonClasses } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { MOTION } from '@/config/design-tokens'

/**
 * The landing hero.
 *
 * Three things were removed rather than restyled, because each was actively
 * working against the page:
 *
 *  - The gradient headline. Violet-to-blue clipped text is the single clearest
 *    signature of a generated marketing page, and it opted the largest type on
 *    the site out of the contrast system the rest of the palette is built
 *    around. Its job — making one phrase carry more weight than the others —
 *    now belongs to a typeface rather than to colour, which is both measurable
 *    and harder to mistake for a template.
 *  - The pill above the headline, which restated the trust line sitting ten rems
 *    below it and spent the most valuable space on the page on the third most
 *    important thing there was to say.
 *  - The secondary call to action, which split intent at the exact moment it
 *    peaked, in favour of a destination one screen further down.
 *
 * The remaining call to action is a real route rather than a fragment. `#analyze`
 * scrolled; `/analyze` navigates, which is what "start" should feel like, and
 * gives the tool an address that can be linked to directly.
 */

const TRUST = 'Free forever · No account · Your CV is never stored'

/** Entrance order, in stagger units. */
const STEP = { headline: 0, subhead: 1, action: 2, trust: 3, origin: 4 } as const

export function HeroSection() {
  const reduce = useReducedMotion()

  /**
   * A short rise, used only to establish reading order — headline, claim,
   * action. It is the one piece of motion on this screen that is not the
   * artwork, and it earns its place by sequencing the argument rather than by
   * decorating its arrival.
   */
  function rise(step: number) {
    return {
      initial: reduce ? false : { opacity: 0, y: 10 },
      animate: { opacity: 1, y: 0 },
      transition: {
        duration: MOTION.duration.slow,
        delay: step * MOTION.stagger,
        ease: MOTION.easeOut,
      },
    }
  }

  return (
    <Container
      as="section"
      data-testid="hero-section"
      className="flex min-h-[calc(100svh-4.5rem)] items-center py-20 lg:py-24"
    >
      <div className="grid w-full items-center gap-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
        <div className="max-w-2xl">
          <motion.h1
            {...rise(STEP.headline)}
            className="text-balance text-hero font-semibold text-text-primary"
          >
            Stop{' '}
            {/* The one editorial device on the page. Emphasis by typeface rather
                than by colour: it reads as a considered choice instead of an
                effect, and unlike gradient text it has a contrast ratio. */}
            <span className="font-display font-normal italic">guessing</span> why your CV gets
            rejected
          </motion.h1>

          <motion.p
            {...rise(STEP.subhead)}
            className="mt-8 max-w-md text-pretty text-base text-text-secondary sm:text-lg"
          >
            Three in four CVs are filtered out by software before a person ever reads them. See
            what that software sees — and exactly what to change.
          </motion.p>

          <motion.div {...rise(STEP.action)} className="mt-8">
            {/* `next/link` with `buttonClasses` rather than `LinkButton`, which
                renders a bare anchor: a route change through it would be a full
                document load instead of a client navigation, and would lose the
                prefetch that makes the tool feel instant. */}
            <Link href="/analyze" className={buttonClasses({ size: 'lg', className: 'group' })}>
              Analyse my CV
              <ArrowRight
                className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none"
                strokeWidth={2}
                aria-hidden="true"
              />
            </Link>
          </motion.div>

          {/* Promoted from `--text-muted` at 12px, where the most trust-critical
              sentence on the site was set smaller and dimmer than everything
              around it. This is a promise, not a disclaimer. */}
          <motion.p {...rise(STEP.trust)} className="mt-6 text-sm text-text-secondary">
            {TRUST}
          </motion.p>

          <motion.p {...rise(STEP.origin)} className="mt-12 text-xs text-text-muted">
            Built in Faisalabad, by someone applying to the same scholarships.
          </motion.p>
        </div>

        <div className="flex justify-start lg:justify-end">
          <RegistrationField />
        </div>
      </div>
    </Container>
  )
}
