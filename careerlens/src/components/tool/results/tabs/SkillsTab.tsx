import { motion } from 'framer-motion'
import React from 'react'

import { EmptyState } from '@/components/shared/EmptyState'
import { Tag } from '@/components/shared/Tag'
import type { AnalysisResult } from '@/types'
import { CircleAlert } from 'lucide-react'

interface SkillsTabProps {
  result: AnalysisResult
}

export function SkillsTab({ result }: SkillsTabProps) {
  const groups = [
    { title: `Skills You Have (${result.skills_matched.length})`, variant: 'match' as const, items: result.skills_matched },
    { title: `Skills Missing (${result.skills_missing.length})`, variant: 'missing' as const, items: result.skills_missing },
    { title: `Bonus Skills (${result.skills_extra.length})`, variant: 'extra' as const, items: result.skills_extra },
  ]

  return (
    <div data-testid="skills-tab" className="space-y-4">
      {groups.map((group, groupIndex) => (
        <div key={group.title} className="space-y-2">
          <div className="text-sm font-semibold text-text-primary">{group.title}</div>
          {group.items.length ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: groupIndex * 0.04 }}
              className="flex flex-wrap gap-2"
            >
              {group.items.map((item) => (
                <Tag key={item} label={item} variant={group.variant} />
              ))}
            </motion.div>
          ) : (
            <EmptyState icon={CircleAlert} title="We couldn't detect specific skills. Try adding more technical details to your CV." />
          )}
        </div>
      ))}
    </div>
  )
}
