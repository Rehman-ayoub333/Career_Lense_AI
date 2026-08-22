import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

/**
 * Status pill.
 *
 * Two notes on accessibility, both fixing real defects in the previous version:
 *
 * 1. It no longer carries `role="status"`. That role is an ARIA live region, so
 *    every badge on the page announced itself on mount and again on any change —
 *    a results screen with eleven badges produced eleven interruptions. Badges
 *    are static labels; they should be read in document order like other text.
 *
 * 2. Colour is not the only signal. Each variant is paired with a text label by
 *    the caller, and the border and background differ per variant, so the
 *    meaning survives for users who cannot distinguish the hues.
 */

export type BadgeVariant = 'pass' | 'fail' | 'warn' | 'info' | 'neutral'

const VARIANTS: Record<BadgeVariant, string> = {
  pass: 'border-[hsl(var(--green)/0.35)] bg-[hsl(var(--green)/0.12)] text-green-text',
  fail: 'border-[hsl(var(--red)/0.35)] bg-[hsl(var(--red)/0.12)] text-red-text',
  warn: 'border-[hsl(var(--amber)/0.35)] bg-[hsl(var(--amber)/0.12)] text-amber-text',
  info: 'border-[hsl(var(--violet)/0.35)] bg-[hsl(var(--violet)/0.14)] text-violet-text',
  neutral: 'border-border bg-surface-raised text-text-secondary',
}

export interface BadgeProps {
  variant?: BadgeVariant
  children: ReactNode
  className?: string
}

export function Badge({ variant = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1',
        'text-xs font-semibold uppercase tracking-[0.08em]',
        VARIANTS[variant],
        className
      )}
    >
      {children}
    </span>
  )
}

/**
 * Verification-tier chip.
 *
 * Distinct from `Badge`: tags are lower-case, appear in long wrapping lists,
 * and use sentence casing because they contain proper nouns ("TypeScript",
 * "PostgreSQL") that uppercase styling would mangle.
 *
 * ## Why these four, and why `missing` is gone
 *
 * The variants used to be `match`/`missing`/`extra`, and `missing` was red. That
 * meant a requirement the CV happened not to mention was painted in the same
 * colour as a network failure — the system rendering an absence of evidence as
 * if it were a fault, and by implication a fault in the person. It is the exact
 * doctrinal violation this redesign exists to close.
 *
 * The vocabulary is now the verification tier itself, which describes the
 * *evidence*: found (`verified`), found weakly (`uncertain`), not found
 * (`unresolved`). `unresolved` uses the dedicated calm slate token, never red —
 * see ADR-06. There is no longer a red variant here for a component to reach
 * for, which is what makes the fix structural rather than a matter of everyone
 * remembering.
 */
export type TagVariant = 'verified' | 'uncertain' | 'unresolved' | 'neutral'

export const TAG_VARIANTS: Record<TagVariant, string> = {
  verified: 'border-[hsl(var(--green)/0.35)] bg-[hsl(var(--green)/0.1)] text-green-text',
  uncertain: 'border-[hsl(var(--amber)/0.35)] bg-[hsl(var(--amber)/0.1)] text-amber-text',
  unresolved:
    'border-[hsl(var(--unresolved)/0.4)] bg-[hsl(var(--unresolved)/0.12)] text-unresolved-text',
  neutral: 'border-border bg-surface-raised text-text-secondary',
}

export function Tag({
  variant = 'neutral',
  children,
  className,
}: {
  variant?: TagVariant
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium',
        TAG_VARIANTS[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
