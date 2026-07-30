import React from 'react'

interface CVTextareaProps {
  value: string
  onChange: (nextValue: string) => void
}

const CV_PLACEHOLDER = 'Paste your full CV or resume text here.\n\nInclude experience, education, projects, and skills so the analysis can compare your profile against the opportunity.'

export function CVTextarea({ value, onChange }: CVTextareaProps) {
  return (
    <div>
      <label htmlFor="cv-textarea" className="mb-2 block text-sm font-medium text-text-primary">
        Your CV
      </label>
      <textarea
        id="cv-textarea"
        data-testid="cv-textarea"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-[180px] w-full resize-y rounded-[var(--radius)] border border-[hsl(var(--card-border))] bg-[hsl(var(--bg))] px-4 py-3 text-sm leading-relaxed text-text-primary placeholder:text-text-subtle outline-none transition-all duration-200 focus:border-[hsl(var(--violet))] focus:shadow-[0_0_0_3px_hsl(var(--violet)/0.1)]"
        placeholder={CV_PLACEHOLDER}
        maxLength={8000}
      />
      <div className="mt-1.5 flex justify-end text-[11px] tabular-nums text-text-subtle">
        {value.length.toLocaleString()} / 8,000
      </div>
    </div>
  )
}
