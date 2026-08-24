# Testing Coverage Report — Phase 10

Measured against `TESTING_STRATEGY_FINAL.md`, category by category, at the close
of Phase 10. This is a report of what exists, not a restatement of what was
planned. Where a category is short, it says so and says what is missing.

**Suite as it stands:** 258 Jest tests across 16 suites, 21 Playwright tests
across 2 spec files, 45 further unit tests in `research/`. Nothing here has been
run against a live `GOOGLE_API_KEY`; every AI call is mocked or intercepted.

**Summary:** 6 of 12 categories genuinely covered, 5 partial, 1 obsolete in the
good direction. The two deepest categories the brief singled out — the evidence
verifier and accessibility — are both covered, with one important documented
limitation in the verifier that belongs in the thesis rather than in a bug list.

| # | Category | Verdict |
|---|----------|---------|
| 1 | Unit tests | **Partial** — 4 of 5 named modules covered; `prompts.ts` has no test |
| 2 | Integration tests | **Covered** |
| 3 | API tests | **Partial** — 2 of 6 endpoints; no route-level 429 |
| 4 | Evidence verifier | **Covered** — all 7 adversarial cases, 1 documented limitation |
| 5 | AI schema validation | **Covered**, with one obligation that is architecturally unmeetable |
| 6 | Frontend component tests | **Partial** — `EmptyState` catalogue not enumerated |
| 7 | End-to-end tests | **Partial** — scroll-to-results untested |
| 8 | Regression tests | **Partial** — `skills_missing` guard missing, the one the spec insisted on |
| 9 | Security tests | **Partial** — Stage 1 injection needs a live key |
| 10 | Accessibility | **Covered** — this phase; both named violations closed |
| 11 | Edge cases | **Thin** — 4 of 7 covered |
| 12 | "What this document does not claim" | **Obsolete** — a runner now exists |

---

## 1. Unit tests — Partial

Four of the five named modules are covered well beyond the ask:

- `lib/analysis/grounding.ts` — `tests/grounding.test.ts`, normalization, fuzzy
  match and tier thresholds, plus the dedicated adversarial section in §4.
- `lib/analysis/aggregate.ts` — `tests/aggregate.test.ts`, including the
  zero-claims division guard named in the spec ("is 0 and never NaN").
- `lib/scoring.ts` — `tests/scoring.test.ts`, band lookup plus the
  single-source-of-truth assertions in §8.
- `lib/ai/guards.ts` — `tests/guards.test.ts`, schema validators including the
  `gap`-with-non-null-quote rejection rule, which gets five tests of its own.

**Missing:** `lib/prompts.ts`'s `wrapUntrusted` / nonce generation. There is no
`prompts.test.ts`. The only assertion touching it is indirect —
`tests/api/rewrite.test.ts` checks that the weak-requirements block reuses the
same nonce as the CV block. Neither of the two properties the spec names is
asserted anywhere: **uniqueness per call**, and **correct delimiter escaping**
(what happens when CV text itself contains something shaped like
`<<<END_CV:...>>>`). This is the one named unit obligation with no home, and it
is the security-relevant one.

Beyond the spec, seven further modules have unit coverage that was never asked
for: `errors.ts`, `validators.ts`, `ai-json.ts`, `locate.ts`, `history.ts`,
`ats-checks.ts`, `rate-limit.ts`.

## 2. Integration tests — Covered

`tests/api/analyze.test.ts` runs the full route against a mocked `generateJson`
and asserts the guard-validate → normalize → verify → aggregate → respond
ordering end to end, not merely the final shape. Both failure paths named in
`AI_PIPELINE_FINAL.md` are present: malformed JSON → repair → success, and
malformed JSON → repair → still malformed → `AI_INVALID_OUTPUT`. A third path
the spec did not name is also covered — parses cleanly but fails the guard →
repair → success.

## 3. API tests — Partial

Six routes exist. Two are tested.

| Route | Covered |
|-------|---------|
| `/api/analyze` | Yes — thoroughly (24 tests) |
| `/api/rewrite` | Yes — thoroughly (10 tests) |
| `/api/chat` | **No** |
| `/api/cover-letter` | **No** |
| `/api/health` | **No** |
| `/api/upload` | **No** |

Against the sub-requirements:

- **Correct 2xx shape** — covered for the two tested routes.
- **4xx on missing input** — covered (`unknown mode`, `CV below minimum`,
  `malformed JSON body`, all 400).
- **4xx on oversized input** — **not covered at the route boundary.**
  `tests/validators.test.ts` asserts the sanitiser truncates, which is a
  different thing from the route rejecting.
- **Rate-limit 429 after threshold** — **not covered at the route boundary.**
  `tests/rate-limit.test.ts` exercises the limiter itself in isolation across 11
  tests, including window expiry and bucket sweeping, but nothing drives a real
  route past the threshold and asserts a 429 with `Retry-After`.
- **Research-mode header honored only when `RESEARCH_MODE_ENABLED=1`** —
  **covered**, and this is the one the spec called mandatory rather than
  optional. Both directions are asserted, each marked `SECURITY:`: header sent
  with the flag off leaks no internal fields; flag on with no header also leaks
  nothing; and the claims are identical either way, proving research mode is one
  pipeline serialized twice rather than two pipelines.

## 4. Evidence verifier — Covered

The deepest coverage in the suite, as instructed. All seven required adversarial
cases have named tests in `tests/grounding.test.ts`:

| Required case | Test | Result |
|---|---|---|
| Fabricated quote resembling real CV text | `ADVERSARIAL: … "4 engineers" -> "12 engineers"` | Capped at `unresolved` by the ADR-17 digit gate |
| Same fabrication diluted across a longer quote | `ADVERSARIAL: … diluted …` | Still caught |
| JD text quoted as if it were CV text | `ADVERSARIAL: text quoted from the job description` | `unresolved`; only the CV is searched |
| Reworded-CV attack | `ADVERSARIAL: a fluent reword …` | `uncertain`, not `verified` — as the spec predicted |
| Empty-string quote | `ADVERSARIAL: an empty-string quote …` | Identical to `null` |
| Quote spanning a normalization edge | `ADVERSARIAL: … PDF whitespace and bullet artifacts` | Matches after normalization |
| Near-duplicate distractor | `ADVERSARIAL — KNOWN LIMITATION: …` | **Verifies. See below.** |
| Injection inside the candidate's own CV | `ADVERSARIAL: a prompt injection inside the CV is inert` | Inert; Stage 2 calls no model |

Two regression guards were added that the spec did not ask for, both protecting
against the digit gate over-triggering: a quote whose numbers are correct is not
gated, and a multi-digit figure inside a longer token is not gated.

### The one limitation that matters

The **near-duplicate distractor** case does not behave as
`TESTING_STRATEGY_FINAL.md` hoped. The spec says the verifier "must not accept
the wrong one just because it scores above threshold". It does accept it. The
test asserts that truthfully and is named `KNOWN LIMITATION`, with the reason:
*presence is not relevance*. The verifier answers "does this span exist in the
CV", which is the question it was built to answer; it does not and cannot answer
"does this span support this particular requirement" without a second model call,
which would reintroduce exactly the hallucination surface Stage 2 exists to
remove.

The spec anticipated this — it asked for the case to be "logged as a known
limitation in `RESEARCH_EVALUATION_FINAL.md`'s error-analysis category …, not
silently assumed away". It is logged. **This belongs in the thesis limitations
section, not in a defect list**, and it is the single most important caveat in
this report.

## 5. AI schema validation — Covered, with one unmeetable clause

Valid responses pass; the `gap`-with-quote malformed case is explicitly asserted
as rejected; required fields individually removed or mistyped are rejected
(verdict outside the allowed set, ATS check with unknown status, non-finite
score, category outside the set, status outside the model vocabulary, empty
required collections, and the whole draft when any single claim is malformed).

The clause **"with the correct error path (not a generic catch-all)"** is not
met, and cannot be as currently architected: `isAnalysisDraft` is a boolean type
guard. A rejection carries no path, so one rejection is indistinguishable from
another. Meeting the clause literally would mean replacing the type guard with a
schema library that returns error paths. That is a design decision, not a missing
test, and it is recorded here rather than ticked off.

## 6. Frontend component tests — Partial

- **`Tag`/`Badge`, `unresolved` never red** — covered twice over, at token level
  (`tests/doctrine.test.ts`, six tests, including "has no red mapping anywhere in
  the tag vocabulary at all") and at render level (`tests/components/evidence.test.tsx`).
- **`EvidenceMarker`** (shipped as `ClaimMarker`) — covered: tier styling,
  accessible label naming tier and requirement, `aria-expanded` disclosure state,
  keyboard operability, rationale shown only when expanded.
- **`ScorePanel` — no ring gauge present** — covered as a regression assertion:
  `CoverageSummary` "renders no chart, gauge or progressbar", and
  `tests/scoring.test.ts` asserts no colour-by-score function survives anywhere.
- **`EmptyState` variants, one test per `FAILURE_MODES_FINAL.md` state** —
  **not covered as specified.** Empty states are tested where they occur
  (`RequirementChecklist`, `EvidenceDocument`, `CoverageSummary`'s zero-claims
  case, `CompensationSummary`'s absent estimate) but nothing enumerates the
  catalogue. A state listed in `FAILURE_MODES_FINAL.md` that has no surface at
  all would not be caught by any current test.

Components with no unit coverage, relying on e2e alone: `HistoryPanel`,
`AnalyzeTool`, the four tools tabs, `Hallmark`.

## 7. End-to-end tests — Partial

Covered: the full analyze flow (paste CV+JD → submit → results render → evidence
markers present → a tools tab action completes), all three tiers in the
checklist, marker open/close, keyboard reachability of every marker and tab, the
not-found page, the privacy page, and the doctrine assertion that no element in a
rendered result is painted red.

- **Scroll-to-results behaviour** — **not tested.** The spec names it explicitly;
  no test asserts the page moves to the results after submission.
- **Error-page recovery flow** — partial, and deliberately so. The not-found
  recovery path is tested end to end. The error *boundary* is tested in Jest
  (`tests/components/error-page.test.tsx`) instead, because it catches a React
  render throw and no route, state or API response produces one on demand — the
  same reason `QA-REPORT.md` recorded it as unverified. Mounting the component
  directly is the only honest way to assert its contract, but it should be read
  as a component test, not an e2e one.

## 8. Regression tests — Partial

- **No `role`/`aria` regression on `Hallmark`/`Badge`, asserting the attributes
  exist** — **covered**, this phase. `e2e/accessibility.spec.ts` asserts the
  single-sentence accessible name is present *and* that the old "73 / Match /
  GOOD" fragments are gone from the tree rather than merely supplemented.
- **Single source of truth for score bands** — **covered.**
  `tests/scoring.test.ts` asserts `BANDS` covers 0–100 with no gap and no
  overlap, has one band per verdict, and that no second colour-by-score
  definition survives.
- **No reintroduction of a flat `skills_missing` field, "protected by a schema
  test not just a convention"** — **not covered.** The field is genuinely gone
  from the codebase, but the only thing recording that is a prose comment in
  `ChatTab.tsx`. Nothing fails if it comes back. This is precisely the outcome
  the spec wrote that clause to prevent.

## 9. Security tests — Partial

- **Nonce mechanism holds** — partial. `tests/api/rewrite.test.ts` asserts
  untrusted claims are wrapped in the same nonce delimiters as the CV.
  Uniqueness per call and delimiter escaping are untested (see §1).
- **Injection fixtures asserting the final output contains no attacker-controlled
  instruction-following** — **not covered, and not coverable without a live key.**
  What *is* covered is the surrounding defence: `tests/validators.test.ts`
  asserts zero-width and bidi-override characters used to hide instructions are
  stripped, along with control characters and HTML tags; `tests/grounding.test.ts`
  asserts an injection inside the CV is inert against Stage 2 because Stage 2
  calls no model. The remaining assertion is about what a real model does with a
  real prompt, and belongs to the live-key smoke test.
- **Input-size limits** — partial (minimum enforced at the route; maximum not
  asserted there).
- **Rate limits** — partial (limiter covered in isolation; route-level 429 not).

Unasked-for coverage worth noting: several tests assert that internal detail
never reaches a user-visible surface — error bodies from `/api/analyze`, the
model output inside `parseModelJson` failures (which contains the CV), and
`validators`' public messages.

## 10. Accessibility — Covered

Closed this phase. `e2e/accessibility.spec.ts` runs axe-core (WCAG 2.1 A and AA)
over seven page states: `/analyze` before submission, the results screen with all
three evidence tiers, the results screen with a rationale popover open, each of
the four tools tabs scanned separately (three never render until selected), the
landing page, the privacy page and the not-found page. All green.

Both violations the spec names by hand are closed and pinned by attribute-level
assertions that duplicate the sweep on purpose — a sweep would pass just as green
if someone deleted `Hallmark`'s `sr-only` sentence and axe happened not to flag
the replacement:

- **`Hallmark`'s missing `role`/label** — closed. Announces "Match 73 out of 100,
  band GOOD." as one sentence; the separate fragments are out of the tree.
- **`error.tsx`'s absent error announcement** — closed. `role="alert"` with
  `aria-live="assertive"`, asserted in both `e2e/accessibility.spec.ts` (for the
  inline surface, so the two cannot drift) and `tests/components/error-page.test.tsx`
  (for the boundary itself).

The sweep also found three defects the component-level jest-axe suite could not:
nine components using alpha-composited text below AA (fixed by the new
`--text-faint` token), decorative `/` and `·` separators read aloud as text
(fixed with `aria-hidden`), and the error boundary's silence.

**What this does not claim.** axe covers roughly the machine-checkable third of
WCAG. It cannot judge whether a label is meaningful or a reading order sensible.
It does not check icon contrast — and three icons still use alpha fills that
likely fall under the 3:1 non-text threshold of WCAG 1.4.11, most notably
`ComparisonSection`'s `Minus` at `--text-muted/0.6`, which carries
`aria-label="No"` and is therefore meaningful rather than decorative. Not flagged,
not fixed, worth a manual pass. A green run here is a floor, not a certificate.

## 11. Edge cases — Thin

| Case | Covered |
|---|---|
| Empty CV | Yes — 400 below minimum length |
| Empty JD | Yes — same mechanism |
| CV with zero extractable claims | Yes — as a defined empty state, end to end: the guard accepts an empty claims array, the route returns 200, and `CoverageSummary` explains the case instead of rendering 0/0 |
| JD with zero requirements | Yes — same path |
| Non-English input (graceful non-crash) | **No** |
| Extremely long CV, near the size limit | **No** |
| CV that is actually a JD pasted into the wrong box | **No** — and no defined message exists for it, so this is a product gap as well as a test gap |

The last one is worth separating from the others: the spec calls it "a real
user-error case worth a defined message, not a crash". There is currently no such
message to test.

## 12. "What this document does not claim" — Obsolete, in the good direction

`TESTING_STRATEGY_FINAL.md` closes by stating that no test suite exists with this
coverage and that "`careerlens/` today … has no test runner configured at all".
Both statements are now out of date. A runner exists and 279 automated tests run
against it.

One divergence to record: the document recommended **Vitest** for unit and
integration tests. The project uses **Jest**. Playwright was adopted as
recommended. The recommendation should be read as satisfied in substance, and the
document updated rather than left to look unmet.

---

## What would close the gaps

Ordered by value per unit of effort, for whoever picks this up:

1. **`skills_missing` structural regression test** — small. The spec explicitly
   demanded a schema test rather than a convention, and today it is a convention.
2. **`prompts.ts` unit tests** — small, and security-relevant: nonce uniqueness
   per call, and delimiter escaping when CV text contains a forged terminator.
3. **Route-level 429 and oversized-input rejection** — small; the limiter is
   already tested in isolation, so this is about driving a real route past it.
4. **The four untested endpoints** (`chat`, `cover-letter`, `health`, `upload`) —
   moderate; `analyze` and `rewrite` give the pattern to copy.
5. **Scroll-to-results e2e test** — small.
6. **`EmptyState` catalogue test** — moderate; requires reconciling
   `FAILURE_MODES_FINAL.md`'s list against the states actually implemented.
7. **The three edge cases** — moderate, and one of them (JD-in-the-wrong-box)
   needs a product decision about the message before a test can assert it.
8. **Icon contrast under WCAG 1.4.11** — manual review, not automatable by axe.

Two items are explicitly *not* on this list because they need a live
`GOOGLE_API_KEY` and belong to the live-smoke phase: the Stage 1 prompt-injection
assertion, and any end-to-end assertion about real model output.
