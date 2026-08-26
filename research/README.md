# research/

The evaluation harness for CareerLens's evidence-grounding contribution. Sibling to `careerlens/`, never inside it.

> **Status: the harness works, the experiments have not been run.** Every script here is implemented and its pure logic is unit-tested. None has been run end-to-end, because that needs a labelled dataset, which does not exist yet (Phase 8). No results are claimed anywhere in this directory.
>
> The other half of that blocker is now cleared: `ANTHROPIC_API_KEY` is populated and the application pipeline these scripts drive has been verified live — one real `POST /api/analyze`, end to end, on 26 Aug 2026 (`LIVE_SMOKE_TEST.md`). The dataset is the only remaining dependency.

## What blocks what

| | State | Blocked on |
|---|---|---|
| Harness code | Written, typechecked, 45 unit tests passing | — |
| Scaffold dataset (5 items) | Exists, validates | — |
| Real dataset (60–150 items) | **Not started** | Human labelling work |
| Experiment 1 / 2 / 3 runs | **Never run** | the dataset (the key is populated and the pipeline is live-verified) |
| Embedding baseline | Implemented (ADR-23), never run | `VOYAGE_API_KEY` |

## Requirements

Node ≥ 22.6. Nothing else — **this directory has no dependencies**. Node strips TypeScript natively, so every script runs as-is. `package.json` declares `type: module` and nothing more; `tsconfig.json` is for `tsc --noEmit` only and borrows `@types/node` from `careerlens/node_modules`.

## Running

The scripts call the real `/api/analyze` over HTTP, exactly as a user's browser does. Start the app first, in a separate shell:

```bash
cd careerlens
RESEARCH_MODE_ENABLED=true npm run dev
```

`RESEARCH_MODE_ENABLED` is required. The metrics are computed from `match_score` and `hallucination_candidate`, which are stripped from a standard response by design — the request header alone is not authorization. A server without the flag returns the public shape, and the scripts refuse rather than compute metrics from absent fields.

Then, from `research/`:

```bash
node scripts/evaluate.ts --split test --runs 3   # Experiment 1
node scripts/perturb.ts --runs 3                 # Experiment 2
node scripts/ablate.ts                           # Experiment 3
node --test scripts/lib/lib.test.ts              # unit tests, no server needed
```

`CAREERLENS_URL` overrides the default `http://localhost:3000`.

### The embedding baseline's own environment

Every other script reaches the model through the running app. The embedding baseline (ADR-23) is the one exception: it calls Voyage AI's embeddings endpoint directly, in-process, so it reads `VOYAGE_API_KEY` from *this* shell, not from `careerlens/.env.local`. It is a different vendor from the generation pipeline and a separate credential. Node does not load `.env` files on its own, so export it:

```bash
export VOYAGE_API_KEY=...              # embedding baseline only
export VOYAGE_MODEL=...                # optional, defaults to voyage-4
```

Unset, the baseline throws and the run reports it as absent rather than substituting a weaker number. `VOYAGE_MODEL` is deliberately commented out in `careerlens/.env.example`: the application never reads it, and presenting it as live configuration would imply otherwise.

## What each script produces

Every run writes to `results/<timestamp>-<experiment>/`:

```
config.json    model, temperature, runs per item, dataset version + hash, git commit
raw/           one file per item, written as it completes
summary.json   the aggregates
```

The order is fixed and load-bearing. **Config is written before the first call**, so a run always records what it was. **Raw output is written per item, before any aggregate exists**, so a run that dies on item 40 of 100 leaves items 1–39 usable — and so a metric formula can be corrected and re-applied to a finished run without paying for the model calls again.

### `evaluate.ts` — Experiment 1, evidence grounding (RQ1)

Runs the held-out test split and computes faithfulness, hallucination rate, unsupported-claim rate, precision/recall/F1, and evidence-extraction accuracy, for two conditions:

- **grounded** — the shipped pipeline, `verification` consulted.
- **ungrounded** — the baseline, which is the pipeline *before* this thesis's intervention: `status` trusted at face value with no Stage 2 check.

Both conditions are derived from the same response rather than two calls. They are the same model output read two ways, so re-calling would inject sampling noise into a comparison that has none by construction.

### `perturb.ts` — Experiment 2, bias sensitivity (RQ2)

Generates identity variants of each base item (name × institution, all substantive content fixed), runs them, and reports per-item score standard deviation.

It also reports faithfulness on the same subset, and this is not optional. Grounding could reduce variance by making outputs generically more conservative rather than more accurate — a variance drop alongside a faithfulness drop would not support H2. The script writes both so the number cannot be reported without its control.

Base items opt in by declaring `perturbation_base` (the literal name and institution to substitute). Items without it are skipped and listed. Nothing tries to *guess* which token is a name: a wrong guess would alter a qualification and destroy the experiment's only control.

### `ablate.ts` — Experiment 3

Conditions (a) full and (b) Stage 2 removed. Conditions (c) no-injection-defence and (d) no-schema-constrained-decoding are **reported as not run**, with reasons, rather than silently dropped — both need a build with a defence removed, and a runtime flag that disables the injection defence would be a permanent footgun in production code for the sake of one experiment. Run those from a scratch branch.

This is the only script that imports from `careerlens/` directly (`grounding.ts`), which is the single sanctioned exception in ADR-08. It also cross-checks: every claim is re-verified in-process and the agreement with the server's own tiers is recorded per item. A disagreement means the server is running different code from this checkout, or `grounding.ts` has acquired a hidden dependency — either is worth noticing.

## Reproducibility

`config.json` records the exact model string, temperature, runs per item, dataset version, dataset content hash, and the `careerlens/` commit that produced the results. The dataset hash is checked on load and a mismatch **refuses the run** — a result file naming `v1` while `v1` has since been edited is a reproducibility failure that is invisible after the fact.

## Layout

```
research/
├── dataset/v1/          items.jsonl + manifest.json  (5 scaffold items)
├── annotation/          GUIDELINES.md, raw/ for the two-labeller pass
├── scripts/
│   ├── lib/             dataset, metrics, alignment, perturbation, run scaffolding
│   ├── baselines/       keyword-overlap, embedding-similarity (Voyage AI, ADR-23)
│   ├── evaluate.ts      Experiment 1
│   ├── perturb.ts       Experiment 2
│   └── ablate.ts        Experiment 3
└── results/             run outputs (gitignored)
```

`scripts/lib/` is not in `RESEARCH_ARCHITECTURE_FINAL.md`'s tree. It holds what all three experiments share — dataset loading, metrics, claim alignment — which would otherwise be written three times and drift.

## The honest part

- **No experiment in this directory has been run.** There are no results to report and none are implied.
- **The dataset is five items.** It is labelled `SCAFFOLD ONLY` in its own manifest. It is below the 60–150 target, has had no second-labeller pass, and has no computed κ. Nothing computed from it is a finding.
- **The split is empty on purpose.** Assigning a calibration/test boundary before the real dataset exists would make a meaningless one, and the leakage rule requires the split be fixed *before* calibration begins.
- **The 0.85/0.55 thresholds are uncalibrated.** They are the specified starting values. Calibrating them is what the calibration split is for, and it has not happened.
- **The embedding baseline has never been run.** It is implemented against Voyage AI's embeddings endpoint per ADR-23, and its pure logic is unit-tested, but no vector has ever been fetched. Without `VOYAGE_API_KEY` it throws rather than returning a plausible number: it is secondary, Experiment 1 reports without it, and a baseline that silently degrades to something weaker is worse than an absent one, because the comparison still gets published.

## Boundary

`research/` reads `careerlens/`; `careerlens/` never reads `research/`. Contact is over the public HTTP API, plus the one direct `grounding.ts` import in `ablate.ts`. No script writes to production state — there is none to write to.
