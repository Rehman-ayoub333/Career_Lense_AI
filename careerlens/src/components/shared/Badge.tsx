import React from 'react'

interface BadgeProps {
  label: string
  variant: 'pass' | 'fail' | 'warn' | 'info'
}

const badgeStyles: Record<BadgeProps['variant'], string> = {
  pass: 'border border-green/30 bg-green-dim text-green',
  fail: 'border border-red/30 bg-red-dim text-red',
  warn: 'border border-amber/30 bg-amber-dim text-amber',
  info: 'border border-violet/30 bg-violet-dim text-violet',
}

export function Badge({ label, variant }: BadgeProps) {
  return (
    <span
      role="status"
      className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${badgeStyles[variant]}`}
    >
      {label}
    </span>
  )
}
