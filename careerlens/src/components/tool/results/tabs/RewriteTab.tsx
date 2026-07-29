'use client'

import { Check, Copy, Loader2, RotateCcw } from 'lucide-react'
import React, { useState } from 'react'

import type { RewriteResult } from '@/types'

interface RewriteTabProps {
  rewrite: RewriteResult
  cvText: string
  jdText: string
}

export function RewriteTab({ rewrite: initialRewrite, cvText, jdText }: RewriteTabProps) {
  const [rewrite, setRewrite] = useState<RewriteResult>(initialRewrite)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [regenError, setRegenError] = useState<string | null>(null)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  async function handleRegenerate() {
    setIsRegenerating(true)
    setRegenError(null)

    try {
      const response = await fetch('/api/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvText, jdText }),
      })
      const payload = (await response.json()) as {
        success?: boolean
        data?: RewriteResult
        message?: string
      }

      if (!response.ok || !payload.success || !payload.data) {
        setRegenError(payload.message ?? 'Regeneration failed. Please try again.')
        return
      }

      setRewrite(payload.data)
    } catch {
      setRegenError('Check your internet connection and try again.')
    } finally {
      setIsRegenerating(false)
    }
  }

  async function handleCopyBullet(text: string, index: number) {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIndex(index)
      window.setTimeout(() => setCopiedIndex(null), 1600)
    } catch {
      // Clipboard API unavailable — silently ignore
    }
  }

  return (
    <div data-testid="rewrite-tab" className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-text-muted">AI-optimized rewrite preview</div>
        <button
          type="button"
          disabled={isRegenerating}
          onClick={() => void handleRegenerate()}
          className="rounded-full border border-[hsl(var(--violet)/0.4)] bg-[hsl(var(--violet-dim))] px-3 py-2 text-xs font-semibold text-[hsl(var(--violet))] transition disabled:opacity-50"
        >
          <span className="inline-flex items-center gap-2">
            {isRegenerating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Regenerating...
              </>
            ) : (
              <>
                <RotateCcw className="h-3.5 w-3.5" />
                Re-generate
              </>
            )}
          </span>
        </button>
      </div>

      {regenError ? (
        <div className="rounded-[var(--radius)] border border-[hsl(var(--red)/0.4)] bg-[hsl(var(--red-dim))] px-3 py-2 text-xs text-[hsl(var(--red))]">
          {regenError}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Original bullets */}
        <div className="rounded-[var(--radius)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-4">
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">Original</div>
          <ul className="space-y-2 text-sm text-text-muted">
            {rewrite.original_bullets.map((bullet, index) => (
              <li
                key={`original-${index}`}
                className="rounded bg-[hsl(var(--card-hover))] px-3 py-2 leading-relaxed"
              >
                {bullet}
              </li>
            ))}
          </ul>
        </div>

        {/* Rewritten bullets with per-bullet copy */}
        <div className="rounded-[var(--radius)] border border-[hsl(var(--violet)/0.4)] bg-[hsl(var(--violet-dim)/0.2)] p-4">
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[hsl(var(--violet))]">
            AI-Optimized
          </div>
          <ul className="space-y-2 text-sm text-text-primary">
            {rewrite.rewritten_bullets.map((bullet, index) => (
              <li
                key={`rewritten-${index}`}
                className="rounded border border-[hsl(var(--amber)/0.3)] bg-[hsl(var(--amber-dim)/0.25)] px-3 py-2 leading-relaxed"
              >
                <div className="flex items-start justify-between gap-3">
                  <span>{bullet}</span>
                  <button
                    type="button"
                    onClick={() => void handleCopyBullet(bullet, index)}
                    aria-label={`Copy bullet ${index + 1}`}
                    className="shrink-0 rounded-full border border-[hsl(var(--card-border))] p-1 text-text-muted transition hover:text-text-primary"
                  >
                    {copiedIndex === index ? (
                      <Check className="h-3.5 w-3.5 text-[hsl(var(--green))]" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
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
