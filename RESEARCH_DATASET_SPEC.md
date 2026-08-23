# Research Dataset Specification

**DATASET COLLECTION REQUIRED.** No labeled dataset exists in this repository at the time of this planning pass. `DEMO_CV`/`DEMO_JD` in `AnalyzeTool.tsx` are two unlabeled placeholder strings used only to avoid a blank input screen — they are not, and must never be represented as, research data. This document specifies the schema and process; it does not, and must not, contain fabricated example "results," only structurally-illustrative examples clearly marked as such.

## Dataset schema (one JSON object per line, `research/dataset/v1/items.jsonl`)
```json
{
  "item_id": "string, unique, e.g. \"syn-0042\"",
  "mode": "job | scholarship",
  "cv_text": "string — SYNTHETIC, constructed by the labeler, not a real person's CV",
  "opportunity_text": "string — a real, publicly-posted job description/scholarship criteria, OR synthetic",
  "gold_claims": [
    {
      "requirement": "string",
      "category": "skill | experience | education | ats | research | leadership | academic",
      "gold_status": "matched | partial | gap",
      "gold_evidence_span": "string | null — the exact CV substring a human labeler identifies as supporting this requirement, or null",
      "labeler_id": "pseudonymous id, e.g. \"L1\""
    }
  ],
  "identity_variant_of": "item_id | null — set on perturbation-generated variants (Experiment 2), pointing back to the base item",
  "variant_fields_changed": ["name", "institution"],
  "construction_method": "synthetic | synthetic-based-on-public-posting",
  "construction_date": "ISO 8601"
}
```

## Annotation format and rules — full detail in `research/annotation/GUIDELINES.md` (this section summarizes what that file must contain)
- **`gold_status`** rules: `matched` requires the labeler to find CV text a reasonable reader would accept as evidence; `gap` requires confirming no such text exists anywhere in the item; `partial` covers a genuine middle case (related but incomplete evidence) — labelers must not use `partial` as a default when unsure; unsureness gets flagged for adjudication (below), not silently defaulted.
- **`gold_evidence_span`** must be copied verbatim from `cv_text`, exactly as the model is instructed to do — this symmetry is deliberate, since it's what makes the faithfulness comparison meaningful.
- **Positive examples:** items where most requirements are genuinely `matched`. **Negative examples:** items with several deliberate, unambiguous `gap`s. **Ambiguous examples:** items with at least one genuinely `partial` case, included deliberately — a dataset with no ambiguous items would understate the real difficulty of the task and inflate every metric.
- **Evidence-verification labels** (`gold_status`/`gold_evidence_span`) are what the deterministic verifier and Stage 1 model output are both compared against — this is the ground truth for Experiment 1's precision/recall/F1.

## Inter-annotator agreement
At least a second labeler independently labels a fixed subsample (recommended: 20% of the full set, minimum 15 items) without seeing the first labeler's labels. Agreement computed per-field: exact-match rate on `gold_status` (three-way categorical — report Cohen's κ, not raw agreement, since raw agreement overstates chance-level agreement on an imbalanced label set) and a fuzzy-match check on `gold_evidence_span` (using the same normalization/overlap logic as `EVIDENCE_VERIFICATION_SPEC.md`, since disagreement about *which* span counts as evidence is itself a data point worth capturing with the same yardstick the system uses). Disagreements are adjudicated by discussion and the resolved label is what ships in `items.jsonl`; the pre-adjudication two-labeler data is retained in `research/annotation/raw/` for the κ calculation and for the thesis's reproducibility appendix.

## Train/validation/test strategy
Given the small target size (60–150 items), a single held-out split is used rather than k-fold: roughly 70% for threshold calibration (`EVIDENCE_VERIFICATION_SPEC.md`'s 0.85/0.55 thresholds are tuned only against this portion), 30% held out and untouched until the final Experiment 1/2 numbers are computed. **This split must be fixed and recorded (`manifest.json`) before calibration begins** — calibrating thresholds against the same data used to report the final metric would invalidate the comparison, and is exactly the leakage this section exists to prevent.

## Leakage prevention
Perturbation variants (Experiment 2) generated from a base item must stay in the same split as their base item — a variant in the test split whose base item was used for threshold calibration would leak information about that specific CV's phrasing into the "held-out" evaluation.

## Dataset versioning
Each revision gets its own `research/dataset/vN/` folder; `manifest.json` records item count, construction date, split assignment, and a content hash of `items.jsonl` so a later run can verify it evaluated against the exact version it claims to have.

## Anonymization / privacy
Every `cv_text` is synthetic by construction — invented by the labeler(s), not derived from any real person's actual resume, specifically so this dataset never becomes something the project's own privacy promise ("we never store your CV") would be embarrassed by. `opportunity_text` may be drawn from real, already-public job postings (job postings are not personal data), with the source noted informally in `manifest.json` for attribution, not for any privacy reason.

## What is scaffolded now vs. what requires human work
**Scaffolded by this planning pass:** the schema above, the folder structure, the annotation-guideline outline. **Requires human work, explicitly not simulated or fabricated here or during implementation:** writing the 60–150 synthetic CVs and their gold labels, running the second-labeler pass, computing real κ, and only then locking `v1/` as the dataset the experiments run against. `CLAUDE_CODE_FINAL_KICKOFF.md` already instructs the implementation session to stop after producing 3–5 fully worked examples and the format scaffold, and to report the remainder as a human task — restated here as this document's own binding instruction, not merely inherited from the kickoff file.
