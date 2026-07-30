'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, Info, type LucideIcon, XCircle } from 'lucide-react'
import type { ReactNode } from 'react'

import { MOTION } from '@/config/design-tokens'
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

/* ── Progress bar ──────────────────────────────────────────────────────────── */

export function ProgressBar({
  value,
  colorVar,
  label,
  className,
}: {
  /** 0-100. Clamped defensively. */
  value: number
  /** CSS colour expression, e.g. `hsl(var(--blue))`. */
  colorVar: string
  /** Accessible name. Omit when an adjacent label already names the bar. */
  label?: string
  className?: string
}) {
  const clamped = Math.max(0, Math.min(100, value))
  const reduceMotion = useReducedMotion()

  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-[hsl(var(--border)/0.7)]', className)}
    >
      <motion.div
        // `scaleX` rather than `width`: a width animation invalidates layout on
        // every frame, a transform is composited and stays on the GPU.
        style={{ backgroundColor: colorVar, transformOrigin: 'left center' }}
        initial={reduceMotion ? { scaleX: clamped / 100 } : { scaleX: 0 }}
        animate={{ scaleX: clamped / 100 }}
        transition={
          reduceMotion ? { duration: 0 } : { duration: 0.7, ease: MOTION.easeOut }
        }
        className="h-full w-full rounded-full"
      />
    </div>
  )
}

/**
 * A progress bar with its label and value.
 *
 * The score breakdown and the landing-page demo each rendered this three-part
 * row by hand, with the label row's type and spacing declared independently in
 * both — so the marketing preview and the real product drifted apart.
 */
export function LabelledMeter({
  label,
  value,
  colorVar,
  valueTestId,
  className,
}: {
  label: string
  /** 0-100. */
  value: number
  colorVar: string
  /** Stable hook for end-to-end tests, applied to the numeric value. */
  valueTestId?: string
  className?: string
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between text-xs text-text-secondary">
        <span>{label}</span>
        <span className="tabular" data-testid={valueTestId}>
          {value}%
        </span>
      </div>
      {/* `role="progressbar"` requires an accessible name, and the visible text
          is a sibling rather than a label element, so it is passed explicitly. */}
      <ProgressBar value={value} colorVar={colorVar} label={label} />
    </div>
  )
}

/* ── Skeleton ──────────────────────────────────────────────────────────────── */

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-[var(--radius-sm)] bg-surface-hover', className)}
    />
  )
}
