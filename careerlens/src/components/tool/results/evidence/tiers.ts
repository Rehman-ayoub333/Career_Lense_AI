import type { TagVariant } from '@/components/ui/Badge'
import type { VerificationTier } from '@/types'

/**
 * The words and colours a verification tier is allowed to be shown as.
 *
 * One table, so the copy cannot drift between the checklist, the markers and the
 * coverage block. `CLAIM_MODEL_FINAL.md` is explicit that the `unresolved` label
 * is fixed, reviewed text and must not be paraphrased locally — a locally
 * improvised label is precisely how "not found in this document" erodes back
 * into "you don't have this".
 */

export const TIER_LABEL: Record<VerificationTier, string> = {
  verified: 'Verified',
  uncertain: 'Uncertain',
  /* Fixed copy. About the document, never the person. Do not reword. */
  unresolved: 'Not found in your CV',
}

/** Expanded form, for the checklist group headings. */
export const TIER_HEADING: Record<VerificationTier, string> = {
  verified: 'Evidence found',
  uncertain: 'Evidence unclear',
  unresolved: 'Not found in your CV',
}

/** One sentence per group, stating what the tier does and does not mean. */
export const TIER_DESCRIPTION: Record<VerificationTier, string> = {
  verified: 'The quoted text appears in your CV.',
  uncertain: 'Some of the quoted text appears in your CV, but not closely enough to confirm.',
  unresolved:
    'No supporting text was found in the document you provided. This is not a judgement about your experience.',
}

export const TIER_TAG_VARIANT: Record<VerificationTier, TagVariant> = {
  verified: 'verified',
  uncertain: 'uncertain',
  unresolved: 'unresolved',
}

/**
 * Inline highlight for a marked span.
 *
 * `unresolved` is absent by construction, not by omission: there is no span to
 * highlight when nothing was found, so the type only admits the two tiers that
 * can appear in the document.
 */
export const TIER_MARKER_CLASS: Record<Exclude<VerificationTier, 'unresolved'>, string> = {
  verified:
    'bg-[hsl(var(--green)/0.14)] decoration-[hsl(var(--green)/0.4)] hover:bg-[hsl(var(--green)/0.22)]',
  uncertain:
    'bg-[hsl(var(--amber)/0.14)] decoration-[hsl(var(--amber)/0.4)] hover:bg-[hsl(var(--amber)/0.22)]',
}

/** Fixed display order: found, then unclear, then not found. */
export const TIER_ORDER: readonly VerificationTier[] = ['verified', 'uncertain', 'unresolved']
