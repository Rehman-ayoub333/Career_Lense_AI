# Data Contracts — Final

**Canonical.** Frontend and backend both import from `careerlens/src/types/index.ts` (domain types) and `careerlens/src/lib/api/contract.ts` (wire types, kept in lockstep per the existing, preserved architectural separation). Every type below is intended to be pasted essentially verbatim into those files during implementation. Every field has: name, type, required/optional, allowed values, meaning, example.

## CV document (input)
| Field | Type | Required | Allowed values | Meaning | Example |
|---|---|---|---|---|---|
| `cvText` | `string` | yes | length 100–8000 chars post-sanitization (`INPUT_LIMITS.cv`, unchanged) | The applicant's CV, plain text, already sanitized | `"Senior software engineer with 4 years..."` |

## Opportunity document (input)
| Field | Type | Required | Allowed values | Meaning | Example |
|---|---|---|---|---|---|
| `jdText` | `string` | yes | length 50–6000 chars post-sanitization (`INPUT_LIMITS.jd`, unchanged) | Job description or scholarship criteria, plain text | `"We are looking for a strong frontend engineer..."` |
| `mode` | `'job' \| 'scholarship'` | yes | exactly these two | Which prompt/schema variant to use | `"job"` |

## Analysis request (wire, `POST /api/analyze`)
```ts
interface AnalyzeRequest {
  cvText: string
  jdText: string
  mode: 'job' | 'scholarship'
}
```

## RequirementClaim (model output, pre-verification)
| Field | Type | Required | Allowed values | Meaning | Example |
|---|---|---|---|---|---|
| `id` | `string` | yes | any non-empty string, unique within the response | Stable identifier, derived server-side from array index (`"claim-0"`, `"claim-1"`, ...) — NOT model-generated, to guarantee uniqueness and stable React keys | `"claim-3"` |
| `requirement` | `string` | yes | non-empty, ≤200 chars (enforced by schema `description`, soft) | The specific requirement being assessed, in the applicant's/committee's language | `"3+ years of production React experience"` |
| `category` | `ClaimCategory` | yes | `'skill' \| 'experience' \| 'education' \| 'ats' \| 'research' \| 'leadership' \| 'academic'` (last three: scholarship mode only) | Groups claims for the checklist UI and for `coverage.byCategory` | `"skill"` |
| `status` | `ClaimStatus` | yes | `'matched' \| 'partial' \| 'gap'` | The MODEL's own self-reported judgment — never trusted alone for the UI's verification tier | `"matched"` |
| `evidence_quote` | `string \| null` | yes (nullable) | if non-null: a literal or near-literal substring the model asserts appears in the CV; if `status: 'gap'`, MUST be `null` (schema-enforced where possible, guard-enforced otherwise) | The exact text the claim is grounded in | `"built and shipped three production React applications over 4 years"` |
| `rationale` | `string` | yes | non-empty, one sentence, ≤240 chars | Human-readable, CV-specific explanation — replaces the old `verdict_note`'s job at claim level | `"The CV states four years building React apps, exceeding the stated 3-year minimum."` |

## VerifiedClaim (server output, post-verification — what the client actually receives inside `AnalysisResult.claims`)
Extends `RequirementClaim` with:
| Field | Type | Required | Allowed values | Meaning | Example |
|---|---|---|---|---|---|
| `verification` | `VerificationTier` | yes | `'verified' \| 'uncertain' \| 'unresolved'` | The MECHANICAL result of Stage 2 — the only field the UI is allowed to render a colour/marker from | `"verified"` |
| `match_score` | `number \| null` | yes (nullable) | `0.0`–`1.0`, or `null` when `evidence_quote` was `null` | Internal fuzzy-match confidence. **Never sent in the standard (non-research-mode) response.** | `0.91` |
| `hallucination_candidate` | `boolean` | yes | `true \| false` | `true` only when `evidence_quote` was non-null AND `verification: 'unresolved'` — a quote the model asserted exists but that the deterministic check could not find. Internal/research use only; never shown to end users as an accusation. | `false` |

**In the standard client response, `match_score` and `hallucination_candidate` are stripped server-side before serialization** (see `API_CONTRACT_FINAL.md`'s response-shaping note) — the client type for normal use is `PublicVerifiedClaim = Omit<VerifiedClaim, 'match_score' | 'hallucination_candidate'>`. Research mode (`X-Research-Mode: 1`, server-flag-gated) returns the full `VerifiedClaim`.

## CoverageSummary
| Field | Type | Required | Allowed values | Meaning | Example |
|---|---|---|---|---|---|
| `overall` | `number` | yes | `0.0`–`1.0` | `verifiedCount / total`; `0` when `total === 0` (explicit guard, never `NaN`) | `0.82` |
| `byCategory` | `Partial<Record<ClaimCategory, number>>` | yes | each value `0.0`–`1.0` | Same ratio, scoped to claims of that category; a category absent from the CV's claim set is simply absent from this object, not `0` (distinguishes "no requirements of this type existed" from "none were verified") | `{ "skill": 0.75, "experience": 1.0 }` |
| `verifiedCount` | `integer` | yes | `≥ 0` | Count of `verification: 'verified'` claims | `14` |
| `uncertainCount` | `integer` | yes | `≥ 0` | Count of `verification: 'uncertain'` claims | `2` |
| `unresolvedCount` | `integer` | yes | `≥ 0` | Count of `verification: 'unresolved'` claims | `1` |
| `total` | `integer` | yes | `≥ 0`, equals the sum of the three counts above | Total claims assessed | `17` |

## ATSCheck (preserved from the current shape, status source now hybrid)
| Field | Type | Required | Allowed values | Meaning | Example |
|---|---|---|---|---|---|
| `id` | `string` | yes | one of 8 fixed ids per mode (unchanged from current `JOB_ATS_CHECKS`/`SCHOLARSHIP_ATS_CHECKS`) | Stable check identifier | `"dates"` |
| `label` | `string` | yes | short human-readable name | Display label | `"Consistent date format"` |
| `status` | `ATSStatus` | yes | `'pass' \| 'fail' \| 'warn'` | Outcome — for the 3 mechanically-checkable ids (`dates`, `contact`, `tables`), this is the deterministic result when conclusive, the model's result otherwise; for the remaining 5, always the model's result | `"pass"` |
| `note` | `string` | yes | one specific sentence | Explanation specific to this CV | `"All three dates use MM/YYYY consistently."` |
| `source` | `'deterministic' \| 'model'` | yes | exactly these two | **New field.** Tells the UI (and research mode) which mechanism produced this status — required for `EVIDENCE_VERIFICATION_SPEC.md`'s mechanical-check transparency | `"deterministic"` |

## InterviewQuestion (unchanged)
```ts
interface InterviewQuestion {
  question: string
  skill_tested: string
  tip: string
}
```

## AnalysisResult (the full response body's `data` field, per `lib/api/contract.ts`'s envelope)
```ts
interface AnalysisResult {
  score: number                        // 0-100, integer, clamped server-side — unchanged
  verdict: MatchVerdict                // 'Weak Match' | 'Partial Match' | 'Good Match' | 'Strong Match' — unchanged
  claims: PublicVerifiedClaim[]         // NEW — replaces skills_*/keywords_*/verdict_note/six sub-scores entirely
  coverage: CoverageSummary             // NEW — mechanically computed, never model-generated
  key_actions: string[]                 // exactly 3, unchanged shape — now generated preferentially from gap/unresolved claims
  salary_range: string                  // unchanged
  salary_context: string                // unchanged
  interview_questions: InterviewQuestion[]  // exactly 5, unchanged
  ats_checks: ATSCheck[]                 // exactly 8, `source` field added
}
```
**Explicitly removed from this shape, and from the schema that produces it:** `skills_score`, `experience_score`, `education_score`, `research_score`, `leadership_score`, `academic_score`, `verdict_note`, `skills_matched`, `skills_missing`, `skills_extra`, `keywords_present`, `keywords_missing`. Any later change that reintroduces one of these must be recorded in `ARCHITECTURAL_DECISION_REGISTER.md` with a reason, not silently restored.

## RewriteResult, AnalysisSession (unchanged)
Preserved exactly as currently implemented — `RewriteResult { original_bullets: string[], rewritten_bullets: string[] }` (index-aligned, 5 each) and `AnalysisSession`'s nullable `rewrite`/`coverLetter` fields (the data-loss guard, 11 regression tests, do not touch).

## Recommendation (key_actions, contextualized)
Not a separate type — `key_actions: string[]` remains flat strings, but the *prompt* generating them (per `PROMPT_ARCHITECTURE_FINAL.md`) is now instructed to derive them preferentially from `status: 'gap'` claims, so each action traces back to a specific unresolved requirement even though the wire type itself stays simple. This is a deliberate choice: a `RequirementClaim[]`-shaped `key_actions` field would be more traceable but adds UI complexity disproportionate to the benefit for a v1 — recorded as a decision in `ARCHITECTURAL_DECISION_REGISTER.md`.

## Metadata (session-level, unchanged)
```ts
interface AnalysisSession {
  id: string           // ms timestamp, stable key
  date: string          // ISO 8601
  mode: AnalysisMode
  cvText: string
  jdText: string
  jobTitle: string
  result: AnalysisResult
  rewrite: RewriteResult | null
  coverLetter: string | null
}
```

## Errors (unchanged envelope, `lib/api/contract.ts`)
```ts
// success
{ success: true, data: T }
// failure
{ success: false, error: ErrorCode, message: string, requestId: string, retryAfter?: number }
```
`ErrorCode` is the existing 10-code taxonomy in `lib/errors.ts` — no new error codes are required by this plan; the evidence pipeline's failure modes (`FAILURE_MODES_FINAL.md`) all map onto existing codes (`AI_INVALID_OUTPUT`, `AI_TIMEOUT`, `AI_UNAVAILABLE`, `AI_CONTENT_BLOCKED`, `VALIDATION_ERROR`).
