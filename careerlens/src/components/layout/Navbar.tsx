'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import Link from 'next/link'

import { buttonClasses } from '@/components/ui/Button'

/**
 * Application chrome.
 *
 * Glass arrives rather than being permanent: over the hero the bar is bodiless,
 * so the artwork is not sitting under a grey shelf, and it acquires a surface
 * only once there is content to separate itself from. That is the whole
 * interaction — there is no height compression, because animating `height`
 * relayouts the document on every frame, and a one-off scroll effect is not
 * worth the jank on the mid-range laptops this audience actually uses.
 *
 * The surface is therefore a separate absolutely-positioned layer whose
 * `opacity` is driven straight from scroll position. Framer writes the value to
 * the DOM without a React render, so scrolling costs no reconciliation and the
 * property being animated stays on the compositor.
 *
 * The links are also no longer conditional. `useLandingVisible` existed because
 * the tool shared this page and unmounted the sections the navbar pointed at;
 * with the tool on `/analyze` the anchors always exist, and the bar stops
 * changing shape underneath the user.
 */
/** Destinations that exist on the landing page today. Nothing speculative. */
const NAV_ENTRIES = [
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'Scholarships', href: '/#scholarships' },
  { label: 'The maker', href: '/#who-built-this' },
] as const

export function Navbar() {
  const { scrollY } = useScroll()

  // Fully transparent across the first 80px, matched to the hero's top padding
  // so the transition finishes before any content reaches the bar.
  const surfaceOpacity = useTransform(scrollY, [0, 80], [0, 1])

  return (
    <nav
      data-testid="navbar"
      aria-label="Main navigation"
      className="sticky top-0 z-50 w-full"
    >
      <motion.div
        aria-hidden="true"
        style={{ opacity: surfaceOpacity }}
        className="absolute inset-0 border-b border-border bg-[var(--glass-bg)] backdrop-blur-[var(--glass-blur)]"
      />

      <div className="relative mx-auto flex h-18 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="text-[15px] font-semibold tracking-tight text-text-primary transition-opacity duration-200 hover:opacity-80"
        >
          CareerLens
          {/* `--violet` is a fill colour — 3.44:1 on the page background, below
              AA. `--violet-text` is its accessible sibling at 7.94:1 and the
              only form legal for text. */}
          <span className="text-violet-text"> AI</span>
        </Link>

        <div className="flex items-center gap-6">
          {/* Entries name destinations that exist. Each matches the section's
              own heading vocabulary exactly, so a reader never has to translate
              between what the nav calls a thing and what the page calls it. */}
          {NAV_ENTRIES.map((entry) => (
            <Link
              key={entry.href}
              href={entry.href}
              className="hidden text-sm text-text-secondary transition-colors duration-200 hover:text-text-primary md:inline"
            >
              {entry.label}
            </Link>
          ))}

          {/* With the tool off the landing page, this is the only persistent
              route into the product — it stays visible at every breakpoint. */}
          <Link href="/analyze" className={buttonClasses({ size: 'sm' })}>
            Analyse my CV
          </Link>
        </div>
      </div>
    </nav>
  )
}
