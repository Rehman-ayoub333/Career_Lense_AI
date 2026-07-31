'use client'

import { motion } from 'framer-motion'
import { PencilLine, ShieldCheck, Sparkles, type LucideIcon } from 'lucide-react'

import { Card } from '@/components/ui/Card'
import { Container } from '@/components/ui/Container'
import { MOTION } from '@/config/design-tokens'

interface Feature {
  icon: LucideIcon
  title: string
  description: string
}

const FEATURES: readonly Feature[] = [
  {
    icon: Sparkles,
    title: 'Scholarship Mode',
    description:
      'The only tool that evaluates your CV against DAAD, Stipendium Hungaricum, and Chevening criteria.',
  },
  {
    icon: ShieldCheck,
    title: 'ATS Simulation',
    description: 'Know exactly which ATS checks your CV passes or fails before you apply.',
  },
  {
    icon: PencilLine,
    title: 'Instant Rewrite',
    description: 'AI rewrites your bullets with the exact keywords the job description uses.',
  },
]

export function FeatureCards() {
  return (
    <Container as="section" className="pb-12 lg:pb-16">
      <div className="grid gap-4 md:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, description }, index) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{
              duration: MOTION.duration.slow,
              delay: index * MOTION.stagger,
              ease: MOTION.easeOut,
            }}
          >
            <Card as="article" interactive className="group h-full p-6">
              <div className="mb-4 inline-flex rounded-[var(--radius-md)] bg-[hsl(var(--violet)/0.12)] p-3 text-violet-text transition-colors duration-200 ease-out group-hover:bg-[hsl(var(--violet)/0.18)]">
                <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
              <p className="mt-2 text-sm text-text-secondary">{description}</p>
            </Card>
          </motion.div>
        ))}
      </div>
    </Container>
  )
}
