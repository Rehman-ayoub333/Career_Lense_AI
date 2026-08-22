# API Contract — Final

Minimal surface — no new routes added by this plan. All six existing endpoints kept; one changes response shape.

## `POST /api/analyze`
**Request:**
```json
{ "cvText": "string, 100-8000 chars", "jdText": "string, 50-6000 chars", "mode": "job" }
```
**Response (200, standard):**
```json
{
  "success": true,
  "data": {
    "score": 73,
    "verdict": "Good Match",
    "claims": [
      {
        "id": "claim-0",
        "requirement": "3+ years of production React experience",
        "category": "skill",
        "status": "matched",
        "evidence_quote": "4 years building React, TypeScript, and Next.js applications",
        "rationale": "The CV states four years of React experience, exceeding the stated minimum.",
        "verification": "verified"
      },
      {
        "id": "claim-1",
        "requirement": "Docker or containerization experience",
        "category": "skill",
        "status": "gap",
        "evidence_quote": null,
        "rationale": "No mention of Docker or containerization appears in the CV.",
        "verification": "unresolved"
      }
    ],
    "coverage": { "overall": 0.82, "byCategory": { "skill": 0.75, "experience": 1.0 }, "verifiedCount": 14, "uncertainCount": 2, "unresolvedCount": 1, "total": 17 },
    "key_actions": ["Add specific containerization experience, even a personal project, to your CV.", "..." , "..."],
    "salary_range": "$95,000 - $120,000 USD",
    "salary_context": "Based on mid-level frontend roles at growth-stage companies in this market.",
    "interview_questions": [{ "question": "...", "skill_tested": "...", "tip": "..." }],
    "ats_checks": [{ "id": "dates", "label": "Consistent date format", "status": "pass", "note": "...", "source": "deterministic" }]
  }
}
```
**Response (200, research mode — request header `X-Research-Mode: 1`, server flag `RESEARCH_MODE_ENABLED=true` required):** as above, but each claim additionally includes `match_score` and `hallucination_candidate`, and the top-level `data` object includes a `_debug` field with per-stage timing and the raw Stage-1 model output. **This shape must never appear when the server flag is unset, regardless of the request header** — the header alone is insufficient authorization, this is a defense-in-depth requirement.
**Errors:** `400 VALIDATION_ERROR` (cvText/jdText length), `429 RATE_LIMIT` (with `Retry-After`, now covering both the existing per-minute and the new per-hour bucket), `500 INTERNAL_ERROR`, `422 AI_INVALID_OUTPUT` (both Stage 1 attempts failed), `502 AI_UNAVAILABLE`, `503`/`504` (timeout/upstream). **Unchanged taxonomy — no new codes.**
**Validation:** unchanged (`INPUT_LIMITS`). **Security:** nonce-delimited wrapping (unchanged), rate limiting (extended, §`SECURITY_PRIVACY_SPEC.md`).

## `POST /api/rewrite`
**Request/response shape: additive, backward-compatible.** `RewriteRequest` gains one new **optional** field: `claims?: Array<{ requirement: string; category: ClaimCategory; verification: VerificationTier }>` — the `unresolved`/`uncertain` subset the client already holds in `AnalysisSession.result.claims` from the prior `/api/analyze` call. When present, the prompt prioritizes those requirement categories per `PROMPT_ARCHITECTURE_FINAL.md` Prompt 3. When absent, falls back to the prior generic framing. Response shape unchanged. See ADR-18.

## `POST /api/cover-letter`
**Request/response shape: unchanged**, genuinely — Prompt 4 is explicitly unchanged, no claims data needed.

## `POST /api/chat`
**Unchanged for MVP.** SHOULD-HAVE, not required: request gains an optional `claims` field so answers can reference verification tiers.

## `POST /api/upload`, `GET /api/health`
**Unchanged.** `GET /api/health?deep=1` is a SHOULD-HAVE addition (§`BACKEND_ARCHITECTURE_FINAL.md`), not specified further here since it's optional.

## No endpoints added
Explicitly: no `/api/verify`, no `/api/evidence`, no `/api/research/*` route. Research mode is a header+flag on the existing `/api/analyze`, not a parallel API surface — keeping the API minimal, per the brief's explicit instruction, and ensuring the evaluated system is exactly the shipped system.
