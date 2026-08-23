import { join } from 'node:path'

import { alignClaims, spanOverlap } from './lib/align.ts'
import { loadDataset, splitItems, type DatasetItem } from './lib/dataset.ts'
import {
  evidenceExtractionAccuracy,
  faithfulnessRate,
  hallucinationRate,
  precisionRecallF1,
  unsupportedClaimRate,
  wilsonInterval,
  type ScoredClaim,
} from './lib/metrics.ts'
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
 * Experiment 1 — evidence grounding (RQ1/H1).
 *
 * Runs the pipeline over the held-out test split and computes the metrics table
 * from `RESEARCH_EVALUATION_FINAL.md`, for two conditions:
 *
 *  - **grounded** — the shipped pipeline, `verification` consulted.
 *  - **ungrounded** — the baseline, which is the pipeline *before* this thesis's
 *    intervention: Stage 1's claims trusted at face value, `status` taken as the
 *    answer with no Stage 2 check. It is derived from the same response rather
 *    than obtained from a second call, because it is literally the same model
 *    output read differently — re-calling would introduce sampling noise into a
 *    comparison that has none by construction.
 *
 * Usage:
 *   RESEARCH_MODE_ENABLED=true npm run dev        # in careerlens/, separate shell
 *   node research/scripts/evaluate.ts [--split test|calibration|all] [--runs N]
 */

interface Condition {
  name: 'grounded' | 'ungrounded'
  /** How this condition decides a claim is a positive assertion of evidence. */
  verifiedWhen: (claim: ScoredClaim) => boolean
}

const CONDITIONS: readonly Condition[] = [
  { name: 'grounded', verifiedWhen: (claim) => claim.verification === 'verified' },
  // The ungrounded baseline has no verification at all: whatever the model
  // called `matched` is what it asserts. This is the shipped-before behaviour.
  { name: 'ungrounded', verifiedWhen: (claim) => claim.status === 'matched' },
]

function parseArgs(argv: readonly string[]): { split: string; runs: number } {
  const get = (flag: string, fallback: string): string => {
    const index = argv.indexOf(flag)
    return index === -1 || argv[index + 1] === undefined ? fallback : (argv[index + 1] as string)
  }

  return { split: get('--split', 'test'), runs: Number(get('--runs', '1')) }
}

/** Re-reads a scored claim under a condition's definition of "verified". */
function underCondition(claims: readonly ScoredClaim[], condition: Condition): ScoredClaim[] {
  return claims.map((claim) => ({
    ...claim,
    verification: condition.verifiedWhen(claim) ? 'verified' : claim.verification,
  }))
}

function summarise(claims: readonly ScoredClaim[], gold: DatasetItem['gold_claims']) {
  const faithfulness = faithfulnessRate(claims)
  const hallucination = hallucinationRate(claims)
  const unsupported = unsupportedClaimRate(claims)

  return {
    faithfulness: {
      ...faithfulness,
      ci95: wilsonInterval(faithfulness.numerator, faithfulness.denominator),
    },
    hallucination: {
      ...hallucination,
      ci95: wilsonInterval(hallucination.numerator, hallucination.denominator),
    },
    unsupportedClaims: unsupported,
    classification: precisionRecallF1(claims, gold),
    evidenceExtraction: evidenceExtractionAccuracy(claims, spanOverlap),
  }
}

async function main(): Promise<void> {
  const { split, runs } = parseArgs(process.argv.slice(2))

  await assertServerReachable()

  const dataset = loadDataset(DATASET_DIR)
  if (!dataset.hashMatches) {
    // Refused, not warned: a result file naming v1 while v1 has been edited
    // since is a reproducibility failure, and it is invisible after the fact.
    throw new Error(
      'items.jsonl does not match the hash recorded in manifest.json. Re-run ' +
        'the manifest hash update deliberately if the dataset really did change.'
    )
  }

  const splits = splitItems(dataset)
  const items =
    split === 'all' ? dataset.items : split === 'calibration' ? splits.calibration : splits.test

  if (items.length === 0) {
    throw new Error(`Split "${split}" contains no items. Check manifest.json's split assignment.`)
  }

  const runDirectory = createRunDirectory('experiment-1-grounding')
  const config = buildRunConfig({
    experiment: 'experiment-1-grounding',
    dataset,
    runsPerItem: runs,
    notes: `split=${split}`,
  })

  // Config first, before a single call is made.
  writeJson(join(runDirectory, 'config.json'), config)
  process.stdout.write(`Run: ${runDirectory}\n${items.length} items, ${runs} run(s) each\n\n`)

  const perCondition = new Map<string, ScoredClaim[]>(CONDITIONS.map((c) => [c.name, []]))
  const allGold: DatasetItem['gold_claims'] = []
  let completed = 0

  for (const item of items) {
    try {
      for (let run = 0; run < runs; run += 1) {
        const data = await analyze(item)

        const scored: ScoredClaim[] = alignClaims(data.claims, item.gold_claims).map(
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

        // Raw output per item, written before any aggregate exists — a run that
        // dies at item 40 leaves 1-39 usable and re-scorable.
        appendRaw(runDirectory, `${item.item_id}-run${run}`, {
          item_id: item.item_id,
          run,
          score: data.score,
          verdict: data.verdict,
          coverage: data.coverage,
          claims: data.claims,
          alignment: scored.map((claim) => ({
            requirement: claim.requirement,
            gold_requirement: claim.gold?.requirement ?? null,
            gold_status: claim.gold?.gold_status ?? null,
          })),
        })

        for (const condition of CONDITIONS) {
          perCondition.get(condition.name)?.push(...underCondition(scored, condition))
        }
        allGold.push(...item.gold_claims)
      }

      completed += 1
      process.stdout.write(`  ok  ${item.item_id} (${completed}/${items.length})\n`)
    } catch (cause) {
      // Recorded and skipped. One failed item must not discard the run.
      process.stdout.write(`  FAIL ${item.item_id}: ${String(cause)}\n`)
      appendRaw(runDirectory, `${item.item_id}-error`, { item_id: item.item_id, error: String(cause) })
    }
  }

  const summary = {
    config,
    finishedAt: new Date().toISOString(),
    itemsRequested: items.length,
    itemsCompleted: completed,
    conditions: Object.fromEntries(
      CONDITIONS.map((condition) => [
        condition.name,
        summarise(perCondition.get(condition.name) ?? [], allGold),
      ])
    ),
    // Stated in the output, not left to the reader to remember.
    interpretation:
      'Rates are null where the denominator was zero — not measured, as distinct ' +
      'from zero. Significance testing and error analysis are separate steps ' +
      'required by RESEARCH_EVALUATION_FINAL.md and are not performed here.',
  }

  writeJson(join(runDirectory, 'summary.json'), summary)
  process.stdout.write(`\nWrote ${join(runDirectory, 'summary.json')}\n`)
}

await main()
