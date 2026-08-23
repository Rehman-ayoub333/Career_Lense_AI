# Migration Plan — Final

Current → target state transition. This document describes the migration; it does not perform it. No code is modified by this planning pass.

## Migration is additive-first, destructive-last
The general strategy: introduce new data contracts and new components alongside the old ones where feasible, prove them against real pipeline output, then remove the old ones — rather than a single big-bang rewrite of `AnalysisResult` and every consumer at once. This matters specifically because the AI pipeline's output shape (`DATA_CONTRACTS_FINAL.md`) is a hard dependency for the frontend, backend, and research scripts simultaneously — sequencing the cutover wrong risks a window where components disagree about the shape of the data.

## Migration steps, in dependency order

**Step 1 — Data contract cutover (backend-only, no UI change yet).**
Replace `ANALYSIS_PROPERTIES`/`AnalysisResult` (flat `skills_matched`/`skills_missing`/etc.) with the new `RequirementClaim[]`/`VerifiedClaim[]`/`CoverageSummary` shape (`DATA_CONTRACTS_FINAL.md`). Update `lib/ai/guards.ts` validators to match. At the end of this step, `/api/analyze` returns the new shape but no frontend component consumes the new fields yet — the old UI is temporarily broken against the new API and this is expected, not a regression to chase; Step 1 and Step 2 land together in the same phase gate, not independently shippable.

**Step 2 — Evidence verification layer.**
Add `lib/analysis/grounding.ts` (Stage 2) and `lib/analysis/aggregate.ts` (Stage 3), wired into the pipeline per `AI_PIPELINE_FINAL.md`'s fixed order. This step has no UI dependency and can be developed/tested (`TESTING_STRATEGY_FINAL.md`'s verifier suite) against fixture data before Step 1's live wiring is complete.

**Step 3 — New color tokens.**
Add `--unresolved`/`--unresolved-text` to `globals.css` (additive — does not touch the 19 existing tokens). Safe to land independently, before or after Steps 1–2, since it introduces no new consumer yet.

**Step 4 — Component-level rebuild: results experience.**
Replace `ScorePanel`'s dial-adjacent number treatment, replace `SkillsTab`'s `Tag variant="missing"` (red) usage, introduce the marked-document evidence view and its supporting components (`FRONTEND_COMPONENT_ARCHITECTURE.md`). This is the largest single step and the one most likely to reveal an unspecified case — implementers hitting a genuine gap here follow the STOP → REPORT → DO NOT GUESS rule from `CLAUDE_CODE_FINAL_KICKOFF.md`, restated as binding for this step specifically since it's the highest-ambiguity step in the whole migration.

**Step 5 — Remove dead/superseded code.**
Only after Step 4 is verified working end-to-end: delete `share-card.ts`'s dial/bar-chart drawing functions (superseded by the new visual language — confirm no other consumer first), collapse the three parallel band tables (`BANDS`/`SCORE_BANDS`/`BAND_RANGES`) into one imported source of truth, remove the flat `skills_missing`-shaped fields entirely once no consumer references them (making the red-as-judgment violation structurally impossible, per the master plan's stated fix).

**Step 6 — Hygiene fixes (parallelizable, no ordering dependency on Steps 1–5).**
`error.tsx`'s unused `reset` prop, `not-found.tsx`'s missing metadata, `layout.tsx`'s nested-`<main>` risk and hardcoded `SITE_URL`, `config/site.ts`'s unused fields, `README.md`'s stale content, `Hallmark.tsx`'s missing accessibility attributes. These can land in any order relative to the steps above and are listed separately specifically so they aren't starved by focus on the larger structural steps.

**Step 7 — research/ scaffold.**
Create the `research/` directory structure (`RESEARCH_ARCHITECTURE_FINAL.md`), independent of all `careerlens/` steps above — no ordering dependency, since it only consumes the public API surface once Steps 1–2 are live, or can be scaffolded (folder structure, empty scripts, dataset schema files) before that.

## Backward compatibility
None is promised or required. Per `PROJECT_CURRENT_STATE_AUDIT.md`, there is no persisted server-side data, no external API consumers, and no versioned public contract in production today — there is nothing an old client depends on that a migration would break, which is what makes the additive-then-destructive sequencing above safe to do at this pace rather than needing a parallel-run/feature-flag strategy.

## Rollback
Standard git-branch-per-phase discipline (already implied by `CLAUDE_CODE_FINAL_KICKOFF.md`'s phase gates) — each phase gate is a natural rollback point. No database migration exists to roll back (no database exists), which removes the most common source of migration risk entirely.

## What this document does not claim
No migration has been performed. This is a plan for the future Claude Code kickoff/implementation session(s) to follow, sequenced to minimize the window where the system is in an inconsistent state, not a record of work already done.
