'use client'

import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Container } from '@/components/ui/Container'
import { Alert } from '@/components/ui/Feedback'
import { TextareaField } from '@/components/ui/Textarea'
import { MOTION } from '@/config/design-tokens'
import { LOADING_STEPS, type AnalysisController } from '@/hooks/useAnalysis'
import { INPUT_LIMITS } from '@/lib/analysis/constants'
import { MODE_LABEL } from '@/lib/format'
import type { AnalysisMode } from '@/types'

import { AssessmentPanel } from './AssessmentPanel'
import { HistoryPanel } from './history/HistoryPanel'
import { LoadingOverlay } from './LoadingOverlay'
import { ModeSelector } from './ModeSelector'
import { UploadZone } from './UploadZone'
import { EvidenceDocument } from './results/evidence/EvidenceDocument'
import { ResultsTabs } from './results/tabs/ResultsTabs'

const DEMO_CV =
  'Senior software engineer with 4 years of experience building React, TypeScript, and Next.js applications. Strong product thinking, API integration, system design, and growth mindset. Built accessible user interfaces, collaborated with cross-functional teams, and delivered measurable business outcomes.'

const DEMO_JD =
  'We are looking for a strong frontend engineer with React, TypeScript, UI performance optimization, and experience shipping production web applications. Candidate should be comfortable with accessible interfaces, API integration, and working across product and engineering teams.'

const JD_PLACEHOLDERS: Record<AnalysisMode, string> = {
  job: 'Paste the full job description here.\n\nInclude responsibilities, required skills, and qualifications so every stated requirement can be checked.',
  scholarship:
    'Paste the scholarship criteria here.\n\nInclude eligibility requirements, evaluation criteria, and programme details so every stated requirement can be checked.',
}

const CV_PLACEHOLDER =
  'Paste your full CV or resume text here.\n\nInclude experience, education, projects, and skills so the analysis can compare your profile against the opportunity.'

const SECTION_MOTION = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: MOTION.duration.slow, ease: MOTION.easeOut },
}

export function AnalyzeTool({ analysis }: { analysis: AnalysisController }) {
  const { step, loadingStep, session, error, runAnalysis, reset, restoreSession } = analysis
  const [mode, setMode] = useState<AnalysisMode>('job')
  const [cvText, setCvText] = useState(DEMO_CV)
  const [jdText, setJdText] = useState(DEMO_JD)
  /**
   * The one claim currently opened, shared by the checklist and the document so
   * selecting in either surface reveals the same claim in the other. Owned here
   * rather than in either child, since neither is the other's parent.
   */
  const [activeClaimId, setActiveClaimId] = useState<string | null>(null)

  const canAnalyze =
    cvText.length >= INPUT_LIMITS.cv.min && jdText.length >= INPUT_LIMITS.jd.min

  function handleReset() {
    reset()
    setCvText(DEMO_CV)
    setJdText(DEMO_JD)
    setMode('job')
  }

  if (step === 'loading') {
    return <LoadingOverlay loadingStep={loadingStep} steps={LOADING_STEPS} />
  }

  if (step === 'results' && session) {
    return (
      <Container as="section" className="py-8 lg:py-12">
        <motion.div {...SECTION_MOTION} className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
          {/* Source order is the mobile order, and the mobile order is the
              priority order: score and coverage, then the document, then the
              tools. On `lg` the panel becomes the sticky left column. */}
          <AssessmentPanel
            session={session}
            onNewAnalysis={handleReset}
            activeClaimId={activeClaimId}
            onClaimSelect={setActiveClaimId}
          />

          <div className="min-w-0 space-y-12">
            <EvidenceDocument
              cvText={session.cvText}
              claims={session.result.claims}
              activeClaimId={activeClaimId}
              onClaimSelect={setActiveClaimId}
            />

            <div className="border-t border-border pt-8">
              <h2 className="font-mono text-xs uppercase tracking-[0.16em] text-text-muted">
                Tools
              </h2>
              <p className="mt-1.5 max-w-prose text-xs leading-relaxed text-[hsl(var(--text-muted)/0.8)]">
                Text generated from your CV and this opportunity. Unlike the evidence above, none of
                it has been checked against your document — read it before you send it.
              </p>
              <div className="mt-4">
                <ResultsTabs session={session} />
              </div>
            </div>
          </div>
        </motion.div>
      </Container>
    )
  }

  return (
    <Container as="section" className="py-8 lg:py-12">
      <motion.div {...SECTION_MOTION}>
        <Card className="p-4 sm:p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <ModeSelector mode={mode} onModeChange={setMode} />
            <HistoryPanel onRestore={restoreSession} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="flex flex-col gap-4">
              <UploadZone onTextExtracted={setCvText} />
              <TextareaField
                label="Your CV"
                testId="cv-textarea"
                value={cvText}
                onChange={setCvText}
                placeholder={CV_PLACEHOLDER}
                minLength={INPUT_LIMITS.cv.min}
                maxLength={INPUT_LIMITS.cv.max}
                rows={7}
              />
            </div>

            <div className="flex flex-col gap-4">
              <TextareaField
                label={MODE_LABEL[mode]}
                testId="jd-textarea"
                value={jdText}
                onChange={setJdText}
                placeholder={JD_PLACEHOLDERS[mode]}
                minLength={INPUT_LIMITS.jd.min}
                maxLength={INPUT_LIMITS.jd.max}
                rows={9}
                className="flex-1"
              />

              <Button
                data-testid="analyze-button"
                size="lg"
                block
                disabled={!canAnalyze}
                title={
                  canAnalyze
                    ? undefined
                    : `Enter at least ${INPUT_LIMITS.cv.min} characters for your CV and ${INPUT_LIMITS.jd.min} for the description`
                }
                onClick={() => void runAnalysis(cvText, jdText, mode)}
              >
                <Sparkles className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                Analyse match
              </Button>

              {error ? <Alert tone="error">{error}</Alert> : null}
            </div>
          </div>
        </Card>
      </motion.div>
    </Container>
  )
}
