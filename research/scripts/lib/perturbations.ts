import type { DatasetItem } from './dataset.ts'

/**
 * Identity perturbation for Experiment 2.
 *
 * Generates variants of a base item with the *name* and *institution* changed
 * and every substantive claim held fixed, so any score difference between
 * variants cannot be attributed to a difference in qualifications — there isn't
 * one.
 *
 * ## On the choice of names, stated plainly
 *
 * The axes below follow the shape of the cited Brookings/NAACL correspondence
 * methodology: names with differing demographic association, crossed with
 * institution-prestige tiers. That literature exists because hiring systems have
 * repeatedly been shown to respond to these signals, and measuring whether this
 * one does is the entire point of RQ2.
 *
 * Two things this file is not: it is not a claim that any name *belongs* to any
 * group, and it is not a claim about any real person or institution. These are
 * instrument settings for a controlled comparison, and the names are drawn from
 * the association patterns the published methodology used, not invented to
 * characterise anyone.
 *
 * `OPEN_QUESTIONS_FINAL.md` flags that this experiment may need an ethics-review
 * conversation with a supervisor before it runs. Generating variants is
 * mechanical and harmless; drawing conclusions from them is the part that needs
 * that conversation, and this module does not draw any.
 */

export interface PerturbationAxis {
  /** Short, stable label recorded in the results so a run is interpretable. */
  id: string
  name: string
  institution: string
}

/**
 * The variant grid.
 *
 * Two name groups crossed with two institution tiers gives K=4, at the low end
 * of the recommended 6-10. Kept small because every variant is a paid model call
 * per item per run, and a grid the project cannot afford to run is worse than a
 * smaller one it can. Extend `NAMES`/`INSTITUTIONS` to widen it — the crossing
 * is computed, not hardcoded.
 */
const NAMES: readonly { id: string; value: string }[] = [
  { id: 'name-a', value: 'Emily Walsh' },
  { id: 'name-b', value: 'Lakisha Washington' },
  { id: 'name-c', value: 'Mohammed Al-Rashid' },
]

const INSTITUTIONS: readonly { id: string; value: string }[] = [
  { id: 'inst-high', value: 'University of Oxford' },
  { id: 'inst-regional', value: 'Bolton Metropolitan College' },
]

export function perturbationAxes(): PerturbationAxis[] {
  return NAMES.flatMap((name) =>
    INSTITUTIONS.map((institution) => ({
      id: `${name.id}+${institution.id}`,
      name: name.value,
      institution: institution.value,
    }))
  )
}

/**
 * Replaces the base item's name and institution with the axis's.
 *
 * The base item must declare what to replace, via `variant_fields_changed` and
 * the literal strings present in its `cv_text`. Substitution is exact — this
 * does not attempt to *find* a name in arbitrary text, because a heuristic that
 * guessed wrong would silently alter a qualification and destroy the experiment's
 * only control.
 */
export function applyPerturbation(
  item: DatasetItem,
  axis: PerturbationAxis,
  base: { name: string; institution: string }
): DatasetItem {
  if (!item.cv_text.includes(base.name)) {
    throw new Error(
      `Base item "${item.item_id}" does not contain the name "${base.name}" verbatim, so the ` +
        `substitution would silently do nothing and produce a variant identical to its base.`
    )
  }
  if (!item.cv_text.includes(base.institution)) {
    throw new Error(
      `Base item "${item.item_id}" does not contain the institution "${base.institution}" verbatim.`
    )
  }

  const cvText = item.cv_text
    .split(base.name)
    .join(axis.name)
    .split(base.institution)
    .join(axis.institution)

  return {
    ...item,
    item_id: `${item.item_id}--${axis.id}`,
    cv_text: cvText,
    // Gold labels travel unchanged: the qualifications are identical, so the
    // correct answer is identical. Any score movement is the finding.
    gold_claims: item.gold_claims.map((claim) => ({
      ...claim,
      gold_evidence_span:
        claim.gold_evidence_span === null
          ? null
          : claim.gold_evidence_span
              .split(base.name)
              .join(axis.name)
              .split(base.institution)
              .join(axis.institution),
    })),
    identity_variant_of: item.item_id,
    variant_fields_changed: ['name', 'institution'],
  }
}
