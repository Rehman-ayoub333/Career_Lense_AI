# CareerLens AI — PROJECT STATE REPORT

**Prepared:** 18 August 2026
**Repository:** `F:\PIAIC_6_PROJECTS\Career_Lense_AI`
**Branch:** `main` · HEAD `6d2fc58` ("feat: redesign CareerLens AI and improve analysis experience", 12 Aug 2026)
**Working tree:** clean (111 tracked files, 0 untracked, 0 modified)
**Purpose:** complete handoff to a new senior agent (Claude Cowork). Nothing in the repository was modified to produce this report.

---

## EVIDENCE STANDARD USED IN THIS REPORT

| Mark | Meaning |
|---|---|
| **[FACT]** | Read directly in the current source, or produced by a command run during this audit |
| **[INFERRED]** | Reasoned from the code but not executed or observed at runtime |
| **[UNVERIFIED]** | Could not be checked in this environment; the reason is always given |

Verification commands actually executed during this audit, against the current working tree:

| Command | Result |
|---|---|
| `npx tsc --noEmit` | **0 errors** [FACT] |
| `npx eslint . --max-warnings=0` | **clean, exit 0** [FACT] |
| `npx jest` | **7 suites, 95/95 tests passed** [FACT] |
| `npx next build` (Next 16.2.12, Turbopack) | **succeeds**; 4 static routes, 6 dynamic API routes [FACT] |
| Live `POST` to Gemini with the shell `GOOGLE_API_KEY` | **HTTP 400 `API_KEY_INVALID`** [FACT] |

No runtime browser verification was performed in this audit. Every claim about how a page *looks* or *feels* is marked [INFERRED] and derives from reading the JSX and the token system.

---

# 1. WHAT THIS PROJECT IS

## Product name
**CareerLens AI** [FACT — `src/config/site.ts`, `SPEC.md` §1]

## What problem it solves
A CV is rejected by an applicant tracking system, or by a scholarship committee, and the applicant is never told why. SPEC.md §1 states the premise: ~75% of resumes are filtered before a human reads them; every incumbent tool (Jobscan, Teal, Huntr) is built for US/UK corporate hiring; and no tool at all understands European scholarship committee evaluation criteria. [FACT — `SPEC.md:41-46`]

The product answers two questions: *why is this being rejected*, and *what do I change*.

## Who it is for
Three personas, explicit in SPEC.md §2 [FACT]:

1. **Primary — "The International Applicant."** Final-year CS/engineering students in Pakistan, India, Nigeria, Bangladesh, Egypt, applying to European MS programmes (DAAD, Stipendium Hungaricum, Erasmus Mundus, Chevening) or to remote tech jobs. Laptop-first, occasionally mobile. Not developers.
2. **Secondary — "The Scholarship Reviewer."** A committee member who follows a link from the author's Statement of Purpose, tries the tool, and reads the GitHub README. This persona is why code quality is a *product* requirement here, not an engineering preference.
3. **Tertiary — "The LinkedIn Audience."** The distribution channel; wants something free that works and produces a shareable artefact.

## Core product philosophy
The philosophy is not in a manifesto file — it is written into the source comments of the redesign, and it is unusually coherent. Reconstructed from the code [FACT — `Hallmark.tsx`, `ScorePanel.tsx`, `HistoryPanel.tsx`, `ResultSection.tsx`, `KeyActions.tsx`]:

- **The score is a judgement passed on a document, not a game score.** "This number is shown to people who have already been rejected repeatedly, and a dial that sweeps up to a low figure is a slot machine landing on a loss." (`Hallmark.tsx:18-20`)
- **A product that assesses people does not get to paint them red.** Band is carried by a *word*, at identical weight and colour whatever it says. (`ScorePanel.tsx:26-28`)
- **A figure that cannot be verified should not be rendered at all.** This is why the three sub-score bars were deleted. (`ScorePanel.tsx:30-32`)
- **State what was found; never console and never congratulate.** This is why `verdict_note` stopped being rendered. (`ScorePanel.tsx:33-36`)
- **Selection is expressed by depth, never by colour.** Applied to the tab bar and the mode selector. (`Tabs.tsx:115-120`, `ModeSelector.tsx:10-14`)
- **Findings are never padded, never ranked, never silently empty.** (`KeyActions.tsx:7-16`)
- **A band without its reference asserts nothing.** The score always ships with what it was measured against. (`format.ts:47-53`, `Hallmark.tsx:62`)
- **Zero infrastructure, zero retention.** No account, no database, no cookies, no analytics. History is localStorage only.
- **The landing page sells; the application works.** They are separate routes and must stay separate. (`careerlens/CLAUDE.md`)

## Main user journey (verified — see §3)
`/` (landing, 10 sections) → click "Analyse my CV" → `/analyze` → pre-populated CV + JD → optional PDF/TXT upload → choose Job or Scholarship mode → Analyse → loading overlay (4 steps) → results (hallmark + findings + 8 tabs) → share PNG / download .txt report / restore from history / new analysis.

## What makes the product different
Per SPEC.md §1 "Non-Negotiables" [FACT] and as built:
1. **Scholarship Mode** — matches a CV against scholarship criteria as a selection panellist, with its own system prompt, its own 8-item check list, and research/leadership/academic axes. No named competitor does this. **Built.**
2. **Never a blank canvas** — `/analyze` opens pre-populated with a sample CV and JD. **Built** (`AnalyzeTool.tsx:25-29`).
3. **Shareable score card** — the viral loop. **Built**, but see the severe caveat in §5 and §9.

The genuinely distinctive asset, however, is the **design language introduced in the August redesign**: the assay-hallmark score, the struck-selection interaction vocabulary, the print-registration hero artwork, the folio/colophon editorial furniture. Nothing else in this product category looks like it.

## What the intended final product should feel like
[INFERRED — from `Section.tsx`, `Footer.tsx`, `Hallmark.tsx`, `globals.css` atmosphere layer]

A **printed document under an assayer's lamp**, not a SaaS dashboard. Dark, near-neutral, lit from the upper left with film grain to prevent banding. Sections carry running heads and folios like book chapters. The footer is a colophon, not a link farm. Figures are struck rather than animated. Nothing congratulates the reader; nothing paints them red. The interface should read as an *instrument* — quiet, exact, and answerable.

---

# 2. WHAT HAS ALREADY BEEN BUILT

## Feature-by-feature status

### Routing & pages

| Feature | Status | Evidence |
|---|---|---|
| Landing page `/` (10 sections) | ✅ Complete | `app/page.tsx`, 10 landing components |
| Application `/analyze` | 🟡 Partially complete | Works end-to-end; explicitly **not yet redesigned** (`app/analyze/page.tsx:22-23`) |
| Privacy `/privacy` | ✅ Complete | 7 sections, names Google Gemini correctly |
| 404 `app/not-found.tsx` | ⚠️ Implemented but problematic | Renders; **no `metadata` export → default `<title>`**; nested `<main>` |
| Error boundary `app/error.tsx` | ⚠️ Implemented but problematic | Renders; **ignores the `error` prop entirely — nothing is logged**; nested `<main>` |
| Route separation (`/` vs `/analyze`) | ✅ Complete | Enforced by `careerlens/CLAUDE.md` as an absolute rule |
| `sitemap.ts` / `robots.ts` | 🔴 Missing | Required by `SPEC.md` §26; neither file exists |
| JSON-LD structured data | 🔴 Missing | Required by `SPEC.md` §26 |

### Components (37 total)

| Group | Files | Status |
|---|---|---|
| `components/landing/` | 12 (10 sections + `Section.tsx` + `hero/`) | ✅ Complete — all four redesign passes appear landed |
| `components/layout/` | `Navbar`, `Footer` | ✅ Complete |
| `components/tool/` | `AnalyzeTool`, `AnalyzeExperience`, `UploadZone`, `ModeSelector`, `LoadingOverlay`, `history/HistoryPanel` | 🟡 Functional; visual language is **pre-redesign except** `ModeSelector`, `UploadZone`, `HistoryPanel` |
| `components/tool/results/ScorePanel/` | `ScorePanel`, `KeyActions`, `ShareCard` | ✅ Redesigned |
| `components/tool/results/tabs/` | 8 tabs + `ResultsTabs` | ⚠️ **Tab *bar* redesigned; tab *contents* are entirely pre-redesign** |
| `components/ui/` | `Badge`, `Button`, `Card`, `Container`, `CopyButton`, `Feedback`, `Hallmark`, `Modal`, `Tabs`, `Textarea` | ✅ Complete; **3 dead exports** (see §5) |

### Frontend architecture — ✅ Complete

[FACT] Next.js 16 App Router, React 19.2.4, React Compiler enabled (`reactCompiler: true`). Server Components by default; `'use client'` used only where a hook or an event handler requires it. `AnalyzeExperience.tsx` exists purely as a client boundary so `app/analyze/page.tsx` can stay a Server Component and own its `metadata`. Path alias `@/*` → `src/*`. Discipline is high: **zero `any` types, zero `console.log` outside the sanctioned logger, zero `transition-all`, zero hardcoded hex in components** — all four verified by grep [FACT].

### Backend / API architecture — ✅ Complete, and the strongest part of the codebase

[FACT] Six routes under `app/api/`. Five of them are built from a single higher-order factory, `createApiRoute` in `lib/api/route.ts`, which owns — for every endpoint, by construction:

- rate limiting with correct `Retry-After` and `X-RateLimit-*` headers
- a **real** `AbortController` budget (the upstream fetch is genuinely cancelled, not merely raced)
- one serialisation path that *physically cannot* emit an internal error message
- one structured log record per request, carrying the same `requestId` returned to the client

This is a well-designed boundary and should not be disturbed.

### Database / storage — ✅ Complete (by deliberate absence)

[FACT] No database. No ORM. No server-side persistence of any kind. The only storage is `localStorage`, routed exclusively through `lib/history.ts` (key `careerlens:history:v1`, cap 10 sessions). That module is genuinely defensive: it survives blocked storage, corrupt entries, and quota exhaustion (it sheds oldest entries and retries the write so the analysis the user is *currently looking at* always survives).

### Authentication — 🔴 Not present, and correctly so

[FACT] No auth anywhere. "Free, no signup" is a stated non-negotiable. This is not a gap.

### AI / LLM integration — ✅ Complete

[FACT]
- **Provider:** Google Gemini, exactly one, registered in `lib/ai/index.ts`.
- **Model:** `gemini-2.5-flash` (overridable via `GOOGLE_MODEL`).
- **Transport:** raw `fetch` against the REST API — no vendor SDK, deliberately (smaller bundle, no dependency, runs on Node and Edge unchanged).
- **Key handling:** sent as the `x-goog-api-key` *header*, never a `?key=` query parameter, with the reasoning stated in a comment ("URLs are recorded by proxies, CDNs and access logs; headers are not").
- **Reliability:** 3 attempts, exponential backoff with jitter, honours upstream `Retry-After`, retries only on 408/429/5xx.
- **Structured output:** the JSON schema is handed to Gemini's constrained decoder (`responseSchema`), so malformed JSON is prevented rather than caught. One repair attempt on failure, then stop.
- **Thinking disabled** on 2.5 models (`thinkingBudget: 0`) with the latency rationale documented.
- **Safety thresholds raised** to `BLOCK_ONLY_HIGH` with an excellent rationale: military service, medical roles, criminal-justice work and non-English names all produce false positives at default thresholds.

**Naming hazard, already flagged in both CLAUDE.md files:** the product is called *CareerLens AI* and the repository is `Career_Lense_AI`, but **there is no Anthropic/Claude provider**. Adding one requires updating `app/privacy/page.tsx` in the same change, because that page names the data processor.

### Analysis pipeline — ✅ Complete

[FACT — `hooks/useAnalysis.ts`]
```
POST /api/analyze            (load-bearing; failure aborts the run)
        ↓
Promise.allSettled([
  POST /api/rewrite,         (enhancement; may fail alone)
  POST /api/cover-letter     (enhancement; may fail alone)
])
        ↓
AnalysisSession { …, rewrite: RewriteResult | null, coverLetter: string | null }
        ↓
addToHistory()  →  render results
```
The `allSettled` choice is correct and load-bearing: a rewrite failure must not discard an analysis the user already spent quota and waiting time on. `types/index.ts:72-80` and `lib/history.ts:29-42` both document the prior bug where requiring both fields caused **silent permanent data loss** on the next write.

### Prompt / system architecture — ✅ Complete, and notably strong

[FACT — `lib/prompts.ts`] Every prompt lives in one file; nothing else builds prompt text (verified by grep). Two design decisions worth preserving:

1. **Format lives in the schema, not the prompt.** Prompts describe *judgment*; `lib/analysis/schemas.ts` describes structure. Reported ~60% shorter prompts and lower input-token cost.
2. **Unguessable delimiters.** Untrusted content is wrapped in `<<<CV:{nonce}>>>` with a **per-request random nonce**, and the system notice tells the model that only a marker bearing that exact token closes a block. This closes a real, trivial injection vector (a CV containing the literal line `CV_END` used to escape the data block). This is a genuinely good piece of security engineering.

### State management — ✅ Complete

[FACT] No state library. `useAnalysis` is a single `useState` reducer-shaped hook owning `{ step, loadingStep, error, session }`, plus an `AbortController` ref so unmount or reset cancels in-flight work. Called once, at the client boundary, and passed down. Local `useState` for form fields and tab selection. This is the right amount of machinery for this app.

### Export / share functionality — 🟡 Partially complete / ⚠️ problematic

| Piece | Status |
|---|---|
| `.txt` report download (`lib/export.ts`) | ✅ Works. But covers only score/verdict/rewrite/key-actions/skills/cover-letter — **omits ATS checks, keywords, salary, interview questions** |
| Share card PNG (`lib/share-card.ts`) | ⚠️ **Works, but renders the deleted pre-redesign design** — see §5 and §9 |
| Copy image to clipboard | ✅ Works, with a URL fallback for Firefox / insecure origins |
| `GET /api/share` OG image | 🔴 Missing — `SPEC.md` FR-12 specifies `@vercel/og` via an API route; implementation is client-side canvas instead |

### History functionality — ✅ Complete

[FACT] Open-on-demand read (correct — `localStorage` is unavailable during SSR), restore, delete one, clear all, 10-item cap, legacy-key cleanup, quota-shedding writes. The redesigned row shows a struck unpainted figure, the band as a word, the mode, and an **absolute** date. 11 regression tests cover the data-loss path.

### Accessibility implementation — 🟡 Partially complete

**Genuinely well done** [FACT]:
- `Tabs.tsx` is a correct ARIA Authoring Practices tab implementation: roving tabindex, arrow keys with wrap, Home/End, `aria-selected`/`aria-controls`, focusable panels.
- `useFocusTrap` restores focus to the trigger, excludes disabled/hidden elements, re-reads the focusable list per keypress, and **does lock background scroll** with scrollbar-width compensation.
- `Modal` has `role="dialog"`, `aria-modal`, a real `aria-labelledby` heading, Escape with `stopPropagation`, backdrop-close that survives text-selection drags.
- `Badge` **deliberately removed** `role="status"` because eleven badges on a results screen produced eleven live-region interruptions. The reasoning is correct and contradicts `SPEC.md` §15 — the implementation is right and the SPEC is wrong.
- `LoadingOverlay` exposes per-step status with `sr-only` text and `aria-current="step"`.
- `TextareaField` associates hint and counter via `aria-describedby`, with a polite `aria-live` counter.
- One global `:focus-visible` ring using `--violet-text` (7.94:1) rather than `--violet` (3.44:1). The token file documents measured contrast ratios for every text token.
- `HistoryPanel` rows carry `sr-only` text: *"Match 73 out of 100, band GOOD. Select to restore this analysis."*

**Gaps** [FACT]:
- **`Hallmark` — the primary score — has no accessible text.** No `role`, no `aria-label`, no `sr-only` sentence. A screen reader gets `"73 Match GOOD"` as three unrelated fragments. `SPEC.md` §15 requires *"Match score: 73 out of 100. Good Match."* The history row does this correctly; the main score does not.
- **No skip-to-content link** anywhere.
- **Nested `<main>` elements** on `/privacy`, `/404` and the error boundary: `layout.tsx` renders `<main>`, and each of those pages renders `<Container as="main">` inside it.
- **`UploadZone` is a `div[role="button"]`** with `aria-label="Upload CV file"`, which **overrides all inner text**. The one genuinely useful line — *"PDF or TXT · Max 4 MB · A scanned page cannot be read"* — is never announced. `SPEC.md` §15 specifies `aria-describedby="upload-hint"`; it is absent.
- **`MotionConfig` does not exist.** `globals.css:348-350` explicitly claims *"Framer Motion is additionally told about the preference in layout.tsx via `MotionConfig`"*. It is not there (grep: zero occurrences outside that comment). CSS `transition-duration: 0.01ms` cannot reach Framer's JS-driven transforms. Every landing component and `Hallmark`/`Modal`/`Feedback` calls `useReducedMotion()` individually and is therefore safe — but **no component under `components/tool/results/tabs/` does**, nor `AnalyzeTool`. Those animations run regardless of the user's preference.

### Responsive / mobile implementation — 🟡 Partially complete, largely unverified

[FACT] Only **4 of 18** components under `components/tool/` contain any responsive breakpoint: `AnalyzeTool`, `ScorePanel`, `ResultsTabs`, `RewriteTab`. The other 14 — including all seven remaining result tabs, `ChatTab`, `ShareCard`, `HistoryPanel` and `UploadZone` — have none and rely on flex-wrap and intrinsic sizing.

Deliberate mobile provisions that *are* present: the 8-tab list becomes a horizontally scrollable strip below `md` (`ResultsTabs.tsx:61-71`); the results grid collapses from `[320px, 1fr]` to a single column; `Button` sizes are on a 4px rhythm documented as clearing 44px touch targets.

[UNVERIFIED] No viewport was ever rendered. `QA-REPORT.md` §3 lists mobile (375px), tablet (768px) and desktop (1024/1440px) as **still pending manual verification**, blocked by a non-composited Chrome instance. That block was never lifted, and the August redesign added ~2,800 lines of new landing markup *after* that report — so even the desktop verification in QA-REPORT is now stale.

### Error handling — ✅ Complete (server) / 🟡 (client)

[FACT] `lib/errors.ts` enforces one rule absolutely: *the message a user sees and the message a developer sees are different strings*. 10 error codes, each with default user-safe copy and a fixed HTTP status. `AppError.publicMessage` is the **only** field serialised (`lib/api/route.ts:49-58`), so a provider error string cannot escape. `toAppError` collapses unknown throws to `INTERNAL_ERROR`. All three CLAUDE.md-required statuses (400/429/500) are covered, plus 422/502/503/504.

Client: `lib/api/client.ts` is the single fetch door. It correctly handles the case that broke the old code — a platform gateway returning an **HTML** error page, where `response.json()` throws and the user saw "network error" for what was a timeout.

Weak spots: `app/error.tsx` **discards the `error` prop** — a client-side crash is shown to the user and then lost. `useAnalysis` exposes `dismissError` which **no component calls** — the analyze error `Alert` cannot be dismissed.

### Loading states — ✅ Complete
`LoadingOverlay` with 4 steps keyed to **real completion events**, not a timer (`useAnalysis.ts:15-27`). `RewriteTab` has an inline regenerating state. `ChatTab` has a "Thinking…" bubble. `UploadZone` has `aria-busy` + spinner.

### Empty states — ✅ Complete
Every result tab has one, via the shared `EmptyState`: Skills, Keywords, ATS, Salary (scholarship mode), Interview, Cover Letter, Rewrite (with a retry action), History, and the Findings summary ("No requirement is unevidenced.").

### Animations / motion — 🟡 Partially complete
[FACT] Framer Motion in 21 files. Durations and easings come from `MOTION` in `config/design-tokens.ts`. Zero `transition-all`. Named-property transitions throughout. `MOTION.spring` and `MOTION.softSpring` are **both dead** — `softSpring`'s comment says "for the score gauge", which no longer exists. Reduced-motion is honoured per-component on the landing but **not** in the results tabs (see accessibility above). CSS `animate-spin` / `animate-pulse` are used for spinners and skeletons — arguably outside the "Framer only" rule, but the rule says *interactive elements*, and a spinner is not one.

### Design system — ✅ Complete and unusually rigorous

[FACT — `app/globals.css`, 366 lines] Tailwind v4, CSS-first (`@theme`), no `tailwind.config.ts` — and the file explains that one existed and was **silently dead**, because v4 ignores it without an explicit `@config`. Colour is stored as bare HSL channels so any token works at any alpha.

- **Surfaces:** 4-step ramp, each a real lightness increase, so a card inside a card still reads as depth.
- **Text:** 3 steps, each annotated with its **measured** contrast ratio on `--bg` (18.19:1 / 9.98:1 / 6.51:1). The comment records that the previous `--text-subtle` measured 2.66:1 and was being used for counters and footer text.
- **Fill vs text tokens:** `--violet` (3.44:1, surfaces only) vs `--violet-text` (7.94:1, text only). Same pattern for green/amber/red/blue. This is the single best rule in the system.
- **Atmosphere:** four layers — warm key light upper-left, cool fill lower-right, vignette, and `feTurbulence` film grain as a ~300-byte inline data URI to defeat 8-bit gradient banding. The rationale is explicit: a flat `--bg` with one violet radial wash "is the exact signature of a generated AI landing page".
- **Elevation:** two-layer shadows (contact + ambient), because a single blurred shadow reads as a smudge on dark backgrounds.
- **Glass and glow:** consolidated to one blur radius and two glow values, replacing nine ad-hoc values across six components.

### Typography — ✅ Complete
[FACT] Three self-hosted `next/font` faces: **Geist** (sans, UI), **Geist Mono** (data, folios, references, findings), **Instrument Serif** (`--font-display`, editorial emphasis only — explicitly never for UI). A tightened optical scale where larger text gets tighter leading and negative tracking; **nothing renders below 12px**. `--text-hero` is a `clamp(2.5rem, 5.5vw, 4.5rem)`, with the comment recording that 6rem was tried and pushed the CTA below the fold at 1440×900.

### Colours — ✅ Complete (system) / ⚠️ (application; see §6)

### Icons — ✅ Complete
[FACT] Lucide React only. No mixed icon libraries. `optimizePackageImports` rewrites barrel imports so one icon does not pull the whole set. Sizes and strokes largely follow the 14/16/20/32 · 2.25/2/1.75/1.5 rule; the hero registration marks are hand-drawn SVG with an explicit written exemption ("this is artwork rather than an icon").

### Forms — ✅ Complete
`TextareaField` (labelled, live counter, "n more characters needed", shared min/max with the server), `ModeSelector` (`role="radiogroup"`), `UploadZone`, chat input. Client limits import from `lib/analysis/constants` — the file that exists precisely because the JD box once accepted 6,000 characters while the API truncated at 4,000.

### Navigation — ✅ Complete
Sticky navbar whose glass surface fades in via `useTransform(scrollY, [0,80], [0,1])`, written straight to the DOM without a React render. All 3 nav anchors and all 6 footer register entries resolve to real section ids — verified by cross-referencing every `id=` against every `href=` [FACT]. Footer is a colophon rather than a four-column link farm.

### Other meaningful functionality
- **Security headers** (`next.config.ts`): full CSP, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS 2y preload, COOP, CORP. `'unsafe-eval'` is **development-only**. `connect-src 'self'` is the key line: even a successful prompt injection could not exfiltrate a CV from the browser.
- **Structured logging** (`lib/logger.ts`) with two-layer redaction: any key matching `/key|token|secret|password|authorization|cookie|apikey/i`, plus a regex for anything shaped like a Google API key (`\bAIza[0-9A-Za-z_-]{10,}\b`) in message bodies. Single-line JSON in production, readable in dev, stacks suppressed in production.
- **`lib/analysis/ats-tips.ts`** — remediation copy for all 16 check ids across both modes.

---

# 3. CURRENT USER FLOWS (verified from source)

## Flow A — Landing → Analysis (the primary path)

```
GET /
  HeroSection (h1 + registration artwork + "Analyse my CV" → /analyze)
  ProblemSection      #the-filter       folio 02
  HowItWorks          #how-it-works     folio (03-series)
  ResultSection       #the-result       ← worked example: Hallmark 73 + gap fields + margin annotations
  FeaturesSection     #what-you-get
  ScholarshipSection  #scholarships
  ComparisonSection   #how-it-differs
  FounderSection      #who-built-this
  MissionSection      #the-terms        → /privacy
  ClosingSection      #start            → /analyze
        │
        ▼  (navbar CTA, hero CTA, or closing CTA — all → /analyze)
GET /analyze
  sr-only <h1>  +  AnalyzeExperience → AnalyzeTool
  step = 'input'
    ├─ ModeSelector  [Job description | Scholarship criteria]
    ├─ HistoryPanel button ────────────────────────────┐
    ├─ UploadZone (PDF/TXT ≤4MB) → POST /api/upload → fills CV textarea
    ├─ CV textarea      (pre-filled DEMO_CV,  min 100 / max 8000)
    ├─ JD textarea      (pre-filled DEMO_JD,  min  50 / max 6000)
    └─ "Analyse match"  (disabled until both minimums met; title= explains why)
        │
        ▼
  step = 'loading'   LoadingOverlay, 4 steps keyed to real events
        POST /api/analyze                       ← must succeed
        POST /api/rewrite ┐ allSettled          ← may fail alone
        POST /api/cover-letter ┘                ← may fail alone
        addToHistory(session)
        │
        ▼
  step = 'results'   grid [320px | 1fr]
    LEFT  ScorePanel (sticky lg:top-20)
          ├─ Hallmark: struck 73, "MATCH / GOOD", reference line
          ├─ Findings: up to 3, unranked, unpadded          (Summary)
          └─ New analysis · Share Result · Download report
    RIGHT ResultsTabs — 8 tabs, default 'skills'
          Skills Gap · CV Rewrite · ATS Check · Keywords ·
          Salary · Interview Q · Cover Letter · Chat CV
```

## Flow B — Restore from history
`HistoryPanel` → open (reads localStorage on open, not on mount) → row → `restoreSession()` → `step='results'` with the stored session. Chat, rewrite and cover letter all replay from stored `cvText`/`jdText`.
⚠️ **No scroll reset on restore.** `AnalyzeExperience` replaced `HomeExperience`, which owned the `scrollIntoView` call; nothing took over. A user who scrolled down before opening History lands mid-page in the results. [INFERRED — no scroll handling exists anywhere in the current tool tree]

## Flow C — Share
`ShareCard` → Modal → `requestAnimationFrame` → `drawShareCard(canvas, session)` → Download PNG **or** Copy Image (falls back to copying the page URL).

## Flow D — Export
`Download report` → `buildReport(session)` → `careerlens-{slug}.txt` blob download.

## Flow E — Retry a failed enhancement
`RewriteTab` with `rewrite === null` → EmptyState with a **Generate** action → `POST /api/rewrite` → local state update.
⚠️ **Asymmetry:** `CoverLetterTab` has **no retry**. Its empty state says "Start a new analysis to try again" — which costs the user a full three-call analysis to recover one failed call. `useAnalysis` even exports `updateCoverLetter`, and **nothing calls it**.

## Flows that do NOT exist
- 🔴 `/#analyze` deep links (documented as a knowingly accepted break in `SPEC.md` §6 Screen 1b)
- 🔴 Upskilling roadmap (`SPEC.md` §31, FR-15)
- 🔴 Clickable missing-skill tags with learning-path tooltips (`SPEC.md` FR-06)
- 🔴 Any analytics or event tracking (`SPEC.md` §39)
- 🔴 Chat history persistence across a restore

---

# 4. CURRENT ROUTES

| Route | Purpose | State | Important components | Known issues |
|---|---|---|---|---|
| `/` | Landing / conversion | ✅ Static, redesigned | `HeroSection`, `RegistrationField`, `ProblemSection`, `HowItWorks`, `ResultSection`, `FeaturesSection`, `ScholarshipSection`, `ComparisonSection`, `FounderSection`, `MissionSection`, `ClosingSection`, `Section` | `ComparisonSection` uses `py-5` ×3 — **illegal spacing step** in both CLAUDE.md files. Markets a results design (`ResultSection`) that `/analyze` does not deliver. |
| `/analyze` | The application | 🟡 Static shell, functional, **not yet redesigned** | `AnalyzeExperience`, `AnalyzeTool`, `ModeSelector`, `UploadZone`, `TextareaField`, `LoadingOverlay`, `ScorePanel`, `Hallmark`, `ResultsTabs` + 8 tabs, `HistoryPanel`, `ShareCard` | `h1` is `sr-only` — no designed page header. Tab *contents* pre-redesign. No scroll reset on results/restore. `Hallmark` has no accessible text. |
| `/privacy` | Privacy policy | ✅ Static, accurate | `Container`, `Card` | **Nested `<main>`**. "Last updated: July 2026" — will drift. |
| `/_not-found` | 404 | ⚠️ Renders | `Card`, `Container` | **No `metadata` export → default `<title>`**. Nested `<main>`. |
| *(error boundary)* | Client crash recovery | ⚠️ Renders | `Card`, `Button` | **`error` prop ignored — nothing logged, no `digest` surfaced**. Nested `<main>`. Never runtime-verified (QA §2). |
| `POST /api/analyze` | Score + gaps + ATS + keywords + salary + interview | ✅ Complete | `createApiRoute`, `generateJson`, `ANALYSIS_SCHEMA` | Returns 4 fields the UI never renders (§5) |
| `POST /api/rewrite` | 5 index-aligned bullet rewrites | ✅ Complete | `REWRITE_SCHEMA`, `normalizeRewriteResult` | — |
| `POST /api/cover-letter` | 3-paragraph letter, 250–300 words | ✅ Complete | `generateText` | No client retry path |
| `POST /api/chat` | 2–3 sentence grounded answer | ✅ Complete | `getChatPrompt` | Context trimmed to 3000/1500 chars per turn (deliberate) |
| `POST /api/upload` | PDF/TXT → text | ✅ Complete | `extractTextFromPdf`, `sanitizeText` | PDF path **never runtime-verified** (QA §2) |
| `GET /api/health` | Readiness probe | ⚠️ Complete but misleading | `getProvider()` | **Reports `ready: true` for a syntactically-present but invalid key.** See §10. |

---

# 5. CURRENT API / BACKEND

## Endpoints and schemas

**Envelope** (`lib/api/contract.ts`) — shared by both sides, so a change is a compile error:
```ts
{ success: true,  data: T }
{ success: false, error: ErrorCode, message: string, requestId: string, retryAfter?: number }
```

| Endpoint | Request | Response `data` | Timeout | Rate limit |
|---|---|---|---|---|
| `POST /api/analyze` | `{ cvText, jdText, mode }` | `AnalysisResult` | 45s | `ai` bucket |
| `POST /api/rewrite` | `{ cvText, jdText }` | `RewriteResult` | 45s | `ai` bucket |
| `POST /api/cover-letter` | `{ cvText, jdText }` | `{ coverLetter }` | 45s | `ai` bucket |
| `POST /api/chat` | `{ message, cvText, jdText, score, verdict, missingSkills }` | `{ reply }` | 20s | `ai` bucket |
| `POST /api/upload` | `multipart/form-data` `file` | `{ text, wordCount, charCount }` | 25s | `upload` bucket |
| `GET /api/health` | — | `{ status, ready, timestamp }` | — | none |

`maxDuration = 60` is a **literal** in each AI route, with a comment explaining it cannot be imported (Next only statically analyses literal segment configs) and must be kept in step with `AI_TIMEOUT_MS` by hand. This is a real, documented, unavoidable coupling.

## Validation
`lib/validators.ts` — `sanitizeText` strips control characters, **zero-width and bidi-override characters** (invisible to the user, fully visible to the model — a natural hiding place for injected instructions), and HTML tags via `/<\/?[a-zA-Z][^>]*>/g`. That pattern requires a letter or `/` after `<` specifically so that `"reduced latency <100ms"` survives — the previous `<[^>]*>` deleted the exact quantified achievements the tool exists to surface. Unicode letters are preserved for accented and non-Latin names. Length is checked **after** sanitisation, and the error names the field.

`lib/analysis/guards.ts` — every field the UI dereferences is validated at the boundary, so no component needs a defensive `?.`. `normalizeAnalysisResult` clamps scores to 0–100 integers and drops empty strings from tag lists.

## Guards
Rate limiting (`lib/rate-limit.ts`): one **shared** `ai` bucket at 15/min across all four AI endpoints (because one analysis fans out to three calls, so per-endpoint limits would let a user issue 3× the intended load), and a separate `upload` bucket at 20/min. Fixed-window, module-level `Map`, with an opportunistic sweep above 500 keys. **The per-instance limitation is stated honestly in the module docblock**, along with why Redis was rejected. `RateLimitStore` exists as the seam for adopting a shared backend later.

## AI provider / model / prompts
Google Gemini `gemini-2.5-flash` — see §2.

## Error handling
See §2. The critical property: `lib/api/route.ts:49-58` is the single place a failure body is constructed, and it serialises only `publicMessage`. `detail` and `cause` are structurally unable to reach the client.

## Environment variables

| Variable | Read by | Status |
|---|---|---|
| `GOOGLE_API_KEY` | `lib/env.ts` | **Required.** Present in shell but **INVALID** (§10) |
| `GEMINI_API_KEY` | `lib/env.ts` | Accepted legacy alias |
| `GOOGLE_MODEL` | `lib/env.ts` | Optional, defaults `gemini-2.5-flash` |
| `AI_PROVIDER` | `lib/env.ts` | Optional, defaults `google` |
| `NEXT_PUBLIC_SITE_URL` | `lib/env.ts` → `getSiteUrl()` | ⚠️ **Documented in `.env.example` but has no effect** — `getSiteUrl()` is never called |
| `NEXT_PUBLIC_APP_URL` | *nothing* | 🔴 In `.env.local`, read by no code |
| `NEXT_PUBLIC_APP_NAME` | *nothing* | 🔴 In `.env.local`, read by no code |
| `RATE_LIMIT_PER_MINUTE` | *nothing* | 🔴 In `.env.local`, read by no code — limits are hardcoded |
| `RATE_LIMIT_PER_HOUR` | *nothing* | 🔴 In `.env.local`, read by no code — **and no hourly cap exists at all** |

## Health checks
`GET /api/health` calls `getProvider()`, which checks only that a non-empty key string exists. The docblock defends this: *"a health check that consumes model quota is a health check that causes outages."* The reasoning is sound; the consequence is that the probe is **structurally incapable of detecting the exact failure this deployment currently has**.

## Logging
See §2. One record per request carrying the `requestId` the client also receives — genuinely useful for support.

## Security concerns
1. **[Medium]** Rate limiting is per-instance; on N serverless instances the real ceiling is N × 15/min. Documented and accepted.
2. **[Medium]** No hourly cap. `SPEC.md` §12 specifies "max 10 analysis requests per IP per hour" — not implemented. Against a free Gemini quota this is the realistic abuse vector.
3. **[Low]** `x-forwarded-for` is spoofable in general; the module documents that the target platform rewrites it at the edge.
4. **[Low]** CSP requires `'unsafe-inline'` for `script-src`. A nonce via middleware is named as the follow-up.
5. **[Informational]** `.env.local` exists on disk and is correctly gitignored [FACT].

## API fields returned but NO LONGER USED by the UI

This is the specific question asked, and the answer is precise. Every field below is **required by `ANALYSIS_SCHEMA`**, **validated as mandatory by `isAnalysisResult`**, generated on every call, and consumes tokens and latency.

| Field | Rendered in the app UI? | Only remaining consumer |
|---|---|---|
| `verdict_note` | ❌ **Nowhere at all** | None. Validated by `guards.ts:58` and then discarded. **Fully dead.** |
| `skills_score` | ❌ | `lib/share-card.ts:41` (canvas only) |
| `experience_score` | ❌ | `lib/share-card.ts:42` (canvas only) |
| `education_score` | ❌ | `lib/share-card.ts:43` (canvas only) |
| `research_score` | ❌ | `lib/share-card.ts:36` (canvas only) |
| `leadership_score` | ❌ | `lib/share-card.ts:37` (canvas only) |
| `academic_score` | ❌ | `lib/share-card.ts:38` (canvas only) |
| `verdict` | ❌ not rendered on screen | `share-card.ts:93` (pill), `ShareCard.tsx:86` (aria-label), `export.ts:32`, `ChatTab.tsx:59` (sent to chat API) |

The `Hallmark` derives its band **from the score** via its own `BAND_RANGES`, so `verdict` is not needed for display. **Six sub-scores and one prose sentence are generated on every analysis to feed one canvas that renders a design the product has abandoned.**

## Technical debt (backend + shared)

| Item | Detail |
|---|---|
| **Three parallel band tables** | `lib/scoring.ts` `BANDS` (colour + verdict) · `lib/analysis/constants.ts` `SCORE_BANDS` (**entirely unused** — grep confirms only its own definition) · `components/ui/Hallmark.tsx` `BAND_RANGES` (word only). Same thresholds, three declarations, two vocabularies. |
| **Two score vocabularies** | `"Good Match"` (model, share card, export, chat context, aria-label) vs `"GOOD"` (Hallmark, history row). A screen-reader user hears both. |
| Dead exports in `lib/scoring.ts` | `getScoreColorVar`, `getScoreTextColorVar`, `getScoreVerdict` — none called in `src/`. **Two of them have passing unit tests**, so the suite pins dead code. |
| Dead exports in `components/ui/Feedback.tsx` | `ProgressBar`, `LabelledMeter`, `Skeleton` — all orphaned when `BreakdownBars` and `DemoPreview` were deleted. `LabelledMeter`'s own docblock still references both. |
| Dead exports in `components/ui/Card.tsx` | `CardHeader`, `Divider` — never used. |
| Dead export in `components/ui/Button.tsx` | `LinkButton` — never used; both potential call sites document why they use `next/link` instead. |
| Dead motion tokens | `MOTION.spring`, `MOTION.softSpring` (comment: "for the score gauge"). |
| Stale token comments | `--text-display` says "reserved for the score gauge numeral" — it is used by the 404 numeral. `--glow-violet` says "permitted only on the primary button and the active tab pill" — the tab pill no longer glows. |
| Dead hook return | `useAnalysis.dismissError` and `useAnalysis.updateCoverLetter` — neither is called. |
| Dead env function | `lib/env.ts:53 getSiteUrl()` — never called; `layout.tsx:36` hardcodes `https://careerlens.vercel.app`. |
| Dead config | `site.ts` `SITE.description`, `SITE.shortDescription`, `SITE.locale`, `SEO_KEYWORDS` — all unused; `layout.tsx` re-declares its own description and keyword list inline, which is exactly the duplication `site.ts`'s docblock claims to have eliminated. |
| Stale `.env.local` | 4 of its 5 variables are read by nothing. |

---

# 6. CURRENT DESIGN / UX STATE

[INFERRED throughout — reconstructed from source; no page was rendered]

## The central problem: the product contains two different design languages

The August redesign was **completed on `/` and on the results *chrome*, and never reached the results *contents*, the input form, or the share card.** The seam is not subtle.

| Surface | Language | Vocabulary |
|---|---|---|
| Landing (all 10 sections) | **New — editorial/assay** | folios, running heads, head rules, mono references, colophon, gap fields, margin annotations |
| `ScorePanel` / `Hallmark` | **New** | struck figure, band as a word, no colour, reference line |
| `Tabs` bar, `ModeSelector`, `HistoryPanel` row, `UploadZone` | **New** | selection by depth (`inset` shadow), solid hairlines, mono metadata |
| **All 8 tab contents** | **Old — status-dashboard** | green/red/amber pills, tinted cards, `(count)` in headings, violet "AI-Optimised" panel |
| **`AnalyzeTool` input form** | **Old** | plain `Card`, generic layout |
| **Share card PNG** | **Old** | radial ring dial, colour-by-band numeral, coloured verdict pill, three coloured bars, green chips |

**A user's actual sequence is: new → new → old → old.** They land on an editorial argument, click through to a form in the old language, get a struck unpainted hallmark, then click the very first tab and are shown their missing skills as **red pills** — the precise thing `ScorePanel.tsx:26-28` says the product does not do. Then they click Share and get a PNG containing the ring gauge and the band colours that were deleted for stated ethical reasons.

## Visual hierarchy
Landing: strong and deliberate — one display-tier string per page (`--text-hero`), `SectionHeading` sized below it, `SectionLede` capped at 55ch, folio as the quiet closer. `/analyze`: weak — the `h1` is `sr-only`, so the page opens with no title at all; the first visible element is a mode toggle. On results, the `Hallmark` is the only strong anchor.

## Typography
Consistent and well-reasoned (§2). One inconsistency: the results tabs are entirely `--font-sans`, while the redesigned surfaces use `--font-mono` for all metadata, references and findings. The mono register is a signature of the new language and is absent from 8 of 11 result surfaces.

## Spacing
Governed by a deliberately sparse scale. **Compliance is high but not total** [FACT]:
- `ComparisonSection.tsx:131,140,144` use `py-5` — **`5` is explicitly banned by both CLAUDE.md files**, and `careerlens/CLAUDE.md` singles it out as "the value most often reached for by mistake."
- `ChatTab` uses `2.5` — **legal**, under the message-bubble exception.
- `Navbar` uses `h-18` (72px), which is a *height* not layout spacing, so arguably out of scope — but it produces a numeric inconsistency: `globals.css:234` says the header "settles at 60px", `scroll-padding-top` is `6rem` (96px), and `ScorePanel` sticks at `lg:top-20` (80px). **Four different numbers describing one bar.**

## Layout
Landing: single column, `max-w-6xl`, alternating `raised` grounds, rules at section boundaries. Results: `[320px | 1fr]` collapsing to one column, left panel `lg:sticky lg:top-20`. Input form: two columns on `lg`, with the Analyze button in the **right** column only — QA-REPORT §4 flagged this as "Analyze button spans only the right half of the card", and `AnalyzeTool.tsx:114-128` confirms it is unchanged.

## Information density
Landing: low and confident. Results: **high and undifferentiated** — 8 equal-weight tabs with no indication of which matters. The tab bar carries an optional `badge` field in its type that **no tab uses**, so counts that would help a user prioritise are available in the API and shown nowhere.

## Cards
`components/ui/Card.tsx` with 3 elevations — genuinely consolidated. But the redesigned surfaces have largely **stopped using `Card`** in favour of hairline rules and bare grounds, while the tabs still wrap everything in `<Card className="p-6">`. The primitive is drifting out of the new language without being retired.

## Buttons
One implementation, four variants, three sizes, `active:scale-[0.98]` with `motion-reduce:active:scale-100`, disabled styling declared once. The `primary` variant carries `--glow-violet` — the last surviving glow, now inconsistent with a system whose stated rule is that state is expressed by depth.

## Forms
Good. Live counters, shared limits, associated hints, min-length guidance.

## Tabs
The bar is excellent. `ResultsTabs` renders 8 tabs; the `badge` affordance is unused; the panel is wrapped in a `Card` while the bar is not.

## Tables
One only: `ComparisonSection`. Carries the illegal `py-5`.

## Badges
`Badge` (5 variants) and `Tag` (4 variants). Both are **colour-first**. `Tag variant="missing"` is red. This is used for missing skills and missing keywords — the two lists most likely to be long for a struggling applicant.

## Score presentation
Redesigned and coherent **in the app**: `Hallmark` — struck plate, `bg/0.6`, band-keyed `inset` shadow depth, `tabular` numeral at `text-5xl`, `MATCH / {BAND}` in mono, reference line beneath. Compact variant defined for registers. The depth cue carries **nothing** to assistive technology, and the docblock says so explicitly, which is the correct instinct — except the band word it relies on has no accessible sentence around it.

**Fossilised elsewhere:** the share-card canvas still draws the ring dial, the colour-by-band numeral, the coloured verdict pill and the three bars.

## Colours
System excellent, application inconsistent (see above).

## Animations
Consistent tokens, composited properties, reduced-motion honoured on the landing. `MotionConfig` is claimed in a comment and does not exist; the results tabs animate unconditionally.

## Accessibility
See §2. Strong primitives, one significant gap on the primary score, three nested-`<main>` violations, no skip link.

## Mobile behaviour
Thin. 14 of 18 tool components have no breakpoints at all. Never visually verified at any width.

## Inconsistencies between parts of the product — summary

1. Landing (new) vs `/analyze` (old) — the largest.
2. `ScorePanel` (no colour) vs `SkillsTab`/`KeywordsTab` (red/green/amber) — a **doctrinal contradiction**, not a style drift.
3. `Hallmark` band word vs `verdict` string — two vocabularies for one concept.
4. In-app score (struck, uncoloured) vs shared PNG (ring, coloured) — the artefact the user *publishes* contradicts the product.
5. `ResultSection` markets gap fields and margin annotations that `/analyze` does not implement.
6. `HistoryPanel` has `sr-only` score text; `Hallmark` does not.
7. `RewriteTab` has a retry; `CoverLetterTab` does not.
8. Mono metadata register present on redesigned surfaces, absent from tab contents.
9. Four different numbers for the navbar height.

---

# 7. DESIGN BIBLE / PRODUCT RULES

## Finding: there is no Design Bible in this repository.

[FACT] Exhaustive search of every tracked and untracked file (excluding `node_modules`, `.next`, `.git`) for `Design Bible`, `Volume I/II/III`, `Chapter N`, `precedence`, `prohibition`, and `vocabulary` returned **two hits, both incidental**, both in `QA-REPORT.md` and both using "precedence" to mean *environment-variable precedence*.

There are **no** Volume I/II/III documents, no chapter files, no `docs/` directory, and no design-rules file of any kind. `README.md` at the repository root is **0 bytes**.

The next agent must not assume a Design Bible exists elsewhere. **If one does exist outside this repository, it is not available here, and every design decision below was reconstructed from source comments.**

## What actually governs design, in precedence order

1. **`careerlens/CLAUDE.md`** — nearest to the code; should win.
2. **`CLAUDE.md`** (repo root) — an older sibling that **conflicts** (see below).
3. **`SPEC.md` §9 Design System** — pre-redesign; conflicts with the shipped tokens.
4. **Source docblocks** — in practice the most authoritative and most current statement of design intent in the project.

## Rules currently IMPLEMENTED in code [FACT]

| Rule | Source | Verification |
|---|---|---|
| Colours from CSS variables only; no hex in components | both CLAUDE.md | ✅ grep: zero `#rrggbb` in `components/` or `app/` |
| Fill tokens for surfaces, `-text` siblings for text | root CLAUDE.md | ✅ Held throughout; contrast ratios documented in `globals.css` |
| Never `transition-all` | root CLAUDE.md | ✅ grep: zero occurrences |
| Framer durations/easings from `MOTION` | root CLAUDE.md | ✅ Held |
| Icons via Lucide only | both | ✅ Held (hero SVG has a written exemption) |
| All prompts in `lib/prompts.ts` | both | ✅ Held |
| All AI calls through `lib/ai/` | both | ✅ Held |
| All localStorage through `lib/history.ts` | both | ✅ Held |
| All client→server calls through `lib/api/client.ts` | root CLAUDE.md | ✅ Held — no raw `fetch` outside it |
| Model never called from a client component | both | ✅ Held |
| Zero `any` | both | ✅ grep + `tsc` |
| No `console.log` | both | ✅ Only `logger.ts`, with a written justification |
| 400/429/500 on every API route | both | ✅ Held, plus 422/502/503/504 |
| `/` and `/analyze` are separate routes | careerlens CLAUDE.md | ✅ Held |
| No new dependency without asking | both | ✅ 6 prod deps; 9 were removed in an earlier pass |
| **Selection expressed by depth, never colour** | source docblocks | 🟡 Held in `Tabs`, `ModeSelector`, `HistoryPanel`, `Hallmark` — **violated** by `Tag`, `Badge`, `Button.primary` glow |
| **Never paint a person red** | `ScorePanel.tsx:26-28` | 🔴 **Violated** by `Tag variant="missing"`, `Badge variant="fail"`, and the share card |
| Findings never padded / ranked / silently empty | `KeyActions.tsx` | ✅ Held |
| A band never appears without its reference | `format.ts:47-53` | ✅ Held in `Hallmark`; ⚠️ `HistoryPanel` shows a bare band word (arguably its row *is* the reference) |
| Dates: day + full month + year, never numeric, never a time | `format.ts:25-34` | 🟡 Held in `formatDate`; **`export.ts:33` bypasses it** with `toLocaleDateString('en-GB')` |
| Mode named identically everywhere via `MODE_LABEL` | `ModeSelector.tsx:15-17` | ✅ Held |
| Nothing renders below 12px | `globals.css:164-166` | 🟡 `Hallmark` compact uses `text-[0.6875rem]` = **11px** |

## Rules VIOLATED

1. **🔴 "A product that assesses people does not get to paint them red."** — `Tag variant="missing"` renders every missing skill and missing keyword in red; `Badge variant="fail"` colours ATS failures; the share card paints the whole score by band. This is the deepest inconsistency in the product: the doctrine is stated in the file that governs the score, and contradicted in the very first tab the user sees.
2. **🔴 Layout spacing scale** — `ComparisonSection.tsx` × 3 `py-5`.
3. **🟡 "Nothing renders below 12px"** — `Hallmark` compact label at 11px.
4. **🟡 "Every exported artefact" uses `formatDate`** — `export.ts` does not.
5. **🟡 `site.ts` as the single source for site copy** — `layout.tsx` re-declares description and keywords inline.

## Rules stated in documentation but NOT IMPLEMENTED

1. **`MotionConfig` in `layout.tsx`** — claimed by `globals.css:348-350`, does not exist. **This is a documentation lie with an accessibility consequence.**
2. **`getSiteUrl()` for canonical URLs, OG images, sitemap, robots** — claimed by `env.ts:48-52`; the function is never called and neither `sitemap.ts` nor `robots.ts` exists.
3. **`SPEC.md` §15**: score reads as "Match score: 73 out of 100. Good Match." — not implemented on `Hallmark`.
4. **`SPEC.md` §15**: upload zone `aria-describedby="upload-hint"` — not implemented.
5. **`SPEC.md` §26**: sitemap, robots, JSON-LD — none implemented.
6. **`SPEC.md` §12**: `GET /api/share`, hourly rate cap — neither implemented.
7. **`SPEC.md` §31/§36/§37/§39**: upskilling roadmap, feature flags, skeleton system, analytics — none implemented.

## Rules whose implementation CANNOT BE VERIFIED here

- All WCAG contrast claims in `globals.css` (they are asserted in comments; no automated contrast check runs in CI). [UNVERIFIED]
- 44px touch targets — asserted in `Button.tsx`; never measured. [UNVERIFIED]
- `prefers-reduced-motion` branches — QA-REPORT §2 records the test machine reported `false`. [UNVERIFIED]
- Focus ring visibility against every surface. [UNVERIFIED]
- All mobile/tablet/desktop layout rules. [UNVERIFIED]

## DIRECT CONFLICT: the two CLAUDE.md files disagree

[FACT] On the one rule most likely to be violated:

| | Excluded from the layout scale |
|---|---|
| `CLAUDE.md` (root) | `2.5, 3.5, 5, 7, 9, 11` |
| `careerlens/CLAUDE.md` | `5, 7, 9, 10, 14` |

These are **different sets**. The root file bans `11` and permits `10` and `14`; the nested file bans `10` and `14` and says nothing about `11`. Both then permit `2.5`/`3.5` for control padding, but only the root file lists them as excluded from layout first.

They also state **different current session tasks** (root: "Day 1-2 project setup"; nested: "Landing redesign, Pass 1 of 4"), and `careerlens/CLAUDE.md` still instructs the reader that `DemoPreview` and `FeatureCards` are "still the pre-redesign design" — **both files were deleted in commit `6d2fc58`** [FACT].

**The next agent must resolve which file governs before touching layout spacing.**

---

# 8. COMPLETED PASSES

There is no `PASSES.md`, no changelog, and no explicit "Pass A / B / C" register. Passes are reconstructed from commit history and from the pass language embedded in `careerlens/CLAUDE.md` and `SPEC.md`.

| Pass | Commit(s) | What changed | Verification | Current state |
|---|---|---|---|---|
| **Scaffold** | `b379950`, `0bae660`, `b335f34`, `a7350c8`, `fa4a84e` (17–19 Jul) | Initial project, components, hooks, API scaffolding | none recorded | Superseded |
| **Production polish** | `896b4bd` (29 Jul) | pdf-parse v2 dynamic import; `sanitizeText` Unicode fix; shared rate limiting; chat route + `ChatTab`; `HistoryPanel`; `ShareCard` canvas; ATS tips for all 16 ids; Escape handlers; SEO metadata + privacy page; hero; feature cards; **9 unused deps removed**; dead code removed | "0 TS errors, 0 ESLint warnings, clean build" (commit body) | Mostly superseded; deps and security stand |
| **Validation audit** | `178fd34` (30 Jul) | Prompt-injection defences; 500-char chat cap; **broken DOCX upload removed**; rewrite type guard; stronger `isAnalysisResult`; focus trap; `role="dialog"`/`aria-modal`; label association; `useId` for SVG filters; rate-limiter cleanup | claimed in commit body | ✅ Stands |
| **Design-system pass** | `0a05213` (30 Jul) | `hsl(var(--))` everywhere; `var(--radius)` everywhere; entrance animations | claimed | ✅ Stands |
| **Premium polish** | `e318964` (30 Jul) | Shadow system; typography hierarchy; chat redesign; contained loading overlay; standardised inputs; `active:scale`; dead CSS removed. 23 files | claimed | Partly superseded |
| **Architecture consolidation** | `05cd409`, `91c8afd`, `f80452d` (30–31 Jul) | `lib/ai/` provider abstraction; `createApiRoute`; `lib/api/contract.ts` + `client.ts`; `lib/errors.ts`; `lib/logger.ts`; scoring; guards; schemas | **QA-REPORT.md**: `tsc` 0 · eslint clean · **95/95 tests** · `next build` passes | ✅ **Stands. The strongest layer in the project.** |
| **QA + fixes** | `f80452d` (31 Jul) | C1 history data loss (+11 regression tests); H1 privacy policy corrected to name Gemini; H2 env precedence proven; H4 structural; navbar links; CSP dev/prod scoping | **QA-REPORT.md §1** — extensive live-DOM and screenshot verification | ✅ Stands. **But the report describes a UI that no longer exists.** |
| **Landing redesign, Passes 1–4** | `6d2fc58` (12 Aug) | Route separation; new `Section` system; 10 new/rewritten landing sections; `RegistrationField` hero artwork; `Hallmark`; **deleted `ScoreGauge`, `BreakdownBars`, `DemoPreview`, `FeatureCards`**; redesigned `Tabs`, `ModeSelector`, `UploadZone`, `HistoryPanel`, `ScorePanel`, `KeyActions`, `Navbar`, `Footer`; `lib/format.ts`; +153 lines of history tests | **No QA report exists for this commit.** Re-verified in this audit: `tsc` 0 · eslint clean · 95/95 · build passes | 🟡 **Landing complete; `/analyze` explicitly deferred** |

## Verification status of HEAD (`6d2fc58`), as re-measured today

| Check | Result |
|---|---|
| TypeScript (`tsc --noEmit`) | ✅ 0 errors [FACT] |
| ESLint (`--max-warnings=0`) | ✅ clean [FACT] |
| Jest | ✅ 7 suites, 95/95 [FACT] |
| Production build | ✅ passes; 4 static + 6 dynamic routes [FACT] |
| Manual/visual verification | 🔴 **None since 31 July** — i.e. never for the current design |
| Accessibility verification | 🔴 **None since 31 July** — and `Hallmark`, the component that replaced the audited `ScoreGauge`, has never been audited |
| End-to-end AI flow | 🔴 **Never** — blocked by the invalid key since before 31 July |

**The headline for the next agent: the current design has passed every automated gate and has never been looked at by a human or a browser.**

---

# 9. KNOWN PROBLEMS

## A. Critical

| # | Problem | Evidence |
|---|---|---|
| A1 | **`GOOGLE_API_KEY` is invalid.** Live call returns `400 API_KEY_INVALID`. The entire product — every feature except the landing page — is non-functional. `.env.local` declares the variable **empty**; the shell exports an invalid 39-char value which takes precedence. | [FACT] live `curl` |
| A2 | **The share card renders the design the product deleted for ethical reasons.** Ring dial, colour-by-band numeral, coloured verdict pill, three breakdown bars, green chips. This is the artefact users **publish to LinkedIn** — the viral loop — so the abandoned design is the *most publicly visible* version of the product. | [FACT] `lib/share-card.ts` |
| A3 | **`/analyze` results contents contradict the product's stated doctrine.** The first tab renders missing skills as red pills, in a product whose score component states in source that it does not paint people red. | [FACT] `SkillsTab.tsx` + `Badge.tsx` vs `ScorePanel.tsx:26-28` |
| A4 | **The landing page markets a results design that does not exist.** `ResultSection` promises "Every requirement, marked against your own words", with gap fields and margin annotations. `/analyze` delivers eight tabs of coloured chips. | [FACT] `ResultSection.tsx` vs `components/tool/results/tabs/` |

## B. High priority

| # | Problem |
|---|---|
| B1 | **`Hallmark` has no accessible text.** Primary score reads as three disconnected fragments. Violates `SPEC.md` §15. The history row already does it correctly — the pattern exists and was not applied. [FACT] |
| B2 | **`MotionConfig` is claimed in `globals.css` and does not exist.** Results-tab animations ignore `prefers-reduced-motion`. [FACT] |
| B3 | **`/api/health` reports `ready: true` with an invalid key** — the exact failure this deployment has. [FACT] |
| B4 | **`app/error.tsx` discards the `error` prop.** Client crashes are shown and lost; no `digest` surfaced for support. [FACT] |
| B5 | **`QA-REPORT.md` is dated 31 July and documents a deleted UI** — score gauge, verdict note, breakdown meters, demo preview card, feature cards, `HomeExperience.tsx`, and nav hrefs `/#demo-preview` and `/#analyze` that no longer exist. A new agent reading it will act on false information. [FACT] |
| B6 | **Both CLAUDE.md files are stale and mutually contradictory** (§7). `careerlens/CLAUDE.md` still describes deleted components as current. [FACT] |
| B7 | **`SPEC.md` §FR-05, §FR-06, §FR-13, §5 and §6 still specify the deleted design** — animated gauge, colour-coded verdict, three sub-score bars, colour-coded history scores, "Score gauge animates in / Breakdown bars animate in". The redesign amended §1 and added §6 Screen 1b, and left the rest. [FACT] |
| B8 | **No scroll reset on results or restore.** `HomeExperience` owned it; `AnalyzeExperience` did not inherit it. [INFERRED] |
| B9 | **Nested `<main>` on `/privacy`, `/404`, and the error boundary.** [FACT] |
| B10 | **No hourly rate cap.** `SPEC.md` specifies 10/hour. Against a free quota this is the realistic abuse vector. [FACT] |

## C. Medium priority

| # | Problem |
|---|---|
| C1 | Six sub-scores + `verdict_note` generated on every call and rendered nowhere (§5). Token and latency cost with no user-visible return. [FACT] |
| C2 | Three parallel band tables, two score vocabularies. [FACT] |
| C3 | `CoverLetterTab` has no retry, though `updateCoverLetter` exists and is unused. [FACT] |
| C4 | 404 page has no `metadata` export → default `<title>`. [FACT] |
| C5 | No `sitemap.ts`, no `robots.ts`, no JSON-LD. `SPEC.md` §26 requires all three. [FACT] |
| C6 | `getSiteUrl()` dead; `layout.tsx` hardcodes the origin; `NEXT_PUBLIC_SITE_URL` has no effect on any preview deploy. [FACT] |
| C7 | Score numeral / gauge collision, sticky panel taller than the viewport, share dialog taller than the viewport (QA §4). The gauge is gone so the first is void; the other two are **unverified against the new layout**. [UNVERIFIED] |
| C8 | Upload zone is a `div[role="button"]` whose `aria-label` suppresses its own guidance text. [FACT] |
| C9 | Analyze button occupies only the right column. [FACT] |
| C10 | The two form columns do not align (QA §4); `UploadZone` + `rows={7}` vs `rows={9}` + button. [INFERRED] |
| C11 | Test suite pins **dead** functions (`getScoreColorVar`, `getScoreVerdict`). [FACT] |
| C12 | No tests for: any API route, any component, any prompt builder, `lib/format.ts`, `lib/export.ts`, `lib/share-card.ts`. `SPEC.md` §41 mandates integration + component + E2E layers with 70/80/80 coverage thresholds; `jest.config.ts` documents the deliberate narrowing. [FACT] |

## D. Low priority

- `Tip:` in `InterviewTab` uses `text-text-muted`, the weakest token (QA §4 low). [FACT]
- Ragged empty space on short tabs (QA §4). [UNVERIFIED]
- Tab pills shifting ~2px on selection — **likely void**, the pill design was replaced. [UNVERIFIED]
- `Hallmark` compact label at 11px, below the stated floor. [FACT]
- Privacy page "Last updated: July 2026" is manual and will drift. [FACT]
- Root `README.md` is **0 bytes** — `SPEC.md` §30 specifies a full README, and the "Scholarship Reviewer" persona is documented as someone who *reads the GitHub README*. [FACT]

## E. Technical debt
Full list in §5. Summary: 12 dead exports across `lib/scoring.ts`, `components/ui/Feedback.tsx`, `components/ui/Card.tsx`, `components/ui/Button.tsx`; 2 dead motion tokens; 2 dead hook returns; 1 dead env function; 4 dead `site.ts` exports; 4 unread `.env.local` variables; 3 stale token comments; the `maxDuration` literal that must be hand-synced with `AI_TIMEOUT_MS`; `SPEC.md` containing duplicate sections (§24 and §34 are both "Environment & Configuration"; §23 and §35 are both "CLAUDE.md"; `tailwind.config.ts` is specified twice **and is dead under Tailwind v4**).

## F. Product / UX concerns
- **The product has no opinion about which of the 8 tabs matters.** All equal weight; the `badge` count affordance exists in the type and is unused.
- **The score is the product's most sensitive artefact and it is not explained.** `verdict_note` was removed for good reasons and nothing replaced it. The reference line says *what* was measured, never *how*.
- **Scholarship Mode — the stated differentiator — is a mode toggle, not a distinct experience.** It reuses the job-mode results tree wholesale (`SkillsTab` relabels two groups; `SalaryTab` shows an empty state), and its distinctive axes (`research_score`, `leadership_score`, `academic_score`) appear **only on the share card**.
- **Findings render in `text-amber-text`** regardless of content — colour applied to all findings equally, in tension with the no-colour doctrine.
- **`SPEC.md` Goal #2 is "Get numbers — measurable analytics to quote in scholarship SOP"**, and `SPEC.md` §39 specifies a full analytics event list. **No analytics exist, and the privacy policy affirmatively promises none.** These cannot all be true. This is a genuine unresolved product decision, not an oversight to code around.

## G. Design inconsistencies
The nine listed at the end of §6.

## H. Accessibility concerns
B1, B2, B9, C8; no skip link; `Hallmark` 11px compact label; `Tag`/`Badge` colour-first (mitigated — each is paired with a text heading and the borders differ, per `Badge.tsx:12-17`); reduced-motion unenforced in results tabs; all contrast claims unverified by any automated check.

## I. Mobile / responsive concerns
14 of 18 tool components have no breakpoints. Never rendered at any viewport. QA-REPORT items P3/P4/P5 remain open and are now **stale on top of being open**, because ~2,800 lines of landing markup landed after they were written. The `ShareCard` dialog at `max-w-2xl` with a 1200×630 canvas, and `HistoryPanel` rows with hover-revealed delete buttons, are the two most likely mobile failures. [INFERRED]

## J. API / backend concerns
A1, B3, B10, C1, C6; per-instance rate limiting; no request-body size limit on JSON routes (only the 4 MB file cap); `maxDuration` hand-sync.

## K. Security concerns
Genuinely good posture. Residual: `'unsafe-inline'` in `script-src` (nonce named as follow-up); spoofable `x-forwarded-for` (mitigated by platform edge rewrite); per-instance limits; no hourly cap. **No secret is committed** — `.env.local` is gitignored and absent from `git ls-files` [FACT].

---

# 10. KNOWN EXTERNAL BLOCKERS

## Environment / configuration problems (NOT code problems)

| Blocker | Evidence | Impact | Fix |
|---|---|---|---|
| **`GOOGLE_API_KEY` in the shell is invalid** | Live POST to `generativelanguage.googleapis.com` → `400 API_KEY_INVALID` [FACT] | Blocks every AI feature and all end-to-end verification | Human must obtain a valid key from `aistudio.google.com/apikey` |
| **`.env.local`'s `GOOGLE_API_KEY` is empty, and the shell value wins** | `grep -cE "^GOOGLE_API_KEY=.+" .env.local` → `0`; shell var present, length 39 [FACT]. Precedence independently proven in QA-REPORT §1 H2 | Setting `.env.local` alone **will not fix it** | Unset the shell variable **or** replace it |
| **No composited browser during prior QA** | QA-REPORT §3: `visibilityState === "hidden"`, `requestAnimationFrame` never fired, `window.scrollTo` a no-op, `resize_window` reported success while `innerWidth` stayed 1536 | Blocked all mobile, scroll, and animation verification | Run the manual script in QA-REPORT §3 in a normal visible Chrome window |
| **No PDF fixture** | QA-REPORT §2 | PDF extraction path never exercised | Supply a real PDF and a scanned-image PDF |

## Code problems that merely *look* like blockers

- **`/api/health` returning `ready: true` with an invalid key is a CODE problem**, not a config one. The probe checks presence, not validity, by design (`route.ts:12-16`). The design decision is defensible; the outcome is a probe that cannot detect this deployment's actual failure.
- **`app/error.tsx` never being triggered in QA** was an environment limitation; **`app/error.tsx` discarding the `error` prop is a code problem**.

## Blockers that were RESOLVED but whose documentation still asserts them

- **Modal background scroll lock.** QA-REPORT §4 lists "modal missing background scroll lock" as an open Medium issue, and QA §1 records measuring `body { overflow: visible }` with a dialog open. **The current code implements the lock** in `useFocusTrap.ts:87-96`, with scrollbar-width compensation — and `git show f80452d:...useFocusTrap.ts` confirms it was **already present at the time of the QA report** [FACT]. The measurement and the source disagree; the discrepancy is unexplained and was most likely an artefact of the non-composited automation tab. **Status: implemented in code; needs one real-browser recheck before being called closed.**

---

# 11. REMAINING WORK

The stock eight-phase structure is **not** the right shape for this repository, and the deviation matters. This project is not an unfinished MVP that needs features; it is a **finished MVP with a half-applied redesign, a truth problem in its documentation, and a dead API key.** Phases are re-ordered accordingly, and the redesign is promoted above feature work.

## Phase 0 — Unblock and tell the truth (do first; ~half a day)

| Task | Why it matters | Files | Deps | Risk | Priority |
|---|---|---|---|---|---|
| Replace/unset the invalid `GOOGLE_API_KEY` | **Nothing else can be verified.** Every remaining phase depends on it | shell env, `.env.local` | none | none | **P0** |
| Run the QA-REPORT §3 manual script in a visible browser | The current design has never been seen | — | key | none | **P0** |
| Mark `QA-REPORT.md` as superseded (do not delete — its method is valuable) | It documents a deleted UI and will mislead | `QA-REPORT.md` | none | none | **P0** |
| Reconcile the two CLAUDE.md files; delete or subordinate the root one | Two contradictory spacing scales make every layout edit a coin flip | `CLAUDE.md`, `careerlens/CLAUDE.md` | none | low | **P0** |
| Amend `SPEC.md` §FR-05/FR-06/FR-13/§5/§6 to match the shipped score design | SPEC is declared "source of truth" and currently mandates a deleted gauge | `SPEC.md` | none | low | **P0** |
| Write the root `README.md` | It is **0 bytes**, and a documented persona reads it | `README.md` | none | none | **P0** |

## Phase 1 — Critical fixes

| Task | Why | Files | Deps | Risk | Priority |
|---|---|---|---|---|---|
| **Redraw the share card in the current language** | The abandoned design is the product's most public artefact | `lib/share-card.ts`, `config/design-tokens.ts` | Phase 0 | **Medium** — canvas cannot read CSS vars; the token mirror must be kept in step by hand | **P0** |
| Add accessible text to `Hallmark` | Primary score is unreadable to a screen reader; pattern already exists in `HistoryPanel` | `components/ui/Hallmark.tsx` | none | low | **P0** |
| Add `MotionConfig` to `layout.tsx` **or** delete the false claim in `globals.css` | A comment currently lies about an accessibility feature | `app/layout.tsx`, `app/globals.css` | none | low | **P0** |
| Fix nested `<main>` (×3) | HTML validity + landmark navigation | `privacy/page.tsx`, `not-found.tsx`, `error.tsx` | none | none | P1 |
| Log the `error` prop in `error.tsx`; surface `digest` | Crashes are currently invisible | `app/error.tsx` | none | low | P1 |
| Add `metadata` to `not-found.tsx` | Default `<title>` | `app/not-found.tsx` | none | none | P2 |
| Restore scroll reset on results and restore | Users land mid-page | `AnalyzeTool.tsx` or `AnalyzeExperience.tsx` | none | low | P1 |
| Fix `py-5` ×3 | Explicit rule violation | `ComparisonSection.tsx` | Phase 0 scale decision | none | P2 |

## Phase 2 — Redesign `/analyze` (the largest and most valuable body of work)

The route's own source says a designed header "lands when the analyse route itself is redesigned". That is this phase.

| Task | Why | Files | Deps | Risk | Priority |
|---|---|---|---|---|---|
| **Decide the results information architecture.** Do the eight tabs survive, or does `/analyze` adopt the marked-document + margin-annotation model the landing already sells? | This is the single largest open product question. Every task below depends on the answer | design decision | Phase 1 | **High** | **P0** |
| Retire colour-as-judgement in results: rework `Tag`, `Badge`, `SkillsTab`, `KeywordsTab`, `ATSTab` | Resolves the deepest doctrinal contradiction | `ui/Badge.tsx`, 3 tabs | IA decision | **High** — colour currently carries meaning; a replacement signal is required, not a deletion | **P0** |
| Give `/analyze` a designed page header | Page currently opens with no visible title | `app/analyze/page.tsx`, `AnalyzeTool.tsx` | IA decision | low | P1 |
| Redesign the input form (column alignment, full-width Analyze button) | Two open QA items; first screen of the app | `AnalyzeTool.tsx` | IA decision | low | P1 |
| Bring the mono metadata register into the tabs | 8 of 11 result surfaces are outside the new language | 8 tab files | IA decision | low | P1 |
| Unify score vocabulary: one of `GOOD` / `Good Match` everywhere | Screen readers currently hear both | `Hallmark`, `scoring.ts`, `constants.ts`, `export.ts`, `share-card.ts`, `ChatTab` | IA decision | Medium | P1 |
| Give the scholarship mode a genuinely distinct results view | The stated differentiator is currently a relabel | `SkillsTab`, new components | IA decision | Medium | P2 |

## Phase 3 — API contract cleanup (schedule *after* Phase 2, deliberately)

Doing this first would be a mistake: the redesign may reintroduce a use for the sub-scores.

| Task | Why | Files | Deps | Risk | Priority |
|---|---|---|---|---|---|
| Decide the fate of `verdict_note` + 6 sub-scores | Generated every call, rendered nowhere but the share card | `schemas.ts`, `guards.ts`, `types/index.ts`, `share-card.ts`, `prompts.ts` | **Phase 2 + share-card redesign** | Medium — `isAnalysisResult` requires them; removal must be coordinated | P1 |
| Collapse three band tables into one | Two vocabularies, three declarations | `scoring.ts`, `constants.ts`, `Hallmark.tsx` | Phase 2 vocabulary decision | low | P1 |
| Delete 12 dead exports, 2 motion tokens, 2 hook returns, 4 `site.ts` exports | Dead code with passing tests is worse than dead code | `scoring.ts`, `Feedback.tsx`, `Card.tsx`, `Button.tsx`, `design-tokens.ts`, `useAnalysis.ts`, `site.ts` + tests | Phase 2 (some may return) | low | P2 |
| Wire `getSiteUrl()` into `layout.tsx`; add `sitemap.ts` + `robots.ts` | `NEXT_PUBLIC_SITE_URL` currently does nothing; SPEC §26 unmet | `layout.tsx`, new files | none | low | P1 |
| Clean `.env.local` / `.env.example` of the 4 unread variables | They imply configurability that does not exist | env files | none | none | P2 |
| Add an hourly rate cap | Only real defence for a free quota | `rate-limit.ts` | none | low | P1 |
| Make `/api/health` distinguish "configured" from "working" | Add an opt-in `?deep=1` probe rather than changing the default | `api/health/route.ts` | key | low | P2 |
| Add a `CoverLetterTab` retry using the existing `updateCoverLetter` | Symmetry with `RewriteTab`; saves a 3-call re-run | `CoverLetterTab.tsx`, `ResultsTabs.tsx` | none | low | P1 |

## Phase 4 — Accessibility

| Task | Why | Files | Deps | Risk | Priority |
|---|---|---|---|---|---|
| Skip-to-content link | Absent | `layout.tsx` | none | none | P1 |
| Make `UploadZone` a real `<button>`; add `aria-describedby` | Guidance text is currently suppressed | `UploadZone.tsx` | Phase 2 | low | P1 |
| Reduced-motion guards in results tabs (or rely on `MotionConfig`) | Currently unconditional | 5 tab files | Phase 1 `MotionConfig` | low | P1 |
| Automated contrast + axe check in CI | Every contrast claim is currently an unverified comment | new dev dep — **must be asked for** | Phase 2 | low | P2 |
| Full keyboard + screen-reader pass on the redesigned `/analyze` | `Hallmark` has never been audited | — | Phase 2 | none | P1 |
| Raise `Hallmark` compact label above 12px | Violates the stated floor | `Hallmark.tsx` | none | none | P3 |

## Phase 5 — Mobile / responsive

| Task | Why | Files | Deps | Risk | Priority |
|---|---|---|---|---|---|
| Render and fix 375 / 768 / 1024 / 1440 across **all** routes | Never verified once; 14 tool components have no breakpoints | most of `components/` | Phase 2, visible browser | **High — unknown unknowns** | **P0 for launch** |
| Specifically: `ShareCard` dialog, `HistoryPanel` hover-reveal delete, `ChatTab` input, 8-tab strip | Most likely failures | 4 files | above | Medium | P1 |
| Horizontal-overflow assertion at each width | QA-REPORT supplies the one-liner | — | above | none | P1 |

## Phase 6 — Export / share

| Task | Why | Files | Deps | Risk | Priority |
|---|---|---|---|---|---|
| Share card redesign | Already Phase 1 (A2) | `share-card.ts` | Phase 1 | Medium | P0 |
| Extend `.txt` report to include ATS, keywords, salary, interview | Half the analysis is unexportable | `export.ts` | Phase 3 | low | P2 |
| Route `export.ts` through `formatDate`; use `session.date` not `new Date()` | Documented rule; export currently dates itself at download time | `export.ts` | none | none | P2 |
| Decide on `GET /api/share` OG image (SPEC FR-12) vs keeping canvas | Canvas cannot produce link-preview cards; OG can | new route | Phase 6 | Medium — **new dependency, must be asked for** | P3 |

## Phase 7 — QA

| Task | Why | Files | Deps | Risk | Priority |
|---|---|---|---|---|---|
| End-to-end AI run, both modes, with a valid key | **Never once performed** | — | Phase 0 | none | **P0** |
| PDF upload with a real PDF and a scanned PDF | Never exercised | — | Phase 0 | none | P1 |
| Rate-limit, timeout and content-block error paths | Only unit-tested | — | Phase 0 | none | P1 |
| Delete tests pinning dead functions | They enforce nothing real | `tests/scoring.test.ts` | Phase 3 | none | P2 |
| Add route-level tests for `createApiRoute` failure paths | The most load-bearing untested code | new tests | none | low | P1 |
| Write a fresh QA report against the redesigned build | Replaces the superseded one | new file | Phases 2–6 | none | P1 |

## Phase 8 — Launch readiness

| Task | Why | Files | Deps | Risk | Priority |
|---|---|---|---|---|---|
| **Resolve the analytics contradiction**: SPEC Goal #2 and §39 require metrics; the privacy policy promises none | The SOP depends on numbers; the privacy promise is a product principle. **Product decision, not an engineering one** | `SPEC.md`, `privacy/page.tsx`, possibly a new dep | none | **High — touches a published privacy promise** | **P0 for launch** |
| Verify `AUTHOR.github` / `AUTHOR.linkedin` resolve | Footer links; reviewer-facing | `config/site.ts` | none | none | P1 |
| Regenerate `og-image.png` in the current design | Currently the pre-redesign look | `public/og-image.png` | Phase 2 | low | P1 |
| Set `NEXT_PUBLIC_SITE_URL`; confirm canonical/OG on the deployed origin | Currently hardcoded | env, `layout.tsx` | Phase 3 | low | P1 |
| Lighthouse against SPEC §17 targets | Never measured. QA measured 725 KB JS across 10 chunks pre-redesign; the redesign added a font and ~2,800 lines | — | all | Medium | P1 |
| CSP nonce via middleware to drop `'unsafe-inline'` | Named as the follow-up in `next.config.ts` | new middleware | — | **High — a mismatched nonce breaks hydration silently** | P3 |

---

# 12. WHAT SHOULD NOT BE CHANGED

These are load-bearing decisions with stated reasoning. Do not alter them without a written argument that engages the original reasoning.

## Product philosophy
1. **No account, no signup, no database, no cookies, no tracking.** Free and staying free. This is the product's identity and its privacy promise.
2. **Scholarship Mode is the differentiator.** Do not fold it into job mode to reduce branching. Strengthen it (Phase 2), do not simplify it away.
3. **`/analyze` never opens blank.** Non-negotiable #2; the reasoning survives the route move.
4. **The landing sells; the application works. Separate routes.** `careerlens/CLAUDE.md` records exactly what broke when they shared one: self-unmounting sections, scroll restoration across the swap, and a module-level store so the navbar could discover whether its own anchors existed.

## Design decisions from the redesign
5. **The score does not perform.** No ring gauge, no count-up, no colour by band. Stated reason: this figure is shown to people who have already been rejected repeatedly.
6. **Selection is expressed by depth, never by colour.** The tab bar, mode selector and hallmark are consistent on this. **Extend it to the tabs' contents; do not reverse it.**
7. **Unverifiable figures are not rendered.** Why the breakdown bars are gone. Applies to anything reintroduced.
8. **Findings are never padded to a target length, never ranked, never silently empty.**
9. **A band never appears without its reference.**
10. **Absolute dates only. Never relative, never numeric, never a time.** The audience spans conventions that disagree about `08/14` — and the product retains nothing, so a timestamp would imply a record that does not exist.
11. **`MODE_LABEL` is the single naming authority for modes.**
12. **The editorial furniture** — folios, running heads, head rules, the colophon — is what makes the product recognisable. Do not "clean it up".
13. **The atmosphere layer.** The four-layer light model and the film grain exist specifically to avoid the generated-AI-landing-page signature.
14. **Fill tokens vs `-text` siblings.** The most valuable rule in the design system.

## Accessibility principles
15. **`Badge` has no `role="status"`** — deliberate, and correct against `SPEC.md` §15. Eleven badges produced eleven live-region interruptions.
16. **The focus ring uses `--violet-text`, not `--violet`** — 7.94:1 vs 3.44:1, against SPEC's own snippet.
17. **The hero artwork and the landing worked example are `aria-hidden`** — a screen reader must not announce a score the visitor has not earned.
18. **`Tabs` implements the full ARIA pattern.** Do not simplify to plain buttons.
19. **Hallmark's depth cue carries nothing to assistive technology, by design.**

## Export principles
20. **Nullable `rewrite` / `coverLetter` in `AnalysisSession`.** Reverting this reintroduces silent permanent data loss — the exact C1 bug, documented in two places and covered by 11 regression tests.
21. **`buildReport` never dereferences a nullable field unconditionally.**

## Analysis methodology
22. **The pipeline shape**: one load-bearing call plus two `allSettled` enhancements.
23. **Constrained decoding + exactly one repair attempt.** Retrying further burns quota on a request that is not converging.
24. **Format lives in the schema; prompts describe judgment.**
25. **Nonce-delimited untrusted content.** This closes a real injection vector. **Never revert to static markers.**
26. **`thinkingBudget: 0`** on 2.5 models.
27. **Safety thresholds at `BLOCK_ONLY_HIGH`** — the false-positive rationale (military service, medical roles, non-English names) is exactly right for this audience.
28. **Scores are honest, not inflated.** "A candidate missing the core requirement scores below 50 no matter how strong they are elsewhere."

## Architecture
29. **`createApiRoute`** as the single place rate limiting, abort budgets, serialisation and logging live.
30. **`publicMessage` is the only field serialised.** A structural guarantee, not a convention.
31. **`lib/api/client.ts` as the only fetch door**, including its non-JSON-body handling.
32. **Raw `fetch` instead of the Google SDK.**
33. **The provider registry seam** — adding a vendor must remain a one-file change.
34. **`lib/env.ts` `assertServerOnly()`**.
35. **The logger's two-layer redaction.**
36. **`sanitizeText`'s HTML pattern** requiring a letter after `<`, so `<100ms` survives.
37. **Unicode preservation** in sanitisation.
38. **The security headers in `next.config.ts`**, especially `connect-src 'self'` and the dev-only `'unsafe-eval'`.

## Privacy principles
39. **Google Gemini is named as the sole processor.** If any provider is added or changed, `app/privacy/page.tsx` changes in the same commit. Both CLAUDE.md files state this.
40. **"Processed in memory, never written to a database or file system"** — this constrains every future feature, including analytics.

---

# 13. TECHNICAL INVENTORY

| Category | Value |
|---|---|
| **Framework** | Next.js `^16.2.12` — App Router, React Compiler on, Turbopack build |
| **Language** | TypeScript `^5`, strict mode, zero `any` |
| **Runtime** | React `19.2.4` / React DOM `19.2.4`; Node `>=20.9.0` |
| **Build** | `next build` (Turbopack); `build:webpack` escape hatch retained |
| **Styling** | Tailwind CSS `^4` via `@tailwindcss/postcss`, **CSS-first `@theme`, no `tailwind.config.ts`** (v4 would ignore it) |
| **UI libraries** | None. All primitives are hand-written in `components/ui/` |
| **Animation** | `framer-motion` `^12.42.2` |
| **Icons** | `lucide-react` `^1.25.0` |
| **AI SDK** | **None** — raw `fetch` to the Gemini REST API |
| **Backend** | Next.js Route Handlers, `runtime = 'nodejs'` |
| **Database** | **None.** `localStorage` only |
| **PDF** | `pdf-parse` `^2.4.5`, `serverExternalPackages` (CJS + dynamic requires break bundling) |
| **Testing** | Jest `^30.4.2` + `ts-jest` `^29.4.11`, `jest-environment-node`. **7 unit suites, 95 tests. No integration, component or E2E layer** |
| **Linting** | ESLint `^9` + `eslint-config-next` `^16.2.12`, flat config. **No Prettier** (SPEC §28 specifies one) |
| **Fonts** | Geist, Geist Mono, Instrument Serif — all self-hosted via `next/font/google` |
| **Deployment** | Vercel-shaped (`VERCEL_URL` detection, `maxDuration`) — **no `vercel.json`, no CI workflow, no `.github/`** [FACT] |
| **External services** | Google Generative Language API (`generativelanguage.googleapis.com`) — the only one |
| **Env vars** | 4 read (`GOOGLE_API_KEY`/`GEMINI_API_KEY`, `GOOGLE_MODEL`, `AI_PROVIDER`), 1 declared-but-dead (`NEXT_PUBLIC_SITE_URL`), 4 in `.env.local` read by nothing |
| **Prod dependencies** | **6 total** — framer-motion, lucide-react, next, pdf-parse, react, react-dom |
| **Dev dependencies** | 13 |
| **Scripts** | `dev`, `build`, `build:webpack`, `start`, `lint`, `lint:fix`, `typecheck`, `test`, `test:watch`, `verify` (= typecheck + lint + test) |

---

# 14. FILE / COMPONENT MAP

```
Career_Lense_AI/
├── CLAUDE.md                    ⚠️ Root rules — STALE, CONFLICTS with careerlens/CLAUDE.md
├── SPEC.md                      4,019 lines, 48 sections. Declared source of truth.
│                                   Partly superseded by the Aug redesign; internally duplicated
├── QA-REPORT.md                 ⚠️ 31 Jul. Documents a DELETED UI. Method excellent, findings stale
├── README.md                    🔴 0 BYTES
├── PROJECT_STATE_REPORT.md      ← this file
└── careerlens/                  ← THE APPLICATION (all code lives here)
    ├── CLAUDE.md                ⚠️ Nearer rules — also stale (names deleted components)
    ├── .env.example             Documents 4 vars; 1 of them (SITE_URL) has no effect
    ├── .env.local               (gitignored) KEY EMPTY + 4 unread vars
    ├── next.config.ts           CSP + 8 security headers, reactCompiler, serverExternalPackages
    ├── jest.config.ts           Unit-only, with a written justification for the narrowing
    ├── public/og-image.png      ⚠️ Pre-redesign artwork
    └── src/
        ├── app/                 ROUTES + the design token file
        │   ├── globals.css          366 lines. THE design system. Read this first.
        │   ├── layout.tsx           Fonts, metadata, atmosphere layer, Navbar/main/Footer
        │   │                          ⚠️ hardcodes SITE_URL; no MotionConfig
        │   ├── page.tsx             Landing — composes 10 sections in argument order
        │   ├── analyze/page.tsx     Server component; sr-only h1; delegates to AnalyzeExperience
        │   ├── privacy/page.tsx     ⚠️ nested <main>
        │   ├── not-found.tsx        ⚠️ nested <main>; no metadata
        │   ├── error.tsx            ⚠️ nested <main>; discards the error prop
        │   └── api/                 6 route handlers; 5 built on createApiRoute
        │
        ├── components/
        │   ├── landing/         ✅ REDESIGNED. Section.tsx is the structural unit
        │   │                       (label + folio + head rule). hero/ holds the
        │   │                       print-registration artwork and its choreography data
        │   ├── layout/          Navbar (scroll-driven glass), Footer (colophon)
        │   ├── tool/            🟡 THE APPLICATION. Redesigned: ModeSelector, UploadZone,
        │   │   │                   HistoryPanel, ScorePanel, KeyActions, Tabs bar.
        │   │   │                   NOT redesigned: AnalyzeTool form, all 8 tab contents
        │   │   ├── AnalyzeExperience.tsx   client boundary (replaced HomeExperience)
        │   │   ├── AnalyzeTool.tsx         the state machine: input | loading | results
        │   │   └── results/
        │   │       ├── ScorePanel/         Hallmark + Findings + 3 actions + ShareCard
        │   │       └── tabs/               8 tabs ⚠️ old visual language
        │   └── ui/              Shared primitives. Hallmark.tsx is the product's
        │                          most important component AND its design manifesto.
        │                          3 dead exports in Feedback, 2 in Card, 1 in Button
        │
        ├── config/
        │   ├── design-tokens.ts     Canvas colour mirror (Canvas can't read CSS vars)
        │   │                          + MOTION constants. 2 dead motion tokens
        │   └── site.ts              ⚠️ 4 of 7 exports unused; layout.tsx duplicates them
        │
        ├── hooks/               useAnalysis (the workflow), useClipboard, useFocusTrap
        │                          (focus restore + background scroll lock)
        │
        ├── lib/                 ALL non-component logic
        │   ├── ai/                  Provider registry, Gemini REST client, JSON recovery
        │   ├── analysis/            constants (shared client/server limits), schemas
        │   │                          (constrained-decoding contracts), guards (the
        │   │                          model-output trust boundary), ats-tips
        │   ├── api/                 contract (wire types), client (the only fetch door),
        │   │                          route (createApiRoute — the shared route plumbing)
        │   ├── prompts.ts           EVERY prompt. Nonce-delimited injection defence
        │   ├── errors.ts            10-code taxonomy; public vs developer messages
        │   ├── logger.ts            Structured, two-layer secret redaction
        │   ├── rate-limit.ts        Fixed-window; per-instance limitation stated honestly
        │   ├── history.ts           The ONLY localStorage module
        │   ├── export.ts            .txt report
        │   ├── share-card.ts        ⚠️ Canvas PNG — RENDERS THE DELETED DESIGN
        │   ├── scoring.ts           ⚠️ 3 of 4 exports dead; duplicate band table
        │   ├── format.ts            Dates + MODE_LABEL + analysisReference
        │   ├── validators.ts        Sanitisation + field parsing
        │   ├── env.ts               ⚠️ getSiteUrl() dead
        │   ├── pdf.ts, cn.ts
        │
        ├── types/index.ts       Domain types. ⚠️ 7 fields the UI no longer renders
        └── tests/               7 unit suites, 95 tests. ⚠️ 2 pin dead functions
```

## Where a new agent should start reading

1. `src/app/globals.css` — the design system, with reasoning
2. `src/components/ui/Hallmark.tsx` — the product's philosophy in 113 lines
3. `src/components/tool/results/ScorePanel/ScorePanel.tsx` — what was removed and why
4. `src/lib/api/route.ts` — the backend contract
5. `src/lib/prompts.ts` — the injection defence
6. `careerlens/CLAUDE.md` — the rules, **noting that they conflict with the root file**

---

# 15. PRODUCT MATURITY ASSESSMENT

## Verdict: **Functional prototype, with production-grade infrastructure.**

Not an MVP. Not a polished MVP. Not a production candidate.

### Why not "Production candidate" or higher
- **The application does not currently work.** The API key is invalid; every feature but the landing page is dead. Whatever the cause, an application that cannot run is not a candidate for production.
- **The end-to-end flow has never once been executed successfully.** QA-REPORT §2 records this as blocked on 31 July; it has been blocked ever since. Nobody has ever seen this product produce a real analysis.
- **The PDF upload path has never been exercised.** It is feature #1 on the P0 list.
- **Mobile has never been rendered at any width**, and 14 of 18 tool components have no breakpoints.
- **No CI, no CD, no `vercel.json`, no deployment.** The `verify` script exists and nothing runs it automatically.

### Why not "MVP" or "Polished MVP"
An MVP is *coherent*. This product currently contains two design languages, and the seam falls **inside the primary user journey** — a user meets the new language, then the old one, then the new one again, then publishes an artefact in the old one. The landing page markets a results experience (`ResultSection`: marked passages, gap fields, margin annotations) that the application does not deliver. And the doctrine the product states most forcefully in its own source — *a product that assesses people does not get to paint them red* — is contradicted by the very first tab it shows.

### Why not merely "Prototype"
Because the infrastructure is genuinely excellent and would survive contact with production unchanged: a real abort budget rather than a leaky `Promise.race`; a serialisation path that structurally cannot leak an internal message; nonce-delimited prompt injection defence; two-layer secret redaction in logs; constrained decoding with a bounded repair; a full security header suite with a CSP that would block CV exfiltration; a design token system that records **measured** contrast ratios; and a source-comment culture that explains *why* — including admitting prior bugs — at a standard most shipped commercial code does not reach. `tsc`, ESLint, 95 tests and a production build all pass today.

### The honest summary
**This is a product with a production-ready spine, an outstanding but half-applied redesign, and an application layer that nobody has ever successfully run.** The gap between the quality of the thinking and the state of the artefact is the defining fact about this repository. It is much closer to shipping than the list of problems suggests — but only if the redesign is finished rather than extended, and only once someone watches it run.

---

# 16. BIGGEST 10 PROBLEMS

Ranked by what blocks launch, weighted by whether the problem damages the product's own stated principles.

| # | Problem | Why it ranks here |
|---|---|---|
| **1** | **Invalid `GOOGLE_API_KEY`; the app is non-functional and has never been run end-to-end** | Nothing else can be verified, fixed or launched behind this. Ten minutes of human work. It has been blocking since before 31 July |
| **2** | **`/analyze` was never redesigned — two design languages inside one journey** | The largest body of work and the largest coherence problem. Everything in Phases 3–7 is shaped by how it is resolved |
| **3** | **The share card renders the design the product deleted for ethical reasons** | The artefact the user *publishes*. The abandoned ring gauge and band colours are the most publicly visible version of this product |
| **4** | **Results contents contradict the product's own doctrine (missing skills in red)** | Not a style inconsistency — a violation of the principle the product argues for in its own source, on the first tab the user sees |
| **5** | **Mobile has never been rendered at any viewport** | The audience is documented as laptop-first "occasionally mobile"; the landing page is the shared artefact. Unknown unknowns, and only a human with a browser can find them |
| **6** | **All three governing documents are stale or contradictory** (`SPEC.md` mandates a deleted gauge; `QA-REPORT.md` documents a deleted UI; the two CLAUDE.md files ban different spacing steps) | A new agent acting in good faith on any of them will build the wrong thing. Cheap to fix; expensive to leave |
| **7** | **`Hallmark` — the primary score — has no accessible text** | The product's central artefact is unreadable to a screen reader, in a product that gets accessibility right nearly everywhere else. The correct pattern already exists 40 lines away in `HistoryPanel` |
| **8** | **`MotionConfig` is claimed in a comment and does not exist** | A documentation lie with a real accessibility consequence, and the kind of defect that erodes trust in every other comment in a codebase whose comments are its best asset |
| **9** | **The analytics contradiction is unresolved** | SPEC Goal #2 and §39 require measurable numbers for the scholarship SOP — the project's stated reason for existing. The privacy policy promises none. Nothing is implemented. This must be decided by a person, not coded around |
| **10** | **`/api/health` cannot detect the failure this deployment has, and `error.tsx` discards its error** | Together: the app is down, the probe says it is up, and client crashes vanish. That is a service with no way to explain itself |

*Just below the line:* the root `README.md` is 0 bytes, and a documented persona — the scholarship reviewer this project exists to impress — is described as someone who reads it.

---

# 17. BIGGEST 10 STRENGTHS

| # | Strength |
|---|---|
| **1** | **The redesign's product thinking.** "This number is shown to people who have already been rejected repeatedly, and a dial that sweeps up to a low figure is a slot machine landing on a loss." That sentence, and the deletions it justifies, is better product reasoning than most funded teams produce. It is the project's real differentiator |
| **2** | **The API layer.** `createApiRoute` gives every endpoint rate limiting, a **genuine** abort budget, one serialisation path that cannot leak internals, and one correlated log record — by construction rather than by convention |
| **3** | **Prompt injection defence.** Per-request random nonce delimiters with the model told that only the exact token closes a block, plus stripping of zero-width and bidi-override characters. This defeats a real attack that the previous static markers did not |
| **4** | **The design token system.** Measured contrast ratios recorded per token; fill tokens separated from `-text` siblings; a four-layer atmosphere model with a stated reason (avoiding the generated-AI-landing-page signature); film grain to defeat 8-bit banding |
| **5** | **The comment culture.** Nearly every non-trivial module explains what it replaced, what was wrong with it, and why the new shape is correct — including admitting prior bugs by name. This is the single most valuable asset for a handoff |
| **6** | **Error taxonomy.** One enforced rule — the user's message and the developer's message are different strings — implemented so the guarantee holds structurally |
| **7** | **The AI reliability strategy.** Constrained decoding to *prevent* malformed output, one bounded repair attempt, retry only on retryable statuses, `thinkingBudget: 0`, and safety thresholds raised with a rationale specific to this audience's names and careers |
| **8** | **Security posture.** Full CSP with `connect-src 'self'`, eight security headers, dev-only `'unsafe-eval'`, API key as a header not a query parameter, two-layer log redaction, `assertServerOnly()`. Better than most commercial products of this size |
| **9** | **Dependency discipline.** Six production dependencies. Nine were removed in an earlier pass. No UI kit, no state library, no AI SDK, no chart library — every primitive is hand-written and consolidated |
| **10** | **The C1 data-loss fix.** Diagnosed (a validation filter in the read path silently *deleted* sessions on the next write), fixed, documented in two files, and pinned by 11 regression tests. Exemplary engineering |

*Honourable mention:* `Tabs.tsx` is a textbook-correct ARIA tabs implementation, and `useFocusTrap` fixes four separate real defects with each one named.

---

# 18. RECOMMENDED NEXT MOVE

## Not "continue development." The correct next move is:

## **Unblock the key, look at the product running, then finish the `/analyze` redesign — in that order. Do not start new features, and do not clean up the API contract yet.**

### Step 1 — Get a valid `GOOGLE_API_KEY` and watch the product work (half a day)
The invalid key has blocked end-to-end verification since before 31 July. **This product has never once been observed producing a real analysis.** Every judgement below — including this report's — rests on reading code. Until someone runs it, the true problem list is unknown, and any redesign work risks being built on assumptions.

Note the trap: the shell variable **takes precedence over `.env.local`**, proven twice (QA-REPORT §1 H2, and again in this audit). Editing `.env.local` alone will not fix it.

Run the manual script already written in `QA-REPORT.md` §3 in a visible browser. It seeds a session via `localStorage`, so most of it works even before the key is replaced.

### Step 2 — Correct the governing documents (half a day)
Three documents actively mislead: `SPEC.md` still mandates the deleted gauge and breakdown bars; `QA-REPORT.md` documents a UI that no longer exists; the two CLAUDE.md files ban **different spacing steps** and one still names deleted components as current. Fixing this is hours of work and prevents an agent from confidently building the wrong thing. Write the 0-byte `README.md` in the same pass — a documented persona reads it.

### Step 3 — Finish the `/analyze` redesign (the main work)
This is the recommendation, and the reasoning is what rules the alternatives out:

- **Not "redesign first" in the general sense** — the landing page is done and good. The work is specifically *finishing* a redesign, not starting one.
- **Not "fix architecture first"** — the architecture is the strongest part of the project. Touching it would be the single easiest way to make this repository worse.
- **Not "fix the API contract first"** — this is the seductive wrong answer. The dead `verdict_note` and six unused sub-scores are real waste, but they are only *knowably* dead relative to the current half-finished UI. The `/analyze` redesign may reintroduce a use for the sub-scores, or delete the share card that is their last consumer. **Removing them now risks deleting fields that Phase 2 wants back, and re-adding a required schema field means touching `schemas.ts`, `guards.ts`, `types/index.ts` and `prompts.ts` in lockstep.** Contract cleanup must follow the redesign, not precede it.
- **Not "UX audit first"** — this report is that audit, and the finding is unambiguous: the product's problem is not that its UX is unknown, it is that its UX is *two products*.
- **Not "resolve Design Bible inconsistencies first"** — there is no Design Bible. The rules that exist live in source comments and are largely honoured. The one substantive doctrinal violation (colour-as-judgement in the tabs) is not a documentation problem; it is exactly the `/analyze` redesign.

The first decision inside Step 3 is a product decision, and everything else waits on it:

> **Does `/analyze` keep the eight-tab dashboard, or does it adopt the marked-document model that the landing page already sells?**

`ResultSection` on the landing page describes gap fields and margin annotations — *"the analysis does not grade your CV; it marks the passages that answer the requirement, and leaves the places that answer nothing visibly empty."* That is a stronger, more distinctive product than eight tabs of coloured chips, and it is already designed, already built as a component, and already being advertised. **The landing page has, in effect, already specified the redesign.** The gap between what it promises and what `/analyze` delivers is the single largest opportunity in this repository.

Whichever way that decision goes, three things must be true when Step 3 ends: **missing skills are no longer painted red**, **the share card no longer renders the deleted design**, and **the score is readable by a screen reader.**

### Then, and only then
Contract cleanup (Phase 3) → accessibility pass (Phase 4) → the mobile work nobody has ever done (Phase 5) → fresh QA (Phase 7) → the analytics decision, which needs a human (Phase 8).

---

---

# HANDOFF FOR CLAUDE COWORK

## What the product is
**CareerLens AI** — a free, no-signup web app that scores a CV against a job description **or against scholarship criteria** and returns a match score, skill gaps, an ATS check, keywords, rewritten bullets, a cover letter, interview questions and a chat. Built by a Pakistani CS student for international applicants to European scholarships and remote roles. The scholarship mode is the differentiator; no competitor has it. Next.js 16 / React 19 / TS strict / Tailwind v4 / Google Gemini `2.5-flash`. No database, no auth, no cookies, no analytics — history is `localStorage` only. **All code is in `careerlens/`; the root holds docs.**

## What is already working
- Landing page `/` — 10 sections, fully redesigned, editorial/assay design language. Genuinely distinctive.
- The complete backend: 6 API routes, 5 built on a shared `createApiRoute` factory with rate limiting, real abort budgets, a serialisation path that cannot leak internals, and correlated structured logging.
- Nonce-delimited prompt-injection defence; constrained-decoding JSON with one bounded repair; full security header suite.
- The analysis pipeline (1 load-bearing call + 2 `allSettled` enhancements), history with quota-shedding writes, `.txt` export, 8 result tabs, chat, PDF/TXT upload.
- `Hallmark` — the redesigned score. Struck plate, band as a word, no colour, always with its reference.
- **Today, at HEAD: `tsc` 0 errors · ESLint clean · 95/95 tests · `next build` passes.** All four re-verified in this audit.

## What is unfinished
- **`/analyze` was never redesigned.** Its own source says so (`app/analyze/page.tsx:22-23`). The tab *bar*, `ModeSelector`, `UploadZone`, `HistoryPanel` and `ScorePanel` are new; the **input form and all 8 tab contents are pre-redesign**.
- Mobile: 14 of 18 tool components have no breakpoints, and **no viewport has ever been rendered**.
- Missing: `sitemap.ts`, `robots.ts`, JSON-LD, hourly rate cap, skip link, `CoverLetterTab` retry, any analytics, upskilling roadmap (SPEC §31), root `README.md` (**0 bytes**).
- Tests are unit-only: no route, component or E2E layer.

## What is broken
1. **`GOOGLE_API_KEY` is invalid** — verified live: `400 API_KEY_INVALID`. The app is non-functional. `.env.local` has it **empty**; the **shell value takes precedence**, so editing `.env.local` alone will not fix it. **The end-to-end flow has never once succeeded.**
2. **The share card PNG renders the deleted pre-redesign design** — ring gauge, colour-by-band score, coloured verdict pill, three breakdown bars. This is the artefact users publish.
3. **`SkillsTab` / `KeywordsTab` paint missing skills red**, directly contradicting the doctrine stated in `ScorePanel.tsx:26-28`.
4. **`Hallmark` has no accessible text** — the primary score reads as three fragments. `HistoryPanel.tsx:109-112` already has the correct pattern.
5. **`MotionConfig` is claimed in `globals.css:348-350` and does not exist** — results-tab animations ignore `prefers-reduced-motion`.
6. **`app/error.tsx` discards the `error` prop**; **`/api/health` reports `ready: true` with an invalid key**.
7. **Nested `<main>`** on `/privacy`, `/404` and the error boundary. **No `metadata`** on 404.
8. **`ComparisonSection.tsx` uses `py-5` ×3** — an explicitly banned spacing step.
9. **All three governing docs are stale**: `SPEC.md` §FR-05/FR-06/FR-13/§5/§6 still mandate the deleted gauge and bars; `QA-REPORT.md` (31 Jul) documents a deleted UI; **the two CLAUDE.md files ban different spacing scales** and `careerlens/CLAUDE.md` names deleted components as current.
10. **7 API fields are generated on every call and rendered nowhere in the app** — `verdict_note` (fully dead), and six sub-scores whose only consumer is the share card.

## What must be preserved
Full list in §12 — **read it before changing anything.** The essentials:
- **The score does not perform.** No gauge, no count-up, no colour by band. The reason is ethical and stated in source.
- **Selection is expressed by depth, never colour.** Extend this into the tabs; do not reverse it.
- **Unverifiable figures are not rendered** (why the breakdown bars are gone).
- **Findings are never padded, never ranked, never silently empty. A band never appears without its reference. Dates are absolute.**
- **Nullable `rewrite` / `coverLetter`** — reverting this reintroduces silent permanent data loss (11 regression tests guard it).
- **Nonce-delimited prompts.** Never revert to static markers.
- **`publicMessage` is the only serialised error field** — a structural guarantee.
- **`Badge` has no `role="status"`** and the focus ring uses `--violet-text` — both deliberate, both correct *against* `SPEC.md`.
- **Google Gemini named as sole processor in `privacy/page.tsx`** — change providers, change that page in the same commit.
- **`/` and `/analyze` stay separate routes.**
- Six production dependencies. **Ask before adding a seventh.**

## What should be reconsidered
- **The eight-tab results dashboard.** The landing page's `ResultSection` already sells a better, more distinctive product — marked passages, gap fields, margin annotations. It is built, and `/analyze` does not deliver it.
- **Whether the six sub-scores and `verdict_note` should be generated at all** — but decide this **after** the redesign, not before.
- **Scholarship mode as a mode toggle.** The stated differentiator currently reuses the job-mode results tree; its distinctive axes appear only on the share card.
- **The analytics contradiction.** SPEC Goal #2 and §39 demand measurable numbers for the scholarship SOP; the privacy policy promises none; nothing exists. **A human must decide this.**
- **`Card` as a primitive** — the redesigned surfaces have largely stopped using it.

## What should be done FIRST
1. **Replace the invalid `GOOGLE_API_KEY` (unset the shell variable) and run one real analysis end to end.** Nobody has ever seen this product work. Half a day. Everything else is guesswork until this is done.
2. **Correct `SPEC.md`, retire `QA-REPORT.md`, reconcile the two CLAUDE.md files, write the `README.md`.** Half a day. Prevents the next agent from confidently building the wrong thing.
3. **Finish the `/analyze` redesign** — starting with the single product decision *"eight tabs, or the marked-document model the landing already sells?"* Three things must be true at the end: **no red skill tags**, **a share card in the current design**, **a screen-reader-readable score.**

## What must NOT be changed without justification
- **`lib/api/route.ts`, `lib/errors.ts`, `lib/ai/`, `lib/prompts.ts`, `lib/logger.ts`, `lib/validators.ts`, `next.config.ts`** — the infrastructure spine. It is the best part of this repository and would survive production unchanged.
- **`lib/history.ts`'s nullable-field handling** — guarded by 11 tests against a real data-loss bug.
- **`app/globals.css`** — the token system, with measured contrast ratios. Change tokens, not the structure.
- **`components/ui/Hallmark.tsx`** — this is the product's design manifesto. Add the missing accessible text; change nothing else.
- **The comment culture.** Nearly every module explains what it replaced and why. It is the single most valuable asset in this handoff. **If you change a module, update its docblock in the same edit** — the `MotionConfig` claim in `globals.css` is what happens when that discipline slips, and it is the reason a real accessibility feature is missing today.
