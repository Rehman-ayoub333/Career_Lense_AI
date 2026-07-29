'use client'

import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import React from 'react'

export function HeroSection() {
  return (
    <section
      data-testid="hero-section"
      className="relative mx-auto flex max-w-6xl flex-col items-center overflow-hidden px-4 py-16 text-center sm:px-6 lg:py-24"
    >
      {/* Subtle radial gradient background */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 0%, hsl(262 83% 58% / 0.08), transparent)',
        }}
      />

      <div className="relative max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--violet)/0.3)] bg-[hsl(var(--violet-dim))] px-3 py-1 text-xs font-semibold text-[hsl(var(--violet))]"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--violet))]" />
          Free forever. No signup required.
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
          className="text-4xl font-black tracking-tight text-text-primary sm:text-5xl lg:text-6xl"
        >
          Stop guessing why your
          <br />
          <span className="bg-gradient-to-r from-[hsl(var(--violet))] to-[hsl(var(--blue))] bg-clip-text text-transparent">
            CV gets rejected
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25, ease: 'easeOut' }}
          className="mx-auto mt-6 max-w-2xl text-base text-text-muted sm:text-lg"
        >
          Upload your CV, paste any job description or scholarship criteria.
          Get your match score, skill gaps, and a rewritten CV in 30 seconds.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4, ease: 'easeOut' }}
          className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <a
            href="#analyze"
            className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[hsl(var(--violet))] px-6 text-sm font-semibold text-white shadow-[0_0_24px_hsl(var(--violet)/0.35)] transition hover:shadow-[0_0_36px_hsl(var(--violet)/0.5)]"
          >
            Analyze My CV
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </a>
          <a
            href="#demo-preview"
            className="inline-flex h-12 items-center justify-center rounded-full border border-[hsl(var(--violet)/0.3)] bg-transparent px-6 text-sm font-semibold text-[hsl(var(--violet))] transition hover:bg-[hsl(var(--violet-dim))]"
          >
            See How It Works
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-8 flex items-center justify-center gap-6 text-xs text-text-subtle"
        >
          <span className="flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-[hsl(var(--green))]" />
            Free forever
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-[hsl(var(--green))]" />
            No signup
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-[hsl(var(--green))]" />
            Data never stored
          </span>
        </motion.div>
      </div>
    </section>
  )
}
