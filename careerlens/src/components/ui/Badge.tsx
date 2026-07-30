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
 * Keyword or skill chip.
 *
 * Distinct from `Badge`: tags are lower-case, appear in long wrapping lists,
 * and use sentence casing because they contain proper nouns ("TypeScript",
 * "PostgreSQL") that uppercase styling would mangle.
 */
export type TagVariant = 'match' | 'missing' | 'extra' | 'neutral'

const TAG_VARIANTS: Record<TagVariant, string> = {
  match: 'border-[hsl(var(--green)/0.35)] bg-[hsl(var(--green)/0.1)] text-green-text',
  missing: 'border-[hsl(var(--red)/0.35)] bg-[hsl(var(--red)/0.1)] text-red-text',
  extra: 'border-[hsl(var(--amber)/0.35)] bg-[hsl(var(--amber)/0.1)] text-amber-text',
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
