/**
 * Domain types. Every shared type in the application lives here.
 *
 * API request/response envelopes live alongside the routes that produce them in
 * `lib/api/contract.ts`, so the wire format and the domain model can evolve
 * independently — but neither is ever re-declared inline in a component.
 *
 * The claim/verification types below are transcribed from
 * `DATA_CONTRACTS_FINAL.md`, which is the canonical source for every field name,
 * type and nullability in this file. A field that is not in that document does
 * not belong here.
 */

export type AnalysisMode = 'job' | 'scholarship'

export type MatchVerdict = 'Weak Match' | 'Partial Match' | 'Good Match' | 'Strong Match'

export type ATSStatus = 'pass' | 'fail' | 'warn'

export interface ATSCheck {
  id: string
  label: string
  status: ATSStatus
  note: string
  /**
   * Which mechanism produced `status`.
   *
   * Three of the eight checks (`dates`, `contact`, `tables`) are mechanically
   * decidable from the CV text alone; for those, the model's answer is used only
   * when the deterministic check is inconclusive. Recording which one spoke is
   * what keeps that hybrid honest — without this field the two are
   * indistinguishable downstream, and a model assertion would read exactly like
   * a measurement.
   */
  source: 'deterministic' | 'model'
}

export interface InterviewQuestion {
  question: string
  skill_tested: string
  tip: string
}

/* ── Claims and verification ──────────────────────────────────────────────── */

/**
 * The claim/verification vocabulary split is the load-bearing decision of this
 * whole architecture, and it is enforced here in the type system rather than by
 * convention:
 *
 *   - `ClaimStatus` is the MODEL's own judgment. It is the only claim vocabulary
 *     the model ever emits.
 *   - `VerificationTier` is the MECHANICAL result of the deterministic check in
 *     `lib/analysis/grounding.ts`. The word "verified" does not exist in the
 *     model's output vocabulary at all — it cannot assert it, because it never
 *     produces a field of this type.
 *
 * If the two vocabularies ever merge, the research question stops being
 * falsifiable: the experiment measures precisely how often they disagree, and a
 * model that graded its own homework would always agree with itself.
 */
export type ClaimCategory =
  | 'skill'
  | 'experience'
  | 'education'
  | 'ats'
  /* The last three are scholarship mode only. */
  | 'research'
  | 'leadership'
  | 'academic'

export type ClaimStatus = 'matched' | 'partial' | 'gap'

export type VerificationTier = 'verified' | 'uncertain' | 'unresolved'

/** One requirement, judged by the model. Stage 1 output, before verification. */
export interface RequirementClaim {
  /**
   * Derived server-side from the array index (`claim-0`, `claim-1`, …), never
   * model-generated — a model-chosen id could collide, and this doubles as a
   * React key and as the citation anchor the evidence marker links to.
   */
  id: string
  /** The requirement being assessed, in the opportunity's own language. ≤200 chars. */
  requirement: string
  category: ClaimCategory
  status: ClaimStatus
  /**
   * The span of CV text the model asserts supports this claim, or `null` when it
   * offers none. `null` is mandatory for `status: 'gap'`.
   *
   * Nothing downstream trusts this to be real — locating it is the whole job of
   * Stage 2.
   */
  evidence_quote: string | null
  /**
   * One sentence, specific to this CV. Replaces the removed `verdict_note`.
   *
   * Says something about the *document*, never about the person: "no mention of
   * Docker appears in the CV", never "the candidate lacks Docker".
   */
  rationale: string
}

/** A claim after the deterministic check in `lib/analysis/grounding.ts` has run. */
export interface VerifiedClaim extends RequirementClaim {
  verification: VerificationTier
  /**
   * Internal fuzzy-match confidence, 0–1, or `null` when there was no quote to
   * match. **Never rendered to an end user** — "0.87 similarity" is exactly the
   * false precision this design exists to remove. Stripped before serialization
   * outside research mode.
   */
  match_score: number | null
  /**
   * `true` only when `evidence_quote` was non-null and the check still came back
   * `unresolved` — a quote the model asserted exists that could not be found.
   *
   * Internal and research-only. It is never surfaced in the product UI: to a user
   * it would read as an accusation, and the user-facing treatment of this case is
   * deliberately identical to the no-quote-offered case.
   */
  hallucination_candidate: boolean
}

/**
 * What a client actually receives. The two internal fields above are stripped
 * server-side; research mode (server-flag gated) returns the full `VerifiedClaim`.
 */
export type PublicVerifiedClaim = Omit<VerifiedClaim, 'match_score' | 'hallucination_candidate'>

/** Mechanically computed from the verified claims. Never model-generated. */
export interface CoverageSummary {
  /** `verifiedCount / total`, or `0` when `total === 0` — never `NaN`. */
  overall: number
  /**
   * The same ratio per category. A category with no claims is **absent** rather
   * than `0`, which is what distinguishes "the opportunity stated no requirements
   * of this kind" from "none of them were verified".
   */
  byCategory: Partial<Record<ClaimCategory, number>>
  verifiedCount: number
  uncertainCount: number
  unresolvedCount: number
  /** Equals the sum of the three counts above. */
  total: number
}

/* ── Analysis result ──────────────────────────────────────────────────────── */

export interface AnalysisResult {
  /** 0-100. An interpretive judgment, not a calibrated probability. */
  score: number
  verdict: MatchVerdict
  claims: PublicVerifiedClaim[]
  coverage: CoverageSummary
  /** Exactly 3, derived preferentially from `gap`-status claims. */
  key_actions: string[]
  salary_range: string
  salary_context: string
  /** Exactly 5. */
  interview_questions: InterviewQuestion[]
  /** Exactly 8. */
  ats_checks: ATSCheck[]
}

/* ── Stage 1 output ───────────────────────────────────────────────────────── */

/**
 * The model's raw output is deliberately NOT an `AnalysisResult`.
 *
 * Three things in the final result are things the model must never be able to
 * produce: `id` (assigned from the index), `verification`/`match_score`/
 * `hallucination_candidate` (computed by Stage 2), `coverage` (computed by Stage
 * 3), and `ATSCheck.source` (recorded by whichever mechanism answered). Giving
 * Stage 1 its own type means a model payload cannot be passed off as a verified
 * result by accident — the compiler refuses it, so the separation survives a
 * careless refactor rather than depending on everyone remembering the rule.
 */
export type ClaimDraft = Omit<RequirementClaim, 'id'>

export type ATSCheckDraft = Omit<ATSCheck, 'source'>

export interface AnalysisDraft {
  score: number
  verdict: MatchVerdict
  claims: ClaimDraft[]
  key_actions: string[]
  salary_range: string
  salary_context: string
  interview_questions: InterviewQuestion[]
  ats_checks: ATSCheckDraft[]
}

/**
 * A draft that has been through `normalizeAnalysisDraft`: ids assigned, the
 * empty-string evidence sentinel resolved to `null`, scores clamped.
 *
 * This is what Stage 2 (`lib/analysis/grounding.ts`) takes as input. It is a
 * distinct type from both `AnalysisDraft` and `AnalysisResult` because it sits
 * between them: the claims are addressable but not yet checked.
 */
export interface NormalizedAnalysisDraft extends Omit<AnalysisDraft, 'claims'> {
  claims: RequirementClaim[]
}

/* ── Supporting generations ───────────────────────────────────────────────── */

export interface RewriteResult {
  original_bullets: string[]
  rewritten_bullets: string[]
}

export interface AnalysisSession {
  /** Millisecond timestamp, used as a stable React key and history id. */
  id: string
  /** ISO 8601. */
  date: string
  mode: AnalysisMode
  /** Retained so the chat tab and the re-generate action have full context. */
  cvText: string
  jdText: string
  /** First non-empty line of the description, used as the history label. */
  jobTitle: string
  result: AnalysisResult

  /**
   * `null` when the supporting generation failed.
   *
   * The score analysis is the product; the rewrite and cover letter are
   * enhancements built from two further model calls. Previously a failure in
   * either discarded the whole run — including the successful, quota-consuming
   * analysis the user had already waited for. They are now optional, and their
   * tabs offer a retry instead.
   */
  rewrite: RewriteResult | null
  coverLetter: string | null
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  /** Distinguishes a delivered reply from an error notice rendered in the thread. */
  status?: 'ok' | 'error'
}

/** The stage the analyser UI is in. */
export type AnalysisStep = 'input' | 'loading' | 'results'
