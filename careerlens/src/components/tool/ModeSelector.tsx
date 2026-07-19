import React from 'react'

interface ModeSelectorProps {
  mode: 'job' | 'scholarship'
  onModeChange: (nextMode: 'job' | 'scholarship') => void
}

export function ModeSelector({ mode, onModeChange }: ModeSelectorProps) {
  return (
    <div data-testid="mode-toggle" className="inline-flex rounded-full border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-1">
      {(['job', 'scholarship'] as const).map((option) => {
        const active = mode === option
        return (
          <button
            key={option}
            type="button"
            onClick={() => onModeChange(option)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              active ? 'bg-violet text-white' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            {option === 'job' ? 'Job Description' : 'Scholarship Criteria'}
          </button>
        )
      })}
    </div>
  )
}
