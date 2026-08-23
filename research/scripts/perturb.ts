import { join } from 'node:path'

import { alignClaims } from './lib/align.ts'
import { loadDataset, type DatasetItem } from './lib/dataset.ts'
import { faithfulnessRate, standardDeviation, type ScoredClaim } from './lib/metrics.ts'
import { applyPerturbation, perturbationAxes } from './lib/perturbations.ts'
import {
  analyze,
  appendRaw,
  assertServerReachable,
  buildRunConfig,
  createRunDirectory,
  DATASET_DIR,
  writeJson,
} from './lib/run.ts'

/**
 * Experiment 2 — bias sensitivity (RQ2/H2).
 *
 * For each base item, generates identity variants with all substantive content
 * held fixed, runs both conditions across every variant, and reports the
 * per-item standard deviation of `score`.
 *
 * ## The confound check is not optional
 *
 * `RESEARCH_EVALUATION_FINAL.md` requires faithfulness to be reported on this
 * same perturbation subset, alongside variance, and never variance alone. The
 * reason is specific: grounding could reduce score variance by making outputs
 * generically more conservative rather than more accurate, and a variance drop
 * with a faithfulness drop would not support H2. This script computes both and
 * writes both, so the number cannot be reported without its control.
 *
 * The base item must declare the literal name and institution to substitute, via
 * `perturbation_base` in its record. An item without it is skipped and said so —
 * guessing which token is a name would risk altering a qualification, which
 * would destroy the experiment's only control.
 *
 * Usage:
 *   RESEARCH_MODE_ENABLED=true npm run dev        # in careerlens/, separate shell
 *   node research/scripts/perturb.ts [--runs N]
 */

interface PerturbationBase {
  name: string
  institution: string
}

/** Items opt in by carrying `perturbation_base`; the field is spec-optional. */
function perturbationBase(item: DatasetItem): PerturbationBase | null {
  const base = (item as unknown as Record<string, unknown>).perturbation_base
  if (!base || typeof base !== 'object') return null

  const candidate = base as Record<string, unknown>
  return typeof candidate.name === 'string' && typeof candidate.institution === 'string'
    ? { name: candidate.name, institution: candidate.institution }
    : null
}

async function main(): Promise<void> {
  const runsIndex = process.argv.indexOf('--runs')
  const runs = runsIndex === -1 ? 1 : Number(process.argv[runsIndex + 1] ?? '1')

  await assertServerReachable()

  const dataset = loadDataset(DATASET_DIR)
  if (!dataset.hashMatches) {
    throw new Error('items.jsonl does not match manifest.json\'s recorded hash.')
  }

  // Variants stay with their base item's split by construction — they are
  // generated here rather than stored, so a variant can never end up in a
  // different split from the CV it was derived from (the leakage rule).
  const bases = dataset.items.filter((item) => item.identity_variant_of === null)
  const axes = perturbationAxes()

  const runDirectory = createRunDirectory('experiment-2-perturbation')
  const config = buildRunConfig({
    experiment: 'experiment-2-perturbation',
    dataset,
    runsPerItem: runs,
    notes: `${axes.length} identity variants per base item`,
  })
  writeJson(join(runDirectory, 'config.json'), config)

  process.stdout.write(
    `Run: ${runDirectory}\n${bases.length} base items x ${axes.length} variants x ${runs} run(s)\n\n`
  )

  const perItem: Record<string, unknown>[] = []
  const skipped: string[] = []

  for (const base of bases) {
    const substitution = perturbationBase(base)
    if (substitution === null) {
      skipped.push(base.item_id)
      process.stdout.write(`  skip ${base.item_id}: no perturbation_base declared\n`)
      continue
    }

    const scores: Record<string, number[]> = { grounded: [], ungrounded: [] }
    const claimsByCondition: Record<string, ScoredClaim[]> = { grounded: [], ungrounded: [] }

    for (const axis of axes) {
      const variant = applyPerturbation(base, axis, substitution)

      for (let run = 0; run < runs; run += 1) {
        try {
          const data = await analyze(variant)

          const scored: ScoredClaim[] = alignClaims(data.claims, variant.gold_claims).map(
            ({ claim, gold }) => ({
              requirement: claim.requirement,
              status: claim.status,
              evidence_quote: claim.evidence_quote,
              verification: claim.verification,
              hallucination_candidate: claim.hallucination_candidate,
              match_score: claim.match_score,
              gold,
            })
          )

          appendRaw(runDirectory, `${variant.item_id}-run${run}`, {
            item_id: variant.item_id,
            base_item_id: base.item_id,
            axis: axis.id,
            run,
            score: data.score,
            claims: data.claims,
          })

          // Both conditions read the same response — the ungrounded baseline
          // trusts `status`, the grounded one trusts `verification`. Score is
          // the same figure in both; what differs is the faithfulness control.
          scores.grounded.push(data.score)
          scores.ungrounded.push(data.score)
          claimsByCondition.grounded.push(...scored)
          claimsByCondition.ungrounded.push(
            ...scored.map((claim) => ({
              ...claim,
              verification: (claim.status === 'matched' ? 'verified' : claim.verification) as
                ScoredClaim['verification'],
            }))
          )
        } catch (cause) {
          process.stdout.write(`  FAIL ${variant.item_id}: ${String(cause)}\n`)
          appendRaw(runDirectory, `${variant.item_id}-error`, { error: String(cause) })
        }
      }
    }

    perItem.push({
      base_item_id: base.item_id,
      variants: axes.length,
      scores: scores.grounded,
      score_stddev: standardDeviation(scores.grounded),
      score_range:
        scores.grounded.length === 0
          ? null
          : Math.max(...scores.grounded) - Math.min(...scores.grounded),
      // The required confound control, per condition.
      faithfulness: {
        grounded: faithfulnessRate(claimsByCondition.grounded),
        ungrounded: faithfulnessRate(claimsByCondition.ungrounded),
      },
    })

    process.stdout.write(`  ok  ${base.item_id}\n`)
  }

  const stddevs = perItem
    .map((entry) => entry.score_stddev)
    .filter((value): value is number => typeof value === 'number')

  writeJson(join(runDirectory, 'summary.json'), {
    config,
    finishedAt: new Date().toISOString(),
    baseItems: bases.length,
    skippedItems: skipped,
    perItem,
    aggregate: {
      meanScoreStddev: stddevs.length === 0 ? null : stddevs.reduce((a, b) => a + b, 0) / stddevs.length,
      itemsMeasured: stddevs.length,
    },
    interpretation:
      'Score variance across identity variants must be read alongside the ' +
      'faithfulness figures in the same record. A variance reduction accompanied ' +
      'by a faithfulness drop does not support H2 — it indicates outputs became ' +
      'more conservative rather than more accurate. Levene\'s test across ' +
      'conditions is a separate step and is not performed here.',
  })

  process.stdout.write(`\nWrote ${join(runDirectory, 'summary.json')}\n`)
}

await main()
