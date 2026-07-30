import React from 'react'

interface JDTextareaProps {
  mode: 'job' | 'scholarship'
  value: string
  onChange: (nextValue: string) => void
}

const PLACEHOLDERS = {
  job: 'Paste the full job description here.\n\nInclude responsibilities, required skills, and qualifications for the best analysis.',
  scholarship: 'Paste the scholarship criteria here.\n\nInclude eligibility requirements, evaluation criteria, and program details.',
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
        className="min-h-[220px] w-full resize-y rounded-[var(--radius)] border border-[hsl(var(--card-border))] bg-[hsl(var(--bg))] px-4 py-3 text-sm leading-relaxed text-text-primary placeholder:text-text-subtle outline-none transition-all duration-200 focus:border-[hsl(var(--violet))] focus:shadow-[0_0_0_3px_hsl(var(--violet)/0.1)]"
        placeholder={PLACEHOLDERS[mode]}
        maxLength={6000}
      />
      <div className="mt-1.5 flex justify-end text-[11px] tabular-nums text-text-subtle">
        {value.length.toLocaleString()} / 6,000
      </div>
    </div>
  )
}
