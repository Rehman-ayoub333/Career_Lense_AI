'use client'

import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import React from 'react'

export function HeroSection() {
  return (
    <section
      data-testid="hero-section"
      className="relative mx-auto flex max-w-6xl flex-col items-center overflow-hidden px-4 pb-16 pt-20 text-center sm:px-6 lg:pb-24 lg:pt-32"
    >
      {/* Radial gradient backdrop */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 70% 50% at 50% 0%, hsl(262 83% 58% / 0.10), transparent 70%)',
        }}
      />

      <div className="relative max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--violet)/0.25)] bg-[hsl(var(--violet-dim))] px-4 py-1.5 text-xs font-medium text-[hsl(var(--violet))]"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--green))]" />
          Free forever &middot; No signup required
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.08, ease: 'easeOut' }}
          className="text-4xl font-black leading-[1.1] tracking-tight text-text-primary sm:text-5xl lg:text-[64px]"
        >
          Stop guessing why your
          <br />
          <span className="bg-gradient-to-r from-[hsl(var(--violet))] via-[hsl(262_83%_68%)] to-[hsl(var(--blue))] bg-clip-text text-transparent">
            CV gets rejected
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
          className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-text-muted sm:text-lg"
        >
          Paste your CV and any job description or scholarship criteria.
          Get your match score, skill gaps, and rewritten CV in seconds.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35, ease: 'easeOut' }}
          className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <a
            href="#analyze"
            className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[hsl(var(--violet))] px-8 text-sm font-semibold text-white shadow-[0_0_24px_hsl(var(--violet)/0.3)] transition-all duration-200 hover:shadow-[0_0_40px_hsl(var(--violet)/0.45)] active:scale-[0.98]"
          >
            Analyze My CV
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </a>
          <a
            href="#demo-preview"
            className="inline-flex h-12 items-center justify-center rounded-full border border-[hsl(var(--card-border))] bg-transparent px-8 text-sm font-medium text-text-muted transition-all duration-200 hover:border-[hsl(var(--text-subtle))] hover:text-text-primary"
          >
            See How It Works
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.55 }}
          className="mt-10 flex items-center justify-center gap-6 text-xs text-text-subtle"
        >
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--green))]" />
            Free forever
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--green))]" />
            No signup
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--green))]" />
            Data never stored
          </span>
        </motion.div>
      </div>
    </section>
  )
}
