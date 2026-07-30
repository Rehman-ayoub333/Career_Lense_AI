/**
 * Domain constants shared by the client and the server.
 *
 * These previously lived as magic numbers duplicated across textarea components
 * and route handlers, which is how the JD textarea came to accept 6 000 characters
 * while the API silently truncated at 4 000. One source of truth removes that
 * class of drift entirely.
 */

export const INPUT_LIMITS = {
  cv: { min: 100, max: 8000 },
  jd: { min: 50, max: 6000 },
  chatMessage: { min: 1, max: 500 },
} as const

export const UPLOAD_LIMITS = {
  maxBytes: 4 * 1024 * 1024,
  /** Below this, extraction almost certainly hit a scanned or image-only PDF. */
  minExtractedChars: INPUT_LIMITS.cv.min,
  /** Matches the CV field's ceiling so an upload never exceeds what can be submitted. */
  maxExtractedChars: INPUT_LIMITS.cv.max,
  acceptedExtensions: ['.pdf', '.txt'] as const,
  acceptedMimeTypes: ['application/pdf', 'text/plain'] as const,
} as const

/** Number of sessions kept in localStorage. Bounded to stay well under the ~5 MB quota. */
export const HISTORY_LIMIT = 10

/**
 * Per-endpoint server budgets, in milliseconds.
 *
 * Each must stay below the platform function ceiling declared as `maxDuration` on
 * the route, so the app returns its own friendly timeout rather than letting the
 * host return an opaque gateway error page.
 */
export const AI_TIMEOUT_MS = {
  analyze: 45_000,
  rewrite: 45_000,
  coverLetter: 45_000,
  chat: 20_000,
} as const

/** Declared `maxDuration` for AI routes, in seconds. Must exceed the budgets above. */
export const ROUTE_MAX_DURATION_SECONDS = 60

export const SCORE_BANDS = [
  { min: 0, max: 40, verdict: 'Weak Match', token: 'red' },
  { min: 41, max: 65, verdict: 'Partial Match', token: 'amber' },
  { min: 66, max: 80, verdict: 'Good Match', token: 'blue' },
  { min: 81, max: 100, verdict: 'Strong Match', token: 'green' },
] as const

export const MATCH_VERDICTS = ['Weak Match', 'Partial Match', 'Good Match', 'Strong Match'] as const

export const ATS_STATUSES = ['pass', 'fail', 'warn'] as const

/** Expected counts, asserted after generation so a short response is caught early. */
export const EXPECTED_COUNTS = {
  keyActions: 3,
  atsChecks: 8,
  interviewQuestions: 5,
  rewriteBullets: 5,
} as const
