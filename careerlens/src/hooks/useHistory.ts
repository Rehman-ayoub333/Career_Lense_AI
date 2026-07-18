import { useMemo } from 'react'

export function useHistory() {
  return useMemo(() => ({ status: 'ready' as const }), [])
}
