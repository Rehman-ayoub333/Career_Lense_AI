/**
 * Embedding-similarity baseline.
 *
 * The "smarter than keywords, still no grounding" middle point, and the same
 * technique the cited bias literature used — which is what lets Experiment 2's
 * methodology be sanity-checked against a known approach.
 *
 * Embeddings come from **Voyage AI** (ADR-23, superseding ADR-21). Claude has no
 * native embeddings endpoint, so the provider swap in ADR-22 left this baseline
 * without a vendor; Voyage is Anthropic's recommended embeddings pairing. A local
 * model was rejected for the same reason ADR-21 rejected it: a dependency,
 * weights and licence surface disproportionate to a supporting metric.
 *
 * **This is a second vendor, and that is a real change.** ADR-21 could say the
 * embedding baseline added no disclosure category, because Gemini embeddings and
 * Gemini generation were one vendor on one credential. That is no longer true and
 * `SECURITY_PRIVACY_SPEC.md` says so plainly rather than carrying the old
 * sentence forward. What bounds it is scope, not vendor identity: the text sent
 * here is synthetic by construction (`RESEARCH_DATASET_SPEC.md`), this script
 * runs only from `research/`, and the deployed application never reads
 * `VOYAGE_API_KEY` at all.
 *
 * ADR-09 pins the *primary pipeline* to one model for the thesis's honesty about
 * model plurality. It does not bar a research-only secondary baseline from using
 * a different model class — embeddings, not generation — from a different vendor.
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

const API_URL = 'https://api.voyageai.com/v1/embeddings'

/**
 * Default embedding model.
 *
 * `voyage-4` confirmed against Voyage's own documentation on 26 Aug 2026, as
 * ADR-23 requires rather than guessing: 1024 dimensions, 32k context, $0.06 per
 * million tokens, with 200M tokens free per account. `voyage-4-lite` ($0.02) and
 * `voyage-4-large` ($0.12) are the cheaper and stronger alternatives.
 *
 * Overridable via `VOYAGE_MODEL` so the model can be rolled forward without a
 * code change, matching how `ANTHROPIC_MODEL` works for generation. Recorded in
 * every run's `config.json` for reproducibility.
 */
const DEFAULT_MODEL = 'voyage-4'

/**
 * Batch size per request. Voyage accepts up to 1000 texts; this stays modest
 * because the datasets here are 60-150 items and a smaller batch keeps any one
 * failure cheap to retry.
 */
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

/**
 * Voyage's REST response is OpenAI-shaped: `data[]` carrying `embedding` and
 * `index`. The `embeddings[][]` form is what the Python client returns after
 * unwrapping, and some documentation shows that shape instead — both are
 * accepted here rather than betting on one, because guessing wrong turns into a
 * runtime failure only a live key can surface.
 */
interface VoyageEmbedResponse {
  data?: { embedding?: number[]; index?: number }[]
  embeddings?: number[][]
  detail?: string
}

/**
 * Calls Voyage's embeddings endpoint.
 *
 * The key travels in an `Authorization` header, which is what Voyage expects and
 * is also the same discipline `lib/ai/*` follows: query strings are recorded by
 * proxies, CDNs and access logs; headers are not.
 *
 * **`input_type` is deliberately omitted.** Voyage accepts `query`/`document` to
 * produce asymmetric retrieval embeddings, and using them here would arguably
 * score better — requirement as query, CV as document. It is left off because
 * this baseline is specified as the symmetric whole-string cosine formulation
 * the cited literature used, and switching to asymmetric retrieval would change
 * what the baseline *is* as a side effect of a vendor swap. Worth evaluating as
 * a deliberate calibration choice alongside the threshold; not worth doing
 * silently here.
 */
async function batchEmbed(
  texts: readonly string[],
  apiKey: string,
  model: string
): Promise<number[][]> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ input: [...texts], model }),
  })

  if (!response.ok) {
    // The body may echo the request, which contains dataset text. Only the
    // status is surfaced — the same discipline the production error path follows.
    throw new Error(
      `Voyage embedding request failed: ${response.status} ${response.statusText}. ` +
        `Model "${model}". Check VOYAGE_API_KEY and that the model name is current.`
    )
  }

  const body = (await response.json()) as VoyageEmbedResponse

  // Sorted by the index Voyage returns rather than trusting array order, so a
  // reordered response cannot silently pair the wrong vector with the wrong text.
  const fromData = body.data
    ?.slice()
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .map((entry) => entry.embedding)

  const embeddings = fromData ?? body.embeddings ?? []

  if (embeddings.length !== texts.length) {
    throw new Error(
      `Voyage returned ${embeddings.length} embeddings for ${texts.length} inputs. ` +
        `Refusing rather than aligning them by position, which would silently pair ` +
        `the wrong vectors.`
    )
  }

  return embeddings.map((values, index) => {
    if (!Array.isArray(values) || values.length === 0) {
      throw new Error(`Voyage returned an empty embedding for input ${index}.`)
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
  const apiKey = process.env.VOYAGE_API_KEY
  const model = process.env.VOYAGE_MODEL ?? DEFAULT_MODEL

  if (apiKey === undefined || apiKey.trim().length === 0) {
    throw new EmbeddingBaselineNotConfiguredError(
      'VOYAGE_API_KEY is not set, so the embedding baseline cannot run. It is a ' +
        'secondary baseline — Experiment 1 runs and reports without it (ADR-23).'
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
 *
 * Note for that calibration: this number was chosen against Gemini's
 * `text-embedding-004` and has never been run against Voyage. Different
 * embedding spaces put their cosine distributions in different places, so 0.6
 * carries even less authority now than it did — treat it as arbitrary until
 * measured.
 */
export function embeddingBaselineStatus(similarity: number, threshold = 0.6): 'matched' | 'gap' {
  return similarity >= threshold ? 'matched' : 'gap'
}
