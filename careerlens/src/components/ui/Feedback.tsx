'use client'

import { AlertTriangle, CheckCircle2, Info, type LucideIcon, XCircle } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

/* ── Alert ──────────────────────────────────────────────────────────────────
   Inline message tied to a user action. Errors are announced assertively
   because they interrupt a task the user was mid-way through; successes are
   announced politely so they queue behind whatever is being read.            */

type AlertTone = 'error' | 'success' | 'warning' | 'info'

const ALERT_TONES: Record<AlertTone, { className: string; icon: LucideIcon }> = {
  error: {
    className: 'border-[hsl(var(--red)/0.35)] bg-[hsl(var(--red)/0.1)] text-red-text',
    icon: XCircle,
  },
  success: {
    className: 'border-[hsl(var(--green)/0.35)] bg-[hsl(var(--green)/0.1)] text-green-text',
    icon: CheckCircle2,
  },
  warning: {
    className: 'border-[hsl(var(--amber)/0.35)] bg-[hsl(var(--amber)/0.1)] text-amber-text',
    icon: AlertTriangle,
  },
  info: {
    className: 'border-border bg-surface-raised text-text-secondary',
    icon: Info,
  },
}

export function Alert({
  tone = 'info',
  children,
  action,
  className,
}: {
  tone?: AlertTone
  children: ReactNode
  /** Optional recovery affordance, e.g. a retry button. */
  action?: ReactNode
  className?: string
}) {
  const { className: toneClass, icon: Icon } = ALERT_TONES[tone]

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      aria-live={tone === 'error' ? 'assertive' : 'polite'}
      className={cn(
        'flex items-start gap-2.5 rounded-[var(--radius-md)] border px-4 py-3 text-sm',
        toneClass,
        className
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">{children}</div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

/* ── Empty state ───────────────────────────────────────────────────────────── */

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex min-h-48 flex-col items-center justify-center gap-3 rounded-[var(--radius-md)]',
        'border border-dashed border-border bg-[hsl(var(--surface)/0.5)] px-6 py-10 text-center',
        className
      )}
    >
      <Icon className="h-8 w-8 text-text-muted" aria-hidden="true" />
      <p className="text-sm font-medium text-text-secondary">{title}</p>
      {description ? <p className="max-w-md text-sm text-text-muted">{description}</p> : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  )
}

/*
 * `ProgressBar` and `LabelledMeter` lived here and are gone.
 *
 * Both existed to draw the score breakdown — skills, experience and education as
 * three filled bars — and the landing page's mock of it. Those three figures no
 * longer exist in the data model, and a meter takes a `colorVar` whose only
 * caller coloured it by the value it displayed. Nothing else ever used them.
 *
 * If a genuine progress indicator is needed later, it should be written for that
 * purpose rather than recovered from here, since the API these carried was
 * shaped around colouring a figure by how large it was.
 */

/* ── Skeleton ──────────────────────────────────────────────────────────────── */

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-[var(--radius-sm)] bg-surface-hover', className)}
    />
  )
}
