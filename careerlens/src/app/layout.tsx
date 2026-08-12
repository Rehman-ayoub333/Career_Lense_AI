import type { Metadata } from 'next'
import { Geist, Geist_Mono, Instrument_Serif } from 'next/font/google'

import { Footer } from '@/components/layout/Footer'
import { Navbar } from '@/components/layout/Navbar'

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

const SITE_URL = 'https://careerlens.vercel.app'

export const metadata: Metadata = {
  title: {
    default: 'CareerLens AI — CV Match Score & ATS Analysis',
    template: '%s | CareerLens AI',
  },
  description:
    'Free AI-powered CV analyzer. Get your match score, ATS compatibility check, skill gap analysis, and rewritten CV bullets in 30 seconds. Supports job descriptions and scholarship criteria.',
  keywords: [
    'CV analyzer',
    'ATS check',
    'resume scanner',
    'job match score',
    'scholarship CV',
    'DAAD application',
    'Stipendium Hungaricum',
    'Chevening',
    'AI resume',
    'career tools',
    'skill gap analysis',
  ],
  authors: [{ name: 'Rehman Ayoub' }],
  creator: 'Rehman Ayoub',
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: 'CareerLens AI',
    title: 'CareerLens AI — CV Match Score & ATS Analysis',
    description:
      'Free AI-powered CV analyzer. Match score, ATS check, skill gaps, and rewritten bullets in 30 seconds.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'CareerLens AI — CV Match Score & ATS Analysis',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CareerLens AI — CV Match Score & ATS Analysis',
    description:
      'Free AI-powered CV analyzer. Match score, ATS check, skill gaps, and rewritten bullets in 30 seconds.',
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
