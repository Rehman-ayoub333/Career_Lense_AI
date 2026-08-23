import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'

/**
 * Dataset loading and validation.
 *
 * The schema is `RESEARCH_DATASET_SPEC.md`'s, transcribed. Validation is strict
 * and refuses rather than repairs: a malformed item in a gold set is a labelling
 * error, and silently coercing it would put a guess into the ground truth that
 * every metric is measured against.
 */

export type ClaimCategory =
  | 'skill'
  | 'experience'
  | 'education'
  | 'ats'
  | 'research'
  | 'leadership'
  | 'academic'

export type GoldStatus = 'matched' | 'partial' | 'gap'

export interface GoldClaim {
  requirement: string
  category: ClaimCategory
  gold_status: GoldStatus
  /** Verbatim substring of `cv_text`, or null. */
  gold_evidence_span: string | null
  labeler_id: string
}

export interface DatasetItem {
  item_id: string
  mode: 'job' | 'scholarship'
  cv_text: string
  opportunity_text: string
  gold_claims: GoldClaim[]
  /** Set on perturbation variants, pointing at the base item. */
  identity_variant_of: string | null
  variant_fields_changed: string[]
  construction_method: 'synthetic' | 'synthetic-based-on-public-posting'
  construction_date: string
}

export interface Manifest {
  dataset_version: string
  item_count: number
  construction_date: string
  labeler_ids: string[]
  /** Fixed before calibration begins, per the leakage rule. */
  split: { calibration: string[]; test: string[] }
  items_sha256: string
  notes?: string
}

const CATEGORIES: readonly string[] = [
  'skill',
  'experience',
  'education',
  'ats',
  'research',
  'leadership',
  'academic',
]

const STATUSES: readonly string[] = ['matched', 'partial', 'gap']

function fail(itemId: string, reason: string): never {
  throw new Error(`Dataset item "${itemId}" is invalid: ${reason}`)
}

/**
 * Validates one item against the spec.
 *
 * The two cross-field rules are the ones a schema alone cannot express, and both
 * protect the ground truth rather than the format:
 *
 *  - a `gap` claim must not carry an evidence span. It is the same rule the
 *    production guard enforces on model output, applied to human labels — a gold
 *    label that says "no evidence exists" while quoting evidence is
 *    self-contradictory whoever wrote it.
 *  - a non-null span must appear verbatim in `cv_text`. `RESEARCH_DATASET_SPEC.md`
 *    requires labellers to copy spans exactly, and that symmetry with the model's
 *    instruction is what makes the faithfulness comparison mean anything. A span
 *    the labeller paraphrased would quietly weaken every evidence-extraction
 *    number computed from it.
 */
export function validateItem(value: unknown): DatasetItem {
  if (!value || typeof value !== 'object') throw new Error('Dataset item is not an object.')
  const item = value as Record<string, unknown>
  const id = typeof item.item_id === 'string' ? item.item_id : '<no item_id>'

  if (typeof item.item_id !== 'string' || item.item_id.length === 0) fail(id, 'item_id missing')
  if (item.mode !== 'job' && item.mode !== 'scholarship') fail(id, 'mode must be job|scholarship')
  if (typeof item.cv_text !== 'string' || item.cv_text.length === 0) fail(id, 'cv_text missing')
  if (typeof item.opportunity_text !== 'string' || item.opportunity_text.length === 0) {
    fail(id, 'opportunity_text missing')
  }
  if (!Array.isArray(item.gold_claims)) fail(id, 'gold_claims must be an array')
  if (item.identity_variant_of !== null && typeof item.identity_variant_of !== 'string') {
    fail(id, 'identity_variant_of must be a string or null')
  }
  if (!Array.isArray(item.variant_fields_changed)) fail(id, 'variant_fields_changed must be an array')
  if (
    item.construction_method !== 'synthetic' &&
    item.construction_method !== 'synthetic-based-on-public-posting'
  ) {
    fail(id, 'construction_method is not one of the two allowed values')
  }
  if (typeof item.construction_date !== 'string') fail(id, 'construction_date missing')

  const cvText = item.cv_text

  for (const [index, raw] of item.gold_claims.entries()) {
    if (!raw || typeof raw !== 'object') fail(id, `gold_claims[${index}] is not an object`)
    const claim = raw as Record<string, unknown>

    if (typeof claim.requirement !== 'string' || claim.requirement.length === 0) {
      fail(id, `gold_claims[${index}].requirement missing`)
    }
    if (typeof claim.category !== 'string' || !CATEGORIES.includes(claim.category)) {
      fail(id, `gold_claims[${index}].category "${String(claim.category)}" is not a known category`)
    }
    if (typeof claim.gold_status !== 'string' || !STATUSES.includes(claim.gold_status)) {
      fail(id, `gold_claims[${index}].gold_status "${String(claim.gold_status)}" is invalid`)
    }
    if (typeof claim.labeler_id !== 'string' || claim.labeler_id.length === 0) {
      fail(id, `gold_claims[${index}].labeler_id missing`)
    }

    const span = claim.gold_evidence_span
    if (span !== null && typeof span !== 'string') {
      fail(id, `gold_claims[${index}].gold_evidence_span must be a string or null`)
    }

    if (claim.gold_status === 'gap' && span !== null) {
      fail(id, `gold_claims[${index}] is a gap but carries an evidence span`)
    }

    if (typeof span === 'string' && !cvText.includes(span)) {
      fail(
        id,
        `gold_claims[${index}].gold_evidence_span is not a verbatim substring of cv_text — ` +
          `spans must be copied exactly, not paraphrased`
      )
    }
  }

  return item as unknown as DatasetItem
}

/** Parses JSONL, reporting the offending line number rather than a bare throw. */
export function parseItems(jsonl: string): DatasetItem[] {
  return jsonl
    .split('\n')
    .map((line, index) => ({ line: line.trim(), number: index + 1 }))
    .filter((entry) => entry.line.length > 0 && !entry.line.startsWith('//'))
    .map((entry) => {
      let parsed: unknown
      try {
        parsed = JSON.parse(entry.line)
      } catch (cause) {
        throw new Error(`Line ${entry.number} of items.jsonl is not valid JSON: ${String(cause)}`)
      }

      try {
        return validateItem(parsed)
      } catch (cause) {
        // Re-thrown with the line number. Locating a bad label by hand in a
        // 150-line file is exactly the friction that makes people stop
        // validating, and the message is the whole value of validating.
        throw new Error(`Line ${entry.number} of items.jsonl: ${(cause as Error).message}`)
      }
    })
}

export function sha256(contents: string): string {
  return createHash('sha256').update(contents, 'utf8').digest('hex')
}

export interface LoadedDataset {
  version: string
  items: DatasetItem[]
  manifest: Manifest
  /** Whether the manifest's recorded hash matches the file actually loaded. */
  hashMatches: boolean
}

/**
 * Loads a pinned dataset version and checks it against its manifest.
 *
 * The hash check is the point: `RESEARCH_ARCHITECTURE_FINAL.md` requires a run to
 * be able to prove it evaluated the exact dataset revision it claims to have.
 * A mismatch is surfaced, never silently tolerated — a result file naming v1
 * while v1 has since been edited is a reproducibility failure that would be
 * invisible without this.
 */
export function loadDataset(datasetDir: string, version = 'v1'): LoadedDataset {
  const versionDir = join(datasetDir, version)
  const raw = readFileSync(join(versionDir, 'items.jsonl'), 'utf8')
  const manifest = JSON.parse(readFileSync(join(versionDir, 'manifest.json'), 'utf8')) as Manifest

  return {
    version,
    items: parseItems(raw),
    manifest,
    hashMatches: manifest.items_sha256 === sha256(raw),
  }
}

/** Splits by the manifest's fixed assignment, which must predate calibration. */
export function splitItems(dataset: LoadedDataset): {
  calibration: DatasetItem[]
  test: DatasetItem[]
} {
  const inSplit = (ids: string[]) => dataset.items.filter((item) => ids.includes(item.item_id))

  return {
    calibration: inSplit(dataset.manifest.split.calibration),
    test: inSplit(dataset.manifest.split.test),
  }
}
