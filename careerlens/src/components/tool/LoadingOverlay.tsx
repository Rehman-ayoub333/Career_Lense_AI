import { LoaderCircle } from 'lucide-react'
import React from 'react'

interface LoadingOverlayProps {
  loadingStep: number
  loadingCopy: string[]
}

export function LoadingOverlay({ loadingStep, loadingCopy }: LoadingOverlayProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Analyzing your CV"
      data-testid="loading-overlay"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(13,17,23,0.85)] backdrop-blur"
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <LoaderCircle className="h-12 w-12 animate-spin text-violet" />
        <div data-testid="loading-step-text" className="text-lg font-semibold text-text-primary">
          {loadingCopy[loadingStep]}
        </div>
        <div className="text-sm text-text-muted">This takes 10–20 seconds. Do not close the tab.</div>
      </div>
    </div>
  )
}
