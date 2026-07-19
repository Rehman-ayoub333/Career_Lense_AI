import { Sparkles } from 'lucide-react'
import React from 'react'

interface AnalyzeButtonProps {
  cvText: string
  jdText: string
  step: 'input' | 'loading' | 'results'
  onClick: () => void
}

export function AnalyzeButton({ cvText, jdText, step, onClick }: AnalyzeButtonProps) {
  const disabled = cvText.length < 100 || jdText.length < 50 || step === 'loading'

  return (
    <button
      data-testid="analyze-button"
      type="button"
      disabled={disabled}
      title={disabled ? 'Please upload your CV and paste a job description' : undefined}
      onClick={onClick}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-violet px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Sparkles className="h-4 w-4" />
      Analyze Match
    </button>
  )
}
