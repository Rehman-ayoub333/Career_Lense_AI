# CareerLens AI — Final Master Plan
**The authoritative specification. Supersedes `SPEC.md` wherever the two disagree; supersedes both `CLAUDE.md` files on any design-rule conflict (resolution stated in §11.4).**
Prepared 18 August 2026, built directly on the verified repository state and on `CAREERLENS_MASTER_RESEARCH_AUDIT.md`, which remains the record of *why* — this document is the record of *what*, exactly, gets built.

**Planning session. No application code was modified to produce this document.**

---

# 1. Executive verdict

The current codebase is a well-engineered, single-shot LLM wrapper wearing a genuinely distinctive design language on its landing page, with two structural debts: the results experience never received that design language, and nothing in the AI pipeline can distinguish a claim it invented from a claim it can actually support. This plan fixes both in one move, because they turn out to be the same fix. The redesigned analysis experience *is* the evidence-grounding architecture, rendered — not two separate projects bolted together, but one decision (make evidence structural, not decorative) that simultaneously solves the frontend's doctrinal contradiction (§9 of the research audit — missing skills painted red), the backend's unfalsifiable-claims problem, and the thesis's missing research contribution. Everything below is organized around that single decision.

# 2. Final product vision

CareerLens AI is a free, no-account tool that tells an international scholarship or job applicant not just *whether* their CV matches an opportunity, but *exactly which sentence in their CV justifies that judgment* — and, just as importantly, which parts of the judgment it cannot justify at all. It treats an unverifiable claim as a defect, not a feature, and it says so in the interface rather than hiding it.

# 3. Core problem statement

International CV applicants receive AI-generated match verdicts they cannot audit: existing tools (and CareerLens's own prior version) assert a score and a list of gaps with no mechanism forcing the assertion to be checkable against the document it was supposedly derived from, so a plausible-sounding but false claim is indistinguishable, in the UI, from a true one.

# 4. Target users
Unchanged from `SPEC.md` §2, verified accurate and worth keeping as-is: the primary persona is a final-year CS/engineering student in Pakistan, India, Nigeria, Bangladesh or Egypt applying to European scholarships or remote roles, laptop-first, not a developer. The secondary persona — a scholarship reviewer or, now explicitly, an FYP examiner — reads the evidence architecture as the credibility signal it is.

# 5. Core value proposition
Ordinary AI resume analyzers, and a bare ChatGPT prompt, produce a verdict. CareerLens produces a verdict *and* the receipts: every claim in the results is tagged Verified, Uncertain, or Unresolved against the literal text the user pasted in, mechanically — not by asking the model to promise it checked.

# 6. Research contribution
Carried forward and finalized from the research audit (§15 there): **evidence-grounded, span-verifiable CV–opportunity matching**, with a deterministic (non-LLM) verification stage as the falsifiable intervention, measured against the current ungrounded pipeline as baseline, on a hand-labeled synthetic dataset, with a reused-harness fairness experiment as the secondary contribution. Full research questions, hypotheses, dataset spec, baselines, metrics, experiments and ablations are defined in that document and are incorporated here by reference in §29–§35; this plan does not repeat them, it implements them.

# 7. Product differentiator
Not "we use AI" — every competitor does. The differentiator is structural: the UI cannot render a claim the pipeline hasn't attempted to verify, because verification is a data-layer requirement (§11), not a prompt-level request. A user who asks "why should I believe this" gets an answer built into the product, not a suggestion to trust the model.

---

# 8. Final system architecture (overview)

```
CV text + Opportunity text (job description OR scholarship criteria)
        │
        ▼
sanitizeText()  [preserved, unchanged — lib/validators.ts]
        │
        ▼
STAGE 1 — Structured Claim Extraction  (1 Gemini call, schema-constrained)
   Output: score, band-verdict, per-requirement RequirementClaim[],
           ats_checks (structural, see §11.3), salary, interview questions
        │
        ▼
STAGE 2 — Deterministic Verification   (pure function, no model call, no network)
   For every RequirementClaim with a non-null evidence_quote:
     normalized fuzzy-substring match against the ORIGINAL cv text
   → verification: 'verified' | 'uncertain' | 'unresolved'
        │
        ▼
STAGE 2b — Adjudication escalation (SHOULD-HAVE, conditional)
   Only for claims Stage 2 scores as borderline (see §11.2 threshold band)
   → 1 narrow Gemini call per borderline claim, batched into one request
     ("for each of these N quote/requirement pairs, answer yes/no/partial")
        │
        ▼
STAGE 3 — Aggregation (pure function)
   evidence_coverage = verified / total
   per-category coverage (skill / experience / education / research / leadership)
   → replaces the six fake sub-scores entirely (§16)
        │
        ▼
STAGE 4 — Enhancements (existing calls, now gap-aware)
   /api/rewrite, /api/cover-letter — unchanged call shape, but the prompt
   is handed the UNRESOLVED claims specifically, not a flat skills_missing list
        │
        ▼
AnalysisSession → localStorage (unchanged: client-only, zero server persistence)
```

This is a **deterministic, ablatable multi-stage pipeline, not an agent** — see §10 for why that classification is deliberate and final.

---

# 9. AI architecture

## 9.1 What's preserved unchanged (verified strong in the source audit, do not touch)
`lib/ai/google.ts` (retry/backoff, safety thresholds, constrained decoding, header-based key transport), `lib/ai/index.ts` (`generateJson`/`generateText`, the one-repair-attempt strategy), the nonce-delimited injection defence in `lib/prompts.ts`, `lib/errors.ts`, `lib/logger.ts`, `lib/rate-limit.ts` (extended, not replaced — §13.5), the provider-registry seam.

## 9.2 What changes
`lib/analysis/schemas.ts`: the flat `skills_matched`/`skills_missing`/`skills_extra`/`keywords_present`/`keywords_missing` string arrays and the six sub-score numbers and `verdict_note` are **removed** from the schema (all five confirmed dead-or-fake-precision in the research audit and in this plan's own analysis — §16). Replaced by a single `claims: RequirementClaim[]` array. `verdict`/`score` are **kept** — the interpretive judgment stays, because users need one legible headline number, but it is now always shown paired with the mechanically-computed `evidence_coverage`, never alone (§19).

## 9.3 New module: `lib/analysis/grounding.ts`
Owns Stage 2 and Stage 3 exclusively. Exports `verifyClaims(claims: RequirementClaim[], sourceText: string): VerifiedClaim[]` and `aggregateCoverage(claims: VerifiedClaim[]): CoverageSummary`. Pure functions, no I/O, fully unit-testable, and — critically — this is the exact seam the ablation experiment (research audit §13/§18) toggles: call it or skip it, nothing else in the pipeline needs to know.

## 9.4 Verification algorithm (Stage 2, exact specification)
No new dependency (six production dependencies today; this does not add a seventh, consistent with the existing "ask before adding a dependency" rule). Implemented in-house:
1. Normalize both `evidence_quote` and `sourceText`: lowercase, collapse whitespace, strip punctuation except alphanumerics and spaces.
2. Slide a window of the quote's token length across the normalized source text; compute token-overlap ratio (Jaccard or simple intersection-over-quote-length) at each position.
3. Take the best window score. `≥ 0.85` → `verified`. `0.55–0.85` → `uncertain` (escalation candidate for Stage 2b if enabled). `< 0.55` → `unresolved`.
4. `evidence_quote: null` (model asserted no supporting text exists) is recorded directly as `unresolved`, skipping matching — this is the honest "gap" case, distinct from "the model claimed a quote and it wasn't found" (also `unresolved`, but flagged internally as `hallucination_candidate: true` for research-mode/eval purposes only, never surfaced to end users as an accusation).

## 9.5 Stage 2b — adjudication escalation (SHOULD-HAVE)
Batches all `uncertain`-tier claims from one analysis into a single additional Gemini call (not one call per claim — cost control), asking a yes/no/partial verdict per pair, schema-constrained. If disabled (env flag, default **off** for the MVP thesis build to keep the core claim clean — see research audit §13 ablations), all `uncertain` claims simply stay `uncertain` in the UI, which is itself an honest and acceptable end state, not a bug.

## 9.6 ATS checks become partially self-verifying
Of the 8 ATS checks, at least three are mechanically checkable without trusting the model at all: consistent date format (regex pattern-consistency check across detected dates), contact details present in the body (regex for email/phone patterns), no tables/multi-column markers (heuristic on extracted-text line structure — best-effort, since PDF layout information is mostly lost at extraction; documented as a known limitation, not oversold). These three run as an additional deterministic check inside Stage 2, and their `status` is only trusted from the model when the deterministic check is inconclusive. This is a SHOULD-HAVE refinement, not required for the core thesis claim, but cheap and directly reinforces the "evidence over assertion" doctrine everywhere it's feasible.

---

# 10. The agentic AI decision — final, with reasoning restated for this document

**No.** CareerLens does not adopt agent architecture (autonomous planning, cross-invocation memory, tool selection by the model, multi-agent role play). Measured against the field's own definition (research audit §4/§7 — reason, act, interact, with a genuine "degree of autonomy"), the proposed pipeline above has none of it: every stage is a fixed function in a fixed order, chosen by the engineer, not the model. This is a **deliberate, load-bearing decision**, not an oversight: an autonomous verifier-agent would add cost, latency, and a new failure surface (agent loops that don't converge) to solve a problem — "check this one quote against this one document" — that a 40-line deterministic string function already solves, testably and for free. Calling this pipeline "agentic" in a thesis would be dishonest and would fail under the exact viva question already anticipated in the research audit (§20, Q9–11). If the SHOULD-HAVE Stage 2b escalation is built, it remains a single scoped, stateless, non-autonomous call — still not an agent by the field's definition.

---

# 11. Evidence-grounding architecture (the research core, restated as an engineering spec)

## 11.1 Data model

```ts
// types/index.ts — replaces the flat skills_*/keywords_* fields entirely

export type ClaimCategory = 'skill' | 'experience' | 'education' | 'ats'
  | 'research' | 'leadership' | 'academic'   // last three: scholarship mode only

export type ClaimStatus = 'matched' | 'partial' | 'gap'        // the MODEL's own judgment
export type VerificationTier = 'verified' | 'uncertain' | 'unresolved'  // the MECHANICAL check

export interface RequirementClaim {
  id: string                     // stable, derived from index — used as React key and citation anchor
  requirement: string            // "3+ years of production React experience"
  category: ClaimCategory
  status: ClaimStatus
  evidence_quote: string | null  // literal-or-near-literal span the model asserts exists in the CV
  rationale: string               // one sentence, specific to this CV — replaces verdict_note's old job
}

export interface VerifiedClaim extends RequirementClaim {
  verification: VerificationTier
  match_score: number | null      // 0–1 internal similarity score; NEVER rendered to end users directly (§19)
  hallucination_candidate: boolean // true only when evidence_quote was non-null and unresolved; research/debug only
}

export interface CoverageSummary {
  overall: number                 // verified / total, 0–1
  byCategory: Partial<Record<ClaimCategory, number>>
  verifiedCount: number
  uncertainCount: number
  unresolvedCount: number
  total: number
}

export interface AnalysisResult {
  score: number                   // preserved — the interpretive judgment, unchanged in spirit
  verdict: MatchVerdict           // preserved
  claims: VerifiedClaim[]         // NEW — replaces skills_*/keywords_*/verdict_note/six sub-scores
  coverage: CoverageSummary       // NEW — mechanically computed, never model-generated
  key_actions: string[]           // preserved, now generated preferentially from `gap`/`unresolved` claims
  salary_range: string
  salary_context: string
  interview_questions: InterviewQuestion[]
  ats_checks: ATSCheck[]          // preserved shape; status now hybrid model+deterministic (§9.6)
}
```

## 11.2 Why this satisfies "no invented evidence"
The model is never trusted to say "verified" — that word does not exist in its output vocabulary at all (`status` uses `matched`/`partial`/`gap`, the model's *claim*; `verification` is computed downstream and the model never sees or influences it). This separation — claim vocabulary vs. verification vocabulary — is the single most important design decision in this document, because it's what makes the research question falsifiable: if the two always agreed, grounding would be theater; the experiment (research audit §18) measures exactly how often they disagree.

## 11.3 Why this isn't RAG
There is no external corpus to retrieve from — the CV and the opportunity text are both already fully present in context. "Evidence retrieval" in this project means *locating a span inside text the model already has*, not fetching unseen documents. Building a vector store here would answer a question nobody is asking. (Research audit §12/§23 — this decision is restated, not revisited.)

## 11.4 Design-rule conflict resolution
`careerlens/CLAUDE.md` (nearer to the code) governs on any conflict with the root `CLAUDE.md`, per the precedence this plan adopts from the research audit's decision. The root `CLAUDE.md` should be reduced to a one-paragraph pointer at the file's existing location the next time it's touched; this plan does not require that edit as a gate, only records the decision so nobody re-litigates it mid-build.

---

# 12. Backend architecture

## 12.1 Services (all under `lib/`, existing folder rules preserved)
| Module | Responsibility | Change |
|---|---|---|
| `lib/ai/*` | Provider transport | Unchanged |
| `lib/prompts.ts` | Prompt text | Analysis prompts rewritten for claim extraction; rewrite/cover-letter/interview prompts updated to consume `claims` instead of flat skill lists |
| `lib/analysis/schemas.ts` | Constrained-decoding contracts | `ANALYSIS_SCHEMA` restructured per §11.1 |
| `lib/analysis/grounding.ts` | **New.** Stage 2/3 | Pure, unit-tested, ablatable |
| `lib/analysis/guards.ts` | Runtime validation | Extended for `RequirementClaim`/`CoverageSummary` |
| `lib/analysis/ats-tips.ts` | Remediation copy | Unchanged, now paired with `hybrid` status source |
| `lib/scoring.ts` | Score/band presentation | Collapsed into the single source of truth for band thresholds (removes the 3-parallel-table debt: `constants.ts`'s `SCORE_BANDS` and `Hallmark.tsx`'s `BAND_RANGES` both become re-exports of this one table) |
| `lib/history.ts` | localStorage | Unchanged — nullable-field handling preserved exactly (data-loss regression guard stays) |
| `lib/export.ts` | `.txt` report | Extended to include claims/coverage, routed through `formatDate` (fixes the existing `toLocaleDateString` doctrine violation) |
| `lib/share-card.ts` | PNG export | Rewritten — §21 |

## 12.2 API surface — no new routes for the core contribution
| Endpoint | Change |
|---|---|
| `POST /api/analyze` | Response shape changes per §11.1. Internally runs Stage 1 (existing AI call pattern) → Stage 2/3 (new, in-process, no extra latency budget needed — deterministic string matching is sub-millisecond) → optionally Stage 2b if `ADJUDICATION_ENABLED=true`. `maxDuration`/`AI_TIMEOUT_MS` unchanged, since Stage 2/3 add negligible time. |
| `POST /api/rewrite` | Unchanged contract; prompt now receives `unresolved`-tier claims specifically |
| `POST /api/cover-letter` | Unchanged contract |
| `POST /api/chat` | Unchanged contract for MVP; SHOULD-HAVE: pass `claims` so answers can cite verification tier ("that's listed as unresolved because...") |
| `POST /api/upload` | Unchanged |
| `GET /api/health` | SHOULD-HAVE: add an opt-in `?deep=1` that performs a trivial real provider call to distinguish "configured" from "working" — never the default, per the existing documented reasoning about quota-consuming health checks |
| **Research mode** | Not a new route. A request header `X-Research-Mode: 1`, accepted by `/api/analyze` **only when `process.env.RESEARCH_MODE_ENABLED === 'true'`** (unset/false in any real deployment). When active, the response additionally includes raw Stage-1 model output, per-claim `match_score`, and per-stage timing. This is how Experiments 1–3 pull data — via the real running app, not a parallel code path, so what's evaluated is what ships. |

## 12.3 Data models
All in `types/index.ts` per §11.1, plus `lib/api/contract.ts` wire types updated in lockstep (existing separation of domain type vs. wire type preserved, not collapsed).

## 12.4 Storage
No change to the zero-persistence posture. `localStorage` remains the only storage, client-only, capped at 10 sessions, same quota-shedding write path (`lib/history.ts` untouched). The research dataset and evaluation results (§29–§32) live in a separate `research/` directory at the repo root, entirely outside the deployed application, never touched by the running server, and containing no real user data at any point (§14, §29 — synthetic by construction).

## 12.5 Privacy
Unchanged promise, now easier to keep with a straight face: "your CV is processed in memory and never written to a database or file system" remains true of the production app in every configuration, including research mode (research mode returns extra data in the HTTP response; it does not write anything server-side). The dataset needed to prove the research claims is synthetic, built by the student, and lives in `research/`, never derived from real user submissions — this directly resolves the tension the earlier audit flagged between `SPEC.md`'s "get numbers to quote in the SOP" goal and the no-analytics privacy promise: **the numbers to quote are the thesis's own evaluation results** (evidence coverage rate, faithfulness delta, sample size), not user telemetry. No analytics module is added. This decision is final, not reopened.

## 12.6 Security
Preserved in full: nonce-delimited injection wrapping (now also applied to the Stage 2b adjudication prompt, since it too handles untrusted quote text), safety thresholds, header-based key transport, structured two-layer log redaction, `assertServerOnly()`. **Added:** an hourly rate cap (the `RATE_LIMIT_PER_HOUR` value already sitting unused in `.env.local` finally gets read — `lib/rate-limit.ts` gains a second bucket keyed per-IP-per-hour, composed with the existing per-minute bucket, both must pass); a committed adversarial-input test fixture set (CVs attempting instruction override, tested against both the extraction prompt and the new Stage 2b batched-adjudication prompt, since batching multiple untrusted quotes into one call is a new surface worth testing explicitly). Nothing existing is weakened.

---

# 13. Frontend architecture

## 13.1 Visual direction, decided
"Premium technical product + calm intelligence + editorial precision + modern research instrument," per the brief — this is, near-exactly, the direction the existing landing-page redesign already achieves (assay-hallmark scoring, editorial furniture, measured-contrast tokens, film-grain atmosphere). **Decision: extend that language, do not replace it.** It already avoids every item on the "avoid" list (no glassmorphism, no 3D, no giant gradients, no dashboard cards) and it already reads as a research instrument rather than a SaaS product. The redesign work is bringing the results experience up to the same standard, not inventing a fourth visual language.

## 13.2 Design system — token contract (extends, does not replace, the existing `globals.css` architecture)
The existing fill/`-text` token split (`--violet`/`--violet-text`, etc., each with a measured contrast ratio) is confirmed, independently, as the best-reasoned part of the current system — kept exactly as-is. **New semantic contract, same five hues, no new CSS custom properties required:**

| Token (existing) | New semantic meaning | Usage rule |
|---|---|---|
| `--green` / `--green-text` | **Verified** — a claim has mechanical evidence support | Never used to mean "good candidate"; used only on a per-claim verification marker |
| `--amber` / `--amber-text` | **Uncertain** — partial or borderline evidence; also general system caution (rate limits, retries) | Two legitimate uses, same epistemic register (caution, not judgment) — no split needed |
| *(neutral — `--text-muted`, `--border`, no hue)* | **Unresolved** — no supporting evidence found | Deliberately colourless. A gap in a document is information, not a warning. This retires `Tag variant="missing"` in red permanently. |
| `--red` / `--red-text` | **System errors only** — network failure, validation failure, rate limit exceeded | Never appears inside an analysis result. If you're tempted to use red to describe something about the user's CV, that's the bug this token contract exists to prevent. |
| `--blue` / `--blue-text` | Informational / neutral content (salary context, research-mode debug panels) | Unchanged from today |
| `--violet` / `--violet-text` | Primary interactive/brand accent | Unchanged from today |

Span highlighting in the marked-document view (§14) reuses the existing alpha-compositing convention already in the codebase (`hsl(var(--green)/0.12)` etc.) — no new tokens needed for that either.

## 13.3 Typography
Unchanged: Geist (UI), Geist Mono (data/citations/evidence annotations — its usage *extends* into the new evidence markers, a natural fit for a register already reserved for "folios, references, findings"), Instrument Serif (editorial emphasis only, landing page, never UI chrome). The 11px `Hallmark` compact-label violation gets raised to 12px as part of this pass (§16).

## 13.4 Spacing
Unchanged scale: `0.5 1 1.5 2 3 4 6 8 12 16 20 24` for layout; `2.5`/`3.5` permitted only inside `components/ui/` and message bubbles for control padding. This resolves the two-`CLAUDE.md` conflict per §11.4 — the nested file's set (excluding `5 7 9 10 14`) is authoritative.

## 13.5 Motion
Framer Motion only, tokens from `MOTION` in `config/design-tokens.ts`, `MotionConfig` finally added to `layout.tsx` (closing the existing documentation-lie gap). **New principle, specific to this redesign:** motion is permitted to represent a *mechanically real* quantity changing state — a claim's highlight fading in as verification resolves, an evidence-coverage count incrementing as claims are tallied — because those are literal counts, not performances of judgment. Motion remains forbidden from representing the *interpretive* score (no count-up, no colour-by-value) — the existing Hallmark doctrine is unchanged and this is a clarification of it, not an exception to it. Every results-tree component gains a `useReducedMotion()` guard (closing the confirmed gap where 5 of the result surfaces ignored the user's motion preference).

---

# 14. UX architecture — the analysis experience

**Decision, final: retire the eight-tab dashboard as the primary surface. Adopt a marked-document primary view with a lightweight secondary tools strip.** This was flagged as the single largest open product question in the research audit and is resolved here, not reopened.

## 14.1 Information architecture
```
┌─────────────────────────────────────────────────────────────┐
│  [sticky, left/top]                 [primary, scrollable]    │
│  ASSESSMENT PANEL                    EVIDENCE DOCUMENT        │
│                                                                │
│  Hallmark: 73 / GOOD                 Your CV, rendered as     │
│  (struck, no colour, unchanged       continuous text with     │
│   doctrine — now with real           inline evidence markers: │
│   accessible text, §16)                                       │
│                                       "...built ETL pipelines  │
│  Evidence coverage                    in Python..."            │
│    14 / 17 requirements verified      └─ VERIFIED             │
│    (mechanically computed, §11)         "3+ years Python"     │
│                                                                │
│  Requirement checklist                "...familiar with        │
│    ✓ 11 verified                       containerization..."   │
│    ~ 3 uncertain                       └─ UNCERTAIN            │
│    ○ 3 unresolved                       "Docker experience"   │
│                                                                │
│  Recommended next actions            (unresolved requirements  │
│    (generated from unresolved         appear as a quiet        │
│     claims specifically)              margin note beside the   │
│                                        nearest relevant section,│
│  [New analysis] [Share] [Download]    never as a red flag on   │
│                                        the document itself)     │
├─────────────────────────────────────────────────────────────┤
│  TOOLS  (secondary, lower visual weight, tab strip)            │
│  Rewrite · Cover Letter · Interview Prep · Chat                │
└─────────────────────────────────────────────────────────────┘
```
This is the target IA, not a literal component spec — implementers should treat the panel/document split as fixed and the exact spacing/typography as governed by §13.

## 14.2 Why this resolves the doctrinal contradiction
Every requirement in the checklist and every marker in the document uses the §13.2 verification-tier vocabulary (verified/uncertain/unresolved), never the old matched/missing/extra vocabulary, so there is no longer a code path capable of rendering "missing skill" in red — the type system itself makes the old violation impossible to reintroduce, because `Tag variant="missing"` and the flat `skills_missing` field it read from are both deleted, not merely unused.

## 14.3 Tools strip (secondary)
`Rewrite`, `Cover Letter`, `Interview Prep`, `Chat` survive as lightweight tabs — these are generated *outputs*, not *findings*, and belong in a visually secondary register so the evidence document remains the hero (§17 of the brief). ATS checks and salary context fold into the primary panel (ATS as part of the requirement checklist, since §9.6 makes several of them mechanically verifiable anyway; salary as a small info card).

## 14.4 Results-screen communication checklist (brief §18, answered)
1. Overall assessment → Hallmark, preserved. 2. Evidence coverage → new, mechanical, always shown beside the score. 3. Skill alignment → the requirement checklist, three-tier. 4. Job alignment → the same checklist, since requirements *are* the job/scholarship criteria items. 5. Recommendations → key actions, gap-conditioned. 6. Uncertainty → the "uncertain"/"unresolved" counts, stated as counts, never hidden. 7. Evidence → the marked document itself, clickable/hoverable to reveal the requirement + rationale behind each marker.

## 14.5 No false precision (brief §19, enforced structurally)
`match_score` (the 0–1 internal fuzzy-similarity number) is **never sent to the client in the standard response** — only the three-tier `verification` label is. It exists only in the research-mode payload (§12.2), where a numeric internal value is appropriate because the audience is the evaluation script, not an end user. `score`/`verdict` retain their existing, already-defended framing (a judgment, explicitly not a performance metric, always shown with its reference). `evidence_coverage` is the one new user-facing number, and it earns its place because, unlike the old sub-scores, it is a literal count divided by a literal count — fully defensible, fully reproducible from the same claims the user can see listed beneath it.

## 14.6 Landing page
Redesign scope: keep the existing ten-section structure and editorial language (confirmed strong, §17 of the research audit); rewrite `ResultSection`'s worked example so it depicts the *actual* marked-document experience (§14.1) instead of the abandoned gap-fields/margin-annotation mockup that currently over-promises relative to what `/analyze` delivers — this closes the "landing markets a UI that doesn't exist" defect identified previously, and it becomes accurate *because* §14.1 is now real, not because the landing copy is toned down. Explicitly add one short section stating the evidence-grounding claim in plain language ("we show our work") — this is both a product differentiator and a credibility signal for the scholarship-reviewer/examiner persona, and it must not overclaim (no "hallucination-free," no invented accuracy percentage — state the mechanism, not an unproven outcome).

## 14.7 Accessibility (brief §20)
Every verification-tier marker gets a text equivalent, not just a colour/icon — screen readers must hear "verified," "uncertain," or "unresolved," never infer it from colour alone. `Hallmark` gains the accessible sentence pattern already correctly implemented in `HistoryPanel` ("Match 73 out of 100, band GOOD") — this closes the confirmed existing gap. Skip-to-content link added. `UploadZone` becomes a real `<button>` with `aria-describedby` pointing at its guidance text (currently suppressed by an overriding `aria-label`). Nested `<main>` fixed on `/privacy`, `/404`, and the error boundary.

## 14.8 Responsive strategy (brief §21)
Desktop/laptop (primary target, per the persona): panel + document side by side, as drawn in §14.1. Tablet: panel moves above the document, becomes a horizontal summary strip, document remains full-width and scrollable. Mobile: the document becomes the primary and only initially-visible surface; the assessment panel collapses to a sticky one-line summary bar (score + coverage fraction) that expands on tap; the tools strip becomes a bottom sheet rather than inline tabs. Priority order on small screens, explicit: score/coverage first, evidence document second, recommendations third, tools last — this is a genuine information-priority decision, not a uniform shrink.

## 14.9 Failure states (brief §24)
Every one of these gets a named, designed state, not a generic error banner: invalid/unreadable upload (name the likely cause — scanned image PDF — and offer the paste-text fallback directly in the error copy); empty document; unsupported file type; AI timeout (distinct copy from a hard failure — "this is taking longer than expected," with the existing abort-and-retry machinery already in `useAnalysis.ts`); rate limit (surface the real `Retry-After` value already returned by `createApiRoute`, don't invent a generic "try again later"); malformed model response (already handled server-side by the one-repair-attempt strategy; client-side, this must never look identical to a network failure — `lib/api/client.ts`'s existing non-JSON-body handling is the right foundation, extend its message mapping); insufficient evidence (a CV too short/generic to extract meaningful requirements against — a distinct empty state, not a crash).

---

# 15. Component architecture (file-level, careerlens/src/)

**New:**
- `components/tool/results/evidence/EvidenceDocument.tsx` — renders CV text with inline claim markers
- `components/tool/results/evidence/ClaimMarker.tsx` — one inline marker + hover/click annotation card
- `components/tool/results/evidence/RequirementChecklist.tsx` — the three-tier list in the assessment panel
- `components/tool/results/evidence/CoverageSummary.tsx` — the mechanical coverage stat block
- `components/tool/AssessmentPanel.tsx` — composes Hallmark + CoverageSummary + RequirementChecklist + KeyActions + actions (replaces today's `ScorePanel.tsx`, keeping its sticky behaviour and its three-action footer)

**Modified:**
- `components/ui/Badge.tsx` — `TagVariant` becomes `'verified' | 'uncertain' | 'unresolved' | 'neutral'`, mapped per §13.2; `role="status"` stays absent (confirmed correct, unchanged)
- `components/ui/Hallmark.tsx` — add accessible sentence, raise compact label to 12px, otherwise unchanged (this file is the product's design manifesto per the earlier audit and is treated that way here too)
- `components/tool/AnalyzeTool.tsx` — input-form column balance fixed, full-width Analyze button, results branch now renders `AssessmentPanel` + `EvidenceDocument` + tools strip instead of `ScorePanel` + `ResultsTabs`
- `components/tool/results/tabs/ResultsTabs.tsx` — narrows to the four "Tools" tabs only (Rewrite, Cover Letter, Interview Prep, Chat); `SkillsTab.tsx`, `KeywordsTab.tsx`, `ATSTab.tsx` are **deleted**, their content absorbed into the evidence document/checklist
- `lib/share-card.ts` — rewritten per §21
- `app/analyze/page.tsx` — gets a real (not sr-only) page header, per the existing source comment's own stated intent

**Deleted:** `components/tool/results/tabs/SkillsTab.tsx`, `KeywordsTab.tsx`, `ATSTab.tsx` (superseded by the evidence document; their remaining unique logic — ATS deterministic checks — moves to `lib/analysis/grounding.ts`).

State management, data fetching, loading/empty/skeleton states: unchanged architecture (`useAnalysis` single hook, `lib/api/client.ts` single fetch door) — the shape of `AnalysisResult` changes, the plumbing around it does not.

---

# 16. Retiring false precision (brief §19, applied item by item)

| Item | Disposition | Why |
|---|---|---|
| `skills_score`, `experience_score`, `education_score`, `research_score`, `leadership_score`, `academic_score` | **Removed** | Six numbers generated every call, rendered nowhere, unverifiable by construction — exactly the "figure that cannot be verified should not be rendered" doctrine the product already states. Replaced by `coverage.byCategory`, which is computed, not guessed. |
| `verdict_note` | **Removed** | Confirmed fully dead in the prior audit; replaced by per-claim `rationale`, which is specific and checkable instead of generic. |
| `match_score` (new internal fuzzy value) | **Never shown to end users** | Internal-only; research-mode only. Showing "0.87 similarity" to a rejected applicant is exactly the false precision this brief warns against. |
| `score`/`verdict` | **Kept** | Already correctly hedged by existing doctrine (a judgment, not a metric; always paired with its reference); now additionally always paired with `evidence_coverage`. |
| `evidence_coverage` | **Added** | The one new number, and it earns its place: it's a literal ratio of literal counts the user can recount themselves from the checklist below it. |

---

# 17. Dataset, baselines, evaluation, experiments, ablations, fairness

Fully specified in `CAREERLENS_MASTER_RESEARCH_AUDIT.md` §11–§18 and incorporated here by reference, with one implementation-level addition: the dataset and evaluation scripts live in a new top-level `research/` directory (sibling to `careerlens/`, not inside it), specifically so the FYP research artifact is never mistaken for, or accidentally coupled to, the deployed application's runtime — a grader or examiner can review `research/` in isolation. Structure:
```
research/
├── dataset/            synthetic CV/JD/scholarship pairs + hand labels (versioned, small, privacy-safe)
├── annotation/          labeling guidelines + inter-rater reliability worksheet
├── scripts/
│   ├── baselines/        keyword-overlap.ts, embedding-similarity.ts
│   ├── evaluate.ts        Experiment 1 — faithfulness/hallucination/F1 against gold labels
│   ├── perturb.ts         Experiment 2 — name/institution identity-swap generator + variance calculator
│   └── ablate.ts          Experiment 3 — runs the pipeline with grounding on/off, diffing results
└── results/              output tables/figures, one subfolder per run, timestamped
```
Baselines, metrics, hypotheses, and the three experiments are not restated in full here to avoid two documents disagreeing with each other over time — the research audit is the single source of truth for the *scientific* design; this document is the single source of truth for *where it lives and how it plugs into the app*.

---

# 18. Reproducibility

Every experimental run records: the exact `GOOGLE_MODEL` string (already the single override point via `getGoogleModel()` — reused, not duplicated), `temperature: 0` (already the pipeline default) with the number of independent runs averaged noted explicitly (Gemini determinism at temperature 0 is not guaranteed), the exact prompt text as committed in `lib/prompts.ts` at that commit hash, the dataset version (a simple version string in `research/dataset/`), and raw per-item model output alongside aggregated metrics (so a reviewer can re-score by hand). `research/scripts/evaluate.ts` and siblings are themselves tested code (§20), not one-off notebooks.

---

# 19. Testing strategy

| Category | What it verifies | Where |
|---|---|---|
| Unit | `lib/analysis/grounding.ts`'s matching algorithm against known quote/source pairs (including adversarial near-misses); `lib/scoring.ts`'s collapsed band table | `tests/` (extends the existing 7-suite Jest setup) |
| Integration | `POST /api/analyze` end-to-end against a fixture CV/JD, asserting the response contains `claims`/`coverage` in the new shape | new `tests/api/analyze.test.ts` |
| AI evaluation | Faithfulness/hallucination/F1 against the gold dataset | `research/scripts/evaluate.ts`, run manually/on-demand, not part of `npm run verify` (it costs real API quota) |
| Regression | The existing 11 history-data-loss tests, preserved exactly; new regression test asserting `AnalysisSession` never requires `rewrite`/`coverLetter` to be non-null | `tests/history.test.ts` |
| Security | The new adversarial-input fixture set (§12.6) against both the extraction and Stage 2b prompts | new `tests/security/injection.test.ts` |
| Accessibility | Automated `axe` check in CI (new dev dependency — **must be asked for explicitly before adding**, per the existing dependency policy) covering the redesigned `/analyze`; manual screen-reader pass on `Hallmark` and the evidence markers | CI + manual checklist |
| Frontend/component | `EvidenceDocument`/`ClaimMarker` render correctly for all three verification tiers, including the zero-claims empty state | `tests/components/` (new — currently no component-level tests exist) |
| API contract | `lib/api/contract.ts` wire types stay in sync with `types/index.ts` domain types — a compile-time check, not a runtime test, already implicitly enforced by TypeScript strict mode |
| Research evaluation | Ablation harness (`ablate.ts`) confirms the grounded and ungrounded code paths actually produce measurably different `verification` distributions on at least one known adversarial fixture — a smoke test that the intervention is real before trusting the full experiment | `research/scripts/ablate.ts` |

---

# 20. Thesis structure and viva preparation
Fully specified in the research audit §17 and §20 (14-chapter structure, 25-question viva bank). Incorporated by reference, unchanged — nothing in this replanning session alters the scientific narrative, only the system that will generate its results.

---

# 21. Share-card redesign (closing a previously-flagged critical defect)
`lib/share-card.ts` is rewritten to draw: the struck score numeral (no ring, no arc, no colour-by-band — matching `Hallmark`'s doctrine exactly, since this is the one artefact users actually publish and it currently contradicts the product's own stated ethics), the band word, the evidence-coverage fraction as plain text, and up to three `verified`-tier requirement strings as plain uncoloured chips. `CANVAS_TOKENS` in `config/design-tokens.ts` is trimmed to only the values this new drawing needs (removing the now-unused ring/bar-specific colour entries).

---

# 22. File/folder architecture — final decision

**Decision: two authoritative documents at the repo root (this one and the kickoff doc), plus the existing research audit; no fragmented `docs/` tree.** The brief's §29 example hierarchy is explicitly not adopted — ten near-empty folders each holding one file would recreate exactly the multi-document-contradiction risk this whole exercise exists to eliminate. The one structural addition is `research/` (§17), which holds data and scripts, not prose specification, so it cannot drift out of sync with this document the way a second prose spec could. `SPEC.md` is retained but gets a one-paragraph header added at its top stating it is superseded by this plan wherever the two disagree, specifically on: the deleted score-gauge/breakdown-bar design (§FR-05/06/13), the flat skill lists (§FR-06), and the success-metrics framing (§22, replaced by this plan's §6/§17 research metrics). `QA-REPORT.md` keeps its existing "superseded, method valuable" annotation from the prior audit pass. Both `CLAUDE.md` files are reconciled per §11.4.

---

# 23. MUST / SHOULD / NICE / DO-NOT-BUILD

**MUST HAVE**
Valid `GOOGLE_API_KEY` and one verified real end-to-end run · Stage 1 claim-extraction schema + prompts · Stage 2 deterministic verification module (`lib/analysis/grounding.ts`) · `AnalysisResult` restructure (§11.1) · removal of the six fake sub-scores and `verdict_note` · new colour semantic contract (§13.2) retiring red-as-judgment · marked-document evidence UI (§14.1) · `Hallmark` accessible text · `MotionConfig` · nested-`<main>` fixes · `error.tsx` prop fix · dataset construction (60–150 items) + annotation guidelines · baseline scripts (keyword, embedding) · Experiment 1 harness (faithfulness/hallucination) · Experiment 3 harness (ablation on/off) · reproducibility logging · hourly rate cap.

**SHOULD HAVE**
Stage 2b adjudication escalation · ATS mechanical sub-checks (§9.6) · research-mode header flag · Experiment 2 (fairness perturbation) · share-card rewrite · `CoverLetterTab` retry · mobile responsive pass across all result components · sitemap/robots/JSON-LD · gap-conditioned rewrite/interview prompts · `?deep=1` health check.

**NICE TO HAVE**
Skill-ontology/ESCO normalization · cross-model (non-Gemini) comparison · chat endpoint given claim context · confidence detail beyond the three-tier label in the UI (e.g., an expandable "why uncertain" note) · CSP nonce middleware.

**DO NOT BUILD**
Autonomous/multi-agent architecture · RAG or vector database · accounts/auth/server-side database · analytics or user telemetry of any kind · acquisition of a large real-resume dataset · model fine-tuning · a fragmented `docs/` folder tree · a second, competing prose specification of the research design (the audit document is authoritative for science; this document is authoritative for system design — nothing else should attempt either job).

---

# 24. Risks, threats to validity, assumptions

**Risks:** the deterministic fuzzy-matcher's threshold (0.85/0.55, §9.4) is a judgment call that needs calibration against the labeled dataset before Experiment 1 is trusted — treat the first dataset pass as a threshold-calibration exercise, not a final result. Stage 2b, if enabled, reintroduces a small amount of LLM-side non-determinism into what is otherwise a fully deterministic verification stage — keep it optional and always report results with it explicitly on or off, never mixed. **Threats to validity:** synthetic-dataset realism, single-model (Gemini-only) evaluation, small sample size — all restated from the research audit and not reduced by anything in this plan; this plan makes the experiments buildable, it doesn't make the sample bigger. **Assumptions:** a valid `GOOGLE_API_KEY` will be supplied before Phase 2 of the kickoff doc begins; the student performs (or arranges) the second labeler pass needed for inter-rater reliability; university formatting/citation requirements for the thesis chapters are out of this document's scope and must be layered on by the student.

---

# 25. Final definition of done

The MVP research contribution is done when: the app runs end-to-end against a real API key; `/analyze` renders the marked-document evidence experience with zero code path capable of producing a red "missing skill" tag; `research/scripts/evaluate.ts` produces a faithfulness/hallucination table comparing grounded vs. ungrounded on the full labeled dataset; `research/scripts/ablate.ts` confirms the two conditions are measurably different; `npm run verify` is green; and the student can answer viva questions 1, 8, 9–11, and 21 (research audit §20) from the running system, not from memorized prose. Everything in the SHOULD/NICE tiers is explicitly not required to reach this definition of done.
