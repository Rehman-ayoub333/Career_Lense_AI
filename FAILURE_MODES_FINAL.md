# Failure Modes — Final

Catalogue of defined failure/empty/error states across the pipeline and UI. Each entry states the cause, the system's required behavior, and which layer owns the handling. Nothing in this document is optional polish — an unhandled entry here is a shipped bug, not a future nice-to-have.

## AI pipeline failures
| Failure | Cause | Required behavior | Owner |
|---|---|---|---|
| `AI_INVALID_OUTPUT` | Schema validation fails twice (initial + one repair attempt) | Surface a specific, honest error to the user ("the analysis couldn't be completed — try again"), not a generic 500; log full raw output server-side for debugging | `lib/ai/index.ts` (unchanged existing mechanism) |
| Zero claims extracted | Opportunity text too vague/short to extract requirements from | Not an error — a defined empty state (`CoverageSummary` zero-division guard) with a dedicated frontend message ("we couldn't find specific requirements to check against — try pasting the full job description") | `AI_PIPELINE_FINAL.md` (already specified), restated here as a catalogued state |
| API key missing/invalid | `.env.local` unset (confirmed the actual current state — `ANTHROPIC_API_KEY=` empty) | `/api/health` must report this as unhealthy in a way that's actually checked (current gap noted in `PROJECT_CURRENT_STATE_AUDIT.md`: health check only checks provider presence, not key validity) — closing this gap is a Phase-A task, not assumed already correct | `lib/env.ts` + `/api/health` |
| Rate limit exceeded | >15 AI requests/min from one client | 429 with a clear retry-after message, not a silent failure | existing `rate-limit.ts`, unchanged |
| Anthropic API timeout/5xx | Upstream outage or slow response | Retry/backoff (`lib/ai/anthropic.ts`, via the SDK's own retry of 408/409/429/5xx), then surfaced as `AI_INVALID_OUTPUT`-equivalent honest failure, never an infinite spinner |
| Malformed PDF extraction | `pdf-parse` fails on a corrupt/scanned/image-only PDF | Explicit, distinguishable error message ("we couldn't read text from this PDF — try pasting the text directly"), not conflated with an AI-pipeline failure | upload handling layer |

## Evidence verification edge cases (see also `TESTING_STRATEGY_FINAL.md`'s adversarial cases — this table is the product-behavior contract, that document is the test coverage for it)
| Case | Required `verification` tier | User-facing meaning |
|---|---|---|
| `evidence_quote: null` | `unresolved` | "No evidence quote was offered for this requirement" |
| Quote present, no match found | `unresolved`, `hallucination_candidate: true` | Rendered identically to the null case in tier styling (calm slate, never red) — the *internal* flag differs, the *user-facing* treatment does not, per the false-precision rule |
| Quote present, weak match | `uncertain` | Rendered in the amber tier, with the matched (partial) text shown alongside for the user to judge themselves |
| Quote present, strong match | `verified` | Rendered in the green tier |
| Zero total claims | Handled upstream (table above) | N/A — page never reaches per-claim rendering |

## Frontend empty/error states — one per named case, required before this plan is considered UI-complete
- **Pre-analysis (nothing submitted yet):** existing landing/analyze empty state, unchanged in spirit, redesigned in visual language only per `FRONTEND_UX_SPEC_FINAL.md`.
- **Analysis in progress:** loading state — must communicate multi-stage work honestly (e.g. "reading your CV… checking evidence…") rather than a generic spinner, since the pipeline genuinely has stages worth naming, and false single-step framing undersells (and under-explains) what's happening.
- **Analysis failed (`AI_INVALID_OUTPUT` or network failure):** distinct from empty states — an explicit retry affordance, unlike the current `error.tsx`'s unused `reset` prop (confirmed gap, `PROJECT_CURRENT_STATE_AUDIT.md`) and unlike `CoverLetterTab`'s current no-retry dead end (confirmed gap) — both are named here as failure modes this plan must close, not independently discovered twice.
- **Zero claims extracted:** per pipeline table above — a distinct message from "analysis failed," since nothing actually failed.
- **All claims `unresolved` (worst-but-valid case):** not an error — the honest result of a CV that doesn't address the opportunity's requirements at all. Must render without alarm styling (no red), consistent with the doctrine that unresolved ≠ judgment of the person, at the extreme where this principle is hardest to hold and most important.
- **Upload rejected (wrong file type / too large / unreadable):** distinct message per cause, not a single generic "upload failed."
- **404 (not-found page):** existing page, missing `metadata` export (confirmed gap) — closing this is a Phase-A/documentation-hygiene task, catalogued here so it isn't dropped.
- **Chat/rewrite/cover-letter tool failure:** each Tools-tab feature fails independently of the core analysis — a rewrite failure must not appear to invalidate the (already-succeeded) evidence view above it.

## Research-pipeline failures (research/ scripts, not production)
Partial-run recovery already specified in `RESEARCH_ARCHITECTURE_FINAL.md` (raw-output-before-aggregate ordering) — restated here as a failure mode: an API timeout mid-batch-run must leave completed items' raw output intact and resumable, not force a full re-run from item 1.

## What this document does not claim
This is a required catalogue for implementation, not a report that these states are currently handled. Several are confirmed *not* currently handled (`error.tsx`'s dead `reset` prop, `CoverLetterTab`'s no-retry state, `/api/health`'s shallow check, `not-found.tsx`'s missing metadata) — named explicitly above as pre-existing gaps this plan closes, not new problems it introduces.
