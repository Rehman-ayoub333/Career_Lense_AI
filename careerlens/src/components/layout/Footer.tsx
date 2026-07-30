import { ExternalLink } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

export function Footer() {
  return (
    <footer className="border-t border-[hsl(var(--card-border)/0.6)] px-4 py-8 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
        <div>
          <div className="text-sm font-bold tracking-tight text-text-primary">
            CareerLens <span className="text-[hsl(var(--violet))]">AI</span>
          </div>
          <div className="mt-1 text-xs text-text-subtle">Built by Rehman Ayoub · Pakistan · 2026</div>
        </div>

        <div className="flex items-center gap-5 text-xs text-text-muted">
          <Link href="/privacy" className="transition-colors duration-200 hover:text-text-primary">
            Privacy
          </Link>
          <a
            href="https://github.com/rehmanayoub/careerlens-ai"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 transition-colors duration-200 hover:text-text-primary"
          >
            GitHub
            <ExternalLink className="h-3 w-3" />
          </a>
          <a
            href="https://linkedin.com/in/rehmanayoub"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 transition-colors duration-200 hover:text-text-primary"
          >
            LinkedIn
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </footer>
  )
}
