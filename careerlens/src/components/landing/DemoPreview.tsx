'use client'

import { motion } from 'framer-motion'

import { Badge, Tag } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Container } from '@/components/ui/Container'
import { LabelledMeter } from '@/components/ui/Feedback'
import { MOTION } from '@/config/design-tokens'

/**
 * Static sample of a finished analysis, shown on the landing page.
 *
 * The figures are illustrative and deliberately hard-coded — this is marketing
 * copy, not a live result — but every primitive is the same one the real
 * results screen uses, so the preview cannot drift from the product.
 */

const SAMPLE_SKILLS = [
  { label: 'TypeScript', variant: 'match' },
  { label: 'Python', variant: 'match' },
  { label: 'React', variant: 'match' },
  { label: 'SQL', variant: 'extra' },
] as const

const SAMPLE_BREAKDOWN = [
  { label: 'Skills', value: 78, colorVar: 'hsl(var(--blue))' },
  { label: 'Experience', value: 64, colorVar: 'hsl(var(--amber))' },
  { label: 'Education', value: 82, colorVar: 'hsl(var(--green))' },
] as const

export function DemoPreview() {
  return (
    <Container as="section" id="demo-preview" data-testid="demo-preview" className="py-12 lg:py-16">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: MOTION.duration.slow, ease: MOTION.easeOut }}
      >
        <Card className="p-6 sm:p-8">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-text-primary sm:text-2xl">
                Here&apos;s what your analysis looks like
              </h2>
              <p className="mt-1 text-sm text-text-secondary">This analysis took 11 seconds</p>
            </div>
            <Badge variant="info">Good Match</Badge>
          </div>

          <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
            <div className="rounded-[var(--radius-md)] border border-border bg-surface-raised p-4 text-center">
              <div className="tabular mb-1 text-5xl font-bold leading-none text-blue-text">73</div>
              <div className="text-xs uppercase tracking-[0.12em] text-text-muted">Match score</div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {SAMPLE_SKILLS.map(({ label, variant }) => (
                  <Tag key={label} variant={variant}>
                    {label}
                  </Tag>
                ))}
              </div>

              <div className="space-y-3">
                {SAMPLE_BREAKDOWN.map((row) => (
                  <LabelledMeter key={row.label} {...row} />
                ))}
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </Container>
  )
}
