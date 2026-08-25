# Testing Coverage Report — Phase 10

Measured against `TESTING_STRATEGY_FINAL.md`, category by category. This is a
report of what exists, not a restatement of what was planned. Where a category is
short, it says so and says what is missing.

**Suite as it stands:** 387 Jest tests across 24 suites, 21 Playwright tests
across 2 spec files, 45 further unit tests in `research/`. Nothing here has been
run against a live `GOOGLE_API_KEY`; every AI call is mocked or intercepted.

**Summary:** 7 of 12 categories genuinely covered, 4 partial, 1 obsolete in the
good direction.

| # | Category | Verdict |
|---|----------|---------|
| 1 | Unit tests | **Covered** — all 5 named modules |
| 2 | Integration tests | **Covered** |
| 3 | API tests | **Covered** — 6 of 6 endpoints, plus route-level 429 (one divergence, below) |
| 4 | Evidence verifier | **Covered** — all 7 adversarial cases (one accepted limitation, below) |
| 5 | AI schema validation | **Covered** — one clause architecturally unmeetable (below) |
| 6 | Frontend component tests | **Partial** — `EmptyState` catalogue not enumerated |
| 7 | End-to-end tests | **Partial** — scroll-to-results untested |
| 8 | Regression tests | **Covered** |
| 9 | Security tests | **Partial** — Stage 1 injection needs a live key |
| 10 | Accessibility | **Covered** |
| 11 | Edge cases | **Partial** — 5 of 7 |
| 12 | "What this document does not claim" | **Obsolete** — a runner now exists |

---

## Accepted limitations

Two findings below are **not defects and are not scheduled for repair**. Both are
properties of the design, established by test, and both belong in the thesis
limitations chapter as results rather than as outstanding work.

### L1 — Presence is not relevance: the verifier accepts a near-duplicate distractor

Where a CV contains two similar-but-distinct sentences and only one genuinely
supports the requirement, the verifier may accept the wrong one. It is asserted
in `tests/grounding.test.ts` under the name
`ADVERSARIAL — KNOWN LIMITATION: a near-duplicate distractor verifies, because
presence is not relevance`.

This follows from what Stage 2 is. It answers *"does this span exist in the CV"*
— a deterministic string question — and that is the entire reason it can be
trusted to check the model's work. Answering *"does this span support this
particular requirement"* is a judgment, and the only mechanism available for it
is a second model call, which would reintroduce precisely the hallucination
surface Stage 2 exists to remove. A verifier that could be wrong in the same way
as the generator it checks is not a verifier.

The boundary is therefore principled, not provisional: **grounding establishes
that evidence exists, not that it is apt.** `TESTING_STRATEGY_FINAL.md`
anticipated this and required it be "logged as a known limitation … not silently
assumed away".

### L2 — A boolean type guard cannot report which field failed

`TESTING_STRATEGY_FINAL.md` §AI schema validation asks that each required field
"fails with the correct error path (not a generic catch-all)". `isAnalysisDraft`
is a boolean type guard: it returns `false`. One rejection is indistinguishable
from another, so no test can assert a path that does not exist.

This is a consequence of a deliberate architectural choice — hand-written type
guards over a schema library — taken to keep the dependency surface minimal.
The cost is exactly this: **validation is total but not diagnostic.** It is
sufficient for the pipeline, which needs only a yes or no before the repair
attempt, and insufficient for field-level error reporting, which nothing
currently requires. Meeting the clause literally means adopting a schema library
and rewriting the guards — a design decision, recorded here rather than ticked
off or quietly dropped.

## One divergence between spec and implementation

Distinct from the above, because this one is a genuine open question rather than
a settled property.

### D1 — Oversized text input is truncated, not rejected

`TESTING_STRATEGY_FINAL.md` describes oversized input as *rejected* at the
boundary, in §API ("correct 4xx on missing/oversized input") and again in
§Security ("oversized CV/JD rejected at the boundary `createApiRoute` already
enforces"). It is not. `parseTextField` calls
`sanitizeText(value, options.max)`, which slices, and then checks only the
**minimum**. Over-length input is silently truncated and the request succeeds
with a 200.

Found while writing the `/api/chat` suite, where a test written to the document
failed. The suite now pins the real behaviour under the name
`TRUNCATES rather than rejects a message past the 500-character ceiling`, with
the divergence written out at the test.

**Not changed, because it is a product decision rather than a bug.** Truncating
an 8 001-character CV is arguably kinder than erroring on it; silently discarding
the last page of someone's CV without telling them is arguably worse. A third
option — truncate and say so — is not implemented. Whoever resolves this should
update the specification or the code, not the test.

---

## 1. Unit tests — Covered

All five named modules:

- `lib/analysis/grounding.ts` — `tests/grounding.test.ts`: normalization, fuzzy
  match, tier thresholds, plus the adversarial section in §4.
- `lib/analysis/aggregate.ts` — `tests/aggregate.test.ts`, including the
  zero-claims division guard ("is 0 and never NaN").
- `lib/scoring.ts` — `tests/scoring.test.ts`, band lookup plus the
  single-source-of-truth assertions in §8.
- `lib/ai/guards.ts` (shipped at `lib/analysis/guards.ts`) —
  `tests/guards.test.ts`, including the `gap`-with-non-null-quote rejection rule,
  which gets five tests of its own.
- `lib/prompts.ts` — **closed this pass.** `tests/prompts.test.ts`, 36 tests,
  covering both named obligations: nonce uniqueness per call (200 calls per
  builder, run inside one millisecond so the timestamp half is constant and the
  random half is what is actually under test) and delimiter behaviour.

On the second: there is no escaping, and that is the design. No character is
escaped and no terminator stripped — the block ends at a marker carrying an
unguessable token, so content authored before the request existed cannot forge
one. The tests assert the property that protects the prompt: a forged
`<<<END_CV:deadbeef>>>` does not close the block, the real terminator appears
exactly once and after the injected text, and the forgery survives verbatim as
data. Stripping would be the wrong fix twice over — it silently edits a
candidate's document, and it invites nesting terminators so one pass of stripping
produces a real one. The same is asserted for the JD box, the chat question and
the ADR-18 weak-requirements block.

One degenerate case is pinned rather than left implicit: `Math.random()`
returning exactly `0` leaves the random half empty, and an empty token would mean
a marker of `<<<CV:>>>` that any CV could forge. The timestamp half keeps it
non-empty. Mocked, not waited for.

Beyond the spec, seven further modules have unit coverage that was never asked
for: `errors.ts`, `validators.ts`, `ai-json.ts`, `locate.ts`, `history.ts`,
`ats-checks.ts`, `rate-limit.ts`.

## 2. Integration tests — Covered

`tests/api/analyze.test.ts` runs the full route against a mocked `generateJson`
and asserts the guard-validate → normalize → verify → aggregate → respond
ordering end to end, not merely the final shape. Both failure paths named in
`AI_PIPELINE_FINAL.md` are present: malformed JSON → repair → success, and
malformed JSON → repair → still malformed → `AI_INVALID_OUTPUT`. A third the spec
did not name is also covered — parses cleanly but fails the guard → repair →
success.

## 3. API tests — Covered

All six routes now have suites.

| Route | Tests | Notes |
|-------|-------|-------|
| `/api/analyze` | 22 | incl. the mandatory research-mode security tests |
| `/api/rewrite` | 9 | ADR-18 optional `claims` field |
| `/api/chat` | 16 | **new** — highest-frequency endpoint |
| `/api/cover-letter` | 13 | **new** — incl. the prose-not-JSON regression |
| `/api/health` | 9 | **new** — must never call the provider |
| `/api/upload` | 15 | **new** — the only bytes-in endpoint |

Plus `tests/api/rate-limit-route.test.ts` (10) and
`tests/api/schema-regression.test.ts` (12), which cross endpoints rather than
belonging to one.

Against the sub-requirements:

- **Correct 2xx shape** — covered for all six.
- **4xx on missing input** — covered.
- **4xx on oversized input** — **behaviour differs from the spec.** See D1.
  Tested as implemented.
- **Rate-limit 429 after threshold** — **closed this pass.**
  `tests/api/rate-limit-route.test.ts`, 10 tests at the route boundary rather
  than at the limiter: 15 AI requests then a 429; `Retry-After` present, integer,
  greater than zero and within the window; `retryAfter` in the body matching the
  header; `X-RateLimit-Remaining` counting down to 0; client isolation; and a
  blocked request never reaching the model, which is the entire point. The shared
  AI budget is asserted as designed — 15 calls to `/api/chat` block
  `/api/cover-letter` for the same client, in either order — and uploads are
  asserted to hold a genuinely separate 20/min bucket.
- **Research-mode header honored only when `RESEARCH_MODE_ENABLED=1`** —
  covered, in both directions, each marked `SECURITY:`.

Two behaviours worth stating because they look wrong and are not: a rejected
upload still spends a rate-limit token (otherwise invalid files are free to
hammer with), and `/api/health` answers 503 rather than 200-with-a-flag when
degraded (an orchestrator reads the status code).

## 4. Evidence verifier — Covered

The deepest coverage in the suite, as instructed. All seven required adversarial
cases have named tests in `tests/grounding.test.ts`:

| Required case | Result |
|---|---|
| Fabricated quote resembling real CV text | Capped at `unresolved` by the ADR-17 digit gate |
| Same fabrication diluted across a longer quote | Still caught |
| JD text quoted as if it were CV text | `unresolved`; only the CV is searched |
| Reworded-CV attack | `uncertain`, not `verified` — as the spec predicted |
| Empty-string quote | Identical to `null` |
| Quote spanning a normalization edge | Matches after normalization |
| Near-duplicate distractor | **Verifies — see L1** |
| Injection inside the candidate's own CV | Inert; Stage 2 calls no model |

Two regression guards the spec did not ask for protect against the digit gate
over-triggering: a quote whose numbers are correct is not gated, and a multi-digit
figure inside a longer token is not gated.

## 5. AI schema validation — Covered

Valid responses pass; the `gap`-with-quote malformed case is explicitly asserted
as rejected; required fields individually removed or mistyped are rejected
(verdict outside the allowed set, ATS check with unknown status, non-finite
score, category outside the set, status outside the model vocabulary, empty
required collections, and the whole draft when any single claim is malformed).

The "correct error path, not a generic catch-all" clause is **L2**.

## 6. Frontend component tests — Partial

- **`Tag`/`Badge`, `unresolved` never red** — covered twice over, at token level
  (`tests/doctrine.test.ts`, six tests, including "has no red mapping anywhere in
  the tag vocabulary at all") and at render level.
- **`EvidenceMarker`** (shipped as `ClaimMarker`) — covered: tier styling,
  accessible label, `aria-expanded`, keyboard operability, rationale on expand.
- **`ScorePanel` — no ring gauge present** — covered as a regression assertion,
  plus `tests/scoring.test.ts` asserting no colour-by-score function survives.
- **`EmptyState` variants, one test per `FAILURE_MODES_FINAL.md` state** —
  **still not covered as specified.** `tests/components/empty-states.test.tsx`
  (new, 14 tests) covers the zero-requirements state on both surfaces that render
  it, and empty states are tested where they occur elsewhere. Nothing enumerates
  the catalogue, so a state listed in `FAILURE_MODES_FINAL.md` with no surface at
  all would still not be caught.

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
  instead, because it catches a React render throw and no route, state or API
  response produces one on demand — the same reason `QA-REPORT.md` recorded it as
  unverified. Mounting the component directly is the only honest way to assert
  its contract, but it should be read as a component test, not an e2e one.

## 8. Regression tests — Covered

- **No `role`/`aria` regression on `Hallmark`/`Badge`, asserting the attributes
  exist** — covered. `e2e/accessibility.spec.ts` asserts the single-sentence
  accessible name is present *and* that the old "73 / Match / GOOD" fragments are
  gone from the tree rather than merely supplemented.
- **Single source of truth for score bands** — covered. `BANDS` covers 0–100 with
  no gap and no overlap, one band per verdict, no second definition surviving.
- **No reintroduction of a flat `skills_missing` field** — **closed this pass.**
  `tests/api/schema-regression.test.ts`, 12 tests across three layers, because
  any one alone is escapable: the live `/api/analyze` response walked to any
  depth (standard *and* research mode, since more fields on the wire is more
  surface for the old one to reappear on); the declared shapes read as source,
  since TypeScript is erased at runtime and a field declared but never populated
  is invisible to a response walk; and a mocked model response that emits the
  field anyway, proving the route drops it rather than forwarding it. Two
  near-miss spellings are banned alongside the original, and the key-walker
  itself has three tests — a regression test whose detector is broken passes
  forever and protects nothing.

  It was previously "protected" by a prose comment in `ChatTab.tsx`, which is
  exactly the convention the spec's clause was written to rule out. The comment
  now points at the test; it used to be the other way round.

## 9. Security tests — Partial

- **Nonce mechanism holds** — **closed this pass**, see §1.
- **Injection fixtures asserting the final output contains no attacker-controlled
  instruction-following** — **not covered, and not coverable without a live key.**
  The surrounding defence is covered: invisible and bidi characters stripped
  (`validators`, and now asserted through `/api/chat` and `/api/upload` as well),
  and an injection inside the CV proven inert against Stage 2 because Stage 2
  calls no model. The remaining assertion is about what a real model does with a
  real prompt and belongs to the live-key smoke test.
- **Input-size limits** — minimum enforced and tested; maximum is **D1**.
- **Rate limits** — **closed this pass**, see §3.
- **Magic-number verification on uploads** — covered, and worth naming: both the
  extension and the `Content-Type` are attacker-controlled, so arbitrary bytes
  wearing a `.pdf` name and MIME type are rejected before `pdf-parse` is handed
  anything.

Unasked-for coverage worth noting: numerous tests assert internal detail never
reaches a user-visible surface — provider names, quota ids, project numbers,
byte counts, parser names, route names in rate-limit details, and the model
output inside `parseModelJson` failures, which contains the CV.

## 10. Accessibility — Covered

`e2e/accessibility.spec.ts` runs axe-core (WCAG 2.1 A and AA) over seven page
states: `/analyze` before submission, the results screen with all three evidence
tiers, the results screen with a rationale popover open, each of the four tools
tabs scanned separately (three never render until selected), the landing page,
the privacy page and the not-found page. All green.

Both violations the spec names by hand are closed and pinned by attribute-level
assertions that duplicate the sweep on purpose — a sweep would pass just as green
if someone deleted `Hallmark`'s `sr-only` sentence and axe happened not to flag
the replacement:

- **`Hallmark`'s missing `role`/label** — closed. Announces "Match 73 out of 100,
  band GOOD." as one sentence; the separate fragments are out of the tree.
- **`error.tsx`'s absent error announcement** — closed. `role="alert"` with
  `aria-live="assertive"`, asserted in both the e2e sweep (for the inline
  surface, so the two cannot drift) and `tests/components/error-page.test.tsx`
  (for the boundary itself).

The sweep also found three defects the component-level jest-axe suite could not:
nine components using alpha-composited text below AA (fixed by the `--text-faint`
token), decorative `/` and `·` separators read aloud as text (fixed with
`aria-hidden`), and the error boundary's silence.

**Icon contrast under WCAG 1.4.11 — closed this pass, by manual review.** axe does
not check it, so this is a manual claim and the sweep passing is not evidence for
it. `ComparisonSection`'s `Minus` was the real defect: it carries
`aria-label="No"`, which makes it a meaningful graphic subject to the 3:1
requirement, and at `--text-muted/0.6` it did not clear it. Now `--text-faint`, at
5.68:1. The two registration marks owed no fix — both are `aria-hidden` artwork
and 1.4.11 exempts purely decorative graphics — but were moved off dimmed text
tokens onto `--border-strong`, which is the family a quiet non-text rule belongs
to. No alpha-composited colour token now remains in `src/` except the six
decorative separators, which are `aria-hidden` and convey nothing.

**What this still does not claim.** axe covers roughly the machine-checkable third
of WCAG. It cannot judge whether a label is meaningful or a reading order
sensible. A green run is a floor, not a certificate.

## 11. Edge cases — Partial

| Case | Covered |
|---|---|
| Empty CV | Yes — 400 below minimum length |
| Empty JD | Yes — same mechanism |
| CV with zero extractable claims | Yes — as a defined empty state, end to end |
| JD with zero requirements | Yes — same path |
| **CV that is actually a JD pasted into the wrong box** | **Yes — closed this pass** |
| Non-English input (graceful non-crash) | **No** |
| Extremely long CV, near the size limit | **No** — and see D1 |

The swapped-documents case was a product gap before it was a test gap: there was
no message to assert. No detection logic was added and none should be — a CV in
the description box gives Stage 1 nothing to extract, so it returns zero claims
and lands on the empty state `AI_PIPELINE_FINAL.md` already defines.

What changed is the copy. `RequirementChecklist` previously said only "Try
pasting the full text, including the responsibilities and qualifications
sections" — useful for an incomplete description and actively wrong for a swap,
since re-pasting a description that was never in the box cannot help. Both
surfaces now name the mix-up first and keep the incomplete-description advice
second, because the two causes produce an identical result and nothing downstream
can tell them apart.

The copy deliberately stops short of asserting the swap: the same near-empty
result comes from a terse description, a bulleted ad, or a language the model
handled poorly, so a message stating it as fact would be wrong more often than
right. There is a test asserting the copy does *not* say "you swapped".

## 12. "What this document does not claim" — Obsolete, in the good direction

`TESTING_STRATEGY_FINAL.md` closes by stating that no test suite exists with this
coverage and that "`careerlens/` today … has no test runner configured at all".
Both statements are out of date. A runner exists and 408 automated tests run
against it.

One divergence to record: the document recommended **Vitest** for unit and
integration tests. The project uses **Jest**. Playwright was adopted as
recommended. The recommendation should be read as satisfied in substance, and the
document updated rather than left to look unmet.

---

## What is left

1. **Scroll-to-results e2e test** — small.
2. **`EmptyState` catalogue test** — moderate; requires reconciling
   `FAILURE_MODES_FINAL.md`'s list against the states actually implemented.
3. **Non-English input**, asserting graceful non-crash rather than correct
   extraction — small.
4. **Extremely long CV near the size limit** — small, but resolve **D1** first,
   since the expected behaviour is the thing in question.
5. **Unit coverage for `HistoryPanel`, `AnalyzeTool`, the tools tabs and
   `Hallmark`** — moderate; all four have e2e coverage today.

Not on this list, because they need a live `GOOGLE_API_KEY` and belong to the
live-smoke phase: the Stage 1 prompt-injection assertion, and any end-to-end
assertion about real model output.

Not on this list because they are settled: **L1** and **L2**.
