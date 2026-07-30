import Link from 'next/link'
import React from 'react'

export function Navbar() {
  return (
    <nav
      data-testid="navbar"
      aria-label="Main navigation"
      className="sticky top-0 z-50 w-full border-b border-[hsl(var(--card-border)/0.6)] bg-[hsl(var(--bg)/0.8)] backdrop-blur-xl"
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-1 text-base font-bold tracking-tight text-text-primary">
          CareerLens
          <span className="text-[hsl(var(--violet))]">AI</span>
        </Link>

        <div className="flex items-center gap-4">
          <a href="#demo-preview" className="hidden text-sm text-text-muted transition-colors duration-200 hover:text-text-primary sm:inline">
            How it works
          </a>
          <a
            href="#analyze"
            className="inline-flex h-8 items-center rounded-full bg-[hsl(var(--violet))] px-4 text-xs font-semibold text-white transition-all duration-200 hover:shadow-[0_0_20px_hsl(var(--violet)/0.35)] active:scale-[0.97]"
          >
            Analyze Now
          </a>
        </div>
      </div>
    </nav>
  )
}
