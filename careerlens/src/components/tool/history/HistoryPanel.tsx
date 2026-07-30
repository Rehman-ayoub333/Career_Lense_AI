'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Clock, History, Trash2, X } from 'lucide-react'
import React, { useEffect, useState } from 'react'

import { Badge } from '@/components/shared/Badge'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { clearHistory, deleteFromHistory, readHistory } from '@/lib/history'
import type { AnalysisSession, MatchVerdict } from '@/types'
import { getScoreColor } from '@/utils/score-color'

interface HistoryPanelProps {
  onRestore: (session: AnalysisSession) => void
}

function verdictToBadgeVariant(verdict: MatchVerdict): 'pass' | 'fail' | 'warn' | 'info' {
  switch (verdict) {
    case 'Strong Match':
      return 'pass'
    case 'Good Match':
      return 'info'
    case 'Partial Match':
      return 'warn'
    case 'Weak Match':
      return 'fail'
  }
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60_000)
  const diffHours = Math.floor(diffMs / 3_600_000)
  const diffDays = Math.floor(diffMs / 86_400_000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function HistoryPanel({ onRestore }: HistoryPanelProps) {
  const [items, setItems] = useState<AnalysisSession[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const trapRef = useFocusTrap<HTMLDivElement>(isOpen)

  useEffect(() => {
    if (!isOpen) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  function handleOpen() {
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
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] px-3 py-2 text-xs font-semibold text-text-muted transition hover:text-text-primary"
      >
        <History className="h-3.5 w-3.5" />
        History
      </button>

      <AnimatePresence>
        {isOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-start justify-center bg-[hsl(var(--bg)/0.8)] px-4 pt-20 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              ref={trapRef}
              role="dialog"
              aria-modal="true"
              aria-label="Analysis History"
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-[var(--radius-lg)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-[hsl(var(--card-border))] px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                  <History className="h-4 w-4 text-[hsl(var(--violet))]" />
                  Analysis History
                </div>
                <div className="flex items-center gap-2">
                  {items.length > 0 ? (
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="rounded-full px-2 py-1 text-xs text-[hsl(var(--red))] transition hover:bg-[hsl(var(--red-dim))]"
                    >
                      Clear all
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    aria-label="Close history"
                    className="rounded-full p-1 text-text-muted transition hover:text-text-primary"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="max-h-[60vh] overflow-y-auto">
                {items.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
                    <Clock className="h-8 w-8 text-text-subtle" />
                    <div className="text-sm text-text-muted">No previous analyses</div>
                    <div className="text-xs text-text-subtle">Your analysis history will appear here</div>
                  </div>
                ) : (
                  <div className="divide-y divide-[hsl(var(--card-border))]">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="group flex items-center gap-3 px-4 py-3 transition hover:bg-[hsl(var(--card-hover))]"
                      >
                        <button
                          type="button"
                          onClick={() => handleRestore(item)}
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        >
                          <div
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                            style={{
                              color: getScoreColor(item.result.score),
                              backgroundColor: `${getScoreColor(item.result.score)}18`,
                            }}
                          >
                            {item.result.score}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium text-text-primary">
                              {item.jobTitle}
                            </div>
                            <div className="mt-0.5 flex items-center gap-2">
                              <Badge label={item.result.verdict} variant={verdictToBadgeVariant(item.result.verdict)} />
                              <span className="text-xs text-text-subtle">
                                {item.mode === 'scholarship' ? 'Scholarship' : 'Job'} · {formatDate(item.date)}
                              </span>
                            </div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          aria-label={`Delete ${item.jobTitle}`}
                          className="shrink-0 rounded-full p-1.5 text-text-subtle opacity-0 transition hover:bg-[hsl(var(--red-dim))] hover:text-[hsl(var(--red))] group-hover:opacity-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  )
}
