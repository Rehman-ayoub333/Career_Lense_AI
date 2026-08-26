# Research Contribution — Final

This document states the academic contribution precisely, without exaggeration. It is the canonical научный statement; `CAREERLENS_MASTER_RESEARCH_AUDIT.md` remains the record of the literature review and reasoning that produced it, and `RESEARCH_EVALUATION_FINAL.md` owns the metrics/protocol detail. Nothing here should be restated differently there.

## Research problem
LLM-based CV–opportunity matching tools (CareerLens's prior version included) present claims — "this skill is missing," "this requirement is met" — with no mechanism forcing the claim to be checkable against the source document, so a fabricated claim is visually and structurally indistinguishable from a true one.

## Research gap
Established literature separately covers (a) hallucination/faithfulness measurement for LLMs in general, and (b) bias in LLM-based resume-job matching specifically — but no surfaced work applies span-level evidence grounding *and* measures whether that grounding also affects identity-driven score variance, in the CV-matching domain specifically. Full citations in `CAREERLENS_MASTER_RESEARCH_AUDIT.md` §4 — not repeated here to avoid two documents disagreeing about a reference list over time.

## Research questions
**RQ1 (primary):** Does requiring span-level evidence grounding in LLM-based CV-requirement matching reduce the rate of unsupported (hallucinated) claims, compared to an ungrounded baseline, on a hand-labeled dataset?
**RQ2 (secondary, same harness):** Does span-level evidence grounding reduce the variance in match outcome attributable to candidate name/institution, compared to the ungrounded baseline, holding substantive CV content fixed?

## Hypotheses
**H1:** The grounded pipeline has significantly higher faithfulness and significantly lower hallucination rate than the ungrounded baseline. **H0:** No significant difference.
**H2:** The grounded pipeline shows significantly lower score variance across identity-perturbed variants than the ungrounded baseline. **H0:** No significant difference.
Both remain genuinely open. **No numerical result is claimed anywhere in this repository before the experiments in `RESEARCH_EVALUATION_FINAL.md` are actually run.**

## Proposed approach, summarized (full spec: `EVIDENCE_VERIFICATION_SPEC.md`, `AI_PIPELINE_FINAL.md`)
Stage 1 (LLM): extract structured `RequirementClaim`s, each with a literal-or-near-literal `evidence_quote` or an explicit `null`. Stage 2 (deterministic, no LLM): verify each quote against the actual source text via normalized fuzzy substring matching. The model never sees or influences its own verification outcome — this separation is what makes RQ1 falsifiable rather than circular.

## Evidence states — precise definitions
| State | Assigned when | Evidence required | UI meaning | Evaluation meaning |
|---|---|---|---|---|
| **VERIFIED** | Deterministic match score ≥ 0.85 between `evidence_quote` and the source text (exact spec: `EVIDENCE_VERIFICATION_SPEC.md`) | A quote that mechanically exists in the source, normalized | Green marker, "verified" text label | Counts toward `evidence_coverage`; a `verified` claim on a synthetic-dataset item with a known-false gold label is a **false positive**, tracked separately |
| **UNCERTAIN** | Match score 0.55–0.85, OR the model's own `status` was `partial` | A quote that partially or ambiguously matches | Amber marker, "uncertain" text label | Not counted as faithful or hallucinated by default; the escalation study (Stage 2b, if built) attempts to resolve these further |
| **UNRESOLVED** | Match score < 0.55, OR `evidence_quote` was `null`, OR the model's `status` was `gap` | None found, or none offered | Neutral-slate marker (deliberately calm, never red), "unresolved" text label | Two sub-cases tracked internally for research purposes only: `evidence_quote: null` (an honest gap) vs. a non-null quote that wasn't found (`hallucination_candidate: true` — the primary quantity RQ1 measures) |

## Novelty — stated honestly
**Novel, as engineering applied to this domain:** the specific combination of (a) forcing the extraction schema to carry per-claim evidence, (b) verifying that evidence deterministically rather than trusting the model's self-report, and (c) reusing the resulting harness to test an identity-perturbation fairness hypothesis in the same pass. **Not novel:** schema-constrained decoding (standard practice); fuzzy string matching (a decades-old technique); the general concept of faithfulness measurement for LLMs (an active, well-populated literature, cited in the audit). **The contribution is the application and the joint measurement, not a new algorithm.** A thesis built on this should not oversell the matching algorithm itself as the innovation — it isn't.

## Limitations, stated explicitly
Single-model evaluation (Anthropic Claude Haiku 4.5, `claude-haiku-4-5-20251001`, only — no claim about LLMs generally; per ADR-22 this replaced Gemini 2.5 Flash, which does not widen the claim, since one model was evaluated either way). Small, synthetic, student-labeled dataset (60–150 items) — results are directional, not population-level. The deterministic matcher's thresholds (0.85/0.55) are a design choice requiring calibration against the labeled set before being trusted, not a validated constant. `hallucination_candidate` flags a claim as *suspicious*, not confirmed false — a genuine paraphrase below the match threshold is a false positive of the detector, not of the model, and error analysis must distinguish these (`RESEARCH_EVALUATION_FINAL.md`).

## Expected research contribution
**Not claimed yet.** What this plan commits to producing: a working grounded pipeline, a labeled evaluation set, and two experiments whose results — whatever they are, including a null result on either hypothesis — are reported honestly in the thesis. If H1 and H2 both hold, the contribution is a validated joint intervention. If only H1 holds, the contribution is a validated grounding mechanism with an open fairness question. If neither holds, the contribution is a rigorous negative result plus a reusable evaluation harness for this domain — still a legitimate, if more modest, thesis outcome, and one this document explicitly permits as an honest possible ending.
