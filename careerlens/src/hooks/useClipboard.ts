'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Copy-to-clipboard with a self-resetting confirmation.
 *
 * Implemented twice before — once in `CopyButton` and once inline in the rewrite
 * tab — and neither cleared its timeout on unmount, so copying and then
 * navigating away scheduled a `setState` on an unmounted component.
 *
 * `key` distinguishes which of several copy targets was used, so a list can show
 * the tick on the one row that was actually copied.
 */

const RESET_DELAY_MS = 1800

export function useClipboard() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    },
    []
  )

  const copy = useCallback(async (text: string, key = 'default'): Promise<boolean> => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    try {
      // Unavailable on insecure origins and in some embedded browsers, so the
      // failure path is a real case rather than defensive padding.
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard API unavailable')
      }

      await navigator.clipboard.writeText(text)
      setError(null)
      setCopiedKey(key)
      timeoutRef.current = setTimeout(() => setCopiedKey(null), RESET_DELAY_MS)
      return true
    } catch {
      setCopiedKey(null)
      setError('Copying is blocked in this browser. Select the text and copy manually.')
      timeoutRef.current = setTimeout(() => setError(null), 4000)
      return false
    }
  }, [])

  return { copy, copiedKey, error, isCopied: (key = 'default') => copiedKey === key }
}
