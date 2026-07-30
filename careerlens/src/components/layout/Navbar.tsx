import Link from 'next/link'

import { LinkButton } from '@/components/ui/Button'

export function Navbar() {
  return (
    <nav
      data-testid="navbar"
      aria-label="Main navigation"
      className="sticky top-0 z-50 w-full border-b border-border bg-[var(--glass-bg)] backdrop-blur-[var(--glass-blur)]"
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-1 text-base font-semibold tracking-tight text-text-primary"
        >
          CareerLens
          {/* `--violet` is a fill colour — 3.44:1 on the page background, below
              AA. `--violet-text` is its accessible sibling at 7.94:1 and the
              only form legal for text. */}
          <span className="text-violet-text">AI</span>
        </Link>

        <div className="flex items-center gap-4">
          <a
            href="#demo-preview"
            className="hidden text-sm text-text-secondary transition-colors duration-200 hover:text-text-primary sm:inline"
          >
            How it works
          </a>
          <LinkButton href="#analyze" size="sm">
            Analyze Now
          </LinkButton>
        </div>
      </div>
    </nav>
  )
}
