/**
 * Embedding-similarity baseline — NOT IMPLEMENTED, and deliberately so.
 *
 * This is the "smarter than keywords, still no grounding" middle point, and the
 * same technique the cited bias literature used, which is what lets Experiment
 * 2's methodology be sanity-checked against a known approach.
 *
 * ## Why there is no implementation here
 *
 * Every way of computing embeddings needs a decision that is not mine to make,
 * and `CLAUDE_CODE_FINAL_KICKOFF.md` rule 5 reserves it explicitly — naming this
 * file as the example:
 *
 *  1. **A local model** (`@xenova/transformers`, `onnxruntime-node`, or similar)
 *     — a new dependency, tens of megabytes of weights, and a licence question
 *     for a thesis artefact.
 *  2. **Gemini's embedding endpoint** (`text-embedding-004` via the same REST
 *     call shape `careerlens/src/lib/ai/google.ts` already uses) — no npm
 *     dependency, but it adds a second model to a project whose
 *     `ARCHITECTURAL_DECISION_REGISTER.md` ADR-09 pins to exactly one, spends
 *     quota per run, and means the "no grounding" baseline shares a vendor with
 *     the system under test, which a reviewer may reasonably object to.
 *  3. **A third-party embedding API** — a new credential, a new processor named
 *     in a privacy policy that currently names one.
 *
 * Option 2 is the cheapest and probably right, but it is an ADR, not an
 * implementation detail. Until it is made, this module throws rather than
 * returning a plausible number: a baseline that silently degrades to something
 * weaker is worse than an absent one, because the comparison would still get
 * published.
 *
 * `RESEARCH_EVALUATION_FINAL.md` lists this as a *secondary* baseline "for
 * context, not as the primary comparison", so Experiment 1 is complete and
 * reportable without it. Its absence delays nothing.
 */

export class EmbeddingBaselineNotConfiguredError extends Error {
  constructor() {
    super(
      'The embedding-similarity baseline is not implemented: the embedding source ' +
        'is an open decision (local model / Gemini embeddings / third-party API), ' +
        'each with a dependency, quota or vendor implication that needs an ADR. ' +
        'See the module comment in research/scripts/baselines/embedding-similarity.ts. ' +
        'This baseline is secondary — Experiment 1 runs and reports without it.'
    )
    this.name = 'EmbeddingBaselineNotConfiguredError'
  }
}

/** The interface a future implementation must satisfy. */
export interface EmbeddingBaseline {
  embed(texts: readonly string[]): Promise<number[][]>
}

/** Pure, and correct now — the missing half is where the vectors come from. */
export function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector lengths differ: ${a.length} vs ${b.length}.`)
  }

  let dot = 0
  let magA = 0
  let magB = 0

  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }

  const magnitude = Math.sqrt(magA) * Math.sqrt(magB)
  return magnitude === 0 ? 0 : dot / magnitude
}

export function getEmbeddingBaseline(): EmbeddingBaseline {
  throw new EmbeddingBaselineNotConfiguredError()
}
