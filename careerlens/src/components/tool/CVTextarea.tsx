import React from 'react'

interface CVTextareaProps {
  value: string
  onChange: (nextValue: string) => void
}

const CV_PLACEHOLDER = 'Paste your full CV or resume text here. Include experience, education, projects, and skills so the analysis can compare your profile against the opportunity.'

export function CVTextarea({ value, onChange }: CVTextareaProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-text-primary">Or paste your CV text</label>
      <textarea
        data-testid="cv-textarea"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-[160px] w-full rounded-[var(--radius)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] px-3 py-3 text-sm text-text-primary outline-none transition focus:border-violet"
        placeholder={CV_PLACEHOLDER}
        maxLength={8000}
      />
      <div className="mt-2 text-xs text-text-muted">{value.length} / 8000 characters</div>
    </div>
  )
}
