import React from 'react'

interface TagProps {
  label: string
  variant: 'match' | 'missing' | 'extra' | 'neutral'
}

const variantStyles: Record<TagProps['variant'], string> = {
  match: 'border border-green/40 bg-green-dim text-green',
  missing: 'border border-red/40 bg-red-dim text-red',
  extra: 'border border-amber/40 bg-amber-dim text-amber',
  neutral: 'border border-card-border bg-card text-text-muted',
}

export function Tag({ label, variant }: TagProps) {
  return (
    <span
      data-testid={`tag-${variant}`}
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${variantStyles[variant]}`}
    >
      {label}
    </span>
  )
}
