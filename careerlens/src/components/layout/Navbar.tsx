import Link from 'next/link'
import React from 'react'

export function Navbar() {
  return (
    <nav
      data-testid="navbar"
      aria-label="Main navigation"
      className="sticky top-0 z-50 w-full border-b border-[hsl(var(--card-border))] bg-[hsl(var(--bg)/0.85)] backdrop-blur-md"
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-1.5 text-sm font-semibold text-text-primary sm:text-base">
          CareerLens
          <span className="text-[hsl(var(--violet))]">AI</span>
        </Link>

        <div className="flex items-center gap-3">
          <a href="#demo-preview" className="hidden text-sm text-text-muted transition hover:text-text-primary sm:inline">
            How it works
          </a>
          <a
            href="#analyze"
            className="inline-flex h-8 items-center rounded-full bg-[hsl(var(--violet))] px-3 text-xs font-semibold text-white transition-all duration-200 hover:shadow-[0_0_16px_hsl(var(--violet)/0.3)] active:scale-[0.96]"
          >
            Analyze Now
          </a>
        </div>
      </div>
    </nav>
  )
}
