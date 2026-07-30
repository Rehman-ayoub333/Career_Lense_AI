import React from 'react'

interface JDTextareaProps {
  mode: 'job' | 'scholarship'
  value: string
  onChange: (nextValue: string) => void
}

const PLACEHOLDERS = {
  job: 'Paste the full job description here, including responsibilities, required skills, and qualifications.',
  scholarship: 'Paste the scholarship description from DAAD, Stipendium Hungaricum, Chevening, or any program',
}

export function JDTextarea({ mode, value, onChange }: JDTextareaProps) {
  return (
    <div>
      <label htmlFor="jd-textarea" className="mb-2 block text-sm font-medium text-text-primary">
        {mode === 'job' ? 'Job Description' : 'Scholarship Criteria'}
      </label>
      <textarea
        id="jd-textarea"
        data-testid="jd-textarea"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-[200px] w-full resize-y rounded-[var(--radius)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] px-3 py-3 text-sm leading-relaxed text-text-primary placeholder:text-text-subtle outline-none transition-colors duration-200 focus:border-[hsl(var(--violet))] focus:shadow-[0_0_0_1px_hsl(var(--violet)/0.3)]"
        placeholder={PLACEHOLDERS[mode]}
        maxLength={6000}
      />
      <div className="mt-2 text-xs text-text-muted">{value.length} / 6000 characters</div>
    </div>
  )
}
