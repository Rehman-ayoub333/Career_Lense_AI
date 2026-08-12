import { ExternalLink } from 'lucide-react'
import Link from 'next/link'

import { Container } from '@/components/ui/Container'
import { AUTHOR } from '@/config/site'

/**
 * The colophon.
 *
 * In book production the colophon is the note at the end stating who made the
 * work, where, when, and on what press. It is the printer's signature and the
 * one place a maker is permitted to say plainly what the object is made of.
 *
 * That is the right form for a product built by one person and given away, and
 * it replaces the four-column link farm — a layout borrowed from organisations
 * with a Product department, a Company department and a Legal department, none
 * of which exist here.
 */

const REGISTER = [
  { label: 'The problem', href: '/#the-filter' },
  { label: 'The method', href: '/#how-it-works' },
  { label: 'The output', href: '/#the-result' },
  { label: 'Scholarships', href: '/#scholarships' },
  { label: 'The maker', href: '/#who-built-this' },
  { label: 'Privacy', href: '/privacy' },
] as const

const EXTERNAL = [
  { label: 'GitHub', href: AUTHOR.github },
  { label: 'LinkedIn', href: AUTHOR.linkedin },
] as const

export function Footer() {
  return (
    <footer className="pb-16 pt-24">
      <Container>
        <div className="h-px w-full bg-[hsl(var(--border)/0.7)]" aria-hidden="true" />

        <div className="mt-16 grid gap-16 lg:grid-cols-[1fr_auto] lg:gap-24">
          {/* The statement of manufacture. */}
          <div className="max-w-[52ch]">
            <p className="text-sm leading-relaxed text-text-secondary">
              CareerLens was built by {AUTHOR.name} in Faisalabad, {AUTHOR.location}, in 2026, for
              applicants who kept being rejected by software they were never allowed to see. It is
              free and it stays free. There is no funding behind it, no paid tier, and nothing to
              sell you later.
            </p>

            <p className="mt-8 font-mono text-xs uppercase tracking-[0.14em] text-text-muted">
              Free forever · No account · Nothing stored
            </p>
          </div>

          {/* The register. One ruled list, never four columns of links. */}
          <nav aria-label="Sections" className="lg:min-w-[14rem]">
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-text-muted">
              Contents
            </p>
            <ul className="mt-6 border-t border-border">
              {REGISTER.map((entry) => (
                <li key={entry.href} className="border-b border-border">
                  <Link
                    href={entry.href}
                    className="block py-3 text-sm text-text-secondary transition-colors duration-200 hover:text-text-primary"
                  >
                    {entry.label}
                  </Link>
                </li>
              ))}
              {EXTERNAL.map((entry) => (
                <li key={entry.href} className="border-b border-border">
                  <a
                    href={entry.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 py-3 text-sm text-text-secondary transition-colors duration-200 hover:text-text-primary"
                  >
                    {entry.label}
                    <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-16 flex flex-col gap-4 sm:flex-row sm:items-baseline sm:justify-between">
          <Link
            href="/"
            className="text-sm font-semibold tracking-tight text-text-primary transition-opacity duration-200 hover:opacity-80"
          >
            CareerLens<span className="text-violet-text"> AI</span>
          </Link>
          <p className="tabular font-mono text-xs text-[hsl(var(--text-muted)/0.7)]">
            {AUTHOR.name} · {AUTHOR.location} · 2026
          </p>
        </div>
      </Container>
    </footer>
  )
}
