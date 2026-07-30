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
      title={disabled ? 'Enter at least 100 characters for CV and 50 for job description' : undefined}
      onClick={onClick}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[hsl(var(--violet))] px-6 text-sm font-semibold text-white shadow-[0_0_24px_hsl(var(--violet)/0.3)] transition-all duration-200 hover:shadow-[0_0_40px_hsl(var(--violet)/0.45)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
    >
      <Sparkles className="h-4 w-4" />
      Analyze Match
    </button>
  )
}
