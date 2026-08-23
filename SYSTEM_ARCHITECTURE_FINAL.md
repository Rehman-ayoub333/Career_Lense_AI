# System Architecture — Final

```
User
 ↓
Frontend (Next.js App Router, React 19, client components under /analyze)
 ↓
API (POST /api/analyze — the only route in this data flow; enhancements are separate, see below)
 ↓
Document Processing (sanitizeText — control/zero-width/bidi stripping, HTML-tag stripping; pdf.ts for uploads)
 ↓
Analysis Pipeline Stage 1 — Claim + Evidence Generation (one Gemini call, schema-constrained)
 ↓
Deterministic Evidence Verification (Stage 2 — pure function, no network, no model call)
 ↓
Evidence Classification (Stage 3 — aggregation into CoverageSummary)
 ↓
Structured Result (AnalysisResult, per DATA_CONTRACTS_FINAL.md)
 ↓
Frontend Evidence Visualization (marked-document view, per FRONTEND_UX_SPEC_FINAL.md)
```

Enhancements (`/api/rewrite`, `/api/cover-letter`, `/api/chat`) run as siblings to this pipeline, not inside it — `/api/rewrite` and `/api/cover-letter` fan out from the client via `Promise.allSettled` alongside `/api/analyze`, consuming its `AnalysisResult` only after it returns; `/api/chat` is a fully separate, later, stateless-per-turn call. This fan-out shape is unchanged from the current implementation and is confirmed correct in the prior audits — it is preserved, not redesigned.

## Component specifications

### Document Processing
**Responsibility:** turn raw upload bytes or pasted text into sanitized plain text safe to embed in a prompt. **Inputs:** `File` (PDF/TXT, ≤4MB) or raw string. **Outputs:** sanitized `string`. **Dependencies:** `pdf-parse` (existing, unchanged), `lib/validators.ts`'s `sanitizeText`. **Failure modes:** unreadable/scanned PDF (near-zero extracted characters — existing `UPLOAD_LIMITS.minExtractedChars` guard), oversized file (existing 4MB cap), non-PDF/TXT mime type (existing rejection). **Security:** strips zero-width/bidi characters specifically because they're invisible-to-user, visible-to-model injection vectors — unchanged, preserved exactly. **Testing:** existing `validators.test.ts` extended, not replaced.

### Stage 1 — Claim + Evidence Generation
**Responsibility:** produce a structured judgment of the CV against the opportunity, with every requirement-level claim carrying a literal source quote or an explicit null. **Inputs:** sanitized CV text, sanitized opportunity text, mode (`job`/`scholarship`). **Outputs:** `{ score, verdict, claims: RequirementClaim[], key_actions, salary_range, salary_context, interview_questions, ats_checks }` — unverified at this point; `verification` fields do not exist yet. **Dependencies:** `lib/ai/index.ts` (`generateJson`), `lib/analysis/schemas.ts`, `lib/prompts.ts`. **Failure modes:** malformed JSON (existing one-repair-attempt strategy, unchanged), provider timeout/rate limit/content block (existing `AppError` taxonomy, unchanged). **Security:** nonce-delimited untrusted-content wrapping, unchanged and load-bearing — the CV and opportunity text are still the two things being wrapped. **Testing:** schema validation unit tests (`guards.test.ts`, extended); no live-model test in CI (costs quota) — a fixture-response test using a captured real response instead.

### Stage 2 — Deterministic Evidence Verification
**Responsibility:** decide, mechanically, whether each claim's `evidence_quote` actually exists in the source text. **Inputs:** `RequirementClaim[]` from Stage 1, the original (unsanitized-of-meaning, i.e. the same text the model saw) CV text. **Outputs:** `VerifiedClaim[]` (adds `verification`, `match_score`, `hallucination_candidate`). **Dependencies:** none beyond the standard library — no new production dependency, per `AI_PIPELINE_FINAL.md`. **Failure modes:** none that raise — this is a pure function over strings; a pathological input (e.g., an empty `evidence_quote` string that isn't `null`) is handled as a defined edge case (`EVIDENCE_VERIFICATION_SPEC.md`), not an exception. **Security:** operates only on text already sanitized in Document Processing; no new attack surface. **Testing:** the single most heavily tested module in the system — see `TESTING_STRATEGY_FINAL.md`.

### Stage 3 — Evidence Classification / Aggregation
**Responsibility:** turn a list of `VerifiedClaim`s into the `CoverageSummary` the UI actually renders. **Inputs:** `VerifiedClaim[]`. **Outputs:** `CoverageSummary` (`overall`, `byCategory`, counts). **Dependencies:** none. **Failure modes:** empty claims array (defined: `overall: 0`, not `NaN` — must be handled explicitly, division-by-zero guarded). **Testing:** unit tests covering the empty-array case explicitly, since it's the one edge a naive ratio implementation gets wrong.

### Frontend Evidence Visualization
**Responsibility:** render the `AnalysisResult` as the marked-document experience. **Inputs:** the full `AnalysisResult` object, unmodified, straight off the wire (no client-side re-derivation of verification tiers — the server is the sole source of truth for `verification`, preventing any drift between what was computed and what's displayed). **Outputs:** none (terminal UI layer). **Dependencies:** `FRONTEND_COMPONENT_ARCHITECTURE.md`'s component set. **Failure modes:** see `FAILURE_MODES_FINAL.md`. **Testing:** component tests per verification tier, including the zero-claims case.
