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
 *
 * That ceiling is `export const maxDuration = 60` in each AI route. It cannot be
 * imported from here: Next only statically analyses *literal* segment configs,
 * and an imported binding fails the production build outright. The literal and
 * these budgets therefore have to be kept in step by hand — if you raise one
 * above 60 000, raise `maxDuration` in the four AI routes to match.
 */
export const AI_TIMEOUT_MS = {
  analyze: 45_000,
  rewrite: 45_000,
  coverLetter: 45_000,
  chat: 20_000,
} as const

/*
 * `SCORE_BANDS` lived here and is gone. It was the second of three independent
 * copies of the same four ranges; `lib/scoring.ts` now owns the single table.
 * It also carried a `token` field mapping low scores to red, which nothing
 * should ever have consumed.
 */

export const MATCH_VERDICTS = ['Weak Match', 'Partial Match', 'Good Match', 'Strong Match'] as const

export const ATS_STATUSES = ['pass', 'fail', 'warn'] as const

/**
 * Claim vocabularies.
 *
 * `CLAIM_STATUSES` is what the model may say. `VERIFICATION_TIERS` is what the
 * deterministic check may conclude. They are separate lists on purpose and must
 * never be merged: the model has no way to emit a verification tier, which is
 * what makes "the model never verifies its own claim" a structural property
 * rather than a convention.
 */
export const CLAIM_STATUSES = ['matched', 'partial', 'gap'] as const

export const VERIFICATION_TIERS = ['verified', 'uncertain', 'unresolved'] as const

/** Job mode assesses four axes. */
export const JOB_CLAIM_CATEGORIES = ['skill', 'experience', 'education', 'ats'] as const

/**
 * Scholarship mode adds the three committee axes. These replace the removed
 * `research_score`/`leadership_score`/`academic_score`: the same distinctions,
 * carried by claims that cite evidence instead of by numbers that could not be
 * checked against anything.
 */
export const SCHOLARSHIP_CLAIM_CATEGORIES = [
  ...JOB_CLAIM_CATEGORIES,
  'research',
  'leadership',
  'academic',
] as const

export const CLAIM_CATEGORIES = SCHOLARSHIP_CLAIM_CATEGORIES

/**
 * Ceiling on the two free-text compensation fields (ADR-26).
 *
 * Not a display limit — a corruption tripwire. The Phase 7 live run returned a
 * 319-character `salary_range` that had `", "salary_context": "…` escaped inside
 * it: the model wrote the start of the next field into the value of this one.
 * That is a valid JSON string, so neither `strict: true` nor a `typeof` check
 * can see anything wrong with it, and it would have rendered as visible garbage.
 *
 * 200 sits well above any real salary line ("$95,000 - $120,000 USD, plus
 * equity" is ~40) and well below the 319 that was actually observed.
 */
export const MAX_SALARY_TEXT_CHARS = 200

/** Expected counts, asserted after generation so a short response is caught early. */
export const EXPECTED_COUNTS = {
  keyActions: 3,
  atsChecks: 8,
  interviewQuestions: 5,
  rewriteBullets: 5,
} as const
