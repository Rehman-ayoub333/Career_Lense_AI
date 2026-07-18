import { useMemo } from 'react'

export function useAnalysis() {
  return useMemo(() => ({ status: 'ready' as const }), [])
}
