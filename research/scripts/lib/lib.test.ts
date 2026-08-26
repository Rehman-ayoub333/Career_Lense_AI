import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'node:test'

import { keywordBaselineStatus, keywordOverlap, tokenize } from '../baselines/keyword-overlap.ts'
import {
  cosineSimilarity,
  embeddingBaselineStatus,
  embeddingSimilarities,
  EmbeddingBaselineNotConfiguredError,
  getEmbeddingBaseline,
} from '../baselines/embedding-similarity.ts'
import { alignClaims, requirementSimilarity } from './align.ts'
import { loadDataset, parseItems, sha256, validateItem, type GoldClaim } from './dataset.ts'
import {
  cohensKappa,
  evidenceExtractionAccuracy,
  faithfulnessRate,
  hallucinationRate,
  precisionRecallF1,
  standardDeviation,
  unsupportedClaimRate,
  wilsonInterval,
  type ScoredClaim,
} from './metrics.ts'
import { applyPerturbation, perturbationAxes } from './perturbations.ts'
import { DATASET_DIR } from './run.ts'

/**
 * Unit tests for everything in research/ that does not need a live model.
 *
 * Run with `node --test research/scripts/lib/lib.test.ts` — Node's own runner,
 * no test framework, no dependency. What is NOT covered here is the part that
 * calls the API, which is blocked on a working ANTHROPIC_API_KEY and is reported as
 * blocked rather than stubbed into a green tick.
 */

function gold(overrides: Partial<GoldClaim> = {}): GoldClaim {
  return {
    requirement: 'Production React experience',
    category: 'skill',
    gold_status: 'matched',
    gold_evidence_span: null,
    labeler_id: 'L1',
    ...overrides,
  }
}

function scored(overrides: Partial<ScoredClaim> = {}): ScoredClaim {
  return {
    requirement: 'Production React experience',
    status: 'matched',
    evidence_quote: 'four years of React',
    verification: 'verified',
    hallucination_candidate: false,
    match_score: 0.95,
    gold: gold(),
    ...overrides,
  }
}

describe('dataset validation', () => {
  const base = {
    item_id: 'syn-0001',
    mode: 'job',
    cv_text: 'Built three production React applications.',
    opportunity_text: 'We need React experience.',
    gold_claims: [],
    identity_variant_of: null,
    variant_fields_changed: [],
    construction_method: 'synthetic',
    construction_date: '2026-08-23',
  }

  it('accepts a well-formed item', () => {
    assert.equal(validateItem(base).item_id, 'syn-0001')
  })

  it('rejects a gap claim that carries an evidence span', () => {
    // The same rule the production guard applies to model output, applied to
    // human labels: a label asserting no evidence while quoting evidence is
    // self-contradictory whoever wrote it.
    assert.throws(
      () =>
        validateItem({
          ...base,
          gold_claims: [gold({ gold_status: 'gap', gold_evidence_span: 'Built three' })],
        }),
      /gap but carries an evidence span/
    )
  })

  it('rejects a span that is not verbatim in cv_text', () => {
    // Spans must be copied exactly, mirroring what the model is told to do —
    // that symmetry is what makes the faithfulness comparison meaningful.
    assert.throws(
      () =>
        validateItem({
          ...base,
          gold_claims: [gold({ gold_evidence_span: 'built 3 React apps' })],
        }),
      /not a verbatim substring/
    )
  })

  it('accepts a span that is verbatim', () => {
    assert.doesNotThrow(() =>
      validateItem({
        ...base,
        gold_claims: [gold({ gold_evidence_span: 'three production React applications' })],
      })
    )
  })

  it('rejects unknown categories and statuses rather than coercing them', () => {
    assert.throws(() => validateItem({ ...base, gold_claims: [gold({ category: 'vibes' as never })] }))
    assert.throws(() => validateItem({ ...base, gold_claims: [gold({ gold_status: 'ok' as never })] }))
  })

  it('reports the offending line number for unparseable JSON', () => {
    assert.throws(() => parseItems(`${JSON.stringify(base)}\nnot json\n`), /Line 2.*not valid JSON/s)
  })

  it('reports the offending line number for a validation failure too', () => {
    // Locating a bad label by hand in a 150-line file is the friction that makes
    // people stop validating.
    const bad = { ...base, gold_claims: [gold({ gold_status: 'gap', gold_evidence_span: 'x' })] }
    assert.throws(
      () => parseItems(`${JSON.stringify(base)}\n${JSON.stringify(bad)}\n`),
      /Line 2.*gap but carries an evidence span/s
    )
  })

  it('skips blank lines and comments', () => {
    assert.equal(parseItems(`${JSON.stringify(base)}\n\n// a note\n`).length, 1)
  })
})

describe('the shipped scaffold dataset', () => {
  const dataset = loadDataset(DATASET_DIR)

  it('loads and validates every item', () => {
    assert.equal(dataset.items.length, 5)
  })

  it('matches the hash recorded in its manifest', () => {
    // The reproducibility guarantee: a run can prove it evaluated the exact
    // revision it claims to have.
    assert.equal(dataset.hashMatches, true)
  })

  it('detects a mismatched hash rather than tolerating it', () => {
    const raw = readFileSync(join(DATASET_DIR, 'v1', 'items.jsonl'), 'utf8')
    assert.notEqual(sha256(`${raw} `), dataset.manifest.items_sha256)
  })

  it('is labelled as a scaffold, not as a research dataset', () => {
    // Guards against these five items ever being quietly treated as the real set.
    assert.match(dataset.manifest.notes ?? '', /SCAFFOLD ONLY/)
    assert.ok(dataset.items.length < 60, 'scaffold must stay far below the 60-150 target')
  })

  it('covers both modes and all three gold statuses', () => {
    const statuses = new Set(dataset.items.flatMap((i) => i.gold_claims.map((c) => c.gold_status)))
    assert.deepEqual([...statuses].sort(), ['gap', 'matched', 'partial'])
    assert.deepEqual([...new Set(dataset.items.map((i) => i.mode))].sort(), ['job', 'scholarship'])
  })
})

describe('metrics', () => {
  it('returns null rather than 0 when nothing was measured', () => {
    // Zero is a claim; null is the truth. Averaging a fabricated 0 across items
    // would drag every aggregate down silently.
    assert.equal(faithfulnessRate([]).value, null)
    assert.equal(hallucinationRate([]).value, null)
    assert.equal(standardDeviation([42]), null)
    assert.equal(wilsonInterval(0, 0), null)
  })

  it('computes faithfulness as verified-and-gold-matched over verified', () => {
    const claims = [
      scored(),
      scored({ gold: gold({ gold_status: 'gap', gold_evidence_span: null }) }),
      scored({ verification: 'unresolved' }),
    ]
    const result = faithfulnessRate(claims)
    assert.equal(result.denominator, 2)
    assert.equal(result.numerator, 1)
    assert.equal(result.value, 0.5)
  })

  it('computes hallucination rate only over claims that quoted something', () => {
    const claims = [
      scored({ hallucination_candidate: true, verification: 'unresolved' }),
      scored(),
      scored({ evidence_quote: null, hallucination_candidate: false }),
    ]
    const result = hallucinationRate(claims)
    assert.equal(result.denominator, 2)
    assert.equal(result.value, 0.5)
  })

  it('computes the unsupported-claim rate, the headline comparison', () => {
    const claims = [
      scored({ status: 'matched', verification: 'unresolved' }),
      scored({ status: 'matched', verification: 'verified' }),
      scored({ status: 'gap', verification: 'unresolved' }),
    ]
    assert.equal(unsupportedClaimRate(claims).value, 0.5)
  })

  it('computes precision, recall and F1 against the gold set', () => {
    const claims = [scored(), scored({ gold: gold({ gold_status: 'partial' }) })]
    const result = precisionRecallF1(claims, [gold(), gold({ requirement: 'Other' })])

    assert.equal(result.truePositives, 1)
    assert.equal(result.falsePositives, 1)
    assert.equal(result.precision, 0.5)
    assert.equal(result.recall, 0.5)
    assert.equal(result.f1, 0.5)
  })

  it('measures evidence extraction only where both sides offered a span', () => {
    const claims = [
      scored({ evidence_quote: 'four years of React', gold: gold({ gold_evidence_span: 'four years of React' }) }),
      scored({ evidence_quote: 'entirely different text', gold: gold({ gold_evidence_span: 'four years of React' }) }),
      scored({ evidence_quote: null }),
    ]
    const result = evidenceExtractionAccuracy(claims, (a, b) => (a === b ? 1 : 0))
    assert.equal(result.denominator, 2)
    assert.equal(result.value, 0.5)
  })

  it('computes a Wilson interval that stays inside [0, 1]', () => {
    // The reason for Wilson over the normal approximation: at small n and rates
    // near the boundary, the normal interval runs outside [0, 1].
    const [low, high] = wilsonInterval(0, 20) as [number, number]
    assert.ok(low >= 0 && high <= 1, `interval [${low}, ${high}] escaped [0, 1]`)
    assert.ok(high > 0, 'a zero-success interval should still have width')
  })

  it('computes Cohen kappa, and reports chance agreement as near zero', () => {
    const perfect = cohensKappa(['matched', 'gap', 'partial'], ['matched', 'gap', 'partial'])
    assert.equal(perfect, 1)

    // Two labellers who always say "matched" agree completely by chance; raw
    // agreement would report 1.0, which is exactly the overstatement kappa fixes.
    assert.equal(cohensKappa(['matched', 'matched'], ['matched', 'matched']), null)
  })

  it('refuses mismatched labeller arrays instead of truncating', () => {
    assert.throws(() => cohensKappa(['matched'], ['matched', 'gap']), /differ in length/)
  })

  it('computes sample standard deviation', () => {
    assert.equal(standardDeviation([2, 4, 4, 4, 5, 5, 7, 9])?.toFixed(4), '2.1381')
  })
})

describe('claim alignment', () => {
  it('pairs differently-worded statements of the same requirement', () => {
    const [alignment] = alignClaims(
      [{ requirement: 'Production React experience' }],
      [gold({ requirement: 'production experience with React' })]
    )
    assert.notEqual(alignment.gold, null)
  })

  it('leaves an unrelated claim unaligned rather than pairing it with its nearest neighbour', () => {
    // A bad alignment surfaces as a plausible accuracy number rather than an
    // error, so the threshold refuses instead of guessing.
    const [alignment] = alignClaims(
      [{ requirement: 'Kubernetes cluster administration' }],
      [gold({ requirement: 'Written communication skills' })]
    )
    assert.equal(alignment.gold, null)
  })

  it('never pairs one gold claim with two claims', () => {
    const alignments = alignClaims(
      [{ requirement: 'React experience' }, { requirement: 'React experience' }],
      [gold({ requirement: 'React experience' })]
    )
    assert.equal(alignments.filter((a) => a.gold !== null).length, 1)
  })

  it('scores identical requirements at 1 and disjoint ones at 0', () => {
    assert.equal(requirementSimilarity('React experience', 'React experience'), 1)
    assert.equal(requirementSimilarity('React', 'Kubernetes'), 0)
  })
})

describe('keyword-overlap baseline', () => {
  const cv = 'Built three production React applications using TypeScript and GraphQL.'

  it('scores a fully covered requirement at 1', () => {
    assert.equal(keywordOverlap('production React', cv), 1)
  })

  it('scores an absent requirement at 0', () => {
    assert.equal(keywordOverlap('Kubernetes orchestration', cv), 0)
  })

  it('removes stopwords, so they cannot inflate the score', () => {
    // Leaving them in would make the baseline look worse than it is, which
    // would flatter the system under test.
    assert.deepEqual(tokenize('the and of React'), ['react'])
    assert.equal(keywordOverlap('the React and the TypeScript', cv), 1)
  })

  it('has no notion of a span, which is the thing grounding adds', () => {
    // "React" and "GraphQL" are in different sentences; a document-wide bag of
    // words cannot tell, and that is the honest limitation of this baseline.
    assert.equal(keywordBaselineStatus('React GraphQL', cv), 'matched')
  })

  it('returns 0 for an empty requirement rather than dividing by zero', () => {
    assert.equal(keywordOverlap('   ', cv), 0)
  })
})

describe('embedding baseline', () => {
  /**
   * The credential is read from the ambient environment, so these tests set it
   * explicitly and restore it. Asserting against whatever happens to be in the
   * developer's shell would make the suite pass or fail for reasons unrelated to
   * the code — and this suite has to stay green both before and after
   * `VOYAGE_API_KEY` is populated.
   */
  function withEnv<T>(overrides: Record<string, string | undefined>, run: () => T): T {
    const saved = new Map<string, string | undefined>()
    for (const key of Object.keys(overrides)) saved.set(key, process.env[key])

    try {
      for (const [key, value] of Object.entries(overrides)) {
        if (value === undefined) delete process.env[key]
        else process.env[key] = value
      }
      return run()
    } finally {
      for (const [key, value] of saved) {
        if (value === undefined) delete process.env[key]
        else process.env[key] = value
      }
    }
  }

  it('refuses rather than silently degrading to something weaker', () => {
    // A baseline that quietly returns a plausible number is worse than an absent
    // one, because the comparison still gets published. Experiment 1 reports
    // without it (ADR-23).
    withEnv({ VOYAGE_API_KEY: undefined }, () => {
      assert.throws(() => getEmbeddingBaseline(), EmbeddingBaselineNotConfiguredError)
    })
  })

  it('treats a whitespace-only key as absent, not as a credential', () => {
    withEnv({ VOYAGE_API_KEY: '   ' }, () => {
      assert.throws(() => getEmbeddingBaseline(), EmbeddingBaselineNotConfiguredError)
    })
  })

  it('does not accept the generation credential in place of the embedding one', () => {
    // ADR-23 made these separate vendors. An ANTHROPIC_API_KEY satisfying this
    // check would be a silent misconfiguration that only fails at the network,
    // and it would undercut the privacy spec's claim that the two credentials
    // reach two different processors.
    withEnv({ VOYAGE_API_KEY: undefined, ANTHROPIC_API_KEY: 'sk-ant-test' }, () => {
      assert.throws(() => getEmbeddingBaseline(), EmbeddingBaselineNotConfiguredError)
    })
  })

  it('builds against Voyage once a credential exists, defaulting the model', () => {
    withEnv({ VOYAGE_API_KEY: 'test-key', VOYAGE_MODEL: undefined }, () => {
      assert.equal(getEmbeddingBaseline().model, 'voyage-4')
    })
  })

  it('lets VOYAGE_MODEL roll the model forward without a code change', () => {
    // The model string lands in every run's config.json, so it has to be the
    // one actually used, not a hard-coded default that silently diverges.
    withEnv({ VOYAGE_API_KEY: 'test-key', VOYAGE_MODEL: 'voyage-4-large' }, () => {
      assert.equal(getEmbeddingBaseline().model, 'voyage-4-large')
    })
  })

  it('has a correct cosine implementation', () => {
    assert.equal(cosineSimilarity([1, 0], [1, 0]), 1)
    assert.equal(cosineSimilarity([1, 0], [0, 1]), 0)
    assert.equal(cosineSimilarity([0, 0], [1, 1]), 0)
    assert.throws(() => cosineSimilarity([1], [1, 2]), /lengths differ/)
  })

  it('embeds the CV once for all requirements, not once per pair', async () => {
    // One call per pair would multiply the quota cost by the requirement count
    // for an identical result, so the batching is worth pinning down.
    const calls: string[][] = []
    const stub = {
      model: 'stub',
      async embed(texts: readonly string[]): Promise<number[][]> {
        calls.push([...texts])
        return texts.map((_, index) => (index === 0 ? [1, 0] : [1, 0]))
      },
    }

    const scores = await embeddingSimilarities(['React', 'GraphQL'], 'cv text', stub)

    assert.equal(calls.length, 1)
    assert.deepEqual(calls[0], ['cv text', 'React', 'GraphQL'])
    assert.deepEqual(scores, [1, 1])
  })

  it('returns no scores for no requirements, without calling the endpoint', async () => {
    let called = false
    const stub = {
      model: 'stub',
      async embed(): Promise<number[][]> {
        called = true
        return []
      },
    }

    assert.deepEqual(await embeddingSimilarities([], 'cv text', stub), [])
    assert.equal(called, false)
  })

  it('thresholds similarity into the same matched/gap vocabulary as the keyword baseline', () => {
    // 0.6 is a starting value, not a calibrated one — same status as the
    // verifier's 0.85/0.55.
    assert.equal(embeddingBaselineStatus(0.7), 'matched')
    assert.equal(embeddingBaselineStatus(0.6), 'matched')
    assert.equal(embeddingBaselineStatus(0.59), 'gap')
    assert.equal(embeddingBaselineStatus(0.5, 0.4), 'matched')
  })
})

describe('identity perturbation', () => {
  const dataset = loadDataset(DATASET_DIR)
  const base = dataset.items[0]
  const substitution = { name: 'Priya Raman', institution: 'University of Manchester' }

  it('produces a full crossing of names and institutions', () => {
    const axes = perturbationAxes()
    assert.equal(axes.length, 6)
    assert.equal(new Set(axes.map((a) => a.id)).size, 6)
  })

  it('changes only the name and institution, leaving qualifications identical', () => {
    const [axis] = perturbationAxes()
    const variant = applyPerturbation(base, axis, substitution)

    assert.ok(variant.cv_text.includes(axis.name))
    assert.ok(!variant.cv_text.includes(substitution.name))

    // Every substantive line survives. This is the experiment's only control:
    // if content changed, a score difference would mean nothing.
    for (const line of ['Built and shipped three production React applications', 'Cut', 'GraphQL']) {
      assert.equal(
        variant.cv_text.includes(line),
        base.cv_text.includes(line),
        `substantive content changed: ${line}`
      )
    }
  })

  it('keeps gold labels aligned by rewriting spans that contained the substituted text', () => {
    const [axis] = perturbationAxes()
    const variant = applyPerturbation(base, axis, substitution)

    for (const claim of variant.gold_claims) {
      if (claim.gold_evidence_span !== null) {
        assert.ok(
          variant.cv_text.includes(claim.gold_evidence_span),
          `span no longer verbatim after perturbation: ${claim.gold_evidence_span}`
        )
      }
    }
  })

  it('points every variant back at its base item', () => {
    const [axis] = perturbationAxes()
    const variant = applyPerturbation(base, axis, substitution)

    assert.equal(variant.identity_variant_of, base.item_id)
    assert.deepEqual(variant.variant_fields_changed, ['name', 'institution'])
  })

  it('refuses when the base text does not contain the declared name verbatim', () => {
    // Silently producing a variant identical to its base would put a fake zero
    // into the variance figure.
    assert.throws(
      () => applyPerturbation(base, perturbationAxes()[0], { name: 'Nobody', institution: 'Nowhere' }),
      /does not contain the name/
    )
  })
})
