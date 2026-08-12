'use client'

import { motion, useReducedMotion } from 'framer-motion'

import { Hallmark } from '@/components/ui/Hallmark'
import { MOTION } from '@/config/design-tokens'
import { cn } from '@/lib/cn'

import { Section, SectionHeading, SectionLede } from './Section'

/**
 * A real analysis, shown rather than described.
 *
 * This replaces the previous demo card, which showed a number, four tags and
 * three bars — an artefact indistinguishable from a loading state, and one that
 * conveyed none of the product's actual output.
 *
 * Two constructions carry the whole idea and appear nowhere else in this
 * category:
 *
 *  - **The gap field.** A requirement the CV does not answer is drawn as an
 *    empty ruled field at the position the evidence would have occupied. It is
 *    not an error, not a cross, and not red. Nothing was recorded there, and the
 *    field says so by being empty.
 *  - **The annotation.** The product's findings sit in the margin, attached to
 *    the passage they concern, in the manner of a supervisor marking a draft.
 *    The reader's own text is never highlighted, rewritten, or coloured.
 *
 * The figures are illustrative and the whole composition is hidden from
 * assistive technology, so no screen reader announces a score the visitor has
 * not earned.
 */

type Line =
  | { kind: 'label'; text: string }
  | { kind: 'passage'; text: string; marked?: boolean }
  | { kind: 'gap'; label: string }

const SHEET: readonly Line[] = [
  { kind: 'label', text: 'Experience' },
  { kind: 'passage', text: 'Senior Frontend Engineer, Arcadia Labs — 2022 to present' },
  { kind: 'passage', text: 'Built and shipped the customer billing interface in React and TypeScript.' },
  { kind: 'gap', label: 'Not evidenced — distributed systems' },
  { kind: 'passage', text: 'Reduced page load time by 40% across the primary application.' },
  { kind: 'label', text: 'Skills' },
  { kind: 'passage', text: 'TypeScript · React · Next.js · Node · PostgreSQL', marked: true },
  { kind: 'gap', label: 'Not evidenced — Kubernetes' },
  { kind: 'label', text: 'Education' },
  { kind: 'passage', text: 'BSc Computer Science, GC University Faisalabad — 2022' },
]

/** Each states a fact and its cost, in one sentence, from a fixed vocabulary. */
const ANNOTATIONS: readonly { text: string; consequential: boolean }[] = [
  {
    text: 'Distributed systems experience is not evidenced; the requirement states it as essential.',
    consequential: true,
  },
  {
    text: 'Kubernetes is not evidenced; the requirement states it as desirable.',
    consequential: true,
  },
  {
    text: 'Skills are set in two columns; an applicant tracking system reads this as a single column.',
    consequential: true,
  },
  { text: 'Three roles state a measurable outcome.', consequential: false },
]

export function ResultSection() {
  const reduce = useReducedMotion()

  const rise = (index: number) => ({
    initial: reduce ? false : { opacity: 0, y: 10 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-60px' },
    transition: {
      duration: MOTION.duration.slow,
      delay: Math.min(index, 4) * MOTION.stagger,
      ease: MOTION.easeOut,
    },
  })

  return (
    <Section id="the-result" label="The output" folio="03" raised>
      <SectionHeading>Every requirement, marked against your own words.</SectionHeading>
      <SectionLede>
        The analysis does not grade your CV. It marks the passages that answer the requirement, and
        leaves the places that answer nothing visibly empty.
      </SectionLede>

      <div
        aria-hidden="true"
        className="mt-16 grid gap-12 rounded-[var(--radius-lg)] border border-border bg-[hsl(var(--bg)/0.45)] p-6 sm:p-8 lg:grid-cols-[16rem_1fr] lg:gap-8"
      >
        {/* Apparatus — the verdict and the three findings that account for it. */}
        <div>
          <Hallmark score={73} reference="Analysis · Job description · 14 August 2026" />

          <div className="mt-12 border-t border-border pt-6">
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-text-muted">
              Findings
            </p>
            <p className="tabular mt-4 font-mono text-xs text-text-secondary">
              11 requirements
              <span className="mx-2 text-[hsl(var(--text-muted)/0.5)]">/</span>
              8 matched
              <span className="mx-2 text-[hsl(var(--text-muted)/0.5)]">/</span>
              <span className="text-amber-text">3 gaps</span>
            </p>
          </div>
        </div>

        {/* Work field — the reader's document, marked. */}
        <div className="grid gap-8 lg:grid-cols-[1fr_15rem] lg:gap-6">
          <div className="space-y-3">
            {SHEET.map((line, index) => {
              if (line.kind === 'label') {
                return (
                  <p
                    key={index}
                    className={cn(
                      'font-mono text-xs uppercase tracking-[0.16em] text-text-muted',
                      index > 0 && 'pt-4'
                    )}
                  >
                    {line.text}
                  </p>
                )
              }

              if (line.kind === 'gap') {
                return (
                  <motion.div
                    key={index}
                    {...rise(index)}
                    className="flex h-8 items-center rounded-[var(--radius-sm)] border border-[hsl(var(--amber)/0.55)] bg-[hsl(var(--amber)/0.06)] px-3"
                  >
                    <span className="font-mono text-xs uppercase tracking-[0.12em] text-amber-text">
                      {line.label}
                    </span>
                  </motion.div>
                )
              }

              return (
                <motion.p
                  key={index}
                  {...rise(index)}
                  className={cn(
                    'text-sm leading-relaxed',
                    line.marked ? 'text-text-primary' : 'text-text-secondary'
                  )}
                >
                  {line.text}
                </motion.p>
              )
            })}
          </div>

          {/* The reserved margin. Present whether or not it is occupied. */}
          <div className="space-y-6 border-t border-border pt-6 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            {ANNOTATIONS.map((note, index) => (
              <motion.p
                key={note.text}
                {...rise(index + 2)}
                className={cn(
                  'font-mono text-xs leading-relaxed',
                  note.consequential ? 'text-amber-text' : 'text-text-muted'
                )}
              >
                {note.text}
              </motion.p>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-6 font-mono text-xs text-text-muted">
        Illustrative. Figures and passages are a worked example, not a real analysis.
      </p>
    </Section>
  )
}
