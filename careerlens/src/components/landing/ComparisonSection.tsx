'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { Check, Minus } from 'lucide-react'

import { MOTION } from '@/config/design-tokens'
import { cn } from '@/lib/cn'

import { Section, SectionHeading } from './Section'

/**
 * The comparison.
 *
 * Every row here is checkable, and rows that cannot be checked are marked as
 * not stated rather than as absent. A comparison table that overstates a
 * competitor's shortcomings is the fastest way to lose a reader who has used
 * that competitor, and this product's whole argument is that claims should be
 * verifiable.
 */

type Cell = 'yes' | 'no' | 'partial' | 'unstated'

interface Row {
  capability: string
  careerlens: Cell
  others: readonly Cell[]
  note?: string
}

const COMPETITORS = ['Jobscan', 'Teal', 'Huntr'] as const

const ROWS: readonly Row[] = [
  {
    capability: 'Scholarship criteria mode',
    careerlens: 'yes',
    others: ['no', 'no', 'no'],
    note: 'None of the three advertises support for scholarship or programme criteria.',
  },
  {
    capability: 'Usable without an account',
    careerlens: 'yes',
    others: ['partial', 'partial', 'no'],
  },
  {
    capability: 'No stored copy of your CV',
    careerlens: 'yes',
    others: ['no', 'no', 'no'],
    note: 'Each of the three keeps an account-linked copy by design.',
  },
  {
    capability: 'Source code published',
    careerlens: 'yes',
    others: ['no', 'no', 'no'],
  },
  {
    capability: 'Stated policy against inventing experience',
    careerlens: 'yes',
    others: ['unstated', 'unstated', 'unstated'],
    note: 'Marked as not stated rather than absent — their policies do not address it either way.',
  },
]

function Mark({ value }: { value: Cell }) {
  if (value === 'yes') {
    return <Check className="h-4 w-4 text-green-text" strokeWidth={2.25} aria-label="Yes" />
  }
  if (value === 'partial') {
    return (
      <span className="font-mono text-xs uppercase tracking-[0.12em] text-text-muted">
        Limited
      </span>
    )
  }
  if (value === 'unstated') {
    return (
      <span className="font-mono text-xs uppercase tracking-[0.12em] text-text-muted">
        Not stated
      </span>
    )
  }
  return <Minus className="h-4 w-4 text-[hsl(var(--text-muted)/0.6)]" strokeWidth={2} aria-label="No" />
}

export function ComparisonSection() {
  const reduce = useReducedMotion()

  return (
    <Section id="how-it-differs" label="The comparison" folio="06">
      <SectionHeading>Checkable claims only.</SectionHeading>

      <div className="mt-16 overflow-x-auto">
        <table className="w-full min-w-[42rem] border-collapse text-left">
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className="py-4 pr-6 font-mono text-xs uppercase tracking-[0.16em] text-text-muted">
                Capability
              </th>
              <th
                scope="col"
                className="px-4 py-4 font-mono text-xs uppercase tracking-[0.16em] text-text-primary"
              >
                CareerLens
              </th>
              {COMPETITORS.map((name) => (
                <th
                  key={name}
                  scope="col"
                  className="px-4 py-4 font-mono text-xs uppercase tracking-[0.16em] text-text-muted"
                >
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, index) => (
              <motion.tr
                key={row.capability}
                initial={reduce ? false : { opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{
                  duration: MOTION.duration.slow,
                  delay: Math.min(index, 4) * MOTION.stagger,
                  ease: MOTION.easeOut,
                }}
                className="border-b border-border"
              >
                <th
                  scope="row"
                  className="py-5 pr-6 text-sm font-normal text-text-secondary"
                >
                  {row.capability}
                  {row.note ? (
                    <span className="mt-2 block max-w-[36ch] font-mono text-xs text-text-faint">
                      {row.note}
                    </span>
                  ) : null}
                </th>
                <td className={cn('px-4 py-5', 'bg-[hsl(var(--surface)/0.5)]')}>
                  <Mark value={row.careerlens} />
                </td>
                {row.others.map((cell, cellIndex) => (
                  <td key={COMPETITORS[cellIndex]} className="px-4 py-5">
                    <Mark value={cell} />
                  </td>
                ))}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-8 max-w-[55ch] font-mono text-xs leading-relaxed text-text-muted">
        Assessed from each product’s public pricing and privacy pages, August 2026. If a row is
        wrong, the source is on GitHub and a correction is a pull request away.
      </p>
    </Section>
  )
}
