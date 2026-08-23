/**
 * The salary estimate.
 *
 * Plain text, with no range bar, no midpoint marker and no chart. This figure is
 * the model's guess from a job description — it is not grounded in the CV, not
 * checked against market data, and not verifiable by anything in this system.
 * Drawing it as a range would give it the visual authority of a measurement,
 * which is the same false-precision move the score gauge and the breakdown bars
 * were removed for.
 *
 * It is labelled as an estimate in the copy for the same reason.
 */
export function CompensationSummary({
  salary_range,
  salary_context,
}: {
  salary_range: string
  salary_context: string
}) {
  const range = salary_range.trim()
  const context = salary_context.trim()

  if (range.length === 0) {
    return (
      <p data-testid="compensation-summary" className="text-sm leading-relaxed text-text-muted">
        No salary estimate was produced for this opportunity.
      </p>
    )
  }

  return (
    <div data-testid="compensation-summary">
      <p className="text-sm text-text-primary">{range}</p>

      {context.length > 0 ? (
        <p className="mt-2 text-xs leading-relaxed text-text-muted">{context}</p>
      ) : null}

      <p className="mt-2 font-mono text-xs text-[hsl(var(--text-muted)/0.7)]">
        Estimated by the model from the description — not checked against market data.
      </p>
    </div>
  )
}
