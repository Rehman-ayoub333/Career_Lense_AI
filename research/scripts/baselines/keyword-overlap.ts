/**
 * Keyword-overlap baseline.
 *
 * The simplest defensible comparison, and roughly what the named commercial
 * "ATS scanners" effectively do: tokenize the requirement and the CV, count how
 * much of the requirement's vocabulary appears, call it a match above a
 * threshold. No evidence, no span, no notion of whether the overlap means
 * anything.
 *
 * It exists to make the contribution measurable. If grounding does not beat
 * this, that is a finding and it should be reportable — which requires the
 * baseline to be implemented honestly rather than strawmanned. Stopwords are
 * removed for exactly that reason: leaving them in would inflate every score
 * with "and", "the", "with" and make the baseline look worse than it is.
 *
 * Zero dependencies, deliberately.
 */

/**
 * Function words that carry no matching signal.
 *
 * Kept short and conventional. A longer, tuned list would be tuning the baseline
 * against this dataset, which is the opposite of what a baseline is for.
 */
const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'but', 'by', 'for', 'from', 'has', 'have',
  'in', 'into', 'is', 'it', 'its', 'of', 'on', 'or', 'that', 'the', 'to', 'was', 'were', 'will',
  'with', 'you', 'your', 'we', 'our', 'they', 'their', 'this', 'these', 'those',
])

/** Same normalization shape as the production verifier: NFKC, fold, strip, collapse. */
export function tokenize(text: string): string[] {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 0 && !STOPWORDS.has(token))
}

/**
 * Fraction of the requirement's distinct content words present anywhere in the CV.
 *
 * Set-based and document-wide on purpose: this baseline has no concept of a span,
 * which is precisely the thing the grounded pipeline adds. Making it window-aware
 * would quietly turn it into a weaker version of the system under test rather
 * than a different approach to compare against.
 */
export function keywordOverlap(requirement: string, cvText: string): number {
  const wanted = new Set(tokenize(requirement))
  if (wanted.size === 0) return 0

  const present = new Set(tokenize(cvText))
  let found = 0
  for (const token of wanted) if (present.has(token)) found += 1

  return found / wanted.size
}

/** Above `threshold` counts as matched. 0.5 = "most of the requirement's words appear". */
export function keywordBaselineStatus(
  requirement: string,
  cvText: string,
  threshold = 0.5
): 'matched' | 'gap' {
  return keywordOverlap(requirement, cvText) >= threshold ? 'matched' : 'gap'
}
