'use client'

import { useCallback, useRef } from 'react'

import { cn } from '@/lib/cn'

/**
 * Tab list implementing the ARIA Authoring Practices tabs pattern.
 *
 * The previous implementation set `role="tablist"` and `role="tab"` but wired up
 * no keyboard behaviour, which is worse than using plain buttons: the roles
 * promise arrow-key navigation to a screen reader, so the user is told to press
 * Right and nothing happens. With eight tabs it also meant eight stops in the
 * tab order between the panel and the rest of the page.
 *
 * Implemented here:
 *   - **Roving tabindex** — exactly one tab is tabbable, so Tab enters the tab
 *     list and the next Tab moves to the panel.
 *   - **Arrow keys** move between tabs and wrap at both ends.
 *   - **Home / End** jump to the first and last tab.
 *   - Selection follows focus, which is the recommended behaviour when panels
 *     are cheap to render — the content is already in memory here.
 */

export interface TabDefinition<TId extends string> {
  id: TId
  label: string
  /** Optional trailing count or status dot. */
  badge?: string
}

interface TabsProps<TId extends string> {
  tabs: readonly TabDefinition<TId>[]
  activeId: TId
  onChange: (id: TId) => void
  /** Labels the tab list for assistive technology. */
  label: string
  idPrefix: string
  className?: string
}

export function Tabs<TId extends string>({
  tabs,
  activeId,
  onChange,
  label,
  idPrefix,
  className,
}: TabsProps<TId>) {
  const listRef = useRef<HTMLDivElement | null>(null)

  const focusTab = useCallback(
    (index: number) => {
      const wrapped = (index + tabs.length) % tabs.length
      const next = tabs[wrapped]
      onChange(next.id)
      // Move focus with selection so the roving tabindex stays coherent.
      listRef.current
        ?.querySelector<HTMLButtonElement>(`#${idPrefix}-tab-${next.id}`)
        ?.focus()
    },
    [tabs, onChange, idPrefix]
  )

  // Typed against the element the handler is actually attached to — the tab
  // button — rather than the list container it lives beside.
  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault()
        focusTab(index + 1)
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault()
        focusTab(index - 1)
        break
      case 'Home':
        event.preventDefault()
        focusTab(0)
        break
      case 'End':
        event.preventDefault()
        focusTab(tabs.length - 1)
        break
      default:
        break
    }
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      aria-orientation="horizontal"
      className={cn('flex flex-wrap gap-1.5', className)}
    >
      {tabs.map((tab, index) => {
        const isActive = tab.id === activeId
        return (
          <button
            key={tab.id}
            id={`${idPrefix}-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={`${idPrefix}-panel-${tab.id}`}
            // Roving tabindex: only the selected tab is reachable via Tab.
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            // A ruled register, not a row of pills.
            //
            // The selected entry is *struck* — set below the surface and lit
            // from the upper left — rather than filled with violet and given a
            // glow. Selection is expressed the same way everywhere in this
            // product: by depth, never by colour. A glowing capsule also reads
            // as a button, and these navigate rather than act.
            className={cn(
              'inline-flex h-9 items-center gap-2 rounded-[var(--radius-sm)] px-3 text-xs',
              'transition-[background-color,box-shadow,color] duration-200 ease-out',
              isActive
                ? 'bg-[hsl(var(--bg)/0.6)] font-medium text-text-primary shadow-[inset_0_2px_4px_hsl(222_60%_2%_/_0.5)]'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            {tab.label}
            {tab.badge ? (
              <span className="tabular font-mono text-xs leading-none text-text-muted">
                {tab.badge}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

/** Panel paired with a `Tabs` entry. Ids must line up with `idPrefix`. */
export function TabPanel({
  id,
  idPrefix,
  active,
  children,
  className,
}: {
  id: string
  idPrefix: string
  active: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      id={`${idPrefix}-panel-${id}`}
      role="tabpanel"
      aria-labelledby={`${idPrefix}-tab-${id}`}
      // Panels are focusable so that tabbing out of the tab list lands on the
      // content the user just selected, per the ARIA pattern.
      tabIndex={active ? 0 : -1}
      hidden={!active}
      className={className}
    >
      {children}
    </div>
  )
}
