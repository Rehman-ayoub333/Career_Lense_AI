import type { ErrorCode } from '@/lib/errors'

/**
 * The wire contract between the API routes and the browser.
 *
 * Both sides import these types, so a change to the envelope is a compile error
 * rather than a runtime surprise. Previously every `fetch` call site re-declared
 * an inline `{ success?: boolean; data?: T; message?: string }` shape — six
 * near-identical declarations that could drift from the server independently.
 */

export interface ApiSuccess<T> {
  success: true
  data: T
}

export interface ApiFailure {
  success: false
  /** Machine-readable class of failure. Safe to expose; carries no detail. */
  error: ErrorCode
  /** Human-readable, user-safe copy. Never contains technical information. */
  message: string
  /** Correlates this response with the server log entry, for support requests. */
  requestId: string
  /** Present on 429 only. Seconds until a retry is worthwhile. */
  retryAfter?: number
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure

/* ── Endpoint payloads ────────────────────────────────────────────────────── */

export interface AnalyzeRequest {
  cvText: string
  jdText: string
  mode: 'job' | 'scholarship'
}

export interface RewriteRequest {
  cvText: string
  jdText: string
}

export type CoverLetterRequest = RewriteRequest

export interface CoverLetterResponse {
  coverLetter: string
}

export interface ChatRequest {
  message: string
  cvText: string
  jdText: string
  score: number
  verdict: string
  missingSkills: string[]
}

export interface ChatResponse {
  reply: string
}

export interface UploadResponse {
  text: string
  wordCount: number
  charCount: number
}
