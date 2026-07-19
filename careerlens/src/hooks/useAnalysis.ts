import { useEffect, useState } from 'react'

import { writeHistory } from '@/lib/history'
import type { AnalysisMode, AnalysisSession, AnalysisResult, RewriteResult } from '@/types'

const LOADING_COPY = [
  'Reading your CV...',
  'Comparing against job requirements...',
  'Running ATS simulation...',
  'Generating recommendations...',
  'Almost done...',
]

export function useAnalysis() {
  const [step, setStep] = useState<'input' | 'loading' | 'results'>('input')
  const [loadingStep, setLoadingStep] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [session, setSession] = useState<AnalysisSession | null>(null)

  useEffect(() => {
    if (step !== 'loading') {
      return undefined
    }

    const interval = window.setInterval(() => {
      setLoadingStep((current) => (current + 1) % LOADING_COPY.length)
    }, 4000)

    return () => window.clearInterval(interval)
  }, [step])

  async function runAnalysis(cvText: string, jdText: string, mode: AnalysisMode): Promise<void> {
    setError(null)
    setStep('loading')
    setLoadingStep(0)

    try {
      const analyzeResponse = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvText, jdText, mode }),
      })

      const analyzePayload = (await analyzeResponse.json()) as {
        success?: boolean
        data?: AnalysisResult
        error?: string
        message?: string
      }

      if (!analyzeResponse.ok || !analyzePayload.success || !analyzePayload.data) {
        throw new Error(analyzePayload.message ?? 'Unable to analyze this CV.')
      }

      const rewriteResponse = await fetch('/api/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvText, jdText }),
      })

      const rewritePayload = (await rewriteResponse.json()) as {
        success?: boolean
        data?: RewriteResult
        error?: string
        message?: string
      }

      if (!rewriteResponse.ok || !rewritePayload.success || !rewritePayload.data) {
        throw new Error(rewritePayload.message ?? 'Unable to generate CV rewrite.')
      }

      const coverLetterResponse = await fetch('/api/cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvText, jdText }),
      })

      const coverLetterPayload = (await coverLetterResponse.json()) as {
        success?: boolean
        coverLetter?: string
        error?: string
        message?: string
      }

      if (!coverLetterResponse.ok || !coverLetterPayload.success || !coverLetterPayload.coverLetter) {
        throw new Error(coverLetterPayload.message ?? 'Unable to generate cover letter.')
      }

      const jobTitle = jdText.split(/\n+/)[0]?.trim() || 'Role'
      const nextSession: AnalysisSession = {
        id: `${Date.now()}`,
        date: new Date().toISOString(),
        mode,
        cvText,
        jdText,
        jobTitle,
        result: analyzePayload.data,
        rewrite: rewritePayload.data,
        coverLetter: coverLetterPayload.coverLetter,
      }

      const existing = typeof window !== 'undefined' ? JSON.parse(window.localStorage.getItem('careerlens_history') ?? '[]') : []
      const updatedHistory = [nextSession, ...(Array.isArray(existing) ? existing : [])].slice(0, 10)
      writeHistory(updatedHistory)

      setSession(nextSession)
      setStep('results')
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Analysis failed.')
      setStep('input')
    }
  }

  return {
    step,
    loadingStep,
    error,
    session,
    runAnalysis,
    loadingCopy: LOADING_COPY,
  }
}
