import type { Metadata } from 'next'
import { Geist, Geist_Mono, Instrument_Serif } from 'next/font/google'

import { Footer } from '@/components/layout/Footer'
import { Navbar } from '@/components/layout/Navbar'
import { AUTHOR, SEO_KEYWORDS, SITE } from '@/config/site'
import { getSiteUrl } from '@/lib/env'

import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

/**
 * The editorial voice.
 *
 * One weight and one style, subset to latin: this face sets a handful of
 * emphasised words, not paragraphs, so anything more is payload the visitor
 * downloads and never sees. `next/font` self-hosts it at build time, which
 * means no third-party request, nothing for the CSP to allow, and a `size-adjust`
 * fallback that removes the layout shift a webfont would otherwise cause.
 */
const instrumentSerif = Instrument_Serif({
  variable: '--font-instrument-serif',
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  display: 'swap',
})

/**
 * The origin, resolved rather than hardcoded.
 *
 * `getSiteUrl()` existed in `lib/env.ts` and was dead: this file declared its own
 * literal instead, so every preview deployment advertised the production domain
 * as its canonical URL and pointed its OG image there too. Reading the resolver
 * means a preview describes itself, and the production origin is configuration
 * (`NEXT_PUBLIC_SITE_URL`) rather than a value baked into the bundle.
 */
const SITE_URL = getSiteUrl()

/** `%s | CareerLens AI` — pages set only their own leaf title. */
const TITLE_DEFAULT = `${SITE.name} — ${SITE.tagline}`

export const metadata: Metadata = {
  title: {
    default: TITLE_DEFAULT,
    template: `%s | ${SITE.name}`,
  },
  // Copy comes from `config/site.ts` so the footer, the share card, the export
  // header and this metadata cannot drift apart — they previously each carried
  // their own near-identical wording.
  description: SITE.description,
  keywords: [...SEO_KEYWORDS],
  authors: [{ name: AUTHOR.name }],
  creator: AUTHOR.name,
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: SITE.locale,
    url: SITE_URL,
    siteName: SITE.name,
    title: TITLE_DEFAULT,
    // The short form: OG and Twitter cards truncate, so the full sentence would
    // be cut mid-clause by the consuming client rather than by us.
    description: SITE.shortDescription,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: TITLE_DEFAULT,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE_DEFAULT,
    description: SITE.shortDescription,
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      {/* The base fill now lives on `html` in globals.css so that `body` can stay
          transparent and the atmosphere layer below can paint behind it. */}
      <body className="min-h-full text-text-primary">
        {/* Purely atmospheric: no content, no pointer target, no accessible name.
            Fixed so the light belongs to the viewport and the page travels
            through it rather than carrying it along. */}
        <div className="atmosphere pointer-events-none fixed inset-0 -z-10" aria-hidden="true" />

        <div className="flex min-h-screen flex-col">
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  )
}
