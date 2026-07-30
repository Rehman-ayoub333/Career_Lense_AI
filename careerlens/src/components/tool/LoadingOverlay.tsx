import { CheckCircle2, LoaderCircle } from 'lucide-react'

import { cn } from '@/lib/cn'

/**
 * Full-screen progress while an analysis runs.
 *
 * The step list is a real `<ol>` with per-step status exposed to assistive
 * technology, because the visual signal — a tick, a spinner, a hollow dot — is
 * otherwise the only indication of where the run has got to.
 */
export function LoadingOverlay({
  loadingStep,
  steps,
}: {
  /** Index of the step currently in progress. */
  loadingStep: number
  steps: readonly string[]
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Analyzing your CV"
      data-testid="loading-overlay"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[var(--glass-bg)] px-4 backdrop-blur-[var(--glass-blur)]"
    >
      <div className="w-full max-w-sm rounded-[var(--radius-lg)] border border-border-strong bg-surface-raised p-8 shadow-[var(--shadow-lg)]">
        <div className="flex flex-col items-center gap-6 text-center">
          <LoaderCircle
            className="h-8 w-8 animate-spin text-violet-text"
            strokeWidth={1.5}
            aria-hidden="true"
          />

          <ol className="w-full space-y-3">
            {steps.map((copy, index) => {
              const isCompleted = index < loadingStep
              const isCurrent = index === loadingStep

              return (
                <li
                  key={copy}
                  data-testid={`loading-step-${index}`}
                  className={cn(
                    'flex items-center gap-3 text-sm transition-colors duration-200 ease-out',
                    isCurrent && 'font-medium text-text-primary',
                    isCompleted && 'text-green-text',
                    !isCurrent && !isCompleted && 'text-text-muted'
                  )}
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4 text-green-text" aria-hidden="true" />
                    ) : isCurrent ? (
                      <LoaderCircle
                        className="h-4 w-4 animate-spin text-violet-text"
                        aria-hidden="true"
                      />
                    ) : (
                      <span
                        className="h-2 w-2 rounded-full border border-border-strong"
                        aria-hidden="true"
                      />
                    )}
                  </span>

                  <span
                    data-testid={isCurrent ? 'loading-step-text' : undefined}
                    aria-current={isCurrent ? 'step' : undefined}
                  >
                    {copy}
                  </span>

                  <span className="sr-only">
                    {isCompleted ? '— complete' : isCurrent ? '— in progress' : '— pending'}
                  </span>
                </li>
              )
            })}
          </ol>

          <p className="text-xs text-text-muted">This takes 10–20 seconds</p>
        </div>
      </div>
    </div>
  )
}
