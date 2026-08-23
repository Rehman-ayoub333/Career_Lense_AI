# Prompt Architecture — Final

All prompts continue to live exclusively in `lib/prompts.ts` (unchanged, preserved rule). The nonce-delimited `wrapUntrusted`/`INJECTION_NOTICE` mechanism is unchanged and must wrap the CV and opportunity text in every prompt below exactly as it does today — **this document specifies the instructional text around that mechanism, not a replacement for it.**

## Prompt 1 — Job-mode claim extraction (`getJobAnalysisPrompt`)
**Purpose:** produce `score`, `verdict`, `claims[]`, `key_actions`, `salary_range`/`context`, `interview_questions`, `ats_checks`. **Inputs:** sanitized `cvText`, sanitized `jdText`. **Output schema:** `ANALYSIS_SCHEMA` per `DATA_CONTRACTS_FINAL.md`. **Constraints:** score honestly (unchanged rule — a candidate missing a core requirement scores below 50 regardless of other strengths); `key_actions` derived preferentially from `gap`-status claims. **Forbidden behavior, explicit:**
- Never write a `rationale` asserting a fact about the candidate as a person (e.g. "does not have this skill") — only about the document ("no mention of X appears in the CV"). This is the single most important instruction in this prompt and should be stated more than once in the prompt body if that measurably improves compliance during testing.
- Never invent an `evidence_quote` — if uncertain whether text truly supports a requirement, use `status: 'partial'` and quote the closest available text, or `status: 'gap'` with `evidence_quote: null`. **Absence of a mention is never proof the skill is absent from the candidate's actual life — only from this document** — the model must not treat the two as equivalent in its own reasoning, and the prompt says so explicitly.
- `evidence_quote`, when non-null, must be copied from the CV text, never from the job description.
- `evidence_quote` must be a near-verbatim span (light paraphrase for grammar is tolerable; summarizing a whole paragraph into a quote is not) — the deterministic verifier's tolerance is calibrated to light paraphrase, not summary.
**Example (abbreviated):** *"For each requirement in the job description, decide: does the CV provide evidence? Quote the exact CV text that shows it, or say there's none. Never guess evidence you can't quote."*

## Prompt 2 — Scholarship-mode claim extraction (`getScholarshipAnalysisPrompt`)
As above, with the existing scholarship-specific evaluation framing (research potential, leadership, academic record, community impact, programme fit) preserved, and `category` values extended to `research`/`leadership`/`academic` for those axes. **Correction (post-Phase-1):** this document previously said `scholarship_specific_tips` was unchanged. `DATA_CONTRACTS_FINAL.md`'s canonical `AnalysisResult` omits this field, and Master Plan §11.1 independently omits it too — this document's line was the stale outlier. Per the stated precedence rule (types/shapes are governed by `DATA_CONTRACTS_FINAL.md`), the field is removed. See `ARCHITECTURAL_DECISION_REGISTER.md` ADR-12.

## Prompt 3 — CV rewrite (`getRewritePrompt`)
**Change from current:** the instruction to select "bullets with the most room to improve" now explicitly prioritizes bullets touching `gap`/`uncertain`-tier requirement categories, so the rewrite tool visibly connects to what the evidence view already told the user was weak. **Unchanged:** index-aligned original/rewritten pairs, no fabricated metrics, preserve stated quantities exactly.

## Prompt 4 — Cover letter (`getCoverLetterPrompt`)
**Unchanged.**

## Prompt 5 — Chat (`getChatPrompt`)
**Unchanged for MVP.** SHOULD-HAVE extension: include a compact claims summary so the model can answer "why is Docker marked unresolved" with the same rationale the UI shows, rather than re-deriving an answer from scratch.

## Prompt 6 (SHOULD-HAVE) — Adjudication escalation
**Purpose:** resolve a batch of `uncertain`-tier claims. **Inputs:** an array of `{ requirement, evidence_quote, cv_excerpt_window }` pairs (the window, not the whole CV, to keep the call small). **Output schema:** array of `{ id, verdict: 'support' | 'no_support' | 'partial' }`. **Constraints:** narrow, single-purpose — must not be asked to re-score, re-write, or otherwise touch anything but the yes/no/partial verdict. **Forbidden:** upgrading a claim to full support without the quoted excerpt genuinely containing it — same "no fabrication" rule as Prompt 1, restated for this narrower context because it handles the same class of untrusted content and deserves the same explicit guardrail, not an inherited one a reader might miss.

## Fallback prompt (JSON repair)
Unchanged (`getJsonRepairPrompt`) — terse by design, not re-explained at length, per the existing, tested reasoning that a long re-explanation causes over-correction.

## Validation of prompt behaviour
Not tested by asserting exact output text (LLM output is non-deterministic even at `temperature: 0` in practice) — tested by: (a) schema-shape unit tests against captured fixture responses, (b) the adversarial-input security tests (`TESTING_STRATEGY_FINAL.md`), and (c) the Experiment 1 evaluation harness itself, which is the real measure of whether these forbidden-behavior instructions actually work, not an assumption that writing them down is sufficient.

## Prompts are documented here as specification, not implemented in this planning pass
Per the task's explicit instruction — the exact final prompt strings are an implementation task for the Claude Code kickoff session, using this document's purpose/inputs/outputs/constraints/forbidden-behavior structure as the brief for each one.
