/**
 * Embedding-similarity baseline.
 *
 * The "smarter than keywords, still no grounding" middle point, and the same
 * technique the cited bias literature used — which is what lets Experiment 2's
 * methodology be sanity-checked against a known approach.
 *
 * Embeddings come from Gemini's embedding endpoint, using the same
 * `GOOGLE_API_KEY` the generation pipeline already uses (ADR-21). No new
 * dependency, no new credential, no new vendor: the same synthetic dataset text
 * already travels to the same place for the generation calls these experiments
 * make anyway. A local model was rejected as a dependency, weights and licence
 * surface disproportionate to a supporting metric.
 *
 * ADR-09 pins the *primary pipeline* to one model for the thesis's honesty about
 * model plurality. It does not bar a research-only secondary baseline from using
 * a different model class — embeddings, not generation — from the same
 * already-approved vendor.
 *
 * ## What this baseline is and is not
 *
 * It answers "does the CV talk about roughly the same things as this
 * requirement". It has no notion of a span, cannot say *where* the support is,
 * and cannot be checked. That is exactly the gap the grounded pipeline fills,
 * and the reason this is worth measuring against.
 *
 * Implemented honestly rather than strawmanned: requirement and CV are embedded
 * as whole strings and compared by cosine, which is the standard formulation. If
 * grounding does not beat it, that is a finding and it should be reportable.
 */

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

/**
 * Default embedding model.
 *
 * Overridable via `GOOGLE_EMBEDDING_MODEL` so the model can be rolled forward
 * without a code change, matching how `GOOGLE_MODEL` already works for
 * generation. Recorded in every run's `config.json` for reproducibility.
 */
const DEFAULT_MODEL = 'text-embedding-004'

/** Batch size for `batchEmbedContents`. Kept modest; the datasets here are small. */
const BATCH_SIZE = 50

export class EmbeddingBaselineNotConfiguredError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EmbeddingBaselineNotConfiguredError'
  }
}

export interface EmbeddingBaseline {
  readonly model: string
  embed(texts: readonly string[]): Promise<number[][]>
}

/** Pure. Kept separate so it is testable without a credential. */
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

function chunk<T>(items: readonly T[], size: number): T[][] {
  const batches: T[][] = []
  for (let i = 0; i < items.length; i += size) batches.push(items.slice(i, i + size))
  return batches
}

interface BatchEmbedResponse {
  embeddings?: { values?: number[] }[]
}

/**
 * Calls `batchEmbedContents`.
 *
 * The key travels as a header, not a query parameter, for the same reason
 * `lib/ai/google.ts` does it that way: query strings are recorded by proxies,
 * CDNs and access logs; headers are not.
 */
async function batchEmbed(
  texts: readonly string[],
  apiKey: string,
  model: string
): Promise<number[][]> {
  const response = await fetch(`${API_BASE}/${encodeURIComponent(model)}:batchEmbedContents`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      requests: texts.map((text) => ({
        model: `models/${model}`,
        content: { parts: [{ text }] },
      })),
    }),
  })

  if (!response.ok) {
    // The body may echo the request, which contains dataset text. Only the
    // status is surfaced — the same discipline the production error path follows.
    throw new Error(
      `Gemini embedding request failed: ${response.status} ${response.statusText}. ` +
        `Model "${model}". Check GOOGLE_API_KEY and that the model name is current.`
    )
  }

  const body = (await response.json()) as BatchEmbedResponse
  const embeddings = body.embeddings ?? []

  if (embeddings.length !== texts.length) {
    throw new Error(
      `Gemini returned ${embeddings.length} embeddings for ${texts.length} inputs. ` +
        `Refusing rather than aligning them by position, which would silently pair ` +
        `the wrong vectors.`
    )
  }

  return embeddings.map((embedding, index) => {
    const values = embedding.values
    if (!Array.isArray(values) || values.length === 0) {
      throw new Error(`Gemini returned an empty embedding for input ${index}.`)
    }
    return values
  })
}

/**
 * Builds the baseline, or refuses if the credential is absent.
 *
 * Refusing is deliberate: a baseline that silently degrades to something weaker
 * — a keyword fallback, a zero vector — would still get published as an
 * embedding comparison. An absent number is honest; a wrong one is not.
 */
export function getEmbeddingBaseline(): EmbeddingBaseline {
  const apiKey = process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY
  const model = process.env.GOOGLE_EMBEDDING_MODEL ?? DEFAULT_MODEL

  if (apiKey === undefined || apiKey.trim().length === 0) {
    throw new EmbeddingBaselineNotConfiguredError(
      'GOOGLE_API_KEY is not set, so the embedding baseline cannot run. It is a ' +
        'secondary baseline — Experiment 1 runs and reports without it (ADR-21).'
    )
  }

  return {
    model,
    async embed(texts: readonly string[]): Promise<number[][]> {
      if (texts.length === 0) return []

      const results: number[][] = []
      for (const batch of chunk(texts, BATCH_SIZE)) {
        results.push(...(await batchEmbed(batch, apiKey.trim(), model)))
      }
      return results
    },
  }
}

/**
 * Scores every requirement against the CV in one pass.
 *
 * One call for the CV plus one per batch of requirements, rather than a call per
 * pair: the CV embedding is identical for every requirement in an item, and
 * re-embedding it would multiply the quota cost by the requirement count for no
 * change in result.
 */
export async function embeddingSimilarities(
  requirements: readonly string[],
  cvText: string,
  baseline: EmbeddingBaseline = getEmbeddingBaseline()
): Promise<number[]> {
  if (requirements.length === 0) return []

  const [cvVector, ...requirementVectors] = await baseline.embed([cvText, ...requirements])
  return requirementVectors.map((vector) => cosineSimilarity(vector, cvVector))
}

/**
 * Above `threshold` counts as matched.
 *
 * 0.6 is a starting value, not a calibrated one — the same status the
 * verifier's own 0.85/0.55 thresholds have. Calibrate it against the
 * calibration split alongside those, and record the result.
 */
export function embeddingBaselineStatus(similarity: number, threshold = 0.6): 'matched' | 'gap' {
  return similarity >= threshold ? 'matched' : 'gap'
}
