'use client'

import { Clock, History, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/Feedback'
import { bandForScore } from '@/lib/scoring'
import { Modal } from '@/components/ui/Modal'
import { formatDate, MODE_LABEL } from '@/lib/format'
import { clearHistory, deleteFromHistory, readHistory } from '@/lib/history'
import type { AnalysisSession } from '@/types'

/**
 * Two things were removed from every row.
 *
 * **The coloured score.** Each entry carried its figure in a tinted disc, red
 * below 41 and green above 81. A list of past applications rendered as a column
 * of red and green is a scoreboard of a person's own rejections, and it is the
 * last thing they need to scroll past. The figure is now struck, unpainted, and
 * accompanied by the band as a word.
 *
 * **The relative date.** `3d ago` cannot be resolved to a calendar day by anyone
 * reading it later, and a history list is read later by definition.
 */

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
                    className="tabular flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[hsl(var(--bg)/0.6)] text-sm font-semibold text-text-primary shadow-[inset_0_2px_4px_hsl(222_60%_2%_/_0.5)]"
                  >
                    {item.result.score}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-text-primary">
                      {item.jobTitle}
                    </span>
                    <span className="mt-1 block font-mono text-xs text-text-muted">
                      {bandForScore(item.result.score)}
                      <span aria-hidden="true" className="mx-2 text-[hsl(var(--text-muted)/0.5)]">·</span>
                      {MODE_LABEL[item.mode]}
                      <span aria-hidden="true" className="mx-2 text-[hsl(var(--text-muted)/0.5)]">·</span>
                      {formatDate(item.date)}
                    </span>
                    <span className="sr-only">
                      Match {item.result.score} out of 100, band{' '}
                      {bandForScore(item.result.score)}. Select to restore this analysis.
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
