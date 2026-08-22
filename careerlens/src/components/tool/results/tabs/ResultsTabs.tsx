'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'

import { Card } from '@/components/ui/Card'
import { TabPanel, Tabs, type TabDefinition } from '@/components/ui/Tabs'
import { MOTION } from '@/config/design-tokens'
import type { AnalysisSession } from '@/types'

import { ChatTab } from './ChatTab'
import { CoverLetterTab } from './CoverLetterTab'
import { InterviewTab } from './InterviewTab'
import { RewriteTab } from './RewriteTab'

/**
 * Four tabs, all of them generated content.
 *
 * Skills Gap, ATS Check and Keywords are gone: they showed the evidence, and the
 * evidence is now the page rather than a tab on it. Salary went with them — a
 * market estimate the system cannot ground in the CV sat oddly beside three
 * tools that produce text the user takes away.
 *
 * What remains is one category of thing: text the model wrote, which the user
 * edits and sends. Keeping it visually subordinate to the evidence document is
 * the whole point of the split — generated prose and located evidence are not
 * equally well-founded, and eight tabs at equal weight said they were.
 */
const TABS = [
  { id: 'rewrite', label: 'CV Rewrite' },
  { id: 'cover', label: 'Cover Letter' },
  { id: 'interview', label: 'Interview Prep' },
  { id: 'chat', label: 'Chat CV' },
] as const satisfies readonly TabDefinition<string>[]

type TabId = (typeof TABS)[number]['id']

const ID_PREFIX = 'results'

export function ResultsTabs({ session }: { session: AnalysisSession }) {
  const [activeTab, setActiveTab] = useState<TabId>('rewrite')

  function renderPanel(id: Exclude<TabId, 'chat'>) {
    switch (id) {
      case 'rewrite':
        return (
          <RewriteTab
            rewrite={session.rewrite}
            cvText={session.cvText}
            jdText={session.jdText}
            claims={session.result.claims}
          />
        )
      case 'interview':
        return <InterviewTab result={session.result} />
      case 'cover':
        return <CoverLetterTab coverLetter={session.coverLetter} />
    }
  }

  return (
    <div data-testid="results-tabs" className="space-y-4">
      {/* Four pills fit on one row from `sm` up; the strip stays scrollable below
          that so nothing is clipped at 375px. */}
      <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:overflow-visible md:px-0">
        <Tabs
          tabs={TABS}
          activeId={activeTab}
          onChange={setActiveTab}
          label="Tools"
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
