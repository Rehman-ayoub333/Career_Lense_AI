'use client'

import { AlertTriangle, RotateCcw } from 'lucide-react'

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md items-center justify-center px-4 py-12">
      <div className="w-full rounded-[var(--radius-lg)] border border-[hsl(var(--red)/0.2)] bg-[hsl(var(--card))] p-8 text-center shadow-[var(--shadow-card)]">
        <div className="mx-auto mb-4 inline-flex rounded-full bg-[hsl(var(--red-dim))] p-3">
          <AlertTriangle className="h-6 w-6 text-[hsl(var(--red))]" />
        </div>
        <h1 className="text-xl font-bold text-text-primary">Something went wrong</h1>
        <p className="mt-2 text-sm text-text-muted">An unexpected error occurred. Please try again.</p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[hsl(var(--violet))] px-6 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:shadow-[0_0_20px_hsl(var(--violet)/0.3)] active:scale-[0.98]"
        >
          <RotateCcw className="h-4 w-4" />
          Try again
        </button>
      </div>
    </main>
  )
}
