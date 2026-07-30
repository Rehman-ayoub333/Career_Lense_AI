'use client'

import { Clock, History, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { Badge, type BadgeVariant } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/Feedback'
import { Modal } from '@/components/ui/Modal'
import { clearHistory, deleteFromHistory, readHistory } from '@/lib/history'
import { getScoreColorVar, getScoreTextColorVar } from '@/lib/scoring'
import type { AnalysisSession, MatchVerdict } from '@/types'

const VERDICT_VARIANTS: Record<MatchVerdict, BadgeVariant> = {
  'Strong Match': 'pass',
  'Good Match': 'info',
  'Partial Match': 'warn',
  'Weak Match': 'fail',
}

const MINUTE = 60_000
const HOUR = 3_600_000
const DAY = 86_400_000

function formatRelativeDate(iso: string): string {
  const elapsed = Date.now() - new Date(iso).getTime()

  if (elapsed < MINUTE) return 'Just now'
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}m ago`
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}h ago`
  if (elapsed < DAY * 7) return `${Math.floor(elapsed / DAY)}d ago`

  return new Date(iso).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
}

export function HistoryPanel({ onRestore }: { onRestore: (session: AnalysisSession) => void }) {
  const [items, setItems] = useState<AnalysisSession[]>([])
  const [isOpen, setIsOpen] = useState(false)

  function handleOpen() {
    // Read on open rather than on mount: localStorage is unavailable during the
    // server render, and the list can change while the dialog is closed.
    setItems(readHistory())
    setIsOpen(true)
  }

  function handleDelete(id: string) {
    deleteFromHistory(id)
    setItems((current) => current.filter((item) => item.id !== id))
  }

  function handleClearAll() {
    clearHistory()
    setItems([])
  }

  function handleRestore(session: AnalysisSession) {
    setIsOpen(false)
    onRestore(session)
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={handleOpen}>
        <History className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden="true" />
        History
      </Button>

      <Modal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title="Analysis History"
        align="top"
        headerActions={
          items.length > 0 ? (
            <Button variant="danger" size="sm" onClick={handleClearAll}>
              Clear all
            </Button>
          ) : null
        }
      >
        {items.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No previous analyses"
            description="Your analysis history will appear here."
          />
        ) : (
          <ul className="max-h-[60vh] divide-y divide-border overflow-y-auto">
            {items.map((item) => (
              <li
                key={item.id}
                className="group flex items-center gap-3 py-3 transition-colors duration-200 ease-out hover:bg-surface-hover"
              >
                <button
                  type="button"
                  onClick={() => handleRestore(item)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <span
                    aria-hidden="true"
                    className="tabular flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                    style={{
                      color: getScoreTextColorVar(item.result.score),
                      backgroundColor: `color-mix(in srgb, ${getScoreColorVar(item.result.score)} 14%, transparent)`,
                    }}
                  >
                    {item.result.score}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-text-primary">
                      {item.jobTitle}
                    </span>
                    <span className="mt-0.5 flex items-center gap-2">
                      <Badge variant={VERDICT_VARIANTS[item.result.verdict]}>
                        {item.result.verdict}
                      </Badge>
                      <span className="text-xs text-text-muted">
                        {item.mode === 'scholarship' ? 'Scholarship' : 'Job'} ·{' '}
                        {formatRelativeDate(item.date)}
                      </span>
                    </span>
                    <span className="sr-only">
                      Score {item.result.score} out of 100. Select to restore this analysis.
                    </span>
                  </span>
                </button>

                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDelete(item.id)}
                  aria-label={`Delete analysis for ${item.jobTitle}`}
                  // Revealed on hover, but also whenever it takes keyboard focus —
                  // hover-only visibility made this control unreachable by keyboard.
                  className="h-9 w-9 shrink-0 px-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </>
  )
}
