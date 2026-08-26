# Project Current State Audit

> **Provider note (26 August 2026).** This is a dated snapshot, preserved as written. It describes the pipeline while Google Gemini (`gemini-2.5-flash`) was the LLM provider. ADR-22 has since replaced it with Anthropic Claude (`claude-haiku-4-5-20251001`), and ADR-23 replaced the research embedding baseline with Voyage AI. Gemini references below were accurate when written and are **not** current — see `ARCHITECTURAL_DECISION_REGISTER.md`. They are left in place because rewriting a dated audit to match today's architecture would falsify the record it exists to be.
>
> One open item this audit raised is now answered: §"`JsonSchema`'s actual nullable support must be checked" — Anthropic's strict-mode schema subset **does** support a true nullable via `anyOf`, unlike Gemini's `responseSchema`. It was deliberately not adopted during the swap; the reasoning is in `ADR_10_NULLABLE_INVESTIGATION.md`.
Re-verified against the live repository at the start of this planning pass. Nothing has changed on disk since the prior audits (`PROJECT_STATE_REPORT.md`, `CAREERLENS_MASTER_RESEARCH_AUDIT.md`, `CAREERLENS_FINAL_MASTER_PLAN.md`) except that those three documents and `CLAUDE_CODE_FINAL_KICKOFF.md` now exist at the repo root — confirmed via a fresh directory listing and a full re-read of `app/globals.css`. **No application code has been implemented.** This document is the single current-state reference for everything that follows in this planning pass; where it repeats the earlier audits, that's deliberate — this pass must not silently drift from what was already verified.

## 1. Current architecture
Next.js 16 App Router, React 19, TypeScript strict, Tailwind v4 (CSS-first, `globals.css` is the only source of design tokens — confirmed by full read this pass, exact values in `DESIGN_SYSTEM_FINAL.md`). Six API routes, five built on a shared `createApiRoute` factory. No database, no auth, `localStorage`-only client storage. Single AI provider (Google Gemini `gemini-2.5-flash`, raw REST `fetch`, no SDK).

## 2. Current data flow
`AnalyzeTool` (client) → `lib/api/client.ts` → `POST /api/analyze` → `createApiRoute` wrapper → `generateJson` (schema-constrained, one repair attempt) → `normalizeAnalysisResult`/`isAnalysisResult` → JSON response → client renders directly, writes to `localStorage` via `lib/history.ts`. No verification, no post-processing beyond clamping/trimming. Confirmed by direct read of `hooks/useAnalysis.ts`, `lib/ai/index.ts`, `lib/analysis/guards.ts`.

## 3. Current AI flow
One schema-constrained call per feature: `/api/analyze` (score + flat `skills_matched`/`skills_missing`/`skills_extra`/`keywords_present`/`keywords_missing` + six sub-scores + `verdict_note` + 8 ATS checks + salary + 5 interview questions, all in one call, `thinkingBudget: 0`), `/api/rewrite`, `/api/cover-letter` (fan out via `Promise.allSettled`, independent of each other and of `/api/analyze`'s enhancements failing), `/api/chat` (stateless per turn — no conversation history sent to the server). No retrieval, no tool use, no cross-call memory. Confirmed by direct read of `lib/prompts.ts`, `lib/ai/google.ts`, `lib/analysis/schemas.ts`, `ChatTab.tsx`.

## 4. Current frontend flow
`/` — 10-section landing page, fully redesigned in the "editorial/assay" language (confirmed strong, preserve). `/analyze` — a single client component tree (`AnalyzeTool.tsx`) with three states (`input`/`loading`/`results`); results render `ScorePanel` (redesigned: `Hallmark`, `KeyActions`, `ShareCard`) beside `ResultsTabs` (8 tabs: Skills, Rewrite, ATS, Keywords, Salary, Interview, Cover Letter, Chat — **all 8 tab contents confirmed still pre-redesign**, using the old status-dashboard visual language with coloured `Tag`/`Badge` chips).

## 5. Current backend flow
Every AI route: `sanitizeText` → `wrapUntrusted` (nonce-delimited) → `generateJson`/`generateText` → validate → respond. `createApiRoute` owns rate limiting (per-minute only, no hourly cap despite an unread `.env.local` variable for one), a real `AbortController` budget, and a serialisation path that only ever emits `publicMessage`. Confirmed strong; this plan preserves the transport/error/logging layer entirely.

## 6. Existing problems (confirmed, not re-litigated — see prior audits for full evidence)
Invalid `GOOGLE_API_KEY` (blocking); `/analyze` results contents contradict the product's own no-judgment-colour doctrine (`Tag variant="missing"` renders red); the share card renders the deleted ring-gauge design; `Hallmark` has no accessible text; `MotionConfig` is claimed in a comment and absent from `layout.tsx`; nested `<main>` on three routes; `app/error.tsx` discards its `error` prop; six sub-scores and `verdict_note` are generated every call and rendered nowhere.

## 7. Technical debt
Three parallel score-band tables (`scoring.ts`, `constants.ts`, `Hallmark.tsx`); two score vocabularies (`"Good Match"` vs `"GOOD"`); 12 confirmed dead exports across `scoring.ts`/`Feedback.tsx`/`Card.tsx`/`Button.tsx`; `getSiteUrl()` dead, `layout.tsx` hardcodes the origin instead; `site.ts`'s `description`/`shortDescription`/`locale`/`SEO_KEYWORDS` unused.

## 8. Legacy components
The entire pre-redesign visual language surviving in `SkillsTab.tsx`, `KeywordsTab.tsx`, `ATSTab.tsx`, and the `AnalyzeTool.tsx` input form's plain-`Card` styling.

## 9. Components that should remain (verified strong, do not rewrite)
`lib/api/route.ts`, `lib/errors.ts`, `lib/ai/*`, `lib/prompts.ts`'s nonce-delimited injection wrapper, `lib/logger.ts`, `lib/validators.ts`, `lib/history.ts` (especially its nullable-field data-loss guard, 11 regression tests), `next.config.ts` security headers, the landing page in full, `Hallmark.tsx`'s core doctrine (struck plate, no colour-by-band, always-present reference), `Tabs.tsx` (correct ARIA pattern), `useFocusTrap.ts`.

## 10. Components that should be replaced
`ScorePanel.tsx` → `AssessmentPanel` (per `CAREERLENS_FINAL_MASTER_PLAN.md` §15); `ResultsTabs.tsx` narrows to four "Tools" tabs; `lib/share-card.ts`'s drawing logic (keep the file, replace the drawing calls); the flat skill/keyword fields throughout `types/index.ts`, `lib/analysis/schemas.ts`, `lib/analysis/guards.ts`.

## 11. Components that should be removed
`SkillsTab.tsx`, `KeywordsTab.tsx`, `ATSTab.tsx` (superseded by the evidence document — their ATS-specific deterministic-check logic migrates into the new grounding module, nothing else survives).

## 12. Research/application boundary
Currently: no boundary exists, because no research artifact exists. Target (this plan enforces it): `research/` at the repo root, sibling to `careerlens/`, containing all dataset/evaluation/experiment code and data; the deployed application never imports from `research/` and `research/` never talks to production infrastructure — it calls the same public API surface a real user would, or runs the pure `grounding.ts` functions directly for the ablation study. See `RESEARCH_ARCHITECTURE_FINAL.md`.

## 13. Risks
Gemini 2.5 Flash's constrained decoder has not been tested against the new, more complex `claims` array schema shape (nested objects with a `null`-capable string field) — `JsonSchema`'s actual nullable support must be checked in `lib/ai/types.ts` before Phase B of the kickoff proceeds, exactly as that document already flags. Small-sample research risk unchanged from the research audit.

## 14. Unknowns
Whether `lib/ai/types.ts`'s `JsonSchema` type expresses nullable string fields directly, or needs a sentinel-string workaround for `evidence_quote: null` — flagged as a Phase B decision point in the kickoff, not resolved here because it's a five-minute check against a file, not an architectural choice; **flagged in `OPEN_QUESTIONS_FINAL.md` as NON-BLOCKING.**

## 15. Conflicts between documentation and actual code
Both `CLAUDE.md` files describe deleted components as current, and disagree with each other on the banned spacing scale (resolved: nested file wins, recorded in `ARCHITECTURAL_DECISION_REGISTER.md`). `SPEC.md` §FR-05/06/13 mandate the deleted score gauge and flat skill lists. `globals.css` claims `MotionConfig` exists in `layout.tsx`; it does not. All three are addressed by `MIGRATION_PLAN_FINAL.md`'s documentation-reconciliation step, not by this audit directly.
