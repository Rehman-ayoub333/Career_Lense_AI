# Open Questions — Final

Classified per the brief's required taxonomy: **BLOCKING** (coding cannot proceed correctly without an answer), **NON-BLOCKING** (has a safe default, can proceed and revisit), **RESEARCH-DEPENDENT** (answer depends on data that doesn't exist yet), **USER-DECISION** (only the user/student can decide — not inferable from the repo or the literature).

## BLOCKING
None identified that block starting Phase 0/1/2 implementation. The closest candidate — whether `JsonSchema` in `lib/ai/types.ts` can express `evidence_quote: string | null` directly or needs a sentinel value — is downgraded to NON-BLOCKING below, because it is a small, cheaply-resolved implementation check with an obvious fallback (a sentinel string), not a decision that changes the architecture if it goes either way.

## NON-BLOCKING (safe default stated, proceed, revisit if wrong)
- **`evidence_quote: string | null` schema expressibility — RESOLVED during Phase 1.** `JsonSchema` in `lib/ai/types.ts` cannot express a nullable type directly (each variant carries one concrete type, no nullable flag), and widening the provider contract/request builder to add one was judged out of scope for a Phase 1 type-only pass. Sentinel chosen: the model emits `""`, `normalizeAnalysisDraft` coerces it to `null` before the domain type is used anywhere else. See `ARCHITECTURAL_DECISION_REGISTER.md` ADR-10.
- **Exact fuzzy-match algorithm inside `grounding.ts`** (Levenshtein-ratio vs. token-overlap vs. a hybrid). Default: token-overlap with normalization first (simpler, no new dependency, per `EVIDENCE_VERIFICATION_SPEC.md`); revisit only if Phase 2's adversarial test suite shows it's insufficient.
- **Exact 0.85/0.55 tier thresholds.** Explicitly provisional pending real dataset calibration (`RESEARCH_DATASET_SPEC.md` §Train/validation/test) — shipping with these defaults for Phase 3 is correct; recalibrating after Phase 8/9 is expected, not a sign the defaults were wrong.
- **Test runner choice — RESOLVED during Phase 0/1.** This document originally defaulted to Vitest on the assumption no test runner existed. `PROJECT_CURRENT_STATE_AUDIT.md` missed that Jest + ts-jest was already wired with 95 passing tests and `npm run verify` already pointed at it — a real gap in that audit, corrected here rather than silently left stale. Decision: keep Jest, do not introduce Vitest. See `ARCHITECTURAL_DECISION_REGISTER.md` ADR-14.
- **Content-safety threshold (`BLOCK_ONLY_HIGH`).** Default: unchanged, per `SECURITY_PRIVACY_SPEC.md` — no evidence this needs revisiting, logged here only so it isn't silently forgotten as a possible future lever.
- **ChatTab.tsx `missingSkills` source, post-Phase-1 type cutover — RESOLVED.** `result.skills_missing` no longer exists. Decision: derive `missingSkills` from `gap`-status claim requirement strings, preserving the existing chat wire shape (`API_CONTRACT_FINAL.md`'s "chat request shape unchanged" stands). The claims-aware chat SHOULD-HAVE (`PROMPT_ARCHITECTURE_FINAL.md` Prompt 5) stays deferred, not pulled forward. See `ARCHITECTURAL_DECISION_REGISTER.md` ADR-13.

## RESEARCH-DEPENDENT (cannot be answered until Phase 8/9 data exists)
- **RQ2's actual outcome** (does grounding measurably reduce identity-driven score variance) — genuinely unknown, will not be guessed at, per `RESEARCH_CONTRIBUTION_FINAL.md`'s explicit statement.
- **Real faithfulness/hallucination-rate numbers** — do not exist yet; `RESEARCH_EVALUATION_FINAL.md` specifies how they'll be produced, not what they are.
- **Whether 60 items or closer to 150 is the right target dataset size** — depends on how quickly inter-annotator κ stabilizes and how much labeler time is actually available; stated as a range for this reason, not a fixed number.
- **Whether the paraphrase-tolerance calibration (0.85/0.55) needs a third tier** — only discoverable once real gold-labeled `partial`/`uncertain` cases are examined at volume.

## USER-DECISION (only the student/user can decide, not inferable)
- **Whether to pursue the publication track at all**, beyond the FYP requirement — `CAREERLENS_MASTER_RESEARCH_AUDIT.md`'s Final Verdict already gives an honest assessment of publishability, but committing time to a paper submission after the FYP is a personal/career decision, not a technical one.
- **Which university's FYP formatting/chapter-structure template to follow** — thesis-structure content in the research audit is generic; the specific template is an institutional requirement only the student has access to.
- **Timeline/deadline constraints** — no FYP submission date has been stated anywhere in this conversation; the phased roadmap is sequenced by dependency, not calendar-fitted, because no calendar constraint has been given.
- **Whether to run the identity-perturbation experiment (Experiment 2) at all**, given it touches fairness/bias — a sensitive research area some supervisors may want scoped differently, or expanded with formal ethics review depending on the institution's requirements; this plan assumes it proceeds as specified but flags that a supervisor conversation about ethics review may be a prerequisite the student should independently confirm.
- **Whether real (not synthetic) job postings used as `opportunity_text` need attribution/licensing review** beyond the informal `manifest.json` note this plan specifies — an institution's research-ethics process may have a stricter requirement than what's assumed here.

## What this document does not claim
This list reflects what's identifiable as unresolved from the planning pass completed across all four turns. It does not claim to be exhaustive of every question that will arise once implementation actually starts — new genuine unknowns encountered during coding are added here as they're found (per the STOP → REPORT → DO NOT GUESS rule), not treated as already covered by this list.
