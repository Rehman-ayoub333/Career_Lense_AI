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
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[hsl(var(--bg)/0.92)] backdrop-blur-md"
    >
      <div className="mx-4 w-full max-w-sm rounded-[var(--radius-lg)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-8 shadow-[var(--shadow-elevated)]">
        <div className="flex flex-col items-center gap-6 text-center">
          <LoaderCircle className="h-8 w-8 animate-spin text-[hsl(var(--violet))]" />

          <ol className="w-full space-y-3" aria-label="Analysis progress">
            {loadingCopy.map((copy, index) => {
              const isCompleted = index < loadingStep
              const isCurrent = index === loadingStep

              return (
                <li
                  key={copy}
                  data-testid={`loading-step-${index}`}
                  className={`flex items-center gap-3 text-sm transition-all duration-300 ${
                    isCurrent
                      ? 'font-medium text-text-primary'
                      : isCompleted
                        ? 'text-[hsl(var(--green))]'
                        : 'text-text-subtle'
                  }`}
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4 text-[hsl(var(--green))]" aria-hidden />
                    ) : isCurrent ? (
                      <LoaderCircle className="h-4 w-4 animate-spin text-[hsl(var(--violet))]" aria-hidden />
                    ) : (
                      <span
                        className="h-2 w-2 rounded-full border border-[hsl(var(--card-border))]"
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

                  <span className="sr-only">
                    {isCompleted ? '— complete' : isCurrent ? '— in progress' : '— pending'}
                  </span>
                </li>
              )
            })}
          </ol>

          <p className="text-xs text-text-subtle">This takes 10–20 seconds</p>
        </div>
      </div>
    </div>
  )
}
