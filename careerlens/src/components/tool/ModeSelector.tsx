import React from 'react'

interface ModeSelectorProps {
  mode: 'job' | 'scholarship'
  onModeChange: (nextMode: 'job' | 'scholarship') => void
}

export function ModeSelector({ mode, onModeChange }: ModeSelectorProps) {
  return (
    <div
      data-testid="mode-toggle"
      role="radiogroup"
      aria-label="Analysis mode"
      className="inline-flex rounded-full border border-[hsl(var(--card-border))] bg-[hsl(var(--bg))] p-1"
    >
      {(['job', 'scholarship'] as const).map((option) => {
        const active = mode === option
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onModeChange(option)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
              active
                ? 'bg-[hsl(var(--violet))] text-white shadow-[0_0_16px_hsl(var(--violet)/0.25)]'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            {option === 'job' ? 'Job Description' : 'Scholarship Criteria'}
          </button>
        )
      })}
    </div>
  )
}
