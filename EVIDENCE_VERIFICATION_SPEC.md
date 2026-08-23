# Evidence Verification Specification

This is the specification for `careerlens/src/lib/analysis/grounding.ts` — the module the entire research contribution and the entire "no red missing-skill tags" product fix both depend on. It must be implemented exactly as specified; deviations belong in `ARCHITECTURAL_DECISION_REGISTER.md`, not silently in code.

## Evidence lifecycle
```
Claim (from Stage 1, model output)
 ↓
Evidence quote (evidence_quote: string | null)
 ↓
Normalization (of BOTH the quote and the full source CV text)
 ↓
Deterministic search (sliding-window token-overlap match)
 ↓
Match analysis (best-window score → tier)
 ↓
Verification status (verified | uncertain | unresolved)
 ↓
UI representation (marker colour/label, per DESIGN_SYSTEM_FINAL.md)
```

## Normalization rules (applied identically to the quote and to the source text before comparison — never compare raw strings)
1. **Case:** lowercase both.
2. **Whitespace:** collapse all runs of whitespace (including newlines, tabs) to a single space; trim leading/trailing.
3. **Punctuation:** strip all characters that are not Unicode letters, Unicode digits, or spaces (this deliberately removes commas, periods, parentheses, bullets, dashes — CVs are punctuation-inconsistent and the match must not fail over a missing comma).
4. **Quotation marks:** normalize curly quotes (`'` `'` `"` `"`) to straight equivalents before the punctuation-strip step removes them anyway — stated explicitly so the strip step's behavior here isn't accidental.
5. **Unicode:** apply `NFKC` normalization before the above, so visually-identical characters encoded differently (common in copy-pasted CVs from Word/PDF) compare equal.
6. **Sentence boundaries:** NOT segmented. The matcher operates on the normalized token stream directly; sentence boundaries are irrelevant to whether a phrase exists in the text, and segmenting introduces a second source of normalization bugs for no benefit here.

## Deterministic search algorithm
1. Tokenize the normalized quote into words; let `n` = token count. If `n === 0` (see "empty quote" below), skip search entirely.
2. Tokenize the normalized source text into words; slide a window of length `n` (and, to tolerate minor insertions/omissions, also `n-1` and `n+1` where `n > 3`) across the source token stream.
3. At each window position, compute the token-overlap ratio: `|intersection(window_tokens, quote_tokens)| / n` (set intersection, not sequence — order-tolerant, since a model paraphrase may reorder within a clause; this is a deliberate, documented choice, not an oversight — record any change to it in the decision register).
4. Take the maximum ratio across all window positions as the claim's `match_score`.
5. Threshold: `match_score ≥ 0.85` → **verified**. `0.55 ≤ match_score < 0.85` → **uncertain**. `match_score < 0.55` → **unresolved**.
6. **These thresholds are provisional, not final, until calibrated against the labeled dataset (`RESEARCH_DATASET_SPEC.md`) — the calibration step itself is a required Phase 2 research task, not optional polish. Record the calibrated values, once chosen, in `ARCHITECTURAL_DECISION_REGISTER.md`.**

## Rule: the verifier must be deterministic
No LLM call exists anywhere inside `grounding.ts`. If Stage 2b (adjudication escalation, `AI_PIPELINE_FINAL.md`) is built, it is a *separate*, optional, clearly-named module (`grounding-adjudication.ts` or similar) that consumes `grounding.ts`'s output and may *upgrade* an `uncertain` verdict — it never runs before or instead of the deterministic check, and it must never be able to downgrade a `verified` result, only resolve an `uncertain` one toward `verified` or `unresolved`.

## Scenario table — every case named in the brief, resolved explicitly

| Scenario | Detection | Result |
|---|---|---|
| **Exact evidence exists** | Normalized quote appears verbatim in a window of the normalized source | `match_score = 1.0` → `verified` |
| **Normalized evidence exists** (case/punctuation/whitespace differs but content is identical) | Normalization collapses both to the same token stream | `match_score = 1.0` → `verified` (this is the normal case for real CVs, not an edge case) |
| **Partial match** (some but not all quote tokens present in any single window) | Best window's overlap ratio lands in `0.55–0.85` | `uncertain` |
| **No evidence exists** | Best window's overlap ratio `< 0.55` across the entire source | `unresolved`, `hallucination_candidate: true` (since `evidence_quote` was non-null) |
| **Evidence is ambiguous** (the quote matches well at multiple, non-overlapping positions — e.g. a common phrase repeated) | Multiple windows score ≥ 0.85 | Still `verified` — ambiguity about *where* in the document doesn't weaken *whether* the content exists. The UI's `ClaimMarker` may highlight only the first strong match, or all of them (`FRONTEND_COMPONENT_ARCHITECTURE.md` decides the UI behaviour; the verification tier itself is unaffected) |
| **Model produces fabricated evidence** (quote asserted, not found) | Same as "no evidence exists" | `unresolved`, `hallucination_candidate: true` — this is the primary quantity `RESEARCH_EVALUATION_FINAL.md`'s Experiment 1 measures |
| **Model produces an empty quote** (`evidence_quote: ""`, not `null`) | Treated as a schema/guard violation, not a verification case — `guards.ts` must reject or coerce `""` to `null` before this module ever sees it (a claim with `status: 'matched'` and an empty-string quote is a malformed response, handled at the validation boundary, not the verification boundary) | Never reaches `grounding.ts` in this state |
| **Model quotes text from the job description instead of the CV** | The verifier only ever searches the CV text (its one and only source parameter) — a JD-sourced quote will simply fail to match unless the phrase coincidentally also appears in the CV | `unresolved`, `hallucination_candidate: true` — correctly caught as a grounding failure, since the claim is supposed to be evidence *from the CV* |
| **Model changes the wording of the CV** (a real paraphrase, not a fabrication) | Token-overlap ratio degrades gracefully with paraphrase distance rather than failing to `0` on any change | Likely `uncertain`, sometimes `verified` if the paraphrase preserves most content words — this graceful degradation is exactly why token-overlap was chosen over exact-substring matching, and is the reason the `uncertain` tier exists at all rather than a binary verified/unresolved split |

## What happens in the UI (cross-reference, not restated in full — see `FRONTEND_UX_SPEC_FINAL.md`/`DESIGN_SYSTEM_FINAL.md`)
`verified` → green marker + "Verified" text. `uncertain` → amber marker + "Uncertain" text. `unresolved` → neutral-slate marker + "Not found in your CV" text — **never** "you don't have this skill." `hallucination_candidate` is never surfaced in the standard UI at all; it exists only in research-mode payloads and evaluation scripts.

## What happens during evaluation (cross-reference — see `RESEARCH_EVALUATION_FINAL.md`)
Faithfulness rate = `verifiedCount / total` on items where the gold label agrees the requirement is genuinely met. Hallucination rate = fraction of claims with `hallucination_candidate: true`. Both computed per-item and aggregated across the dataset, never estimated from a single example.

## Distinguishing "no evidence found" from "candidate lacks the skill" — enforced, not just documented
This distinction is structural, not a UI copy choice that could drift: the type system has no field anywhere named `lacks_skill` or similar, and `unresolved` claims carry no negative assertion about the candidate — only about the document. `key_actions`/interview-question prompts (`PROMPT_ARCHITECTURE_FINAL.md`) are instructed to phrase gap-derived recommendations as "add evidence of X" or "clarify your experience with X," never "you don't have X." This rule is enforced at three independent points — the data model (no such field exists), the prompt instructions (explicit forbidden phrasing), and the UI copy (`FRONTEND_UX_SPEC_FINAL.md`'s literal microcopy) — specifically so no single missed review catches all violations; a reviewer checking any one of the three layers will still catch a regression.
