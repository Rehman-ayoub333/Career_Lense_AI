# Backend Architecture — Final

## Application structure (unchanged shape, `careerlens/src/`)
```
app/api/{analyze,rewrite,cover-letter,chat,upload,health}/route.ts   — routes, thin
lib/api/route.ts            — createApiRoute: rate limit, abort budget, serialisation, logging
lib/api/contract.ts          — wire types
lib/api/client.ts            — the one client-side fetch door
lib/ai/{index,anthropic,json,types}.ts — provider registry + transport (ADR-22: `google.ts` → `anthropic.ts`; registry seam unchanged)
lib/analysis/{schemas,guards,constants,ats-tips}.ts — restructured per DATA_CONTRACTS_FINAL.md
lib/analysis/grounding.ts    — NEW, Stage 2/3, pure functions
lib/prompts.ts               — rewritten prompt bodies, unchanged injection-defence mechanism
lib/{errors,logger,rate-limit,validators,history,export,share-card,scoring,format,env,pdf,cn}.ts — unchanged mechanism, rate-limit.ts gains an hourly bucket
```

## Routes — responsibilities (contract detail in `API_CONTRACT_FINAL.md`)
`POST /api/analyze` — the only route that changes shape. Owns: sanitize → Stage 1 (`generateJson` against the restructured schema) → Stage 2/3 (`grounding.ts`, in-process, synchronous) → response-shape (strip `match_score`/`hallucination_candidate` unless research mode) → serialize. `POST /api/rewrite`, `POST /api/cover-letter` — unchanged contract, prompt inputs updated to consume `claims` instead of flat arrays. `POST /api/chat` — unchanged for MVP. `POST /api/upload` — unchanged. `GET /api/health` — unchanged default behaviour; optional `?deep=1` addition is a SHOULD-HAVE, not required for the core contribution.

## Services / modules — exact responsibilities
| Module | Owns | Does NOT own |
|---|---|---|
| `lib/ai/*` | Transport to Anthropic, retries, forced-tool-use schema binding | Any judgment about claim correctness |
| `lib/analysis/schemas.ts` | What shape Stage 1 is constrained to produce | Whether that shape is *true* |
| `lib/analysis/guards.ts` | Runtime validation that the shape is well-formed (types, required fields, no empty-string quote masquerading as evidence) | Fuzzy-matching evidence against source text |
| `lib/analysis/grounding.ts` | Fuzzy-matching evidence against source text, tier assignment, coverage aggregation | Any network call, any model call |
| `lib/prompts.ts` | Prompt text only | Schema shape (lives in `schemas.ts`, per the existing, preserved "format lives in the schema" doctrine) |
| `lib/api/route.ts` | Rate limiting, abort budget, error serialisation, logging — unchanged | Business logic of any specific route |

## Validation
Unchanged mechanism (`sanitizeText`, boundary validation in `guards.ts`), extended for the new shape: `isRequirementClaim`, `isVerifiedClaim`, `isCoverageSummary` type guards follow the exact pattern already used for `isAnalysisResult`. **New guard rule:** a claim with `status: 'gap'` and a non-null `evidence_quote` is rejected as malformed at the guard layer (this combination should never occur if the prompt/schema are correct, and treating it as a validation failure rather than silently accepting it surfaces a prompt regression immediately instead of letting it reach the verifier as a confusing edge case).

## Error handling
Unchanged 10-code taxonomy (`lib/errors.ts`), `publicMessage`-only serialization (unchanged structural guarantee). No new error codes required — the grounding stage cannot itself fail in a way that needs a new code, since it's a pure function with defined behaviour on every input (including malformed-but-guard-passed edge cases, per `EVIDENCE_VERIFICATION_SPEC.md`).

## AI provider boundary
Unchanged in shape: `lib/ai/index.ts` is the only caller of `lib/ai/anthropic.ts` (ADR-22 replaced `google.ts` through this seam, which is what let the swap touch no call site); the provider registry seam (`PROVIDERS: Record<string, AiProvider>`) is preserved exactly, so adding a second provider remains a one-file change. `grounding.ts` is explicitly outside this boundary — it never imports from `lib/ai/*`, by design, since it must remain callable and testable without any provider configured at all.

## Document processing
Unchanged (`lib/pdf.ts`, `lib/validators.ts`).

## Analysis pipeline orchestration
Lives in `app/api/analyze/route.ts` itself (a thin route handler calling, in order: guard-validated Stage 1 output → `verifyClaims` → `aggregateCoverage` → response shaping) — **no new orchestration module is introduced**; a four-line sequential function body inside the existing route handler is sufficient and avoids inventing an unnecessary "pipeline runner" abstraction for four deterministic steps.

## Response serialization
Unchanged structural guarantee (`lib/api/route.ts:` only `publicMessage` on failure) plus one new, explicit rule: **the standard (non-research-mode) success response for `/api/analyze` must never include `match_score` or `hallucination_candidate`** — implemented as an explicit field-strip step immediately before the `NextResponse.json(...)` call, not as a "just don't send it" convention, so it's a single reviewable line rather than an easy-to-miss omission.
