'use client'

import { useEffect, useRef } from 'react'

/**
 * Traps focus inside a container while active, and restores it on close.
 *
 * Four defects in the previous implementation are addressed here:
 *
 * 1. **Focus was never restored.** Closing a dialog dropped focus to `<body>`,
 *    so a keyboard user was returned to the top of the document and had to tab
 *    back to where they were. Focus now returns to whatever opened the dialog.
 * 2. **Disabled and hidden elements were treated as focusable.** The selector
 *    matched every `button`, including disabled ones, so Shift+Tab could land
 *    on an element the browser refuses to focus and the trap would leak.
 * 3. **The element list was captured per keypress but the first-focus target
 *    was captured once**, so a dialog whose content arrived asynchronously
 *    focused nothing.
 * 4. **Background scrolling was not locked**, letting the page scroll behind an
 *    open modal on both wheel and touch.
 */

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    // `offsetParent` is null for anything `display: none`, and elements with no
    // painted box cannot receive focus.
    (element) => element.offsetParent !== null || element === document.activeElement
  )
}

export function useFocusTrap<T extends HTMLElement>(isActive: boolean) {
  const containerRef = useRef<T | null>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isActive) return

    const container = containerRef.current
    if (!container) return

    // Remember where focus came from before moving it.
    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    // Defer one frame: on open the dialog's children may not have mounted yet.
    const focusFrame = requestAnimationFrame(() => {
      const focusable = getFocusable(container)
      // Prefer the first control; fall back to the container so the screen
      // reader still announces the dialog rather than staying outside it.
      ;(focusable[0] ?? container).focus()
    })

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Tab') return

      const focusable = getFocusable(container as HTMLElement)
      if (focusable.length === 0) {
        // Nothing to move to — keep focus where it is rather than losing it.
        event.preventDefault()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement

      if (event.shiftKey && (active === first || !container?.contains(active))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    // Lock background scrolling, compensating for the scrollbar's width so the
    // page behind does not visibly jump sideways as the modal opens.
    const { body } = document
    const previousOverflow = body.style.overflow
    const previousPaddingRight = body.style.paddingRight
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

    body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`

    return () => {
      cancelAnimationFrame(focusFrame)
      document.removeEventListener('keydown', handleKeyDown)
      body.style.overflow = previousOverflow
      body.style.paddingRight = previousPaddingRight

      // Restore focus only if it is still inside the closing dialog; if the user
      // has already clicked elsewhere, stealing it back would be worse.
      const active = document.activeElement
      if (!active || active === document.body || container?.contains(active)) {
        previouslyFocusedRef.current?.focus()
      }
    }
  }, [isActive])

  return containerRef
}
