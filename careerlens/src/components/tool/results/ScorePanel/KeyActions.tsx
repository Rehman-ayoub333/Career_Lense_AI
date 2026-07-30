import { ArrowRight } from 'lucide-react'

export function KeyActions({ items }: { items: string[] }) {
  return (
    <ul data-testid="key-actions" className="space-y-2">
      {items.map((item) => (
        <li
          key={item}
          className="flex items-start gap-2 rounded-[var(--radius-sm)] bg-surface-raised px-3 py-2 text-sm text-text-secondary"
        >
          <ArrowRight
            className="mt-0.5 h-4 w-4 shrink-0 text-violet-text"
            aria-hidden="true"
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}
