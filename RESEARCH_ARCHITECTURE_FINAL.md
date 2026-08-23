# Research Architecture — Final

## Boundary rule
`careerlens/` is the production application. `research/` is the academic artifact. **Neither imports from the other's implementation details** — `research/` scripts interact with the pipeline only through (a) the real `/api/analyze` endpoint (research-mode header) against a locally-running instance, or (b) direct calls into the pure, dependency-free `lib/analysis/grounding.ts` module for the ablation study specifically (since that module has no server dependency and importing it directly is more precise for an ablation than round-tripping through HTTP). No research script writes to, or reads from, the production `localStorage` model or any server-side state — there is none to read from, by design.

## Directory structure
```
research/
├── README.md              how to run every script, what each produces
├── dataset/
│   ├── README.md           format, versioning, licensing/privacy statement
│   ├── v1/                  one versioned folder per dataset revision
│   │   ├── items.jsonl       one JSON object per line, see RESEARCH_DATASET_SPEC.md
│   │   └── manifest.json     item count, construction date, labeler ids (pseudonymous)
├── annotation/
│   └── GUIDELINES.md        labeling rules, inter-rater protocol
├── scripts/
│   ├── baselines/
│   │   ├── keyword-overlap.ts
│   │   └── embedding-similarity.ts
│   ├── evaluate.ts           Experiment 1
│   ├── perturb.ts            Experiment 2
│   └── ablate.ts              Experiment 3
└── results/
    └── <run-timestamp>/
        ├── config.json        model string, temperature, run count, dataset version
        ├── raw/                 per-item raw outputs
        └── summary.json         aggregated metrics
```

## Experiment structure (shared shape across all three)
Every script: (1) loads a pinned dataset version, (2) records its run configuration before executing anything, (3) writes raw per-item output before writing any aggregate, (4) computes aggregates as a separate, re-runnable step over the raw output (so re-scoring with a different metric formula doesn't require re-calling the API). This ordering exists specifically so a partial run (e.g., the API times out on item 40 of 100) leaves usable raw data for items 1–39, rather than losing the whole run.

## Reproducibility
Every `config.json` records: exact `GOOGLE_MODEL` string, `temperature` (0, the pipeline default), number of independent runs per item (to average over Gemini's non-guaranteed determinism at temperature 0), dataset version string, and the git commit hash of `careerlens/` at run time (so a later reader can check out the exact prompt/schema version that produced a given result set). Full detail in `RESEARCH_EVALUATION_FINAL.md`.

## Result storage
Flat files (`JSON`/`JSONL`), not a database — consistent with the whole project's zero-infrastructure philosophy, and appropriate at this scale (hundreds of items, not millions).

## Visualization
Not specified as code in this planning pass (out of scope — a thesis-writing-time task using whatever plotting tool the student prefers over the `summary.json` files) — this document only guarantees the data those figures would be built from is captured in a reusable, versioned form.

## Statistical analysis
`evaluate.ts`/`perturb.ts` compute point estimates (rates, ratios) and, where the sample size supports it, confidence intervals (a standard binomial/bootstrap CI is sufficient — no exotic method is warranted for a 60–150-item set) and an appropriate significance test (a two-proportion z-test or Fisher's exact test for Experiment 1's rate comparison; a variance-comparison test such as Levene's for Experiment 2, as already specified in the research audit). **These are the smallest statistically defensible choices for this sample size, not a placeholder for something more sophisticated** — reaching for a heavier method on a 100-item set would be its own methodological error.

## What research/ explicitly does not contain
No copy of real user data (none exists to copy — the production app persists nothing server-side). No credentials beyond what the student's own local `.env` already needs to call the same API the production app calls. No modification to any file under `careerlens/` — the research scripts are read-only consumers of that codebase's public surface.
