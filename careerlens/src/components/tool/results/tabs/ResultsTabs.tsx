import { motion } from 'framer-motion'
import React, { useMemo, useState } from 'react'

import type { AnalysisSession } from '@/types'

import { ATSTab } from './ATSTab'
import { ChatTab } from './ChatTab'
import { CoverLetterTab } from './CoverLetterTab'
import { InterviewTab } from './InterviewTab'
import { KeywordsTab } from './KeywordsTab'
import { RewriteTab } from './RewriteTab'
import { SalaryTab } from './SalaryTab'
import { SkillsTab } from './SkillsTab'

const TABS = [
  { id: 'skills', label: 'Skills Gap', testId: 'tab-skills' },
  { id: 'rewrite', label: 'CV Rewrite', testId: 'tab-rewrite' },
  { id: 'ats', label: 'ATS Check', testId: 'tab-ats' },
  { id: 'keywords', label: 'Keywords', testId: 'tab-keywords' },
  { id: 'salary', label: 'Salary', testId: 'tab-salary' },
  { id: 'interview', label: 'Interview Q', testId: 'tab-interview' },
  { id: 'cover', label: 'Cover Letter', testId: 'tab-cover' },
  { id: 'chat', label: 'Chat CV', testId: 'tab-chat' },
] as const

interface ResultsTabsProps {
  session: AnalysisSession
}

export function ResultsTabs({ session }: ResultsTabsProps) {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]['id']>('skills')

  const panel = useMemo(() => {
    switch (activeTab) {
      case 'skills':
        return <SkillsTab result={session.result} />
      case 'rewrite':
        return <RewriteTab rewrite={session.rewrite} />
      case 'ats':
        return <ATSTab result={session.result} />
      case 'keywords':
        return <KeywordsTab result={session.result} />
      case 'salary':
        return <SalaryTab result={session.result} />
      case 'interview':
        return <InterviewTab result={session.result} />
      case 'cover':
        return <CoverLetterTab coverLetter={session.coverLetter} />
      case 'chat':
        return <ChatTab hasAnalysis />
      default:
        return null
    }
  }, [activeTab, session])

  return (
    <div data-testid="results-tabs" className="space-y-4">
      <div role="tablist" aria-label="Analysis results" className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            data-testid={tab.testId}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`rounded-full px-3 py-2 text-xs font-semibold ${activeTab === tab.id ? 'bg-violet text-white' : 'border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] text-text-muted'}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="rounded-[var(--radius)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-4"
      >
        {panel}
      </motion.div>
    </div>
  )
}
