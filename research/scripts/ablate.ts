import { join } from 'node:path'

import { verifyClaims } from '../../careerlens/src/lib/analysis/grounding.ts'
import { alignClaims } from './lib/align.ts'
import { loadDataset } from './lib/dataset.ts'
import { faithfulnessRate, hallucinationRate, unsupportedClaimRate, type ScoredClaim } from './lib/metrics.ts'
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
 * Experiment 3 — ablation.
 *
 * Confirms the intervention is real and separable by removing one piece at a
 * time and reporting what changes.
 *
 * This is the one script that imports from `careerlens/` directly rather than
 * going over HTTP — the single sanctioned exception in ADR-08. It is the right
 * call precisely here: condition (b) removes Stage 2, and isolating that over
 * HTTP would mean standing up a second server configured differently, whereas
 * `grounding.ts` is pure and can simply not be called. The import is a type-only
 * dependency away from being free, and the module has no server dependencies by
 * design, which is what keeps this exception narrow.
 *
 * ## Conditions
 *
 *  (a) **full** — the shipped pipeline.
 *  (b) **no-stage-2** — claims read as if `verification` were always `verified`.
 *      Shared with Experiment 1's ungrounded baseline, not duplicated work.
 *  (c) **no-injection-defence** — NOT RUN HERE. It requires prompts built
 *      without `wrapUntrusted`, which means a build of the app with the defence
 *      removed. Deliberately not implemented as a flag: a runtime switch that
 *      disables the injection defence is a footgun living in production code for
 *      the sake of one experiment. Run it from a scratch branch instead.
 *  (d) **no-schema** — NOT RUN HERE, for the same shape of reason: it needs
 *      `generateJson` called without `responseSchema`, which is a provider-layer
 *      change, not a parameter.
 *
 * Conditions (c) and (d) are reported as not-run rather than silently dropped.
 *
 * Usage:
 *   RESEARCH_MODE_ENABLED=true npm run dev        # in careerlens/, separate shell
 *   node research/scripts/ablate.ts
 */

const NOT_RUN = {
  'no-injection-defence':
    'Not run. Requires a build with wrapUntrusted removed; a runtime flag that ' +
    'disables the injection defence would be a permanent footgun in production ' +
    'code. Run from a scratch branch against the adversarial fixture set.',
  'no-schema-constrained-decoding':
    'Not run. Requires generateJson called without responseSchema, which is a ' +
    'provider-layer change rather than a parameter.',
} as const

async function main(): Promise<void> {
  await assertServerReachable()

  const dataset = loadDataset(DATASET_DIR)
  if (!dataset.hashMatches) {
    throw new Error('items.jsonl does not match manifest.json\'s recorded hash.')
  }

  const runDirectory = createRunDirectory('experiment-3-ablation')
  const config = buildRunConfig({ experiment: 'experiment-3-ablation', dataset })
  writeJson(join(runDirectory, 'config.json'), config)

  process.stdout.write(`Run: ${runDirectory}\n${dataset.items.length} items\n\n`)

  const conditions: Record<string, ScoredClaim[]> = { full: [], 'no-stage-2': [] }
  const tierDistribution: Record<string, Record<string, number>> = {
    full: { verified: 0, uncertain: 0, unresolved: 0 },
    're-verified': { verified: 0, uncertain: 0, unresolved: 0 },
  }

  for (const item of dataset.items) {
    try {
      const data = await analyze(item)

      // Condition (a): the pipeline's own verification, as shipped.
      const aligned = alignClaims(data.claims, item.gold_claims)

      // The direct-import check: the same claims re-verified in-process against
      // the same CV. It must reproduce the server's tiers exactly — if it does
      // not, either the server is running different code from this checkout or
      // grounding.ts has acquired a hidden dependency on something outside it.
      // Either is worth failing loudly over, so it is recorded per item.
      const reVerified = verifyClaims(
        data.claims.map((claim) => ({
          id: claim.id,
          requirement: claim.requirement,
          category: claim.category as never,
          status: claim.status,
          evidence_quote: claim.evidence_quote,
          rationale: claim.rationale,
        })),
        item.cv_text
      )

      const agreement = data.claims.filter(
        (claim, index) => claim.verification === reVerified[index]?.verification
      ).length

      for (const claim of data.claims) {
        tierDistribution.full[claim.verification] += 1
      }
      for (const claim of reVerified) {
        tierDistribution['re-verified'][claim.verification] += 1
      }

      const scored: ScoredClaim[] = aligned.map(({ claim, gold }) => ({
        requirement: claim.requirement,
        status: claim.status,
        evidence_quote: claim.evidence_quote,
        verification: claim.verification,
        hallucination_candidate: claim.hallucination_candidate,
        match_score: claim.match_score,
        gold,
      }))

      conditions.full.push(...scored)
      // Condition (b): Stage 2 removed — every claim treated as verified.
      conditions['no-stage-2'].push(
        ...scored.map((claim) => ({ ...claim, verification: 'verified' as const }))
      )

      appendRaw(runDirectory, item.item_id, {
        item_id: item.item_id,
        claims: data.claims,
        re_verified: reVerified.map((claim) => ({
          id: claim.id,
          verification: claim.verification,
          match_score: claim.match_score,
        })),
        server_reverify_agreement: `${agreement}/${data.claims.length}`,
      })

      process.stdout.write(
        `  ok  ${item.item_id} (in-process re-verify agrees ${agreement}/${data.claims.length})\n`
      )
    } catch (cause) {
      process.stdout.write(`  FAIL ${item.item_id}: ${String(cause)}\n`)
      appendRaw(runDirectory, `${item.item_id}-error`, { error: String(cause) })
    }
  }

  writeJson(join(runDirectory, 'summary.json'), {
    config,
    finishedAt: new Date().toISOString(),
    conditions: Object.fromEntries(
      Object.entries(conditions).map(([name, claims]) => [
        name,
        {
          faithfulness: faithfulnessRate(claims),
          hallucination: hallucinationRate(claims),
          unsupportedClaims: unsupportedClaimRate(claims),
        },
      ])
    ),
    tierDistribution,
    conditionsNotRun: NOT_RUN,
    interpretation:
      'The no-stage-2 condition treats every claim as verified, which is the ' +
      'literal ungrounded baseline. Its unsupportedClaims rate is 0 by ' +
      'construction — that is the point: the ungrounded pipeline cannot report ' +
      'the failure mode, not that it does not have it.',
  })

  process.stdout.write(`\nWrote ${join(runDirectory, 'summary.json')}\n`)
}

await main()
