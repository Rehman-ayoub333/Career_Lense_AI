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
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map(({ icon: Icon, title, description }) => (
          <article key={title} className="rounded-[var(--radius)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-5">
            <div className="mb-4 inline-flex rounded-full bg-violet-dim p-2 text-violet">
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
            <p className="mt-2 text-sm text-text-muted">{description}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
