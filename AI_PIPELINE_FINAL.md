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
**Anthropic forced tool use** (ADR-22). The schema in `lib/analysis/schemas.ts` is handed to the model as a single tool's `input_schema` with `strict: true` on the tool definition, and the call sets `tool_choice: {type: 'tool', name: <schema-tool>}`. Forcing the choice guarantees the tool is invoked; `strict` guarantees the arguments validate against the schema. The structured result is read from the `tool_use` block's `input` rather than parsed out of prose, so the JSON-in-text failure mode is removed at the source exactly as the constrained decoder removed it before.

`temperature: 0` unchanged. **No `thinking` parameter is set** — Haiku 4.5 has no extended thinking to disable, so the previous `thinkingBudget: 0` has no counterpart and needs none. Forward note for any future tier upgrade: manual extended thinking is incompatible with forced `tool_choice`, so this call path keeps `thinking` unset regardless of tier.

Two constraints of Anthropic's strict mode differ from Gemini's decoder and are handled in the provider, not the schema:

- **Every object needs `additionalProperties: false`.** Added by the request builder when it translates `JsonSchema`, so `schemas.ts` stays provider-neutral.
- **Numeric and array-count constraints are not part of strict validation.** `minimum`/`maximum` (the 0–100 score) and `minItems`/`maxItems` (exactly 8 ATS checks, 5 interview questions, 3 key actions, 5 rewrite bullets) are dropped from the schema sent upstream. They were decoder-enforced under Gemini and are now enforced one layer later, by `lib/analysis/guards.ts` plus the single repair attempt — the counts are also stated in the prompt text. This is a real weakening of a guarantee from "impossible to violate" to "validated and repaired once", and is recorded rather than absorbed silently.

The `evidence_quote: string | null` question this section used to leave open is **answered and deliberately not acted on** — Anthropic's strict mode does support a true nullable via `anyOf`, but adopting it is a cross-cutting change to the provider contract, the schema, `guards.ts` and its tests, which ADR-22 scoped out. See `ADR_10_NULLABLE_INVESTIGATION.md`.

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
**Not built.** Single-provider, single-model (`claude-haiku-4-5-20251001`) for this thesis's scope — the existing provider-registry seam already makes a second provider a one-file addition later, and this plan does not use that seam now, consistent with `RESEARCH_CONTRIBUTION_FINAL.md`'s explicit single-model-evaluation limitation, stated honestly rather than papered over with an untested fallback path.

The provider swap in ADR-22 used that seam to **replace** the registry's single entry, not to add a second one, so the no-fallback property is unchanged: `lib/ai/index.ts` still resolves exactly one provider and throws if it is unconfigured. Anthropic's own server-side `fallbacks` parameter is likewise not used — it is a refusal-recovery mechanism for the Opus/Fable tier and does not apply to Haiku 4.5, and switching models mid-pipeline is precisely what the single-model limitation says this thesis does not do.

## Evaluation mode
This is what "research mode" (`API_CONTRACT_FINAL.md`) *is*, architecturally — not a separate pipeline, but the same pipeline with a response-shaping flag that includes internal fields (`match_score`, raw Stage-1 output, per-stage timing) that are always computed, just not always serialized.
