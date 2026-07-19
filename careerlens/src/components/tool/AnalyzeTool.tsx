'use client'

import { motion } from 'framer-motion'
import React, { useState } from 'react'

import { useAnalysis } from '@/hooks/useAnalysis'

import { AnalyzeButton } from './AnalyzeButton'
import { CVTextarea } from './CVTextarea'
import { JDTextarea } from './JDTextarea'
import { LoadingOverlay } from './LoadingOverlay'
import { ModeSelector } from './ModeSelector'
import { UploadZone } from './UploadZone'
import { ResultsTabs } from './results/tabs/ResultsTabs'
import { ScorePanel } from './results/ScorePanel/ScorePanel'

const demoCv = 'Senior software engineer with 4 years of experience building React, TypeScript, and Next.js applications. Strong product thinking, API integration, system design, and growth mindset. Built accessible user interfaces, collaborated with cross-functional teams, and delivered measurable business outcomes.'
const demoJd = 'We are looking for a strong frontend engineer with React, TypeScript, UI performance optimization, and experience shipping production web applications. Candidate should be comfortable with accessible interfaces, API integration, and working across product and engineering teams.'

export function AnalyzeTool() {
  const { step, loadingStep, session, loadingCopy, runAnalysis } = useAnalysis()
  const [mode, setMode] = useState<'job' | 'scholarship'>('job')
  const [cvText, setCvText] = useState(demoCv)
  const [jdText, setJdText] = useState(demoJd)

  const handleAnalyze = () => {
    void runAnalysis(cvText, jdText, mode)
  }

  const resetAnalysis = () => {
    setCvText(demoCv)
    setJdText(demoJd)
    setMode('job')
    window.location.reload()
  }

  if (step === 'loading') {
    return <LoadingOverlay loadingStep={loadingStep} loadingCopy={loadingCopy} />
  }

  if (step === 'results' && session) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="mx-auto max-w-6xl px-4 py-8 sm:px-6"
      >
        <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
          <ScorePanel session={session} onNewAnalysis={resetAnalysis} />
          <ResultsTabs session={session} />
        </div>
      </motion.section>
    )
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="mx-auto max-w-6xl px-4 py-8 sm:px-6"
    >
      <div className="rounded-[var(--radius-lg)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <ModeSelector mode={mode} onModeChange={setMode} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <UploadZone />
            <CVTextarea value={cvText} onChange={setCvText} />
          </div>
          <div className="space-y-4">
            <JDTextarea mode={mode} value={jdText} onChange={setJdText} />
            <AnalyzeButton cvText={cvText} jdText={jdText} step={step} onClick={handleAnalyze} />
          </div>
        </div>
      </div>
    </motion.section>
  )
}
