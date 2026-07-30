'use client'

import { motion } from 'framer-motion'
import { PencilLine, ShieldCheck, Sparkles } from 'lucide-react'
import React from 'react'

const cards = [
  {
    icon: Sparkles,
    title: 'Scholarship Mode',
    description: 'The only tool that evaluates your CV against DAAD, Stipendium Hungaricum, and Chevening criteria.',
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
    <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 lg:pb-16">
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map(({ icon: Icon, title, description }, index) => (
          <motion.article
            key={title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.4, delay: index * 0.1, ease: 'easeOut' }}
            className="group rounded-[var(--radius-lg)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6 shadow-[var(--shadow-card)] transition-all duration-200 hover:border-[hsl(var(--violet)/0.3)] hover:shadow-[var(--shadow-elevated)]"
          >
            <div className="mb-4 inline-flex rounded-[var(--radius)] bg-[hsl(var(--violet-dim))] p-2.5 text-[hsl(var(--violet))] transition-colors duration-200 group-hover:bg-[hsl(var(--violet)/0.18)]">
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold text-text-primary">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-text-muted">{description}</p>
          </motion.article>
        ))}
      </div>
    </section>
  )
}
