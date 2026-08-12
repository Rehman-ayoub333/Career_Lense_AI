/**
 * The summary.
 *
 * Up to three findings that account for the score, set as marginalia rather than
 * as a list of tiles. The previous treatment gave each item a raised surface and
 * a violet arrow, which made three statements of fact look like three buttons.
 *
 * Three constraints, each load-bearing:
 *
 *  - **Never padded to three.** Where the analysis produced fewer, fewer are
 *    shown. A summary filled out to a target length stops being a summary.
 *  - **Never ranked.** The order is the order the analysis returned. Nothing
 *    here says which finding is the most serious, because the product has no
 *    basis for that claim.
 *  - **Never silently empty.** An analysis that found nothing states it once, in
 *    a sentence, rather than rendering an empty region.
 */
export function Summary({ items }: { items: readonly string[] }) {
  const findings = items.slice(0, 3)

  if (findings.length === 0) {
    return (
      <p
        data-testid="key-actions"
        className="mt-4 font-mono text-xs leading-relaxed text-text-muted"
      >
        No requirement is unevidenced.
      </p>
    )
  }

  return (
    <ol data-testid="key-actions" className="mt-4 space-y-4">
      {findings.map((finding) => (
        <li key={finding} className="font-mono text-xs leading-relaxed text-amber-text">
          {finding}
        </li>
      ))}
    </ol>
  )
}
