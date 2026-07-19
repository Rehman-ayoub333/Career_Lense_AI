import { ArrowRight } from 'lucide-react'
import React from 'react'

export function HeroSection() {
  return (
    <section data-testid="hero-section" className="mx-auto flex max-w-6xl flex-col items-center px-4 py-16 text-center sm:px-6 lg:py-20">
      <div className="max-w-4xl">
        <h1 className="text-4xl font-black tracking-tight text-text-primary sm:text-5xl lg:text-6xl">
          Stop guessing why your CV gets rejected
        </h1>
        <p className="mx-auto mt-4 max-w-3xl text-base text-text-muted sm:text-lg">
          Upload your CV, paste any job description or scholarship criteria. Get your match score, skill gaps, and a rewritten CV in 30 seconds. Free. No signup.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a href="#analyze" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-violet px-6 text-sm font-semibold text-white shadow-[0_0_20px_hsl(var(--violet)/0.35)]">
            Analyze My CV <ArrowRight className="h-4 w-4" />
          </a>
          <a href="#analyze" className="inline-flex h-12 items-center justify-center rounded-full border border-violet/40 bg-transparent px-6 text-sm font-semibold text-violet">
            See How It Works
          </a>
        </div>
        <p className="mt-4 text-sm text-text-muted">Free forever · No signup · Your data never stored</p>
      </div>
    </section>
  )
}
