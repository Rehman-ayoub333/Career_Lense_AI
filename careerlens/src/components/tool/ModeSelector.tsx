'use client'

import { cn } from '@/lib/cn'
import { MODE_LABEL } from '@/lib/format'
import type { AnalysisMode } from '@/types'

/**
 * The mode selector.
 *
 * Rebuilt from a pill toggle with a violet glowing capsule into a ruled pair.
 * The pill was the only place in the product where selection was expressed by a
 * coloured fill; everywhere else it is expressed by a deeper impression, and a
 * single control speaking a different language is how a system starts to drift.
 *
 * Labels come from `MODE_LABEL` rather than being declared here, so the mode is
 * named identically in the selector, the results reference, the history register
 * and every exported artefact.
 */

const OPTIONS: readonly AnalysisMode[] = ['job', 'scholarship']

export function ModeSelector({
  mode,
  onModeChange,
}: {
  mode: AnalysisMode
  onModeChange: (next: AnalysisMode) => void
}) {
  return (
    <div
      data-testid="mode-toggle"
      role="radiogroup"
      aria-label="Analysis mode"
      className="inline-flex overflow-hidden rounded-[var(--radius-md)] border border-border"
    >
      {OPTIONS.map((id, index) => {
        const active = mode === id
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onModeChange(id)}
            className={cn(
              'h-9 px-4 text-sm',
              'transition-[background-color,color,box-shadow] duration-200 ease-out',
              index > 0 && 'border-l border-border',
              active
                ? // Struck: the selected mode sits below the surface, lit from
                  // the upper left like every other committed state.
                  'bg-[hsl(var(--bg)/0.6)] font-medium text-text-primary shadow-[inset_0_2px_4px_hsl(222_60%_2%_/_0.5)]'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            {MODE_LABEL[id]}
          </button>
        )
      })}
    </div>
  )
}
