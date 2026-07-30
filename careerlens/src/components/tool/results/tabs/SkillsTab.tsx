'use client'

import { motion } from 'framer-motion'
import { CircleAlert } from 'lucide-react'

import { Tag, type TagVariant } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/Feedback'
import { MOTION } from '@/config/design-tokens'
import type { AnalysisMode, AnalysisResult } from '@/types'

interface Group {
  title: string
  variant: TagVariant
  items: string[]
}

function groupsFor(result: AnalysisResult, mode: AnalysisMode): Group[] {
  if (mode === 'scholarship') {
    return [
      {
        title: `Application Strengths (${result.skills_matched.length})`,
        variant: 'match',
        items: result.skills_matched,
      },
      {
        title: `Gaps to Address (${result.skills_missing.length})`,
        variant: 'missing',
        items: result.skills_missing,
      },
    ]
  }

  return [
    {
      title: `Skills You Have (${result.skills_matched.length})`,
      variant: 'match',
      items: result.skills_matched,
    },
    {
      title: `Skills Missing (${result.skills_missing.length})`,
      variant: 'missing',
      items: result.skills_missing,
    },
    {
      title: `Bonus Skills (${result.skills_extra.length})`,
      variant: 'extra',
      items: result.skills_extra,
    },
  ]
}

export function SkillsTab({ result, mode }: { result: AnalysisResult; mode: AnalysisMode }) {
  const isScholarship = mode === 'scholarship'
  const tips = result.scholarship_specific_tips ?? []

  return (
    <div data-testid="skills-tab" className="space-y-4">
      {groupsFor(result, mode).map((group, index) => (
        <div key={group.title} className="space-y-2">
          <h3 className="text-sm font-semibold text-text-primary">{group.title}</h3>

          {group.items.length > 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: MOTION.duration.base,
                delay: index * MOTION.stagger,
                ease: MOTION.easeOut,
              }}
              className="flex flex-wrap gap-2"
            >
              {group.items.map((item) => (
                <Tag key={item} variant={group.variant}>
                  {item}
                </Tag>
              ))}
            </motion.div>
          ) : (
            <EmptyState
              icon={CircleAlert}
              title={isScholarship ? 'No data detected for this section' : 'No skills detected'}
              description={
                isScholarship
                  ? undefined
                  : 'Try adding more technical detail to your CV so the analysis has something to match against.'
              }
            />
          )}
        </div>
      ))}

      {isScholarship && tips.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-text-primary">Scholarship-Specific Tips</h3>
          <ul className="space-y-2">
            {tips.map((tip) => (
              <li
                key={tip}
                className="rounded-[var(--radius-sm)] border border-[hsl(var(--violet)/0.35)] bg-[hsl(var(--violet)/0.12)] px-3 py-2 text-sm text-text-primary"
              >
                {tip}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
