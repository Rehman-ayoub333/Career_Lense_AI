import { CheckCircle2, LoaderCircle } from 'lucide-react'
import React from 'react'

interface LoadingOverlayProps {
  loadingStep: number
  loadingCopy: readonly string[]
}

export function LoadingOverlay({ loadingStep, loadingCopy }: LoadingOverlayProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Analyzing your CV"
      data-testid="loading-overlay"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[hsl(var(--bg)/0.88)] backdrop-blur-sm"
    >
      <div className="flex flex-col items-center gap-8 px-6 text-center">
        {/* Primary spinner */}
        <LoaderCircle className="h-10 w-10 animate-spin text-[hsl(var(--violet))]" />

        {/* Step list — progress is driven by real API completion events */}
        <ol className="space-y-3" aria-label="Analysis progress">
          {loadingCopy.map((copy, index) => {
            const isCompleted = index < loadingStep
            const isCurrent = index === loadingStep

            return (
              <li
                key={copy}
                data-testid={`loading-step-${index}`}
                className={`flex items-center gap-3 text-sm transition-all duration-300 ${
                  isCurrent
                    ? 'font-semibold text-text-primary'
                    : isCompleted
                      ? 'text-[hsl(var(--green))]'
                      : 'text-text-subtle'
                }`}
              >
                <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4 text-[hsl(var(--green))]" aria-hidden />
                  ) : isCurrent ? (
                    <LoaderCircle className="h-4 w-4 animate-spin text-[hsl(var(--violet))]" aria-hidden />
                  ) : (
                    <span
                      className="h-2 w-2 rounded-full border border-[hsl(var(--card-border))] bg-transparent"
                      aria-hidden
                    />
                  )}
                </span>

                <span
                  data-testid={isCurrent ? 'loading-step-text' : undefined}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {copy}
                </span>

                {/* Visually hidden state for screen readers */}
                <span className="sr-only">
                  {isCompleted ? '— complete' : isCurrent ? '— in progress' : '— pending'}
                </span>
              </li>
            )
          })}
        </ol>

        <p className="text-sm text-text-muted">This takes 10–20 seconds. Do not close the tab.</p>
      </div>
    </div>
  )
}
