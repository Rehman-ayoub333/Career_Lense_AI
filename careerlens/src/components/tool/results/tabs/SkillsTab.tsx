import { CircleAlert } from 'lucide-react'
import { motion } from 'framer-motion'
import React from 'react'

import { EmptyState } from '@/components/shared/EmptyState'
import { Tag } from '@/components/shared/Tag'
import type { AnalysisMode, AnalysisResult } from '@/types'

interface SkillsTabProps {
  result: AnalysisResult
  mode: AnalysisMode
}

export function SkillsTab({ result, mode }: SkillsTabProps) {
  const isScholarship = mode === 'scholarship'

  const groups = isScholarship
    ? [
        {
          title: `Application Strengths (${result.skills_matched.length})`,
          variant: 'match' as const,
          items: result.skills_matched,
        },
        {
          title: `Gaps to Address (${result.skills_missing.length})`,
          variant: 'missing' as const,
          items: result.skills_missing,
        },
      ]
    : [
        {
          title: `Skills You Have (${result.skills_matched.length})`,
          variant: 'match' as const,
          items: result.skills_matched,
        },
        {
          title: `Skills Missing (${result.skills_missing.length})`,
          variant: 'missing' as const,
          items: result.skills_missing,
        },
        {
          title: `Bonus Skills (${result.skills_extra.length})`,
          variant: 'extra' as const,
          items: result.skills_extra,
        },
      ]

  return (
    <div data-testid="skills-tab" className="space-y-4">
      {groups.map((group, groupIndex) => (
        <div key={group.title} className="space-y-2">
          <div className="text-sm font-semibold text-text-primary">{group.title}</div>
          {group.items.length > 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: groupIndex * 0.06 }}
              className="flex flex-wrap gap-2"
            >
              {group.items.map((item) => (
                <Tag key={item} label={item} variant={group.variant} />
              ))}
            </motion.div>
          ) : (
            <EmptyState
              icon={CircleAlert}
              title={
                isScholarship
                  ? 'No data detected for this section.'
                  : "We couldn't detect specific skills. Try adding more technical details to your CV."
              }
            />
          )}
        </div>
      ))}

      {/* Scholarship-specific tips section */}
      {isScholarship && result.scholarship_specific_tips && result.scholarship_specific_tips.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-semibold text-text-primary">Scholarship-Specific Tips</div>
          <ul className="space-y-2">
            {result.scholarship_specific_tips.map((tip) => (
              <li
                key={tip}
                className="rounded-[var(--radius)] border border-[hsl(var(--violet)/0.3)] bg-[hsl(var(--violet-dim))] px-3 py-2 text-sm text-text-primary"
              >
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
