# AI Pipeline — Final

## LLM responsibilities vs. deterministic application responsibilities — the one rule this document exists to enforce
| Responsibility | Owner |
|---|---|
| Judging whether a requirement is met, partially met, or unmet | LLM (Stage 1) — this is genuinely a judgment call, appropriate for a model |
| Producing a candidate evidence quote for that judgment | LLM (Stage 1) |
| Writing a human-readable rationale | LLM (Stage 1) |
| **Deciding whether that quote actually exists in the source text** | **Deterministic code (Stage 2) — never the LLM, never a second model call in the default path** |
| Aggregating verification results into coverage stats | Deterministic code (Stage 3) |
| Generating rewrite/cover-letter/interview-question text | LLM (existing enhancement calls, now claims-aware) |
| (SHOULD-HAVE) Adjudicating a borderline `uncertain` claim | LLM (Stage 2b), but only ever narrows toward `verified`/`unresolved`, never independently declares "verified" the way Stage 1 cannot |

This split is the entire research contribution's mechanism (`RESEARCH_CONTRIBUTION_FINAL.md`) and must not be blurred during implementation — if a future change makes the LLM responsible for its own verification, the falsifiability of RQ1 is gone, silently.

## Structured output
Unchanged mechanism: Gemini's `responseSchema` constrained decoder, `temperature: 0`, `thinkingBudget: 0` on 2.5 models. Schema restructured per `DATA_CONTRACTS_FINAL.md` — the one open technical question (whether `JsonSchema` in `lib/ai/types.ts` can express `evidence_quote: string | null` directly, or needs a sentinel) is a Phase B implementation check, not an architectural decision, and is recorded as such in `OPEN_QUESTIONS_FINAL.md`.

## Schema validation
Unchanged mechanism (`guards.ts` runtime check after constrained decoding — belt-and-suspenders, since constrained decoding guarantees syntax, not sensible values). Extended per `DATA_CONTRACTS_FINAL.md`'s new guard rule (a `gap` claim with a non-null quote is rejected as malformed).

## Evidence extraction
Happens entirely inside Stage 1 — the model is asked to extract requirements from the opportunity text and, for each, either point at CV evidence or explicitly say there is none. This is extraction *and* judgment combined in one call, not two separate calls, because splitting them would double latency/cost for no verification benefit — the thing that needs to be separate from the model is the *checking* of the extracted evidence, not the extraction itself.

## Verification
Owned entirely by `lib/analysis/grounding.ts`, specified in full in `EVIDENCE_VERIFICATION_SPEC.md`. Not repeated here.

## Post-processing
`normalizeAnalysisResult` (unchanged pattern: clamp `score` 0–100, trim/validate arrays) now also invokes `verifyClaims`/`aggregateCoverage` before the result is considered complete. Order matters and is fixed: guard-validate → normalize → verify → aggregate → respond.

## Failure handling
Unchanged strategy: constrained decoding prevents most malformed output; one repair attempt on parse/validation failure (`generateJson`'s existing logic, untouched); a second failure surfaces as `AI_INVALID_OUTPUT`, not retried further (existing, preserved reasoning: further retries burn quota on a request that isn't converging). **New consideration, not a new mechanism:** if Stage 1 succeeds but produces zero claims (a valid-but-empty array — e.g. an opportunity description too vague to extract requirements from), this is not an error — it's a defined empty state, handled by `CoverageSummary`'s explicit zero-division guard and the frontend's dedicated empty state (`FAILURE_MODES_FINAL.md`).

## Model fallback
**Not built.** Single-provider, single-model (`gemini-2.5-flash`) for this thesis's scope — the existing provider-registry seam already makes a second provider a one-file addition later, and this plan does not use that seam now, consistent with `RESEARCH_CONTRIBUTION_FINAL.md`'s explicit single-model-evaluation limitation, stated honestly rather than papered over with an untested fallback path.

## Evaluation mode
This is what "research mode" (`API_CONTRACT_FINAL.md`) *is*, architecturally — not a separate pipeline, but the same pipeline with a response-shaping flag that includes internal fields (`match_score`, raw Stage-1 output, per-stage timing) that are always computed, just not always serialized.
