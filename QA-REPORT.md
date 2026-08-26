# CareerLens AI — QA Report

> **Provider note (26 August 2026).** This is a dated snapshot, preserved as written. It describes the pipeline while Google Gemini (`gemini-2.5-flash`) was the LLM provider. ADR-22 has since replaced it with Anthropic Claude (`claude-haiku-4-5-20251001`), and ADR-23 replaced the research embedding baseline with Voyage AI. Gemini references below were accurate on the date above and are **not** current — see `ARCHITECTURAL_DECISION_REGISTER.md`. They are left in place because rewriting a dated audit to match today's architecture would falsify the record it exists to be.

**Date:** 31 July 2026
**Build tested:** production (`next build` + `next start`), Next.js 16.2.12
**Environment:** Chrome via automation, viewport 1254–1536px wide
**Verification status of the build at time of writing:** `tsc` 0 errors · `eslint --max-warnings=0` clean · **95/95 tests** · `next build` passes

---

## Legend

| Mark | Meaning |
|---|---|
| ✅ **Verified** | Observed directly in the running application — rendered screenshots, DOM assertions against the live page, or automated tests |
| 🔍 **Verified by code inspection** | Implementation read and reasoned about, but never exercised at runtime |
| ⏳ **Pending manual verification** | Requires visual confirmation that browser automation could not provide |

---

## 1. ✅ Verified — observed in the running application

### Rendering (production build, screenshots captured)

| Surface | Result |
|---|---|
| Landing — hero, badge, gradient headline, dual CTAs, trust row | ✅ renders correctly |
| Landing — demo preview card (score 73, skill tags, three meters) | ✅ renders correctly |
| Landing — feature cards (3, staggered entrance) | ✅ renders correctly |
| Tool form — mode toggle, History button, upload zone, both textareas with live counters, Analyze button | ✅ renders correctly |
| Analyze failure — `Alert` with `role="alert"` | ✅ renders correctly |
| Results — score gauge (73, blue arc matching the 66–80 band), verdict, verdict note | ✅ renders correctly |
| Results — breakdown meters, Key Actions, New Analysis / Share / Download | ✅ renders correctly |
| Tab: Skills Gap — matched/missing/bonus groups, correct tag variants | ✅ |
| Tab: CV Rewrite — original vs AI-optimised columns, Re-generate control | ✅ |
| Tab: ATS Check — 8 checks, pass/warn/fail colours + icons, remediation tips, summary badge | ✅ |
| Tab: Keywords | ✅ |
| Tab: Salary — range, context panel | ✅ |
| Tab: Interview Q — badges, questions, tips | ✅ |
| Tab: Cover Letter — word count, Copy letter, letter body | ✅ |
| Tab: Chat CV — quick prompts, greeting, user bubble, error bubble | ✅ |
| Share dialog — canvas score card rendering the **current** palette | ✅ |
| History dialog — opens, lists sessions | ✅ |
| Privacy page | ✅ |
| 404 page | ✅ |

### Behaviour

- ✅ **Keyboard tab navigation** — clicked "Skills Gap", pressed `→` twice, landed on "ATS Check"; `aria-selected` synced, panel switched to `results-panel-ats`, roving tabindex correct (`-1,-1,0,-1,-1,-1,-1,-1`).
- ✅ **Focus order** — 15 focusable elements in logical order: nav → hero CTAs → mode toggle → History → upload → CV → JD → Analyze → footer. No traps.
- ✅ **Modal Escape + focus restoration** — Escape closed the Share dialog and focus returned to the "Share Result" trigger with a visible violet focus ring.
- ✅ **Modal does NOT lock background scroll** — measured `body { overflow: visible }` with the dialog open, contradicting the contract documented in `Modal.tsx`. *(Open issue — see §4.)*
- ✅ **Chat error path** — a failed request renders as a red-bordered assistant bubble via `status: 'error'`.
- ✅ **Console** — zero application errors in production. All console noise originated from the Chrome extension itself.

### Fix verification (this session)

- ✅ **C1 — history data loss.** A session with `rewrite: null, coverLetter: null` now appears in the History dialog (asserted against the live DOM) and survives subsequent writes. Backed by **11 new regression tests** in `tests/history.test.ts`, including the `addToHistory` eviction path.
- ✅ **H1 — privacy policy.** Corrected to name Google Gemini as the sole processor; confirmed in server-rendered HTML. Same false claim removed from `README.md` (×4) and `CLAUDE.md`.
- ✅ **H2 — env precedence.** With `.env.local`'s `GOOGLE_API_KEY` empty, `/api/health` still returned `ready: true` — proving the **shell environment value takes precedence** over `.env.local`.
- ✅ **H4 (structural half).** On restore from History: `hero: false`, `demo: false`, `featureCards: 0`, `scorePanel: true`, `resultsTabs: true`. After "New Analysis" the landing remounts.
- ✅ **Navbar link fix.** "How it works" present on landing → **absent** on results → returns after "New Analysis". Both nav hrefs confirmed root-relative (`/#demo-preview`, `/#analyze`) in SSR HTML on `/` **and** `/privacy`.
- ✅ **CSP scoping.** `curl` confirms dev sends `script-src 'self' 'unsafe-inline' 'unsafe-eval'`; production sends `script-src 'self' 'unsafe-inline'` — production policy unchanged.

### Performance (production, measured)

| Metric | Value |
|---|---|
| TTFB | 50 ms |
| `domInteractive` | 572 ms |
| JS (decoded) | **725 KB** across 10 chunks |
| CSS | 40 KB |
| Fonts | 51 KB, 2 files, self-hosted |

### Withdrawn finding

- ❌ **H3 "dev-mode blank hero" — FALSE FINDING, withdrawn.** Caused by the automation tab being non-composited: Chrome froze `requestAnimationFrame`, and Framer Motion drives every animation from rAF, so elements stayed at `initial` (`opacity: 0`). Proven by loading the **production** build in the same state and observing identical frozen output. Not a dev-vs-prod difference and not an application defect.

---

## 2. 🔍 Verified by code inspection only

These were read and reasoned about but never exercised at runtime.

| Item | Why not runtime-verified |
|---|---|
| Scroll reset on results (`scrollIntoView({ block: 'start', behavior: 'auto' })` against `scroll-padding-top: 80px`) | Scrolling suppressed in the automation tab |
| Hash-anchor scroll to `#demo-preview` / `#analyze` | Same. Href correctness and target presence **were** verified; the scroll itself was not |
| `prefers-reduced-motion` branches in `ScoreGauge` and `Modal` | Machine reported `prefers-reduced-motion: false` |
| `app/error.tsx` error boundary | Could not trigger a genuine runtime error without modifying code mid-QA |
| Live analyze flow end-to-end (loading overlay under real conditions) | `GOOGLE_API_KEY` in the shell is rejected by Google (`API_KEY_INVALID`) |
| PDF upload path | Same — and no fixture uploaded |

---

## 3. ⏳ Pending manual verification

**Reason for all items below: browser automation visibility limitation.** The Chrome instance driving these tests was not composited by the OS (`document.visibilityState === "hidden"`, `requestAnimationFrame` never firing, `window.scrollTo` a no-op, `resize_window` reporting success while `innerWidth` stayed 1536). This is an external tooling limitation, **not an application bug**.

| # | Item |
|---|---|
| P1 | Results page scroll reset after analysis |
| P2 | Hash-anchor navigation from the landing page |
| P3 | Mobile responsiveness — 375px |
| P4 | Tablet responsiveness — 768px |
| P5 | Desktop 1024px / large desktop 1440px |
| P6 | Entrance animations and motion polish (frozen throughout automated testing) |

### Manual test script — ~5 minutes

**Setup:** `cd careerlens && npx next build && npx next start --port 3211`, open `http://localhost:3211` in a normal, visible Chrome window.

**Seed a result** (avoids needing a valid API key) — paste into DevTools console, then reload:

```js
localStorage.setItem('careerlens:history:v1', JSON.stringify([{
  id:'t1', date:new Date().toISOString(), mode:'job',
  cvText:'cv', jdText:'jd', jobTitle:'Senior Frontend Engineer',
  result:{ score:73, skills_score:78, experience_score:64, education_score:82,
    verdict:'Good Match', verdict_note:'Test fixture.',
    key_actions:['Add measurable outcomes'],
    skills_matched:['React','TypeScript'], skills_missing:['Jest'], skills_extra:['Product thinking'],
    keywords_present:['React'], keywords_missing:['CI/CD'],
    ats_checks:[{id:'headings',label:'Standard headings',status:'pass',note:'ok'},
                {id:'keywords',label:'Keyword coverage',status:'fail',note:'5 of 9'}],
    salary_range:'$95,000 – $125,000', salary_context:'Test context.',
    interview_questions:[{question:'Describe a perf fix.',skill_tested:'Performance',tip:'Name the metric.'}] },
  rewrite:{ original_bullets:['Built UIs'], rewritten_bullets:['Built 12 accessible React interfaces'] },
  coverLetter:'Dear Hiring Team,\n\nTest letter.' }]));
```

| Step | Action | Expected |
|---|---|---|
| **1. P1** | Scroll to the bottom of the landing page. Click **History → the listed row**. | Marketing sections disappear; view jumps to the **top of the results**, score gauge fully visible and clear of the sticky navbar. No need to scroll up manually. |
| **2. P1** | Click **New Analysis**. | Landing returns; view lands on the tool form, not stranded mid-page. |
| **3. P2** | From the top of the landing page, click **"How it works"** in the navbar. | Page scrolls to the "Here's what your analysis looks like" card. |
| **4. P2** | Go to `/privacy`, click **"How it works"**. | Navigates to `/` **and** scrolls to the demo card. |
| **5. P2** | Restore a result again, then check the navbar. | **"How it works" is absent**; "Analyze Now" remains. |
| **6. P3** | DevTools → device toolbar → **375 × 812**. Scroll the whole landing page and the results view. | No horizontal scrollbar; navbar sticky; hero text wraps cleanly; 8 result tabs form a **horizontally scrollable strip**, not 4 stacked rows; touch targets ≥44px. |
| **7. P3** | At 375px open **History**, **Share**, and the **Chat** tab. | Dialogs fit the viewport with header and close button reachable; chat input and send button not clipped. |
| **8. P4** | Switch to **768 × 1024**. | Feature cards go 1→3 across; tool form still readable; results sidebar stacks above the tabs. |
| **9. P5** | Switch to **1024** then **1440**. | Sidebar becomes a 320px sticky column beside the tabs; container maxes at 1152px and stays centred. |
| **10. P6** | Reload at 1440px and watch the hero. | Badge, headline, subhead, CTAs and trust row fade/rise in sequence; score gauge arc animates and the number counts up. |

**Quick horizontal-overflow check** at each width:

```js
document.documentElement.scrollWidth > document.documentElement.clientWidth
// expected: false
```

---

## 4. Open issues carried forward (unchanged, not fixed)

From the Phase 3 report — Medium and Low were deliberately left unfixed.

**Medium:** modal missing background scroll lock · score numeral collides with the gauge arc · sticky score panel taller than the viewport so it scrolls away · per-bullet copy buttons in CV Rewrite nearly invisible · Analyze button spans only the right half of the card · share-card canvas has a large dead region · share dialog taller than the viewport · no skip-to-content link · upload zone is a `div[role="button"]` rather than a real button · the two form columns don't align.

**Low:** tab pills shift ~2px on selection · 404 page uses the default `<title>` · ragged empty space on short tabs · `Tip:` text uses the weakest contrast token.

**Config (action required by a human):** the `GOOGLE_API_KEY` exported in the shell environment is invalid and takes precedence over `.env.local`. The app cannot function until it is replaced or unset.

---

## 5. Do the automation problems require any code change?

**No.**

The frozen animations, suppressed scrolling and unchangeable viewport were all caused by the Chrome window not being composited by the operating system. This was proven environmental rather than application-level: the **production** build exhibited byte-identical frozen behaviour in the same state, and a brand-new Chrome window inherited it.

Two code changes made during this session touched adjacent ground; both stand on their own merits and neither was made to work around the tooling:

1. **`next.config.ts` — `'unsafe-eval'` in development only.** Motivated by a genuine, independently reported error in Next's dev overlay: React's development build calls `eval()` for debugging features, and the policy was blocking it. The shipped production policy is unchanged.
2. **`HomeExperience.tsx` — `scrollIntoView({ behavior: 'auto' })`.** Justified independently: the global `scroll-behavior: smooth` would otherwise animate a scroll through content that has just been unmounted, which is the wrong behaviour for a wholesale view swap.

No further code change is warranted by the automation limitation.
