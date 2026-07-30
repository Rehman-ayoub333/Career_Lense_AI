'use client'

import { cn } from '@/lib/cn'
import type { AnalysisMode } from '@/types'

const OPTIONS: readonly { id: AnalysisMode; label: string }[] = [
  { id: 'job', label: 'Job Description' },
  { id: 'scholarship', label: 'Scholarship Criteria' },
]

export function ModeSelector({
  mode,
  onModeChange,
}: {
  mode: AnalysisMode
  onModeChange: (next: AnalysisMode) => void
}) {
  return (
    <div
      data-testid="mode-toggle"
      role="radiogroup"
      aria-label="Analysis mode"
      className="inline-flex rounded-full border border-border bg-bg p-1"
    >
      {OPTIONS.map(({ id, label }) => {
        const active = mode === id
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onModeChange(id)}
            className={cn(
              'h-9 rounded-full px-4 text-sm font-medium',
              'transition-[background-color,color,box-shadow] duration-200 ease-out',
              active
                ? 'bg-violet text-white shadow-[var(--glow-violet)]'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
