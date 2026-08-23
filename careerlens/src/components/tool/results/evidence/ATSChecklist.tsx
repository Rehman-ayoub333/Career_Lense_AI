import { cn } from '@/lib/cn'
import type { ATSCheck, ATSStatus } from '@/types'

/**
 * The eight applicant-tracking-system checks.
 *
 * These are about the document's *form* — whether a machine can read it — not
 * about the candidate's fit, which is why they are a separate array from
 * `claims` and are rendered here rather than marked inline. There is no span in
 * a CV to highlight for "your dates are inconsistent".
 *
 * A failing check is genuinely a defect in the file, so amber and red are
 * legitimate here in a way they never are for a claim: this says something about
 * formatting, not about a person. The status is still carried by a word as well
 * as a colour.
 */

const STATUS_LABEL: Record<ATSStatus, string> = {
  pass: 'Pass',
  warn: 'Check',
  fail: 'Fix',
}

const STATUS_CLASS: Record<ATSStatus, string> = {
  pass: 'border-[hsl(var(--green)/0.35)] text-green-text',
  warn: 'border-[hsl(var(--amber)/0.35)] text-amber-text',
  fail: 'border-[hsl(var(--red)/0.35)] text-red-text',
}

export function ATSChecklist({ checks }: { checks: ATSCheck[] }) {
  if (checks.length === 0) {
    return (
      <p data-testid="ats-checklist" className="text-sm leading-relaxed text-text-muted">
        No formatting checks were returned for this analysis.
      </p>
    )
  }

  const passed = checks.filter((check) => check.status === 'pass').length

  return (
    <div data-testid="ats-checklist">
      <p className="text-sm text-text-secondary">
        <span className="sr-only">
          {passed} of {checks.length} formatting checks passed.
        </span>
        <span aria-hidden="true">
          <span className="tabular text-text-primary">
            {passed} / {checks.length}
          </span>{' '}
          formatting checks passed
        </span>
      </p>

      <ul className="mt-4 space-y-3">
        {checks.map((check) => (
          <li key={check.id}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm text-text-secondary">{check.label}</span>
              <span
                className={cn(
                  'shrink-0 rounded-full border px-2 py-0.5 font-mono text-xs',
                  STATUS_CLASS[check.status]
                )}
              >
                {STATUS_LABEL[check.status]}
              </span>
            </div>

            <p className="mt-1 text-xs leading-relaxed text-text-muted">{check.note}</p>

            {/* Shown, not hidden. `source` exists so a reader can tell a
                measurement from the model's opinion, and a transparency field
                that never reaches the reader is not transparency. */}
            <p className="mt-1 font-mono text-xs text-[hsl(var(--text-muted)/0.7)]">
              {check.source === 'deterministic' ? 'Checked in your CV text' : 'Assessed by the model'}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}
