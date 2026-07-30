import { HISTORY_LIMIT } from '@/lib/analysis/constants'
import type { AnalysisSession } from '@/types'

/**
 * The only module in the application that touches `localStorage`.
 *
 * Everything is defensive by design, because browser storage is the least
 * reliable dependency in a client app: it can be disabled outright, be full,
 * throw on read in private-browsing modes, or contain data written by an older
 * version of the app. None of those should ever break the page — the worst
 * acceptable outcome is that history appears empty.
 */

const STORAGE_KEY = 'careerlens:history:v1'

/** Keys written by earlier builds, cleaned up opportunistically on first read. */
const LEGACY_KEYS = ['careerlens_history']

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    // Access alone throws when storage is blocked by policy, so probe inside try.
    return window.localStorage
  } catch {
    return null
  }
}

/** Rejects anything that would make the UI crash when rendered. */
function isValidSession(value: unknown): value is AnalysisSession {
  if (!value || typeof value !== 'object') return false
  const session = value as Partial<AnalysisSession>
  return (
    typeof session.id === 'string' &&
    typeof session.date === 'string' &&
    (session.mode === 'job' || session.mode === 'scholarship') &&
    typeof session.jobTitle === 'string' &&
    typeof session.coverLetter === 'string' &&
    !!session.result &&
    typeof session.result.score === 'number' &&
    typeof session.result.verdict === 'string' &&
    !!session.rewrite &&
    Array.isArray(session.rewrite.rewritten_bullets)
  )
}

export function readHistory(): AnalysisSession[] {
  const storage = getStorage()
  if (!storage) return []

  for (const legacyKey of LEGACY_KEYS) {
    try {
      storage.removeItem(legacyKey)
    } catch {
      // Nothing to do; a stale key is harmless.
    }
  }

  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return []

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    // Filter rather than reject wholesale: one corrupt entry from an interrupted
    // write should not discard the user's other analyses.
    return parsed.filter(isValidSession).slice(0, HISTORY_LIMIT)
  } catch {
    return []
  }
}

/**
 * Persists history, trimming to the newest `HISTORY_LIMIT` entries.
 *
 * Sessions carry full CV and job-description text so the chat tab keeps working
 * after a reload, which makes each entry large. If the quota is exceeded the
 * oldest entries are dropped and the write is retried, so the most recent
 * analysis — the one the user is looking at — always survives.
 *
 * @returns whether the write succeeded.
 */
export function writeHistory(items: AnalysisSession[]): boolean {
  const storage = getStorage()
  if (!storage) return false

  let candidates = items.slice(0, HISTORY_LIMIT)

  while (candidates.length > 0) {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(candidates))
      return true
    } catch {
      // Almost certainly QuotaExceededError. Shed the oldest entry and retry.
      candidates = candidates.slice(0, candidates.length - 1)
    }
  }

  return false
}

/** Prepends a session and persists. Returns the resulting list. */
export function addToHistory(session: AnalysisSession): AnalysisSession[] {
  const next = [session, ...readHistory().filter((item) => item.id !== session.id)].slice(0, HISTORY_LIMIT)
  writeHistory(next)
  return next
}

export function deleteFromHistory(id: string): AnalysisSession[] {
  const next = readHistory().filter((item) => item.id !== id)
  writeHistory(next)
  return next
}

export function clearHistory(): void {
  const storage = getStorage()
  if (!storage) return
  try {
    storage.removeItem(STORAGE_KEY)
  } catch {
    // Clearing is best-effort; failing to clear must not surface as an error.
  }
}
