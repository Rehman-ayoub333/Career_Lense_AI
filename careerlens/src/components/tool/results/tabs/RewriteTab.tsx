'use client'

import { Check, Copy, LoaderCircle, PencilLine, RotateCcw } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { SectionLabel } from '@/components/ui/Card'
import { Alert, EmptyState } from '@/components/ui/Feedback'
import { useClipboard } from '@/hooks/useClipboard'
import type { RewriteRequest } from '@/lib/api/contract'
import { postJson, toDisplayMessage } from '@/lib/api/client'
import type { RewriteResult } from '@/types'

export function RewriteTab({
  rewrite: initialRewrite,
  cvText,
  jdText,
}: {
  /** `null` when the rewrite step failed while the analysis succeeded. */
  rewrite: RewriteResult | null
  cvText: string
  jdText: string
}) {
  const [rewrite, setRewrite] = useState<RewriteResult | null>(initialRewrite)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { copy, isCopied } = useClipboard()

  async function handleRegenerate() {
    setIsRegenerating(true)
    setError(null)

    try {
      const result = await postJson<RewriteResult>('/api/rewrite', {
        cvText,
        jdText,
      } satisfies RewriteRequest)
      setRewrite(result)
    } catch (cause) {
      setError(toDisplayMessage(cause))
    } finally {
      setIsRegenerating(false)
    }
  }

  const regenerateButton = (
    <Button
      variant="secondary"
      size="sm"
      disabled={isRegenerating}
      onClick={() => void handleRegenerate()}
    >
      {isRegenerating ? (
        <>
          <LoaderCircle className="h-3.5 w-3.5 animate-spin" strokeWidth={2.25} aria-hidden="true" />
          Regenerating…
        </>
      ) : (
        <>
          <RotateCcw className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden="true" />
          {rewrite ? 'Re-generate' : 'Generate'}
        </>
      )}
    </Button>
  )

  if (!rewrite) {
    return (
      <div data-testid="rewrite-tab" className="space-y-4">
        {error ? <Alert tone="error">{error}</Alert> : null}
        <EmptyState
          icon={PencilLine}
          title="No rewrite was generated"
          description="The analysis succeeded but the rewrite step did not. You can run it again now."
          action={regenerateButton}
        />
      </div>
    )
  }

  return (
    <div data-testid="rewrite-tab" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-text-secondary">AI-optimised rewrite preview</p>
        {regenerateButton}
      </div>

      {error ? <Alert tone="error">{error}</Alert> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[var(--radius-md)] border border-border bg-bg p-4">
          <SectionLabel className="mb-3">Original</SectionLabel>
          <ul className="space-y-2">
            {rewrite.original_bullets.map((bullet, index) => (
              <li
                key={`original-${index}`}
                className="rounded-[var(--radius-sm)] bg-surface-raised px-3 py-2.5 text-sm text-text-secondary"
              >
                {bullet}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-[var(--radius-md)] border border-[hsl(var(--violet)/0.35)] bg-[hsl(var(--violet)/0.12)] p-4">
          <SectionLabel className="mb-3 text-violet-text">AI-Optimised</SectionLabel>
          <ul className="space-y-2">
            {rewrite.rewritten_bullets.map((bullet, index) => {
              const key = `rewritten-${index}`
              return (
                <li
                  key={key}
                  className="rounded-[var(--radius-sm)] border border-border bg-surface-raised px-3 py-2.5 text-sm text-text-primary"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span>{bullet}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void copy(bullet, key)}
                      aria-label={`Copy bullet ${index + 1}`}
                      className="h-8 w-8 shrink-0 px-0"
                    >
                      {isCopied(key) ? (
                        <Check className="h-3.5 w-3.5 text-green-text" aria-hidden="true" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}
