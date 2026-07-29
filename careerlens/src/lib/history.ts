import type { AnalysisSession } from '@/types'

const STORAGE_KEY = 'careerlens_history'

export function readHistory(): AnalysisSession[] {
  if (typeof window === 'undefined') {
    return []
  }

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw) as AnalysisSession[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function writeHistory(items: AnalysisSession[]): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export function deleteFromHistory(id: string): void {
  const items = readHistory()
  writeHistory(items.filter((item) => item.id !== id))
}

export function clearHistory(): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(STORAGE_KEY)
}
