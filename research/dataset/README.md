# dataset/

## Format

One JSON object per line, in `vN/items.jsonl`. JSONL rather than one file per item: the set is small enough to read in one pass, and a single file makes the content hash in `manifest.json` — which is what lets a result prove which revision it evaluated — trivial to compute.

Blank lines and lines starting with `//` are skipped, so a labeller can leave a note in place.

```jsonc
{
  "item_id": "syn-0001",
  "mode": "job",                       // job | scholarship
  "cv_text": "...",                    // SYNTHETIC. Never a real person's CV.
  "opportunity_text": "...",           // synthetic, or a real public posting
  "gold_claims": [
    {
      "requirement": "At least 3 years of production React experience",
      "category": "experience",        // skill|experience|education|ats|research|leadership|academic
      "gold_status": "matched",        // matched | partial | gap
      "gold_evidence_span": "...",     // VERBATIM substring of cv_text, or null
      "labeler_id": "L1"               // pseudonym, never a real name
    }
  ],
  "identity_variant_of": null,         // base item_id, on Experiment 2 variants
  "variant_fields_changed": [],
  "construction_method": "synthetic",  // synthetic | synthetic-based-on-public-posting
  "construction_date": "2026-08-23",

  // Optional. Experiment 2 only — the literal strings to substitute.
  // An item without it is skipped by perturb.ts rather than guessed at.
  "perturbation_base": { "name": "Priya Raman", "institution": "University of Manchester" },

  // Optional. Scaffold items only; explains what the example demonstrates.
  "example_note": "..."
}
```

## Two rules the loader enforces, and why

**A `gap` claim must have `gold_evidence_span: null`.** A label asserting no evidence exists while quoting evidence is self-contradictory whoever wrote it. This is the same rule the production guard applies to model output, applied to human labels.

**A non-null span must appear verbatim in `cv_text`.** The model is instructed to quote exactly; holding gold labels to the same standard is what makes the faithfulness comparison mean anything. A paraphrased span would quietly weaken every evidence-extraction number computed from it.

Both are refusals, not warnings. A malformed item in a gold set is a labelling error, and coercing it would put a guess into the ground truth that every metric is measured against.

## Versioning

Each revision gets its own `vN/` folder and is **immutable once locked**. Corrections go in `vN+1/`.

`manifest.json` records the item count, construction date, labeller ids, the fixed calibration/test split, and a SHA-256 of `items.jsonl`. The loader checks that hash and refuses on a mismatch — a result file naming `v1` while `v1` has since been edited is a reproducibility failure that is invisible after the fact.

To recompute the hash after a deliberate change:

```bash
node -e "const{readFileSync}=require('fs'),{createHash}=require('crypto');console.log(createHash('sha256').update(readFileSync('v1/items.jsonl','utf8'),'utf8').digest('hex'))"
```

## The split

`manifest.json` fixes which items are calibration and which are test, and it must be written **before threshold calibration begins**. Calibrating the 0.85/0.55 thresholds against the same items used to report the final metric would invalidate the comparison.

Perturbation variants stay in their base item's split. `perturb.ts` generates them at run time rather than storing them, which makes this structurally true rather than a rule someone has to remember.

## Privacy

Every `cv_text` is invented by the labeller. Not anonymised, not borrowed-and-edited — invented. The product promises it never stores anyone's CV, and the research artefact ships with the thesis; it must not embarrass that promise.

`opportunity_text` may be a real public posting. Job adverts are not personal data. Note the source in `manifest.json` for attribution.

## Current contents

`v1/` holds **five scaffold items, not a dataset.** They exist to make the format unambiguous and to exercise the harness, and the manifest says `SCAFFOLD ONLY` in its own notes field.

| item | mode | demonstrates |
|---|---|---|
| `syn-0001` | job | Positive: mostly matched, one clear gap, one genuine partial |
| `syn-0002` | job | Negative: near-total mismatch, tests calm reporting of absence |
| `syn-0003` | job | Ambiguous: a real judgement call, plus one span cited by two requirements |
| `syn-0004` | scholarship | The research/leadership/academic categories; a gap no span can evidence |
| `syn-0005` | job | A soft requirement with circumstantial evidence |

**Writing the real 60–150 items, running the second-labeller pass, computing κ and locking `v1/` is human work and has not begun.** It is explicitly not something an implementation session does: labels generated mechanically are not a gold standard, and a gold set that agrees with the system by construction measures nothing.

See `../annotation/GUIDELINES.md` for how to label.
