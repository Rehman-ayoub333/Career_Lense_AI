# Final File Manifest

Complete intended repository tree at the end of implementation (not today). Files marked **[NEW]** do not exist yet. Files marked **[MODIFIED]** exist today and change. Files marked **[UNCHANGED]** exist today and this plan does not touch them. Files marked **[REMOVED]** exist today and are deleted per `MIGRATION_PLAN_FINAL.md` Step 5.

```
Career_Lense_AI/
├── README.md                                    [MODIFIED — currently stale, mentions removed "animated gauge"/DOCX]
├── CLAUDE.md                                     [UNCHANGED — root precedence rules]
├── CAREERLENS_MASTER_RESEARCH_AUDIT.md            [UNCHANGED — turn-2 deliverable]
├── CAREERLENS_FINAL_MASTER_PLAN.md                [UNCHANGED — turn-3 deliverable]
├── CLAUDE_CODE_FINAL_KICKOFF.md                   [UNCHANGED — turn-3 deliverable]
├── (this document's 27 turn-4 planning files)     [NEW — this delivery]
│
├── careerlens/
│   ├── CLAUDE.md                                  [UNCHANGED]
│   ├── README.md                                  [MODIFIED — stale content corrected]
│   ├── package.json                                [MODIFIED — Vitest/Playwright added, per TESTING_STRATEGY_FINAL.md]
│   ├── .env.local                                  [UNCHANGED structurally — key must be populated by the user, not by any implementation session]
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx                          [MODIFIED — nested-<main> fix, config/site.ts import, MotionConfig]
│   │   │   ├── error.tsx                            [MODIFIED — reset prop wired, error prop used]
│   │   │   ├── not-found.tsx                        [MODIFIED — metadata export added]
│   │   │   ├── globals.css                          [MODIFIED — --unresolved/--unresolved-text tokens added]
│   │   │   ├── analyze/page.tsx                      [MODIFIED — designed header per redesign]
│   │   │   └── api/
│   │   │       ├── analyze/route.ts                   [MODIFIED — new pipeline order, research-mode gating]
│   │   │       ├── rewrite/route.ts                    [MODIFIED — claims-aware prompt input]
│   │   │       ├── cover-letter/route.ts                [UNCHANGED]
│   │   │       ├── chat/route.ts                         [UNCHANGED for MVP, SHOULD-HAVE extension noted]
│   │   │       └── health/route.ts                        [MODIFIED — key-validity check, not just presence]
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   │   ├── Hallmark.tsx                       [MODIFIED — accessibility attributes added]
│   │   │   │   ├── Badge.tsx                           [MODIFIED — unresolved variant added, missing/red usage removed]
│   │   │   │   └── EvidenceMarker.tsx                    [NEW]
│   │   │   ├── landing/
│   │   │   │   └── ComparisonSection.tsx                [MODIFIED — spacing token fix]
│   │   │   └── tool/
│   │   │       ├── AnalyzeTool.tsx                       [MODIFIED — scroll-reset, layout per FRONTEND_UX_SPEC_FINAL.md]
│   │   │       └── results/
│   │   │           ├── ScorePanel/ScorePanel.tsx          [MODIFIED — no ring gauge, per doctrine]
│   │   │           ├── EvidenceView/EvidenceView.tsx        [NEW — marked-document view, replaces 8-tab default]
│   │   │           ├── ToolsTabs/ToolsTabs.tsx                [NEW — secondary strip: Rewrite/Cover Letter/Interview/Chat]
│   │   │           └── tabs/
│   │   │               ├── SkillsTab.tsx                      [REMOVED — superseded by EvidenceView]
│   │   │               └── CoverLetterTab.tsx                  [MODIFIED — retry button added]
│   │   ├── lib/
│   │   │   ├── env.ts                                [UNCHANGED]
│   │   │   ├── rate-limit.ts                          [UNCHANGED]
│   │   │   ├── prompts.ts                              [MODIFIED — new instructional text per PROMPT_ARCHITECTURE_FINAL.md, wrapUntrusted mechanism itself unchanged]
│   │   │   ├── scoring.ts                               [MODIFIED — sole source of truth for bands]
│   │   │   ├── share-card.ts                             [MODIFIED — dial/bar-chart drawing removed]
│   │   │   ├── ai/
│   │   │   │   ├── google.ts                             [UNCHANGED]
│   │   │   │   ├── index.ts                                [UNCHANGED]
│   │   │   │   └── guards.ts                                 [MODIFIED — new schema validators]
│   │   │   └── analysis/
│   │   │       ├── schemas.ts                             [MODIFIED — new ANALYSIS_SCHEMA]
│   │   │       ├── constants.ts                            [MODIFIED — SCORE_BANDS removed, imports scoring.ts]
│   │   │       ├── grounding.ts                              [NEW — Stage 2 deterministic verifier]
│   │   │       └── aggregate.ts                                [NEW — Stage 3 coverage aggregation]
│   │   ├── types/index.ts                              [MODIFIED — new AnalysisResult/RequirementClaim/VerifiedClaim types]
│   │   └── config/site.ts                               [MODIFIED — unused fields wired into layout.tsx or removed]
│
└── research/                                        [NEW — full tree per RESEARCH_ARCHITECTURE_FINAL.md]
    ├── README.md
    ├── dataset/{README.md, v1/{items.jsonl, manifest.json}}
    ├── annotation/GUIDELINES.md
    ├── scripts/{baselines/{keyword-overlap.ts, embedding-similarity.ts}, evaluate.ts, perturb.ts, ablate.ts}
    └── results/<run-timestamp>/{config.json, raw/, summary.json}
```

## What this document does not claim
This tree describes the target end state across every phase of `IMPLEMENTATION_ROADMAP_FINAL.md`, not the current repository. `PROJECT_CURRENT_STATE_AUDIT.md` remains the authoritative record of what exists today.
