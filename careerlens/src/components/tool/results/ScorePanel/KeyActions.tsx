import { ArrowRight } from 'lucide-react'
import React from 'react'

interface KeyActionsProps {
  items: string[]
}

export function KeyActions({ items }: KeyActionsProps) {
  return (
    <div data-testid="key-actions" className="space-y-2">
      {items.map((item) => (
        <div key={item} className="flex items-start gap-2 rounded-[var(--radius)] bg-[hsl(var(--card-hover))] px-3 py-2 text-sm text-text-muted">
          <ArrowRight className="mt-0.5 h-4 w-4 text-[hsl(var(--violet))]" />
          <span>{item}</span>
        </div>
      ))}
    </div>
  )
}
