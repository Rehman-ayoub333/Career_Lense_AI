'use client'

import { useId } from 'react'

import { cn } from '@/lib/cn'

/**
 * Labelled textarea with a live character budget.
 *
 * The CV and description fields duplicated this markup, and their `maxLength`
 * values were set independently of the server's limits — the description box
 * accepted 6 000 characters while the API truncated at 4 000, silently
 * discarding a third of a long posting with no indication to the user. Limits
 * now come from `lib/analysis/constants`, shared by both sides.
 */

export interface TextareaFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** Server-enforced maximum. Also applied as `maxLength`. */
  maxLength: number
  /** Server-enforced minimum, used to render "n more needed" guidance. */
  minLength: number
  rows?: number
  /** Extra guidance rendered under the label. */
  hint?: string
  /** Stable hook for end-to-end tests. */
  testId?: string
  className?: string
}

export function TextareaField({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  minLength,
  rows = 8,
  hint,
  testId,
  className,
}: TextareaFieldProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const counterId = `${id}-counter`

  const length = value.length
  const remaining = minLength - length
  const isBelowMinimum = remaining > 0 && length > 0
  const isNearLimit = length > maxLength * 0.9

  return (
    <div className={cn('flex flex-col', className)}>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-text-primary">
        {label}
      </label>

      {hint ? (
        <p id={hintId} className="mb-2 text-xs text-text-muted">
          {hint}
        </p>
      ) : null}

      <textarea
        id={id}
        data-testid={testId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={rows}
        // Both the hint and the counter are associated, so a screen reader
        // announces the remaining budget when the field receives focus.
        aria-describedby={cn(hint ? hintId : undefined, counterId)}
        spellCheck={false}
        className={cn(
          'w-full flex-1 resize-y rounded-[var(--radius-md)] border border-border bg-bg',
          'px-4 py-3 text-sm leading-relaxed text-text-primary placeholder:text-text-muted',
          'outline-none transition-[border-color,box-shadow] duration-200 ease-out',
          'focus:border-violet focus:shadow-[var(--shadow-focus)]'
        )}
      />

      <div className="mt-1.5 flex items-center justify-between gap-3 text-xs">
        <span className="text-text-muted">
          {isBelowMinimum ? `${remaining} more character${remaining === 1 ? '' : 's'} needed` : ''}
        </span>
        <span
          id={counterId}
          // Polite rather than assertive: a counter should never interrupt typing.
          aria-live="polite"
          aria-atomic="true"
          className={cn('tabular shrink-0', isNearLimit ? 'text-amber-text' : 'text-text-muted')}
        >
          {length.toLocaleString()} / {maxLength.toLocaleString()}
        </span>
      </div>
    </div>
  )
}
