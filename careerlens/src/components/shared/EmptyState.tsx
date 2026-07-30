import type { LucideIcon } from 'lucide-react'
import React from 'react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  subtitle?: string
}

export function EmptyState({ icon: Icon, title, subtitle }: EmptyStateProps) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-[var(--radius)] border border-dashed border-[hsl(var(--card-border))] bg-[hsl(var(--card)/0.4)] px-6 py-10 text-center">
      <Icon className="h-8 w-8 text-text-muted" />
      <div className="text-sm font-medium text-text-muted">{title}</div>
      {subtitle ? <div className="max-w-md text-sm text-text-subtle">{subtitle}</div> : null}
    </div>
  )
}
