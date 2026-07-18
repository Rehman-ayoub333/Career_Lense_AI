import { useMemo } from 'react'

export function useChat() {
  return useMemo(() => ({ status: 'ready' as const }), [])
}
