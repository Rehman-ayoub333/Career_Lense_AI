'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'

import { Card } from '@/components/ui/Card'
import { TabPanel, Tabs, type TabDefinition } from '@/components/ui/Tabs'
import { MOTION } from '@/config/design-tokens'
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
  { id: 'skills', label: 'Skills Gap' },
  { id: 'rewrite', label: 'CV Rewrite' },
  { id: 'ats', label: 'ATS Check' },
  { id: 'keywords', label: 'Keywords' },
  { id: 'salary', label: 'Salary' },
  { id: 'interview', label: 'Interview Q' },
  { id: 'cover', label: 'Cover Letter' },
  { id: 'chat', label: 'Chat CV' },
] as const satisfies readonly TabDefinition<string>[]

type TabId = (typeof TABS)[number]['id']

const ID_PREFIX = 'results'

export function ResultsTabs({ session }: { session: AnalysisSession }) {
  const [activeTab, setActiveTab] = useState<TabId>('skills')

  function renderPanel(id: Exclude<TabId, 'chat'>) {
    switch (id) {
      case 'skills':
        return <SkillsTab result={session.result} mode={session.mode} />
      case 'rewrite':
        return (
          <RewriteTab rewrite={session.rewrite} cvText={session.cvText} jdText={session.jdText} />
        )
      case 'ats':
        return <ATSTab result={session.result} />
      case 'keywords':
        return <KeywordsTab result={session.result} />
      case 'salary':
        return <SalaryTab result={session.result} mode={session.mode} />
      case 'interview':
        return <InterviewTab result={session.result} />
      case 'cover':
        return <CoverLetterTab coverLetter={session.coverLetter} />
    }
  }

  return (
    <div data-testid="results-tabs" className="space-y-4">
      {/* Below `md` the eight pills would wrap to four rows, so the list becomes
          a single scrollable strip instead. */}
      <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:overflow-visible md:px-0">
        <Tabs
          tabs={TABS}
          activeId={activeTab}
          onChange={setActiveTab}
          label="Analysis results"
          idPrefix={ID_PREFIX}
          className="flex-nowrap md:flex-wrap"
        />
      </div>

      {activeTab !== 'chat' ? (
        <TabPanel id={activeTab} idPrefix={ID_PREFIX} active>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: MOTION.duration.base, ease: MOTION.easeOut }}
          >
            <Card className="p-6">{renderPanel(activeTab)}</Card>
          </motion.div>
        </TabPanel>
      ) : null}

      {/* Chat stays mounted so the conversation survives a tab switch. */}
      <TabPanel id="chat" idPrefix={ID_PREFIX} active={activeTab === 'chat'}>
        <Card className="p-6">
          <ChatTab session={session} />
        </Card>
      </TabPanel>
    </div>
  )
}
