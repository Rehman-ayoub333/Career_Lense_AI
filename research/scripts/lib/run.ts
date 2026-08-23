import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { LoadedDataset } from './dataset.ts'

/**
 * Run scaffolding shared by all three experiments.
 *
 * `RESEARCH_ARCHITECTURE_FINAL.md` fixes the order every script follows, and it
 * is not merely conventional: config is recorded *before* anything executes, and
 * raw per-item output is written *before* any aggregate. A run that times out on
 * item 40 of 100 then leaves items 1-39 usable, and a metric formula can be
 * corrected and re-applied to a finished run without re-calling the model.
 */

export const RESEARCH_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
export const REPO_ROOT = resolve(RESEARCH_ROOT, '..')
export const DATASET_DIR = join(RESEARCH_ROOT, 'dataset')
export const RESULTS_DIR = join(RESEARCH_ROOT, 'results')

export interface RunConfig {
  experiment: string
  /** Exact model string, so a later reader knows what produced the numbers. */
  model: string
  temperature: number
  /** Independent runs per item, averaged over Gemini's non-determinism at t=0. */
  runsPerItem: number
  datasetVersion: string
  datasetSha256: string
  /** The careerlens/ commit that produced these results. */
  commit: string
  apiBaseUrl: string
  startedAt: string
  notes?: string
}

/** The commit hash, so a result set can be traced to the code that made it. */
export function currentCommit(): string {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: REPO_ROOT, encoding: 'utf8' }).trim()
  } catch {
    return 'unknown'
  }
}

export function buildRunConfig(options: {
  experiment: string
  dataset: LoadedDataset
  runsPerItem?: number
  notes?: string
}): RunConfig {
  return {
    experiment: options.experiment,
    model: process.env.GOOGLE_MODEL ?? 'gemini-2.5-flash',
    temperature: 0,
    runsPerItem: options.runsPerItem ?? 1,
    datasetVersion: options.dataset.version,
    datasetSha256: options.dataset.manifest.items_sha256,
    commit: currentCommit(),
    apiBaseUrl: apiBaseUrl(),
    startedAt: new Date().toISOString(),
    notes: options.notes,
  }
}

export function apiBaseUrl(): string {
  return process.env.CAREERLENS_URL ?? 'http://localhost:3000'
}

/** A timestamped directory per run, so results are never overwritten. */
export function createRunDirectory(experiment: string): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const directory = join(RESULTS_DIR, `${stamp}-${experiment}`)
  mkdirSync(join(directory, 'raw'), { recursive: true })
  return directory
}

export function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

/** Appends one raw record. Written per item, before any aggregate exists. */
export function appendRaw(runDirectory: string, itemId: string, record: unknown): void {
  writeJson(join(runDirectory, 'raw', `${itemId}.json`), record)
}

/* ── The pipeline under test ──────────────────────────────────────────────── */

export interface AnalyzeResponseClaim {
  id: string
  requirement: string
  category: string
  status: 'matched' | 'partial' | 'gap'
  evidence_quote: string | null
  rationale: string
  verification: 'verified' | 'uncertain' | 'unresolved'
  match_score: number | null
  hallucination_candidate: boolean
}

export interface AnalyzeResponseData {
  score: number
  verdict: string
  claims: AnalyzeResponseClaim[]
  coverage: {
    overall: number
    verifiedCount: number
    uncertainCount: number
    unresolvedCount: number
    total: number
  }
}

export class ResearchModeUnavailableError extends Error {}

/**
 * Calls the real `/api/analyze` in research mode.
 *
 * Research mode is used because the internal fields — `match_score`,
 * `hallucination_candidate` — are what two of the metrics are computed from, and
 * they are stripped from a standard response by design. It requires the server
 * to be started with `RESEARCH_MODE_ENABLED=true`; the header alone is not
 * authorization, and a server that has not been configured for it will return
 * the public shape, which is detected and refused here rather than quietly
 * producing metrics from absent fields.
 *
 * This is the only way the research scripts touch the pipeline, apart from the
 * one sanctioned direct import of `grounding.ts` in the ablation (ADR-08).
 */
export async function analyze(item: {
  cv_text: string
  opportunity_text: string
  mode: 'job' | 'scholarship'
}): Promise<AnalyzeResponseData> {
  const response = await fetch(`${apiBaseUrl()}/api/analyze`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-research-mode': '1' },
    body: JSON.stringify({
      cvText: item.cv_text,
      jdText: item.opportunity_text,
      mode: item.mode,
    }),
  })

  const body = (await response.json()) as
    | { success: true; data: AnalyzeResponseData }
    | { success: false; error: string; message: string }

  if (!response.ok || !body.success) {
    const failure = body as { error?: string; message?: string }
    throw new Error(
      `POST /api/analyze failed (${response.status} ${failure.error ?? 'unknown'}): ${failure.message ?? 'no message'}`
    )
  }

  const [first] = body.data.claims
  if (first !== undefined && first.match_score === undefined) {
    throw new ResearchModeUnavailableError(
      'The server returned the public claim shape, so match_score and ' +
        'hallucination_candidate are absent and the metrics cannot be computed. ' +
        'Start the server with RESEARCH_MODE_ENABLED=true.'
    )
  }

  return body.data
}

/** Fails loudly and early when the server is not reachable at all. */
export async function assertServerReachable(): Promise<void> {
  try {
    const response = await fetch(`${apiBaseUrl()}/api/health`)
    if (!response.ok) throw new Error(`health check returned ${response.status}`)
  } catch (cause) {
    throw new Error(
      `No CareerLens server at ${apiBaseUrl()}. Start it with ` +
        `RESEARCH_MODE_ENABLED=true npm run dev (from careerlens/), or set CAREERLENS_URL. ` +
        `Cause: ${String(cause)}`
    )
  }
}
