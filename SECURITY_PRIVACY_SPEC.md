# Security & Privacy Specification

## Threat model
In scope: prompt injection via CV/JD text (existing, real risk — user-controlled text reaches an LLM prompt), abuse via request volume (existing rate limiter), oversized-payload denial of service, XSS via rendered CV text in the marked-document view (new surface — this plan renders CV text with inline markers, which is exactly the kind of view that invites naive `dangerouslySetInnerHTML` mistakes), accidental leakage of internal-only fields (`match_score`, raw claim text) into a response that shouldn't carry them. Out of scope, stated honestly: this is a client-heavy, no-account, no-persistent-storage app — there is no authentication system, no multi-tenant data isolation, and no payment surface to threat-model, because none of those exist and none are being added by this plan.

## Prompt injection defense — unchanged mechanism, restated as binding
`wrapUntrusted`/`makeNonce`/`INJECTION_NOTICE` (`lib/prompts.ts`) continues exactly as implemented: a fresh random nonce per request delimits untrusted CV/JD text, with an explicit instruction to the model to treat content between the delimiters as data, never instructions. This plan adds no second mechanism and modifies none of the existing one — the only new requirement is the adversarial test coverage specified in `TESTING_STRATEGY_FINAL.md`, which did not exist before and is what actually gives this mechanism a regression guarantee rather than an untested assumption.

## Rendering untrusted text safely — new requirement, direct consequence of the marked-document UI
The evidence-marker view (`FRONTEND_UX_SPEC_FINAL.md`) renders CV text interspersed with marker components at computed offsets. This must be built as: plain-text CV content passed through React's normal text-node rendering (auto-escaped by default) with marker components inserted as siblings at span boundaries computed in application code — never as HTML string concatenation, never `dangerouslySetInnerHTML` on any portion of `cvText`. This is stated explicitly because it is the single easiest security mistake to make when building an "inline annotation over raw text" UI, and the marked-document view is new work introduced by this plan, not an inherited pattern with prior scrutiny.

## Data handling and storage
Unchanged from the existing, already-strong posture, restated as binding: no CV/JD text is persisted server-side, no database exists, no analytics/tracking is added (settled in `RESEARCH_CONTRIBUTION_FINAL.md`/master plan — analytics was explicitly rejected as a way to satisfy the original "metrics to quote" goal). Any client-side persistence (e.g. `localStorage` for in-progress form state, if implemented) must be scoped to the current session's convenience only, never described to the user as saved/backed-up, and never sent anywhere.

## Third-party processors — who receives CV text
Named here because a privacy posture that says "our AI provider" is not a posture, and because the user-facing copy (`/privacy`, `MissionSection`) names the processor and must not be able to drift from this document.

**Anthropic (PBC)** is the sole processor of user-submitted CV and opportunity text, as of ADR-22. Every `/api/analyze`, `/api/rewrite`, `/api/cover-letter` and `/api/chat` call sends the submitted text to Anthropic's Messages API (`claude-haiku-4-5-20251001`) over `ANTHROPIC_API_KEY`. Nothing else leaves the server: uploads are parsed in-process, and the deployed application makes no other outbound call carrying user text.

This replaced **Google (Gemini)**, which held the same role until ADR-22. The change is a change of processor, not an addition — no request path sends user text to both, and the Google credential is gone from the codebase rather than left dormant.

**Voyage AI** receives text only from `research/`, never from the deployed application, and only synthetic dataset text — see §Research-mode embedding baseline below.

## Research dataset privacy
Per `RESEARCH_DATASET_SPEC.md`: all `cv_text` in the research dataset is synthetic by construction, specifically so the dataset itself can never violate the "we never store your CV" promise a real labeled corpus of actual users' resumes would risk. This is restated here as a security/privacy requirement, not merely a research-methodology note — a future contributor adding "just a few real anonymized CVs for realism" would be violating this spec, not improving it.

## Research-mode gating
`X-Research-Mode: 1` header only activates extended (internal-field-including) response shaping when `RESEARCH_MODE_ENABLED` is also true server-side (`API_CONTRACT_FINAL.md`). A header-only trigger with no server-side flag would let any client request internal fields (`match_score`, raw Stage-1 output) simply by adding a header — this two-factor gate is a deliberate defense-in-depth choice, not redundant caution, and must ship as two independent checks (header present AND env flag true), not one check implying the other.

## Research-mode embedding baseline — data flow
Per ADR-23, `research/scripts/baselines/embedding-similarity.ts` calls **Voyage AI's** embedding endpoint using `VOYAGE_API_KEY` — a separate credential from `ANTHROPIC_API_KEY`, and a separate vendor from the generation pipeline.

**This is a new disclosure category, and is recorded as one.** ADR-21's version of this section could truthfully say it introduced none, because Gemini embeddings and Gemini generation were the same vendor over the same credential. That reasoning does not survive ADR-23: Voyage AI is a second processor, and describing it otherwise would be a false privacy statement rather than a stale one. What limits it instead is scope, not vendor identity — the text sent is synthetic by construction (§Research dataset privacy above), so no real applicant's CV reaches Voyage AI at any point, and the script runs only from `research/`, never from the deployed application. A user of the deployed product has no data flowing to Voyage AI at all.

The distinction that matters for the privacy page: **Anthropic is a processor of user data; Voyage AI is not.** The user-facing copy names only the former, correctly.

## Environment / secrets
`ANTHROPIC_API_KEY` (ADR-22, replacing `GOOGLE_API_KEY`) read server-side only (`lib/env.ts`), never exposed to the client bundle, never logged. `.env.local` remains gitignored (verify this is still true at Phase A, since it's a one-line regression risk with severe consequences if ever reverted).

`VOYAGE_API_KEY` (ADR-23) is a second secret and is **new** — the "no new secret-bearing configuration" claim this section used to make no longer holds and has been removed rather than left standing. It is optional, read only by `research/`, and absent from the deployed application's configuration entirely; a production deployment that never sets it is fully functional.

`lib/logger.ts`'s secret-redaction pattern is part of this guarantee and was updated with the credential: it previously matched only Google's `AIza…` key shape, which would have let an Anthropic key pass through unredacted into a log body. It now matches Anthropic (`sk-ant-…`) and Voyage (`pa-…`) key shapes.

## Rate limiting
Unchanged mechanism and unchanged thresholds (`checkAiRateLimit`: 15/min, `checkUploadRateLimit`: 20/min) — this plan does not raise or lower them, since no evidence exists yet (per `PROJECT_CURRENT_STATE_AUDIT.md`) that the current thresholds are miscalibrated, and changing them without data would be a guess, not a decision.

## Content-safety settings
**Changed by ADR-22, and not by choice.** The Gemini provider set every harm category to `BLOCK_ONLY_HIGH`, because CV and job-description text is routinely false-positived by default thresholds — military service, medical and criminal-justice roles, and non-English names all trip naive filters. That tuning was load-bearing for this product's actual corpus.

Anthropic's API exposes no equivalent per-category threshold, so there is nothing to carry over and nothing to re-tune. Safety is applied by the provider and is not configurable by the caller. The application's only remaining control is how it *reacts*: a refusal or blocked completion is mapped to `AI_CONTENT_BLOCKED`, which the user sees as the existing neutral "we were unable to process this text" copy rather than an accusation.

The open question this creates is recorded rather than assumed away: **whether Anthropic's non-configurable safety layer false-positives on the same CV content Gemini needed loosening for is unknown and cannot be known without a live-key run.** It is not a regression that has been observed; it is a calibration that used to be explicit and is now the vendor's. If the live-key smoke test surfaces refusals on ordinary CVs, that belongs in `OPEN_QUESTIONS_FINAL.md` as a product-policy decision, exactly as the threshold calibration did.

## Dependency and supply-chain hygiene
No new runtime dependency is introduced by this plan except where explicitly named elsewhere (none currently named — the evidence verifier is specified to use string normalization the project can implement itself per `EVIDENCE_VERIFICATION_SPEC.md`, deliberately avoiding a new fuzzy-matching library dependency unless Phase B implementation finds the hand-rolled approach genuinely insufficient, in which case that becomes a logged decision, not a silent addition).

## What this document does not claim
No security audit or penetration test has been performed — this is a specification of required controls and required tests, not a certification that the (not-yet-implemented) system is secure. The claims above about "unchanged mechanism" are claims about the current source as read during this planning pass (`PROJECT_CURRENT_STATE_AUDIT.md`), not claims about a live, tested deployment.
