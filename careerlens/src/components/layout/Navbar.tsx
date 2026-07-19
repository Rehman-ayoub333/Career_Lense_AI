import React from 'react'

export function Navbar() {
  return (
    <nav
      data-testid="navbar"
      className="sticky top-0 z-50 w-full border-b border-[hsl(var(--card-border))] bg-[hsl(var(--bg))]/80 backdrop-blur"
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-text-primary sm:text-base">
          <span className="text-base">🎯</span>
          <span>CareerLens</span>
          <span className="text-violet">AI</span>
        </div>

        <div className="flex items-center gap-3">
          <a href="#analyze" className="text-sm text-text-muted transition hover:text-text-primary">
            How it works
          </a>
          <a
            href="#analyze"
            className="inline-flex h-8 items-center rounded-full bg-violet px-3 text-xs font-semibold text-white"
          >
            Analyze Now
          </a>
        </div>
      </div>
    </nav>
  )
}
