import { addToHistory, clearHistory, deleteFromHistory, readHistory, writeHistory } from '@/lib/history'
import type { AnalysisSession } from '@/types'

/**
 * History persistence.
 *
 * `history.ts` reads `window.localStorage` lazily on every call rather than
 * capturing it at module load, so a plain stub installed per test is enough —
 * no DOM test environment required.
 */

const STORAGE_KEY = 'careerlens:history:v1'

function installStorage(): Map<string, string> {
  const store = new Map<string, string>()

  const localStorage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => void store.set(key, value),
    removeItem: (key) => void store.delete(key),
  }

  ;(globalThis as { window?: unknown }).window = { localStorage }
  return store
}

function makeSession(overrides: Partial<AnalysisSession> = {}): AnalysisSession {
  return {
    id: 'a1',
    date: new Date().toISOString(),
    mode: 'job',
    cvText: 'cv',
    jdText: 'jd',
    jobTitle: 'Senior Frontend Engineer',
    result: {
      score: 73,
      skills_score: 78,
      experience_score: 64,
      education_score: 82,
      verdict: 'Good Match',
      verdict_note: 'note',
      key_actions: [],
      skills_matched: [],
      skills_missing: [],
      skills_extra: [],
      keywords_present: [],
      keywords_missing: [],
      ats_checks: [],
      salary_range: '',
      salary_context: '',
      interview_questions: [],
    },
    rewrite: { original_bullets: ['a'], rewritten_bullets: ['b'] },
    coverLetter: 'Dear team,',
    ...overrides,
  }
}

let store: Map<string, string>

beforeEach(() => {
  store = installStorage()
})

afterEach(() => {
  delete (globalThis as { window?: unknown }).window
})

describe('readHistory', () => {
  it('returns an empty list when storage is unavailable', () => {
    delete (globalThis as { window?: unknown }).window
    expect(readHistory()).toEqual([])
  })

  it('returns an empty list rather than throwing on corrupt JSON', () => {
    store.set(STORAGE_KEY, '{not json')
    expect(readHistory()).toEqual([])
  })

  it('drops only the malformed entry, keeping the rest', () => {
    store.set(STORAGE_KEY, JSON.stringify([makeSession({ id: 'good' }), { id: 'broken' }]))
    expect(readHistory().map((s) => s.id)).toEqual(['good'])
  })

  /**
   * Regression: a session whose rewrite or cover-letter generation failed was
   * rejected by the validator. Because `addToHistory` re-reads through that
   * filter before writing back, the entry was not merely hidden — it was erased
   * from storage the next time any analysis was saved.
   */
  it('keeps a session whose rewrite failed', () => {
    store.set(STORAGE_KEY, JSON.stringify([makeSession({ id: 'no-rewrite', rewrite: null })]))
    expect(readHistory().map((s) => s.id)).toEqual(['no-rewrite'])
  })

  it('keeps a session whose cover letter failed', () => {
    store.set(STORAGE_KEY, JSON.stringify([makeSession({ id: 'no-letter', coverLetter: null })]))
    expect(readHistory().map((s) => s.id)).toEqual(['no-letter'])
  })

  it('keeps a session where both enhancements failed', () => {
    store.set(
      STORAGE_KEY,
      JSON.stringify([makeSession({ id: 'analysis-only', rewrite: null, coverLetter: null })])
    )
    expect(readHistory().map((s) => s.id)).toEqual(['analysis-only'])
  })

  it('still rejects a rewrite that is present but structurally wrong', () => {
    store.set(
      STORAGE_KEY,
      JSON.stringify([
        makeSession({ id: 'bad-rewrite', rewrite: { original_bullets: [] } as never }),
      ])
    )
    expect(readHistory()).toEqual([])
  })
})

describe('addToHistory', () => {
  it('does not evict an existing analysis-only session when a new one is saved', () => {
    const analysisOnly = makeSession({ id: 'analysis-only', rewrite: null, coverLetter: null })
    writeHistory([analysisOnly])

    addToHistory(makeSession({ id: 'fresh' }))

    expect(readHistory().map((s) => s.id).sort()).toEqual(['analysis-only', 'fresh'])
  })

  it('prepends the newest session and de-duplicates by id', () => {
    addToHistory(makeSession({ id: 'one' }))
    addToHistory(makeSession({ id: 'two' }))
    addToHistory(makeSession({ id: 'one', jobTitle: 'Updated' }))

    const ids = readHistory().map((s) => s.id)
    expect(ids).toEqual(['one', 'two'])
    expect(readHistory()[0].jobTitle).toBe('Updated')
  })
})

describe('deleteFromHistory and clearHistory', () => {
  it('removes a single session by id', () => {
    writeHistory([makeSession({ id: 'keep' }), makeSession({ id: 'drop' })])
    deleteFromHistory('drop')
    expect(readHistory().map((s) => s.id)).toEqual(['keep'])
  })

  it('removes everything', () => {
    writeHistory([makeSession()])
    clearHistory()
    expect(readHistory()).toEqual([])
  })
})
