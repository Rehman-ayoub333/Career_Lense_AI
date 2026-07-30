import { ExternalLink } from 'lucide-react'
import Link from 'next/link'

import { AUTHOR } from '@/config/site'

const EXTERNAL_LINKS = [
  { label: 'GitHub', href: AUTHOR.github },
  { label: 'LinkedIn', href: AUTHOR.linkedin },
] as const

export function Footer() {
  return (
    <footer className="border-t border-border px-4 py-8 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
        <div>
          <div className="text-sm font-semibold tracking-tight text-text-primary">
            CareerLens <span className="text-violet-text">AI</span>
          </div>
          <div className="mt-1 text-xs text-text-muted">
            Built by {AUTHOR.name} · {AUTHOR.location} · 2026
          </div>
        </div>

        <div className="flex items-center gap-6 text-xs text-text-secondary">
          <Link href="/privacy" className="transition-colors duration-200 hover:text-text-primary">
            Privacy
          </Link>
          {EXTERNAL_LINKS.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 transition-colors duration-200 hover:text-text-primary"
            >
              {label}
              <ExternalLink className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden="true" />
            </a>
          ))}
        </div>
      </div>
    </footer>
  )
}
