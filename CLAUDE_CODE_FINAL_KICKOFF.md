# CareerLens AI — Claude Code Final Kickoff

**Paste this whole file to Claude Code as the implementation instruction.** It implements `CAREERLENS_FINAL_MASTER_PLAN.md` and `CAREERLENS_MASTER_RESEARCH_AUDIT.md`, both at the repository root — read both before starting Phase A, and re-read the relevant section of the Master Plan before starting each phase below; do not implement from memory of this kickoff file alone.

## Rules for this implementation pass

1. **Work phase by phase, in order.** Do not start phase N+1 until phase N's verification gate passes.
2. **If something is genuinely unspecified** — a detail the Master Plan doesn't answer and that isn't a reasonable, narrow inference from the existing codebase's own conventions — **STOP. Report exactly what's unspecified and why you can't infer it. Do not guess, and do not proceed past that point in the phase.** This applies especially to anything touching the evidence-grounding matching thresholds, the research dataset content, or any change to `lib/history.ts`'s nullable-field handling.
3. **Never weaken** the existing security/privacy posture: nonce-delimited prompt wrapping, `publicMessage`-only error serialization, header-based API key transport, zero server-side persistence, two-layer log redaction. If a phase seems to require touching one of these files, re-read Master Plan §9.1/§12.6 first — the answer is almost always "extend, don't rewrite."
4. **Every phase ends with `npm run verify`** (typecheck + lint + test) passing, run from `careerlens/`, plus the phase-specific manual check listed below. Do not move on if either fails.
5. **Do not add a new production dependency** at any point without stopping and asking first — this includes any fuzzy-string-matching library, any accessibility-testing library, and anything for the research scripts. The Master Plan's grounding algorithm (§9.4) is specified to be implementable with zero new dependencies; if you find yourself reaching for one, you've likely over-built the matcher — stop and reconsider before asking.
6. **Commit at phase boundaries**, not mid-phase, so each verification gate corresponds to a reviewable commit.

---

## PHASE A — Baseline verification (no code changes)

**Goal:** confirm the repository is in the state both planning documents assume before touching anything.

**Tasks:**
- Confirm `GOOGLE_API_KEY` resolves to a real, working key (`GET /api/health` returns `ready: true` AND a real `POST /api/analyze` call against the demo CV/JD succeeds end to end — the health check alone is not sufficient, per the known gap in Master Plan §12.2).
- If no working key is available: **STOP here.** Report this plainly and do not proceed to Phase B. Every later phase depends on being able to run real analyses against the new pipeline.
- Run `npm run verify` from `careerlens/` and confirm it's green on the current `main`, matching the state recorded in the research audit.

**Verify:** one real `/api/analyze` response received in a browser or via curl, with a non-empty `score` and `key_actions`. `npm run verify` green.

---

## PHASE B — Data model & schema foundation

**Goal:** land the new types and schemas with nothing yet consuming them incorrectly. This phase touches type definitions only, not runtime logic beyond what TypeScript strict mode requires to keep compiling.

**Files to modify:**
- `careerlens/src/types/index.ts` — add `RequirementClaim`, `VerifiedClaim`, `CoverageSummary`, `ClaimCategory`, `ClaimStatus`, `VerificationTier` exactly per Master Plan §11.1. Restructure `AnalysisResult`: remove `skills_score`, `experience_score`, `education_score`, `research_score`, `leadership_score`, `academic_score`, `verdict_note`, `skills_matched`, `skills_missing`, `skills_extra`, `keywords_present`, `keywords_missing`; add `claims: VerifiedClaim[]` and `coverage: CoverageSummary`. Keep `score`, `verdict`, `key_actions`, `salary_range`, `salary_context`, `interview_questions`, `ats_checks` as-is.
- `careerlens/src/lib/analysis/schemas.ts` — restructure `ANALYSIS_PROPERTIES`/`ANALYSIS_SCHEMA`/`SCHOLARSHIP_ANALYSIS_SCHEMA` to match: the schema now asks the model for `claims` (an array of `{ requirement, category, status, evidence_quote, rationale }` — `evidence_quote` is `type: 'string'`, nullable via the schema's own convention for optional-but-typed fields, or model it as always-string with an explicit `"NONE"` sentinel if the constrained decoder can't express nullable strings — **check `JsonSchema`'s actual nullable support in `lib/ai/types.ts` before deciding; if it can't express null, use the sentinel approach and document the choice in a code comment, don't silently pick one**). Remove the six sub-score properties and `verdict_note` from the schema entirely.
- `careerlens/src/lib/analysis/guards.ts` — extend `isAnalysisResult`/`normalizeAnalysisResult` for the new shape; this is where score-clamping and empty-string-dropping logic already lives, extend the same patterns rather than writing new ones.
- `careerlens/src/lib/api/contract.ts` — mirror the wire type changes, keeping the existing domain-vs-wire separation intact.

**Do not yet touch:** `lib/prompts.ts` (Phase D), any UI component, `lib/analysis/grounding.ts` (doesn't exist yet — Phase C).

**Verify:** `npm run typecheck` fails everywhere the old fields were consumed (expected — this is the point) with a clear, enumerable list of call sites to fix in later phases. Do not fix those call sites in this phase; just confirm the list is what Master Plan §15 predicts (`SkillsTab.tsx`, `KeywordsTab.tsx`, `ATSTab.tsx`, `ScorePanel.tsx`, `share-card.ts`, `scoring.ts`/`constants.ts`/`Hallmark.tsx`'s band tables). If the failing-file list contains anything not mentioned in Master Plan §15, **stop and report** — that's a sign of an undocumented dependency on the old shape.

---

## PHASE C — Grounding module

**Goal:** build and unit-test the deterministic verification stage in complete isolation, before it's wired into anything.

**Files to create:**
- `careerlens/src/lib/analysis/grounding.ts` — implements `verifyClaims(claims: RequirementClaim[], sourceText: string): VerifiedClaim[]` and `aggregateCoverage(claims: VerifiedClaim[]): CoverageSummary`, per the exact algorithm in Master Plan §9.4 (normalize → sliding-window token-overlap → threshold at 0.85/0.55). Pure functions. No imports from `lib/ai/*`, no `fetch`, no `async`.
- `careerlens/tests/grounding.test.ts` — unit tests covering: an exact-match quote (must be `verified`); a paraphrased-but-clearly-present quote (must be `verified` or `uncertain` depending on how close — pick concrete fixture examples and assert the actual threshold behaviour, don't just assert "it works"); a quote for a claim marked `gap` with `evidence_quote: null` (must be `unresolved`, `hallucination_candidate: false`); a quote the model invented that doesn't appear anywhere in the source (must be `unresolved`, `hallucination_candidate: true`); `aggregateCoverage` on a mixed set, asserting the exact ratio math.

**Verify:** `npm test grounding` green, with test names that make the threshold behaviour legible to someone reading the test output (not just "test 1 passed").

---

## PHASE D — Wire grounding into the pipeline

**Goal:** the real `/api/analyze` call produces the new shape end to end.

**Files to modify:**
- `careerlens/src/lib/prompts.ts` — rewrite `getJobAnalysisPrompt`/`getScholarshipAnalysisPrompt` to ask for `claims` per requirement instead of flat skill lists, per Master Plan §9.2. Preserve the nonce-delimited `wrapUntrusted` mechanism exactly — do not touch that function's implementation, only the surrounding instructional text. Preserve the `INJECTION_NOTICE` mechanism unchanged.
- `careerlens/src/app/api/analyze/route.ts` — after the existing `generateJson` call returns and passes `guards.ts` validation, call `verifyClaims`/`aggregateCoverage` from `lib/analysis/grounding.ts` before returning the response. This is a synchronous, in-process addition — no new `await` on external I/O, no change to the route's timeout budget.
- `careerlens/src/lib/prompts.ts` (again) — update `getRewritePrompt`/`getCoverLetterPrompt`/`getChatPrompt` to accept and reference the `unresolved`-tier claims specifically, per Master Plan §12.1's "gap-aware" note, rather than the old flat `skills_missing`.
- Wherever those prompt functions are called (`app/api/rewrite/route.ts`, `app/api/cover-letter/route.ts`, `app/api/chat/route.ts` if you're doing the chat SHOULD-HAVE now — otherwise leave chat's call site alone until Phase K) — update the call sites to pass claims instead of the old flat arrays.

**Stage 2b (adjudication escalation) is SHOULD-HAVE — build it in this phase only if Phase A–D core work is solid and green; otherwise defer to Phase K and leave `ADJUDICATION_ENABLED` unset/false.** If you build it: new function in `lib/ai/index.ts` or `grounding.ts` (your call, but keep it out of the pure `grounding.ts` module if it needs to make a network call — pure functions and I/O should not live in the same file, per the existing codebase's own separation conventions) that batches all `uncertain`-tier claims into one schema-constrained call, gated by `process.env.ADJUDICATION_ENABLED === 'true'`.

**Verify:** a real end-to-end `POST /api/analyze` call (against the demo CV/JD, and against at least one hand-crafted CV you construct with a deliberately unsupported claim baked in) returns `claims` with a mix of `verified`/`uncertain`/`unresolved` tiers that makes sense on manual inspection. `npm run verify` green.

---

## PHASE E — Frontend: evidence experience

**Goal:** replace the eight-tab dashboard with the marked-document IA from Master Plan §14.1, and fix every call site Phase B's typecheck flagged.

**Files to create:**
- `careerlens/src/components/tool/results/evidence/EvidenceDocument.tsx`
- `careerlens/src/components/tool/results/evidence/ClaimMarker.tsx`
- `careerlens/src/components/tool/results/evidence/RequirementChecklist.tsx`
- `careerlens/src/components/tool/results/evidence/CoverageSummary.tsx`
- `careerlens/src/components/tool/AssessmentPanel.tsx`

**Files to modify:**
- `careerlens/src/components/ui/Badge.tsx` — `TagVariant` → `'verified' | 'uncertain' | 'unresolved' | 'neutral'` per Master Plan §13.2/§15. Keep the no-`role="status"` decision unchanged.
- `careerlens/src/components/ui/Hallmark.tsx` — add the accessible sentence (pattern already correct in `HistoryPanel.tsx` — reuse that pattern, don't invent a new one); raise the compact label from `text-[0.6875rem]` to at least `text-xs` (12px).
- `careerlens/src/components/tool/AnalyzeTool.tsx` — results branch renders `AssessmentPanel` + `EvidenceDocument` + the narrowed `ResultsTabs`, not the old `ScorePanel` + full `ResultsTabs`. Fix the input-form column balance and make the Analyse button full-width, per Master Plan §14.6's QA-flagged item.
- `careerlens/src/components/tool/results/tabs/ResultsTabs.tsx` — narrow to `Rewrite`, `Cover Letter`, `Interview Prep`, `Chat` only.
- `careerlens/src/lib/scoring.ts`, `careerlens/src/lib/analysis/constants.ts`, `careerlens/src/components/ui/Hallmark.tsx` — collapse the three parallel band tables into one source of truth (your choice which file owns it, but the other two must re-export from it, not redeclare it — this is a straightforward mechanical dedupe, not a design decision, so don't stop to ask).
- `careerlens/src/app/analyze/page.tsx` — replace the `sr-only` `<h1>` with a real, designed page header, per the source comment's own stated intent.

**Files to delete:**
- `careerlens/src/components/tool/results/tabs/SkillsTab.tsx`
- `careerlens/src/components/tool/results/tabs/KeywordsTab.tsx`
- `careerlens/src/components/tool/results/tabs/ATSTab.tsx`
- `careerlens/src/components/tool/results/ScorePanel/ScorePanel.tsx` (superseded by `AssessmentPanel.tsx` — confirm nothing else imports it before deleting; if something does, that's a sign of an incomplete Phase E, not a reason to keep the old file around as a fallback)

**Verify:** `npm run typecheck` clean (Phase B's failure list is now fully resolved). Manually render `/analyze`, run a real analysis, and confirm: no component anywhere renders `Tag variant="missing"` in red (grep the built output / search the diff for any remaining reference to the deleted `missing`/`match`/`extra` tag variants — there should be none); the evidence document shows inline markers for at least one `verified` and one `unresolved` claim on your Phase D test CV; keyboard-only navigation reaches every marker and every tools tab; a screen reader (or the browser's accessibility tree inspector, at minimum) announces a verification tier as text, not just a colour.

---

## PHASE F — Design-system and accessibility fixes

**Goal:** close the remaining confirmed defects that don't depend on the evidence architecture.

**Files to modify:**
- `careerlens/src/app/layout.tsx` — add `MotionConfig` wrapping the app, honouring `prefers-reduced-motion`, closing the gap `globals.css` has claimed exists since before this plan.
- Every component under `components/tool/results/` (new and surviving) — add `useReducedMotion()` guards to any `motion.*` usage that doesn't already have one.
- `careerlens/src/app/error.tsx` — accept and log the `error` prop (currently not even destructured); surface `digest` if present, without exposing internals to the user-facing copy (`publicMessage`-only discipline extends here too).
- `careerlens/src/app/not-found.tsx` — add a `metadata` export.
- `careerlens/src/app/error.tsx`, `careerlens/src/app/not-found.tsx`, `careerlens/src/app/privacy/page.tsx` — remove the nested `<main>` (`layout.tsx` already renders one; these should render a non-`main` container, e.g. `Container as="div"`).
- `careerlens/src/components/landing/ComparisonSection.tsx` — replace all three `py-5` occurrences with a legal spacing value from the resolved scale (Master Plan §13.4 / §11.4) — nearest legal neighbours are `4` (16px) or `6` (24px); pick based on visual review, this is a minor value choice, not a stop-and-ask decision.
- `careerlens/src/app/layout.tsx` — wire `getSiteUrl()` (currently dead in `lib/env.ts`) into the hardcoded `SITE_URL` constant.
- New: `careerlens/src/app/sitemap.ts`, `careerlens/src/app/robots.ts` (SHOULD-HAVE — do in this phase if time allows, otherwise Phase K).

**Verify:** `npm run verify` green. Manual: trigger a client error and confirm it's logged (check server logs, not just that the UI shows the fallback card); confirm `/privacy`, `/404`, and a forced error each render exactly one `<main>` in the DOM; confirm reduced-motion is honoured by toggling the OS setting and re-running an analysis.

---

## PHASE G — Share card rewrite

**Files to modify:**
- `careerlens/src/lib/share-card.ts` — remove `drawScoreDial` (the ring/arc), the verdict pill, and `drawSummary`'s bar-chart section entirely. Draw instead: the struck numeral (no colour by band), the band word, `coverage.overall` as plain text ("14 / 17 verified"), and up to three `verified`-tier requirement strings as plain, uncoloured text chips.
- `careerlens/src/config/design-tokens.ts` — trim `CANVAS_TOKENS`/`SCORE_CANVAS_COLORS`/`SCORE_CANVAS_SOFT` to only what the new drawing needs.

**Verify:** generate a share card PNG from a real analysis and visually confirm it contains no ring gauge, no colour-by-band numeral, no bar chart — and that it matches the in-app `Hallmark` doctrine (struck, uncoloured, reference always present).

---

## PHASE H — Security hardening

**Files to modify:**
- `careerlens/src/lib/rate-limit.ts` — add a second bucket keyed per-IP-per-hour, reading the existing (currently unread) `RATE_LIMIT_PER_HOUR` env var via a new `lib/env.ts` getter (follow the existing `read()`/getter pattern exactly — don't invent a new env-access style). Both the per-minute and per-hour checks must pass for a request to proceed.
- `careerlens/src/lib/env.ts` — add `getRateLimitPerHour()` following the existing pattern.

**Files to create:**
- `careerlens/tests/security/injection.test.ts` — a small fixture set of adversarial CV/JD text (attempts to override instructions, attempts to forge a nonce-closing marker, attempts to inject fake `<<<END_...>>>` sequences) run through `wrapUntrusted`/the full prompt-building functions, asserting the untrusted content never appears unescaped adjacent to the system instruction in a way that could be mistaken for it. If Stage 2b/adjudication was built in Phase D, include a fixture for its batched-quote prompt too, since batching multiple untrusted quotes into one call is new surface.

**Verify:** new tests pass; manually confirm the hourly cap actually triggers (temporarily lower it in a local `.env.local` override, hit it, confirm a 429 with the correct `Retry-After`, then revert the override — do not leave a lowered limit committed).

---

## PHASE I — Research infrastructure

**Goal:** stand up `research/` per Master Plan §17, entirely outside `careerlens/`.

**Files/directories to create (at the repo root, sibling to `careerlens/`):**
- `research/dataset/` — the synthetic CV/JD/scholarship-criteria pairs and hand labels. **This is content, not code — you (Claude Code) should scaffold the folder, the file format (pick a simple, self-explanatory format: one JSON file per item, or one JSONL file for the whole set — your call, document the choice in a `research/dataset/README.md`), and 3–5 fully worked example items so the format is unambiguous. Do NOT attempt to generate the full 60–150-item labeled dataset yourself — that's the student's labeling work, per Master Plan §17/research audit §14, and mechanically generating "labels" without a human judgment behind them would defeat the entire point of a gold-standard set. Stop after the scaffold and examples, and report that the remaining dataset construction is a human task.**
- `research/annotation/GUIDELINES.md` — the labeling rules: what counts as `matched` vs `partial` vs `gap`, how to write an `evidence_quote`, how the second labeler pass works, how inter-rater disagreement gets resolved. Write this fully — it's a specification document, not data, so it's in scope for you to complete.
- `research/scripts/baselines/keyword-overlap.ts` — simplest defensible baseline (Master Plan §12/research audit §12): tokenize CV and requirement text, compute overlap.
- `research/scripts/baselines/embedding-similarity.ts` — cosine similarity via a lightweight, already-available embedding approach; **if this requires a new dependency (e.g. a local embedding model or an API-based embedding call), stop and ask before adding it — this is exactly the kind of dependency decision Rule 5 at the top of this file reserves for a human.**
- `research/scripts/evaluate.ts` — Experiment 1: runs both the grounded and ungrounded pipeline (toggle via `ADJUDICATION_ENABLED`/a direct flag into `grounding.ts`, or by calling `/api/analyze` twice with a research-mode override — your call, document it) against `research/dataset/`, computes faithfulness rate, hallucination rate, precision/recall/F1 vs. the gold labels, writes results to `research/results/<timestamp>/`.
- `research/scripts/perturb.ts` — Experiment 2: generates name/institution-perturbed variants of each dataset item, runs both pipelines, computes score-variance per item, writes results.
- `research/scripts/ablate.ts` — Experiment 3: runs the pipeline with `verifyClaims` called vs. skipped (a simple conditional import/flag, since the module is pure per Phase C), diffs the `verification` distributions.
- `research/README.md` — how to run each script, what each produces, and the reproducibility fields (model string, temperature, run count) each result file must record, per Master Plan §18.

**Verify:** each script runs against the 3–5 example dataset items without error and produces a results file with the documented shape. Full-scale results against the complete dataset are explicitly out of scope for this phase (the dataset doesn't exist yet) — this phase verifies the *harness* works, not that the *experiments* have been run.

---

## PHASE J — Documentation reconciliation

**Files to modify:**
- `SPEC.md` (root) — add a short header note: superseded by `CAREERLENS_FINAL_MASTER_PLAN.md` wherever the two disagree, naming the specific superseded sections (§FR-05, §FR-06, §FR-13, §22) per Master Plan §22. Do not rewrite the rest of `SPEC.md` line by line.
- `QA-REPORT.md` — confirm it still carries the "superseded, method valuable" annotation from the prior pass; add one if missing.
- `CLAUDE.md` (root) — reduce to a short pointer to `careerlens/CLAUDE.md` as the authoritative rules file, per Master Plan §11.4/§22.
- `careerlens/CLAUDE.md` — update its "current session task" note to reflect that the redesign passes described are complete and point to `CAREERLENS_FINAL_MASTER_PLAN.md` for what's current.
- `README.md` (root, 17 bytes today) and `careerlens/README.md` (6.4KB, stale) — consolidate into one accurate root README per the product-audit correction from the earlier session: pull the still-accurate tech-stack/architecture content from `careerlens/README.md`, remove the stale "animated gauge" and DOCX-upload claims, add a short section on the evidence-grounding architecture. Reduce `careerlens/README.md` to a pointer at the root file, or delete it — your call, document which.

**Verify:** no remaining `.md` file in the repository describes the deleted score gauge, breakdown bars, or flat skill lists as current. `git grep -i "animated gauge\|breakdown bar\|skills_missing"` (or equivalent) across tracked `.md` files returns nothing outside of explicitly-marked "superseded" historical sections.

---

## PHASE K — Remaining SHOULD-HAVEs (do only after A–J are green)

In priority order, each independently gate-able: mobile responsive pass across all result components (per Master Plan §14.8's stated priority order — score/coverage, then document, then recommendations, then tools); `CoverLetterTab` retry using the existing unused `updateCoverLetter` hook return; `?deep=1` health check; chat endpoint given claim context; Stage 2b adjudication if not already built in Phase D; sitemap/robots/JSON-LD if not already done in Phase F.

**Do not start Phase K work if any earlier phase's verification gate is not passing.** This phase is explicitly optional relative to the thesis's definition of done (Master Plan §25) — stop here and report completion status if time runs out before Phase K, rather than doing partial K work at the expense of a clean, fully-verified A–J.

---

## Final acceptance check (run after Phase J, before touching Phase K)

Walk through Master Plan §25's definition of done, item by item, and report pass/fail on each:
1. App runs end-to-end against a real key.
2. `/analyze` renders the marked-document evidence experience with zero remaining code path that can produce a red "missing skill" tag.
3. `research/scripts/evaluate.ts` and `ablate.ts` run successfully against the example dataset (full-dataset results are not required for this check, per Phase I's scope).
4. `npm run verify` is green.
5. No `.md` file describes the deleted design as current (Phase J's check).

Report this checklist's results explicitly. Do not declare the implementation complete without it.
