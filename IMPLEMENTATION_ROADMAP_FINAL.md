# Implementation Roadmap — Final

Consolidates and sequences every step from `MIGRATION_PLAN_FINAL.md` into phases with concrete exit criteria, cross-referencing `CLAUDE_CODE_FINAL_KICKOFF.md`'s existing Phase A–K structure rather than inventing a conflicting second numbering. Where this roadmap adds detail the kickoff file didn't have (the research track, the dataset-collection human task), it says so explicitly.

## Phase 0 — Hygiene (parallelizable, no dependency on anything else)
`error.tsx` reset wiring, `not-found.tsx` metadata, `layout.tsx` nested-`<main>`/hardcoded-URL fixes, `config/site.ts` field wiring, `README.md` corrections, `Hallmark.tsx` accessibility attributes, `.env.local` key population reminder (human task, not code). **Exit criteria:** each fix independently testable and merged; no dependency on Phase 1+.

## Phase 1 — Data contracts (maps to Kickoff Phase A/B)
`DATA_CONTRACTS_FINAL.md` types land in `types/index.ts`, `lib/analysis/schemas.ts`. **Exit criteria:** types compile, existing consumers marked as temporarily broken/TODO (expected per `MIGRATION_PLAN_FINAL.md` Step 1), no attempt to keep the old and new shape simultaneously live.

## Phase 2 — Evidence verification layer (maps to Kickoff Phase B/C)
`grounding.ts`, `aggregate.ts` built and unit-tested against fixtures (`TESTING_STRATEGY_FINAL.md`'s full adversarial suite) before wiring into the live pipeline. **Exit criteria:** verifier suite passing, including every named adversarial case, before Phase 3 begins — this ordering is deliberate, since a verifier bug caught after UI wiring is more expensive to trace than one caught in isolation.

## Phase 3 — Pipeline wiring (maps to Kickoff Phase C)
`/api/analyze` updated to the fixed guard-validate → normalize → verify → aggregate → respond order. `prompts.ts` updated per `PROMPT_ARCHITECTURE_FINAL.md`. **Exit criteria:** integration tests (mocked `generateJson`) passing; a manual live-key smoke test recommended but not required to pass this gate, since live-key testing depends on the human populating `ANTHROPIC_API_KEY`.

## Phase 4 — Design tokens (parallelizable with Phase 1–3)
`--unresolved`/`--unresolved-text` added to `globals.css`. **Exit criteria:** tokens present, unused until Phase 5 consumes them — safe to land any time.

## Phase 5 — Results experience rebuild (maps to Kickoff Phase D/E, the largest phase)
`EvidenceView`, `EvidenceMarker`, `ToolsTabs`, `ScorePanel` changes, `SkillsTab` removal. **Exit criteria:** component tests passing (including the "no red for unresolved" regression assertion), e2e analyze-flow test passing against the new pipeline. **This phase is where STOP → REPORT → DO NOT GUESS is most likely to trigger** — flagged here as the single highest-ambiguity phase in the roadmap, not assumed to proceed smoothly.

## Phase 6 — Dead code removal (maps to Kickoff Phase F)
`share-card.ts` dial/bar-chart removal, band-table consolidation, flat `skills_missing`-shaped field removal. **Exit criteria:** only after Phase 5 verified working — confirmed no lingering consumer of removed code (a grep-based check, not an assumption).

## Phase 7 — research/ scaffold (parallelizable with Phases 1–6 once Phase 2's `grounding.ts` module exists, since the ablation script imports it directly)
Directory structure, dataset schema files, `evaluate.ts`/`perturb.ts`/`ablate.ts` scaffolds, baseline scripts. **Exit criteria:** scripts run against 3–5 hand-written example items (not a full dataset) and produce correctly-shaped output — proving the harness works, not that results are meaningful yet.

## Phase 8 — Human task: dataset construction (explicitly not a coding phase, explicitly not simulated by any implementation session)
Writing 60–150 synthetic CVs and gold labels, second-labeler pass, κ computation, locking `v1/`. **Exit criteria:** owned entirely by the student researcher, outside any Claude Code session's scope — restated here as binding, matching `RESEARCH_DATASET_SPEC.md`'s own statement, so it cannot be silently reassigned to an implementation session later.

## Phase 9 — Experiments (depends on Phase 7 + Phase 8 both complete)
Running Experiments 1–3 against the locked dataset, producing real `summary.json` results. **Exit criteria:** results exist and are reported with the honesty discipline `RESEARCH_EVALUATION_FINAL.md` requires (confidence intervals, error analysis, threats to validity) — not simply "the script ran."

## Phase 10 — Testing hardening and accessibility pass (can begin as early as Phase 5, must complete before any "done" claim)
Full suite per `TESTING_STRATEGY_FINAL.md`, axe-core pass, security-test suite. **Exit criteria:** all named test categories present and passing, not merely a test file existing with a placeholder assertion.

## Dependency graph (summary)
Phase 0 ⟂ everything. Phase 1 → Phase 2 → Phase 3 → Phase 5 → Phase 6. Phase 4 ⟂ Phases 1–3 (must precede Phase 5's consumption of it). Phase 7 depends only on Phase 2's `grounding.ts` existing. Phase 8 ⟂ all code phases (human, parallel track). Phase 9 depends on Phase 7 + Phase 8. Phase 10 threads through Phases 2–6.

## What this document does not claim
No phase has begun. This sequencing is a plan for future sessions, cross-checked against `CLAUDE_CODE_FINAL_KICKOFF.md` for consistency, not a status report.
