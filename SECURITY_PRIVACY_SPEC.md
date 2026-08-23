# Security & Privacy Specification

## Threat model
In scope: prompt injection via CV/JD text (existing, real risk — user-controlled text reaches an LLM prompt), abuse via request volume (existing rate limiter), oversized-payload denial of service, XSS via rendered CV text in the marked-document view (new surface — this plan renders CV text with inline markers, which is exactly the kind of view that invites naive `dangerouslySetInnerHTML` mistakes), accidental leakage of internal-only fields (`match_score`, raw claim text) into a response that shouldn't carry them. Out of scope, stated honestly: this is a client-heavy, no-account, no-persistent-storage app — there is no authentication system, no multi-tenant data isolation, and no payment surface to threat-model, because none of those exist and none are being added by this plan.

## Prompt injection defense — unchanged mechanism, restated as binding
`wrapUntrusted`/`makeNonce`/`INJECTION_NOTICE` (`lib/prompts.ts`) continues exactly as implemented: a fresh random nonce per request delimits untrusted CV/JD text, with an explicit instruction to the model to treat content between the delimiters as data, never instructions. This plan adds no second mechanism and modifies none of the existing one — the only new requirement is the adversarial test coverage specified in `TESTING_STRATEGY_FINAL.md`, which did not exist before and is what actually gives this mechanism a regression guarantee rather than an untested assumption.

## Rendering untrusted text safely — new requirement, direct consequence of the marked-document UI
The evidence-marker view (`FRONTEND_UX_SPEC_FINAL.md`) renders CV text interspersed with marker components at computed offsets. This must be built as: plain-text CV content passed through React's normal text-node rendering (auto-escaped by default) with marker components inserted as siblings at span boundaries computed in application code — never as HTML string concatenation, never `dangerouslySetInnerHTML` on any portion of `cvText`. This is stated explicitly because it is the single easiest security mistake to make when building an "inline annotation over raw text" UI, and the marked-document view is new work introduced by this plan, not an inherited pattern with prior scrutiny.

## Data handling and storage
Unchanged from the existing, already-strong posture, restated as binding: no CV/JD text is persisted server-side, no database exists, no analytics/tracking is added (settled in `RESEARCH_CONTRIBUTION_FINAL.md`/master plan — analytics was explicitly rejected as a way to satisfy the original "metrics to quote" goal). Any client-side persistence (e.g. `localStorage` for in-progress form state, if implemented) must be scoped to the current session's convenience only, never described to the user as saved/backed-up, and never sent anywhere.

## Research dataset privacy
Per `RESEARCH_DATASET_SPEC.md`: all `cv_text` in the research dataset is synthetic by construction, specifically so the dataset itself can never violate the "we never store your CV" promise a real labeled corpus of actual users' resumes would risk. This is restated here as a security/privacy requirement, not merely a research-methodology note — a future contributor adding "just a few real anonymized CVs for realism" would be violating this spec, not improving it.

## Research-mode gating
`X-Research-Mode: 1` header only activates extended (internal-field-including) response shaping when `RESEARCH_MODE_ENABLED` is also true server-side (`API_CONTRACT_FINAL.md`). A header-only trigger with no server-side flag would let any client request internal fields (`match_score`, raw Stage-1 output) simply by adding a header — this two-factor gate is a deliberate defense-in-depth choice, not redundant caution, and must ship as two independent checks (header present AND env flag true), not one check implying the other.

## Environment / secrets
Unchanged: `GOOGLE_API_KEY` read server-side only (`lib/env.ts`), never exposed to the client bundle, never logged. `.env.local` remains gitignored (verify this is still true at Phase A, since it's a one-line regression risk with severe consequences if ever reverted). No new secret-bearing configuration is introduced by this plan.

## Rate limiting
Unchanged mechanism and unchanged thresholds (`checkAiRateLimit`: 15/min, `checkUploadRateLimit`: 20/min) — this plan does not raise or lower them, since no evidence exists yet (per `PROJECT_CURRENT_STATE_AUDIT.md`) that the current thresholds are miscalibrated, and changing them without data would be a guess, not a decision.

## Content-safety settings
Unchanged: Gemini `BLOCK_ONLY_HIGH` safety threshold, preserved as-is — this plan does not revisit that threshold's calibration, since doing so is a product-policy decision outside this plan's technical scope, and is logged as such in `OPEN_QUESTIONS_FINAL.md` if it needs revisiting later.

## Dependency and supply-chain hygiene
No new runtime dependency is introduced by this plan except where explicitly named elsewhere (none currently named — the evidence verifier is specified to use string normalization the project can implement itself per `EVIDENCE_VERIFICATION_SPEC.md`, deliberately avoiding a new fuzzy-matching library dependency unless Phase B implementation finds the hand-rolled approach genuinely insufficient, in which case that becomes a logged decision, not a silent addition).

## What this document does not claim
No security audit or penetration test has been performed — this is a specification of required controls and required tests, not a certification that the (not-yet-implemented) system is secure. The claims above about "unchanged mechanism" are claims about the current source as read during this planning pass (`PROJECT_CURRENT_STATE_AUDIT.md`), not claims about a live, tested deployment.
