# Annotation Guidelines

How to label an item for `research/dataset/vN/items.jsonl`. Written to be followed by a second labeller who has not read the code, because that is exactly who will use it.

## What you are labelling

For one CV and one opportunity, you produce a list of **gold claims**: every requirement the opportunity states, and whether the CV evidences it.

You are labelling **the document**, not the person. The question is never "would I hire them" or "are they good enough". It is only: *does this text contain evidence for this requirement?* Every rule below follows from that one.

## Step 1 — extract the requirements

Read the opportunity text and list every distinct requirement it actually states.

- Split compound requirements. "TypeScript and GraphQL" is two requirements, because the CV can evidence one and not the other.
- Do not invent requirements the posting does not state. If it never mentions a degree, there is no education requirement, however obviously one might be expected.
- Include soft and structural requirements if they are stated ("comfortable owning on-call", "willing to travel").
- Preferences count. "Rust is a plus" is a requirement with a low bar, not a non-requirement.

Assign each a `category`: `skill`, `experience`, `education`, `ats`, or — scholarship mode only — `research`, `leadership`, `academic`.

## Step 2 — assign `gold_status`

Exactly one of three.

**`matched`** — the CV contains text a reasonable reader would accept as evidence for this requirement. Not "the candidate probably can"; the text has to say so.

**`gap`** — you have read the whole CV and there is no such text anywhere. `gap` is a claim about the document that requires you to have actually checked it, not a default for anything you did not find on first read.

**`partial`** — a genuine middle case: related evidence that does not fully meet the requirement. "Some SQL" against "strong SQL". "Led a team" against "mentored junior engineers" — leadership is evidence of seniority, not specifically of mentoring.

> **`partial` is not "I'm not sure".** It is a positive finding about the evidence, not a hedge about your confidence. If you genuinely cannot decide, flag the item for adjudication (Step 5) rather than defaulting to `partial`. A dataset where `partial` absorbs every uncertainty teaches nothing, because the label stops meaning anything specific.

## Step 3 — copy the `gold_evidence_span`

For `matched` and `partial`, copy the supporting text **verbatim** from `cv_text`.

- Character-for-character. The loader rejects a span that is not an exact substring, and it does so on purpose: the model is told to quote exactly, and the whole faithfulness comparison depends on both sides being held to the same standard. A paraphrased gold span would quietly weaken every evidence-extraction number computed from it.
- Quote the **strongest single** span. Not the whole section, not several sentences joined.
- Prefer the most specific text. "Cut p99 latency from 900ms to 210ms" beats "worked on performance".
- The same span may support more than one requirement. That is fine and normal.

For `gap`, the span is `null`. Always. A gap with a span is a contradiction and the loader rejects it.

## Step 4 — record who labelled it

`labeler_id` is a pseudonym (`L1`, `L2`). Never a real name — the dataset ships with the thesis.

## Step 5 — flagging and adjudication

If you cannot decide, do not guess. Add the item to `research/annotation/OPEN.md` with the requirement and what the difficulty is, and move on.

### Second-labeller pass

1. A second labeller independently labels a fixed subsample — **20% of the set, minimum 15 items** — without seeing the first labeller's output.
2. Both raw label sets are kept in `research/annotation/raw/` (`L1-<item_id>.json`, `L2-<item_id>.json`). They are not overwritten by adjudication, because κ is computed from the pre-adjudication data and the thesis needs it reproducible.
3. Agreement is computed per field: Cohen's κ on `gold_status`, and fuzzy overlap on `gold_evidence_span` using the same normalisation the production verifier uses.
4. Disagreements are resolved by discussion. The resolved label is what ships in `items.jsonl`.

κ is reported honestly, whatever it is. A low κ is a finding about task difficulty — it means the F1 numbers computed against this set cannot support a strong precision claim, and saying so is worth more than a number that looks better than the data.

## Step 6 — item composition

A useful set is not uniformly easy. Aim for a mix:

- **Positive** items where most requirements are genuinely matched.
- **Negative** items with several deliberate, unambiguous gaps.
- **Ambiguous** items with at least one genuine `partial`.

Deliberately include ambiguous items. A set with none would understate the real difficulty of the task and inflate every metric computed from it.

## Rules that are not negotiable

- **`cv_text` is synthetic.** Invented by you, never a real person's actual CV, even with the name changed. The product promises it never stores anyone's CV; the research artefact must not embarrass that promise.
- **`opportunity_text`** may come from a real public posting (job adverts are not personal data). Note the source in `manifest.json` for attribution.
- **Never label to make the system look good.** You will sometimes know what the pipeline will say. Label what the document supports, not what would produce a tidy result. The point of a gold set is that it can disagree with the system.
- **Do not edit a locked dataset version.** Corrections go in a new `vN+1/` folder. A result file naming `v1` must be checkable against the `v1` that produced it — the loader verifies the content hash for exactly this reason.

## Worked examples

The five items in `dataset/v1/items.jsonl` are worked examples, each carrying an `example_note` explaining what it is for. `syn-0003` is the one to read first: it contains a genuine judgement call ("has carried a pager" against "wrote the runbooks the on-call rotation uses") of exactly the kind the second-labeller pass exists to measure.

## Status

**These guidelines are complete. The dataset is not.** Five scaffold items exist to make the format unambiguous. Writing the 60–150 labelled items, running the second-labeller pass, computing κ, and locking `v1/` is human work that has not begun.
