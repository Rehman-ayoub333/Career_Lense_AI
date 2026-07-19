import { Copy, RotateCcw } from 'lucide-react'
import React from 'react'

import type { RewriteResult } from '@/types'

interface RewriteTabProps {
  rewrite: RewriteResult
}

export function RewriteTab({ rewrite }: RewriteTabProps) {
  return (
    <div data-testid="rewrite-tab" className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-text-muted">AI-optimized rewrite preview</div>
        <button type="button" className="rounded-full border border-violet/40 bg-violet-dim px-3 py-2 text-xs font-semibold text-violet">
          <span className="inline-flex items-center gap-2"><RotateCcw className="h-3.5 w-3.5" /> Re-generate</span>
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-4">
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">Original</div>
          <ul className="space-y-2 text-sm text-text-muted">
            {rewrite.original_bullets.map((bullet) => (
              <li key={bullet} className="rounded bg-card/40 px-3 py-2">{bullet}</li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-violet/40 bg-violet-dim/20 p-4">
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-violet">AI-Optimized</div>
          <ul className="space-y-2 text-sm text-text-primary">
            {rewrite.rewritten_bullets.map((bullet) => (
              <li key={bullet} className="animate-[pulse_2s_ease-in-out_1] rounded border border-amber/30 bg-amber-dim/25 px-3 py-2 text-text-primary">
                <div className="flex items-start justify-between gap-3">
                  <span>{bullet}</span>
                  <button type="button" className="rounded-full border border-card-border p-1 text-text-muted">
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
