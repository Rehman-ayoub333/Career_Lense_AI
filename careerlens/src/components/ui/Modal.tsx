'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useId } from 'react'

import { MOTION } from '@/config/design-tokens'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { cn } from '@/lib/cn'

import { Button } from './Button'

/**
 * Accessible dialog.
 *
 * The history panel and the share card each hand-rolled this: overlay, panel,
 * Escape handler, focus trap, and an `AnimatePresence` wrapper — around eighty
 * duplicated lines, with the two implementations already diverging on close
 * behaviour and animation timing. One component now owns the dialog contract:
 *
 *   - `role="dialog"` + `aria-modal` + a real `aria-labelledby` target
 *   - Escape closes; the backdrop closes; the panel does not
 *   - focus is trapped while open and restored to the trigger on close
 *   - background scroll is locked
 *   - the title is a heading, so it appears in the screen reader's outline
 */

export interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  /** Optional supporting line, announced as the dialog's description. */
  description?: string
  /** Rendered in the header, left of the close button. */
  headerActions?: ReactNode
  children: ReactNode
  /** Tailwind max-width class. Defaults to a comfortable reading measure. */
  size?: 'sm' | 'md' | 'lg'
  /** Aligns the panel to the top instead of centring it. */
  align?: 'center' | 'top'
}

const SIZES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
} as const

export function Modal({
  open,
  onClose,
  title,
  description,
  headerActions,
  children,
  size = 'md',
  align = 'center',
}: ModalProps) {
  const titleId = useId()
  const descriptionId = useId()
  const panelRef = useFocusTrap<HTMLDivElement>(open)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (!open) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        // Stop the key reaching anything behind the dialog.
        event.stopPropagation()
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: MOTION.duration.fast }}
          onClick={onClose}
          className={cn(
            'fixed inset-0 z-50 flex justify-center overflow-y-auto px-4',
            'bg-[hsl(var(--bg)/0.75)] backdrop-blur-sm',
            align === 'top' ? 'items-start pt-20 pb-8' : 'items-center py-8'
          )}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descriptionId : undefined}
            tabIndex={-1}
            // Only transform and opacity animate, so the panel is composited
            // and never triggers layout while it scales in.
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: -8 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: -8 }}
            transition={{ duration: MOTION.duration.base, ease: MOTION.easeOut }}
            // Without this a click that starts inside and ends on the backdrop
            // would close the dialog — the classic text-selection dismissal bug.
            onClick={(event) => event.stopPropagation()}
            className={cn(
              'w-full rounded-[var(--radius-lg)] border border-border-strong bg-surface-raised shadow-[var(--shadow-lg)]',
              'outline-none',
              SIZES[size]
            )}
          >
            <header className="flex items-center justify-between gap-3 border-b border-border px-6 py-4">
              <div className="min-w-0">
                <h2 id={titleId} className="truncate text-sm font-semibold text-text-primary">
                  {title}
                </h2>
                {description ? (
                  <p id={descriptionId} className="mt-0.5 text-xs text-text-muted">
                    {description}
                  </p>
                ) : null}
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {headerActions}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  aria-label={`Close ${title.toLowerCase()}`}
                  className="h-9 w-9 px-0"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </header>

            <div className="px-6 py-4">{children}</div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
