import type { ErrorCode } from '@/lib/errors'
import type { ClaimCategory, VerificationTier } from '@/types'

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

/**
 * The three fields of a claim the rewrite prompt needs, and no more.
 *
 * Not `PublicVerifiedClaim`: the rewrite call has no use for the evidence quote
 * or the rationale, and sending the whole claim back would put the CV's own text
 * on the wire a second time for nothing.
 */
export interface ClaimReference {
  requirement: string
  category: ClaimCategory
  verification: VerificationTier
}

/**
 * Projects claims onto the wire shape, keeping only the ones worth rewriting for.
 *
 * Filtered on `verification`, never on the model's own `status`. The two
 * vocabularies exist precisely so the mechanical result can disagree with the
 * model's self-report, and everywhere else in this codebase the mechanical one
 * wins — a claim the model called `matched` but the evidence check could not
 * confirm is exactly the kind the rewrite should strengthen, and filtering on
 * `status` would skip it (ADR-18).
 *
 * Lives here, with the type it produces, so both call sites project identically
 * rather than each writing its own filter.
 */
export function toClaimReferences(
  claims: readonly { requirement: string; category: ClaimCategory; verification: VerificationTier }[]
): ClaimReference[] {
  return claims
    .filter(
      (claim) => claim.verification === 'unresolved' || claim.verification === 'uncertain'
    )
    .map((claim) => ({
      requirement: claim.requirement,
      category: claim.category,
      verification: claim.verification,
    }))
}

export interface RewriteRequest {
  cvText: string
  jdText: string
  /**
   * Optional. The `unresolved`/`uncertain` subset of the claims the client
   * already holds from its `/api/analyze` response.
   *
   * The server is stateless and stores no session, so there is nowhere else this
   * could come from — the client sending back what it already has is cheaper
   * than re-running extraction to recompute it. When present the prompt
   * prioritises bullets touching these requirements; when absent it falls back
   * to its prior generic framing, so an older client keeps working unchanged
   * (ADR-18).
   */
  claims?: ClaimReference[]
}

/** Cover letter takes no claims — Prompt 4 is unchanged, and needs none. */
export interface CoverLetterRequest {
  cvText: string
  jdText: string
}

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
