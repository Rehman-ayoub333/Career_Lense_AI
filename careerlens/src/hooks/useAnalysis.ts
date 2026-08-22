'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import type {
  AnalyzeRequest,
  CoverLetterRequest,
  CoverLetterResponse,
  RewriteRequest,
} from '@/lib/api/contract'
import { toClaimReferences } from '@/lib/api/contract'
import { postJson, toDisplayMessage } from '@/lib/api/client'
import { addToHistory } from '@/lib/history'
import type { AnalysisMode, AnalysisResult, AnalysisSession, AnalysisStep, RewriteResult } from '@/types'

/**
 * Owns the analysis workflow: request orchestration, progress, persistence.
 *
 * Progress copy is keyed to real completion events rather than a timer, so the
 * indicator cannot claim to be "almost done" while the first request is still
 * in flight.
 */
export const LOADING_STEPS = [
  'Reading your CV',
  'Scoring the match',
  'Writing your optimised bullets',
  'Finishing up',
] as const

interface AnalysisState {
  step: AnalysisStep
  loadingStep: number
  error: string | null
  session: AnalysisSession | null
}

const INITIAL_STATE: AnalysisState = {
  step: 'input',
  loadingStep: 0,
  error: null,
  session: null,
}

/** Uses the first non-empty line of the description as a human-readable label. */
function deriveJobTitle(jdText: string, mode: AnalysisMode): string {
  const firstLine = jdText
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.length > 0)

  if (!firstLine) return mode === 'scholarship' ? 'Scholarship application' : 'Role'
  return firstLine.length > 80 ? `${firstLine.slice(0, 77)}...` : firstLine
}

export function useAnalysis() {
  const [state, setState] = useState<AnalysisState>(INITIAL_STATE)

  /** Lets a navigating-away or resetting user cancel in-flight requests. */
  const abortRef = useRef<AbortController | null>(null)

  // Abort on unmount so a discarded response can never call setState.
  useEffect(() => () => abortRef.current?.abort(), [])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setState(INITIAL_STATE)
  }, [])

  const dismissError = useCallback(() => {
    setState((current) => ({ ...current, error: null }))
  }, [])

  const restoreSession = useCallback((session: AnalysisSession) => {
    abortRef.current?.abort()
    setState({ step: 'results', loadingStep: 0, error: null, session })
  }, [])

  /** Replaces the rewrite on the active session, e.g. after a manual retry. */
  const updateRewrite = useCallback((rewrite: RewriteResult) => {
    setState((current) =>
      current.session ? { ...current, session: { ...current.session, rewrite } } : current
    )
  }, [])

  const updateCoverLetter = useCallback((coverLetter: string) => {
    setState((current) =>
      current.session ? { ...current, session: { ...current.session, coverLetter } } : current
    )
  }, [])

  const runAnalysis = useCallback(
    async (cvText: string, jdText: string, mode: AnalysisMode): Promise<void> => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setState({ step: 'loading', loadingStep: 1, error: null, session: null })

      try {
        // Step 1 — the analysis. This one is load-bearing: without a score there
        // is nothing to show, so a failure here aborts the run.
        const result = await postJson<AnalysisResult>(
          '/api/analyze',
          { cvText, jdText, mode } satisfies AnalyzeRequest,
          { signal: controller.signal }
        )

        if (controller.signal.aborted) return
        setState((current) => ({ ...current, loadingStep: 2 }))

        // Step 2 — the two enhancements. They depend only on the inputs, not on
        // step 1, so they run concurrently: roughly a third off total wall time.
        //
        // `allSettled`, not `all`: either may fail without invalidating the
        // analysis the user has already paid for in waiting time and quota.
        const [rewriteOutcome, coverLetterOutcome] = await Promise.allSettled([
          postJson<RewriteResult>(
            '/api/rewrite',
            // The analysis has already resolved, so its claims are in hand: the
            // rewrite can aim at the requirements the evidence check could not
            // confirm rather than guessing which bullets are weak (ADR-18).
            { cvText, jdText, claims: toClaimReferences(result.claims) } satisfies RewriteRequest,
            { signal: controller.signal }
          ),
          postJson<CoverLetterResponse>(
            '/api/cover-letter',
            { cvText, jdText } satisfies CoverLetterRequest,
            { signal: controller.signal }
          ),
        ])

        if (controller.signal.aborted) return
        setState((current) => ({ ...current, loadingStep: 3 }))

        const session: AnalysisSession = {
          id: String(Date.now()),
          date: new Date().toISOString(),
          mode,
          cvText,
          jdText,
          jobTitle: deriveJobTitle(jdText, mode),
          result,
          rewrite: rewriteOutcome.status === 'fulfilled' ? rewriteOutcome.value : null,
          coverLetter:
            coverLetterOutcome.status === 'fulfilled' ? coverLetterOutcome.value.coverLetter : null,
        }

        addToHistory(session)
        setState({ step: 'results', loadingStep: 0, error: null, session })
      } catch (error) {
        // A cancelled request is a user action, not a failure to report.
        if (controller.signal.aborted) return

        setState({
          step: 'input',
          loadingStep: 0,
          error: toDisplayMessage(error),
          session: null,
        })
      }
    },
    []
  )

  return {
    ...state,
    runAnalysis,
    reset,
    dismissError,
    restoreSession,
    updateRewrite,
    updateCoverLetter,
  }
}

/**
 * The workflow handle returned by `useAnalysis`.
 *
 * Exported because the hook is called one level above the tool — the page needs
 * `step` to decide whether the marketing sections should still be on screen, and
 * two components calling the hook would give them two independent states.
 */
export type AnalysisController = ReturnType<typeof useAnalysis>
