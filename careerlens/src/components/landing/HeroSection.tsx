'use client'

import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

import { LinkButton } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { MOTION } from '@/config/design-tokens'

const TRUST_POINTS = ['Free forever', 'No signup', 'Data never stored'] as const

/** Entrance order for the four stacked blocks, in stagger units. */
const DELAY = { badge: 0, headline: 1, subhead: 2, actions: 3, trust: 4 } as const

function rise(step: number) {
  return {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: MOTION.duration.slow,
      delay: step * MOTION.stagger,
      ease: MOTION.easeOut,
    },
  }
}

export function HeroSection() {
  return (
    <Container
      as="section"
      data-testid="hero-section"
      className="relative flex flex-col items-center overflow-hidden pb-16 pt-20 text-center lg:pb-24 lg:pt-32"
    >
      {/* Ambient brand wash behind the headline. Tokenised rather than the
          literal `hsl(262 83% 58% / 0.10)` it replaces. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 50% 0%, hsl(var(--violet) / 0.1), transparent 70%)',
        }}
      />

      <div className="relative max-w-4xl">
        <motion.div
          {...rise(DELAY.badge)}
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--violet)/0.35)] bg-[hsl(var(--violet)/0.12)] px-4 py-1.5 text-xs font-medium text-violet-text"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-green" aria-hidden="true" />
          Free forever &middot; No signup required
        </motion.div>

        <motion.h1
          {...rise(DELAY.headline)}
          className="text-4xl font-bold text-text-primary sm:text-5xl"
        >
          Stop guessing why your
          <br />
          {/* Mid-stop is `--violet-text`, the palette's bright violet, rather
              than the untracked literal `262 83% 68%` used before. */}
          <span className="bg-gradient-to-r from-violet via-violet-text to-blue bg-clip-text text-transparent">
            CV gets rejected
          </span>
        </motion.h1>

        <motion.p
          {...rise(DELAY.subhead)}
          className="mx-auto mt-6 max-w-xl text-base text-text-secondary sm:text-lg"
        >
          Paste your CV and any job description or scholarship criteria. Get your match score,
          skill gaps, and rewritten CV in seconds.
        </motion.p>

        <motion.div
          {...rise(DELAY.actions)}
          className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <LinkButton href="#analyze" size="lg" className="group">
            Analyze My CV
            <ArrowRight
              className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none"
              aria-hidden="true"
            />
          </LinkButton>
          <LinkButton href="#demo-preview" variant="secondary" size="lg">
            See How It Works
          </LinkButton>
        </motion.div>

        <motion.ul
          {...rise(DELAY.trust)}
          className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-text-muted"
        >
          {TRUST_POINTS.map((point) => (
            <li key={point} className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-green" aria-hidden="true" />
              {point}
            </li>
          ))}
        </motion.ul>
      </div>
    </Container>
  )
}
