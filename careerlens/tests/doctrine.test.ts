import { TAG_VARIANTS, type TagVariant } from '@/components/ui/Badge'
import {
  TIER_DESCRIPTION,
  TIER_HEADING,
  TIER_LABEL,
  TIER_MARKER_CLASS,
  TIER_ORDER,
  TIER_TAG_VARIANT,
} from '@/components/tool/results/evidence/tiers'
import { VERIFICATION_TIERS } from '@/lib/analysis/constants'

/**
 * Doctrine regression tests.
 *
 * These pin the rules the redesign exists to enforce, at the layer where they
 * are mechanically checkable: the variant-to-token maps and the fixed copy. They
 * do not render anything, and deliberately so — the assertion "unresolved is
 * never red" is a fact about a mapping, and a mapping can be tested without a
 * DOM. Testing it through a rendered component would make the strongest
 * guarantee in the codebase depend on a test runner that is not installed.
 *
 * If one of these fails, the failure is not a styling regression. It means the
 * product has started making a claim about a person that it has no basis for.
 */

describe('no red for unresolved — the rule this redesign exists to enforce', () => {
  it('maps unresolved to the dedicated slate token, not red', () => {
    expect(TAG_VARIANTS.unresolved).toContain('--unresolved')
    expect(TAG_VARIANTS.unresolved).not.toContain('--red')
  })

  it('has no red mapping anywhere in the tag vocabulary at all', () => {
    // Structural, not incidental: red is reserved for system errors, so there
    // must be no variant here for a component to reach for by accident. The old
    // `missing` variant was red, and its absence is the fix.
    for (const [variant, classes] of Object.entries(TAG_VARIANTS)) {
      expect({ variant, hasRed: classes.includes('--red') }).toEqual({ variant, hasRed: false })
    }
  })

  it('no longer exposes the match/missing/extra vocabulary', () => {
    const retired = ['match', 'missing', 'extra']
    for (const name of retired) {
      expect(Object.keys(TAG_VARIANTS)).not.toContain(name)
    }
  })

  it('offers exactly the three verification tiers plus neutral', () => {
    expect(Object.keys(TAG_VARIANTS).sort()).toEqual([
      'neutral',
      'uncertain',
      'unresolved',
      'verified',
    ])
  })

  it('uses no red in the inline document markers either', () => {
    for (const classes of Object.values(TIER_MARKER_CLASS)) {
      expect(classes).not.toContain('--red')
    }
  })

  it('has no marker style for unresolved, because there is no span to mark', () => {
    // Nothing was found, so highlighting a location would be the document
    // asserting support that does not exist.
    expect(Object.keys(TIER_MARKER_CLASS).sort()).toEqual(['uncertain', 'verified'])
  })
})

describe('tier copy — about the document, never the person', () => {
  it('keeps the fixed unresolved label verbatim', () => {
    // CLAIM_MODEL_FINAL.md fixes this string. A locally improvised label is
    // exactly how the rule erodes, so the wording is pinned rather than trusted.
    expect(TIER_LABEL.unresolved).toBe('Not found in your CV')
    expect(TIER_HEADING.unresolved).toBe('Not found in your CV')
  })

  it('never phrases a tier as a statement about the candidate', () => {
    const forbidden = [
      'you lack',
      "you don't have",
      'you do not have',
      'missing skill',
      'candidate lacks',
      'unqualified',
      'failed',
    ]

    const copy = [
      ...Object.values(TIER_LABEL),
      ...Object.values(TIER_HEADING),
      ...Object.values(TIER_DESCRIPTION),
    ].join(' ')

    for (const phrase of forbidden) {
      expect(copy.toLowerCase()).not.toContain(phrase)
    }
  })

  it('states explicitly that unresolved is not a judgement', () => {
    expect(TIER_DESCRIPTION.unresolved).toContain('not a judgement')
  })

  it('covers every tier, so none can render without copy', () => {
    for (const tier of VERIFICATION_TIERS) {
      expect(TIER_LABEL[tier]).toBeTruthy()
      expect(TIER_HEADING[tier]).toBeTruthy()
      expect(TIER_DESCRIPTION[tier]).toBeTruthy()
      expect(TAG_VARIANTS[TIER_TAG_VARIANT[tier] as TagVariant]).toBeTruthy()
    }
  })

  it('orders the tiers found, unclear, not-found', () => {
    expect(TIER_ORDER).toEqual(['verified', 'uncertain', 'unresolved'])
  })
})
