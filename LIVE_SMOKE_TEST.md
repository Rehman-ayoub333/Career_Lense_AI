# Live smoke test — first real model call

**Date:** 26 August 2026
**Provider:** Anthropic, `claude-haiku-4-5-20251001` (ADR-22)
**Calls made:** exactly one billable model call. `GET /api/health` was run first and costs nothing by design — it checks configuration and never contacts the provider.

This is the run that had been blocked since Phase 0. Before it, no part of this product had ever produced a real analysis; `PROJECT_STATE_REPORT.md` recorded a live `400 API_KEY_INVALID` against the old provider and nothing since.

## What was sent

A realistic pair, not a one-liner: a 5-year backend engineer's CV (two roles with dated employment, quantified achievements, an education line, a skills list) against a senior backend JD listing eight requirements plus two nice-to-haves. Built so that several requirements are genuinely absent from the CV — Kubernetes, Terraform, gRPC, observability tooling — so the unresolved tier would be exercised rather than assumed.

## Result: end-to-end success

`HTTP 200` in **39.3 s** of application time (43 s wall including compile).

| Stage | Outcome |
|---|---|
| Stage 1 — claim extraction | Forced tool call returned on the **first attempt**; no repair logged |
| Stage 2 — deterministic grounding | Ran on all 10 claims; 6 quotes searched, 4 nulls correctly not searched |
| Stage 3 — aggregation | Coverage counted from verified claims, not asked of the model |

Schema conformance, first try, with no repair:

```
claims: 10   ats_checks: 8   key_actions: 3   interview_questions: 5
score: 78    verdict: Good Match
coverage: 5 verified / 1 uncertain / 4 unresolved  (overall 0.50)
byCategory: experience 0.75, skill 0.33
```

The three exact counts the ADR-22 guard now enforces — 8 ATS checks, 5 interview questions, 3 key actions — were satisfied on the first attempt. That was the open question from that change: whether moving those from decoder-enforced to guard-enforced would cost a repair on every call. On this run it cost nothing.

## Truncation against `max_tokens: 8192` (ADR-25)

**No sign of truncation.**

- `lib/ai/anthropic.ts` logs a warning when `stop_reason === 'max_tokens'`. **No such warning was emitted.**
- No repair attempt was logged, so the tool call parsed and validated on the first pass — a truncated tool call would have failed the guard and triggered one.
- All 10 claims carry complete `requirement`, `rationale` and quote fields; the last array in the schema (`interview_questions`) is fully populated with 5 items. Truncation shows up as a clipped tail, and there is none.

The exact output-token count could **not** be read, for a reason worth recording: `lib/logger.ts`'s `REDACTED_KEY` pattern matches `/token/i`, so `inputTokens` and `outputTokens` are written to the log as `[redacted]`. Token *counts* are not secrets. See Finding 3.

## Content-safety refusal (ADR-24)

**None encountered.** No `stop_reason: "refusal"`, no `AI_CONTENT_BLOCKED`, no safety-related failure of any kind on ordinary CV and job-description text.

This is the expected result and it is mildly reassuring, but it is **one sample**. It does not establish that Anthropic's non-configurable safety layer behaves like Gemini's `BLOCK_ONLY_HIGH` tuning did on the harder content ADR-24 names — military service history, clinical roles, criminal-justice employment, non-English names. None of those appeared in this CV. ADR-24's open item stands.

## Grounding behaviour on real phrasing

The tiers came out sane, and two cases are worth recording because they exercise mechanisms that until now had only been tested against synthetic fixtures.

**Normalisation (whitespace/line-break artifacts) — worked.** One verified claim quoted two *consecutive* CV lines joined across a newline. Raw string comparison fails; after normalisation it is an exact substring, scored `1.0`, and landed `verified`. This is the case `EVIDENCE_VERIFICATION_SPEC.md` specified for PDF extraction noise, confirmed on real text.

**Multiset overlap (ADR-16) — worked, and caught a real splice.** One claim quoted a span stitched from two *non-adjacent* passages in different jobs, years apart:

> "Rebuilt the shipment-tracking service in Go, cutting p95 response time from 840ms to 210ms. **Built and maintained REST APIs in Python and Django for a payments dashboard used by 12,000 merchants.**"

Both halves are real CV text; the concatenation is not. It is not a normalised substring, scored **0.606**, and landed `uncertain` — below the 0.85 verified threshold, above the 0.55 floor. Exactly the middle tier's purpose, on a real-world instance of the wrong-span family, produced without being contrived.

**Numeric-integrity gate (ADR-17) — NOT exercised.** `hallucination_candidate` was `false` on every claim. The model quoted the CV's figures accurately — 5 years, 40 million rows, 2 million events, 3 juniors, 4 services — so the digit gate never had a fabricated number to catch. It is untested against live output and this run says nothing about it either way.

**ATS attribution (ADR-20) — worked.** `contact` and `dates` were decided in code (`source: 'deterministic'`), with `dates` correctly reporting "All 4 dates use MM/YYYY consistently". `tables` fell back to `source: 'model'`, which is the documented inconclusive path. The other five stayed model-sourced. Every check carried an attribution, so a measurement stays distinguishable from a guess.

**Key actions** were all three drawn from gaps and phrased as additions ("Add evidence of Kubernetes and Helm experience…"), never as statements about the person — the doctrine rule held on real output.

---

## Findings

### 1. `salary_range` contains embedded JSON — user-visible defect

The model emitted, **inside the `salary_range` string value**, text that reads as an attempt to close that field and open the next:

```
"salary_range":"PKR 2,400,000 – 3,200,000 per annum (or USD 8,500–11,500 if
international rate)\", \"salary_context\": \"Senior backend engineer in Lahore
with 5+ years, distributed systems expertise, and transaction-scale experience
commands mid-to-senior market rates; …"
```

319 characters where a range was expected. `salary_context` separately came back correct and well-formed, so the content is duplicated rather than lost.

This is **schema-conformant** — it is a valid JSON string, so `strict: true` did not and could not reject it, and `guards.ts` only checks `typeof salary_range === 'string'`. It would render into `CompensationSummary` as-is.

Not fixed, and deliberately not guessed at. The plausible responses are materially different from each other — a prompt adjustment, a post-parse sanitiser on the field, a guard length ceiling, or accepting it as model-tier noise — and choosing between them on a single observation would be picking one at random. It needs a decision and probably a second observation.

### 2. Latency used 87% of the abort budget

39.3 s against `AI_TIMEOUT_MS.analyze = 45_000`. The call succeeded, but the margin is 5.7 s.

`createApiRoute` aborts the upstream request at 45 s and returns `AI_TIMEOUT`. A longer CV, a JD with more requirements, or a slower moment upstream would cross it. The `maxDuration = 60` platform ceiling sits above the 45 s budget, so there is headroom to raise it — but that is a product decision about how long a user waits, not a mechanical fix, and it interacts with ADR-25's larger `max_tokens` (more allowed output is more time spent generating it).

Recorded rather than acted on.

### 3. `logger.ts` redacts token counts

`REDACTED_KEY = /(key|token|secret|password|authorization|cookie|apikey)/i` matches the substring `token` in `inputTokens` / `outputTokens`, so usage figures are logged as `[redacted]`.

Harmless to security and unhelpful for diagnostics: it hid the exact output-token count during precisely the test that wanted it, and it will hide cost attribution for every future run. The pattern predates the provider swap. Small and probably safe to narrow, but it is a change to a redaction rule, which is the last place to make an unreviewed tweak.

---

## What this run does and does not establish

**Established.** The pipeline works end to end against a live Anthropic key: forced tool use returns a conforming structured result, the deterministic verifier grounds it against the real CV, aggregation counts what the verifier concluded, and the ADR-22 exact-count guard passes without costing a repair. The provider swap is functionally proven, not merely compiling.

**Not established.** One CV, one JD, one call. Nothing here speaks to the digit gate, the content-safety false-positive risk ADR-24 names, variance across runs at `temperature: 0`, or behaviour on non-English or unusually long input. The research experiments remain unrun — they need the labelled dataset (Phase 8), which is not a code dependency.
