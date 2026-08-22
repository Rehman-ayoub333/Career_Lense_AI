import { CANVAS_TOKENS } from '@/config/design-tokens'
import { SITE } from '@/config/site'
import { bandForScore } from '@/lib/scoring'
import type { AnalysisSession } from '@/types'

/**
 * Renders a shareable card to a canvas.
 *
 * This is the one artefact users actually publish, and until now it contradicted
 * the product's own doctrine on the way out the door. It drew a ring gauge
 * sweeping up to the score, coloured the numeral by band, and stacked three
 * progress bars for skills, experience and education — every pattern `Hallmark`
 * exists to have removed, rendered at 1200×630 and posted publicly.
 *
 * What it draws now matches the in-app mark exactly: the numeral struck once at
 * full size in one colour whatever it says, the band as a word, the coverage
 * count as plain text, and up to three verified requirements as uncoloured
 * chips. The three sub-scores it used to chart no longer exist in the data model
 * at all.
 *
 * Nothing here is coloured by value. A card showing 31 is drawn identically to
 * one showing 92 — different figures, the same construction.
 */

const WIDTH = 1200
const HEIGHT = 630

const FONT = 'system-ui, sans-serif'
const MARGIN = 80
const CONTENT_WIDTH = WIDTH - MARGIN * 2

function drawBackground(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = CANVAS_TOKENS.bg
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  const wash = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT)
  wash.addColorStop(0, CANVAS_TOKENS.violetWash)
  wash.addColorStop(1, CANVAS_TOKENS.blueWash)
  ctx.fillStyle = wash
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  ctx.strokeStyle = CANVAS_TOKENS.border
  ctx.lineWidth = 2
  ctx.strokeRect(1, 1, WIDTH - 2, HEIGHT - 2)
}

/**
 * The hallmark: a plate, the numeral, and the band word beneath it.
 *
 * `textPrimary` regardless of score — the band is carried by the word, exactly
 * as it is on screen. There is no call to `getScoreToken` in this file any more,
 * and there should not be one again.
 */
function drawHallmark(ctx: CanvasRenderingContext2D, score: number): void {
  const plateX = MARGIN
  const plateY = 150
  const plateW = 260
  const plateH = 200

  ctx.beginPath()
  ctx.roundRect(plateX, plateY, plateW, plateH, 10)
  ctx.fillStyle = CANVAS_TOKENS.surface
  ctx.fill()
  ctx.strokeStyle = CANVAS_TOKENS.border
  ctx.lineWidth = 1
  ctx.stroke()

  ctx.fillStyle = CANVAS_TOKENS.textPrimary
  ctx.font = `600 96px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(String(score), plateX + plateW / 2, plateY + plateH / 2)

  ctx.font = `500 16px ${FONT}`
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = CANVAS_TOKENS.textMuted
  ctx.fillText('MATCH', plateX + plateW / 2 - 60, plateY + plateH + 36)
  ctx.fillStyle = CANVAS_TOKENS.textPrimary
  ctx.fillText(bandForScore(score), plateX + plateW / 2 + 60, plateY + plateH + 36)
}

/** Title, role, and the coverage fraction — the count, stated as a count. */
function drawSummary(ctx: CanvasRenderingContext2D, session: AnalysisSession): number {
  const { jobTitle, mode, result } = session
  const x = MARGIN + 320
  let y = 170

  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'

  ctx.fillStyle = CANVAS_TOKENS.textPrimary
  ctx.font = `600 32px ${FONT}`
  ctx.fillText(mode === 'scholarship' ? 'Scholarship analysis' : 'CV analysis', x, y)

  y += 44
  ctx.fillStyle = CANVAS_TOKENS.textMuted
  ctx.font = `20px ${FONT}`
  ctx.fillText(jobTitle.length > 44 ? `${jobTitle.slice(0, 41)}…` : jobTitle, x, y)

  y += 64
  ctx.fillStyle = CANVAS_TOKENS.textSecondary
  ctx.font = `22px ${FONT}`
  ctx.fillText(
    `${result.coverage.verifiedCount} / ${result.coverage.total} requirements verified`,
    x,
    y
  )

  return y
}

/**
 * Up to three verified requirements, as plain uncoloured chips.
 *
 * Uncoloured deliberately: a green chip would say "good", and these are simply
 * the requirements whose supporting text was located. The card states what was
 * found, not how well the person did.
 */
function drawVerifiedRequirements(
  ctx: CanvasRenderingContext2D,
  session: AnalysisSession,
  startY: number
): void {
  const verified = session.result.claims.filter((claim) => claim.verification === 'verified')
  if (verified.length === 0) return

  const x = MARGIN + 320
  let y = startY + 56

  ctx.fillStyle = CANVAS_TOKENS.textMuted
  ctx.font = `500 14px ${FONT}`
  ctx.fillText('EVIDENCE FOUND FOR', x, y)

  y += 34
  ctx.font = `16px ${FONT}`

  for (const claim of verified.slice(0, 3)) {
    const label =
      claim.requirement.length > 52 ? `${claim.requirement.slice(0, 49)}…` : claim.requirement
    const chipWidth = Math.min(ctx.measureText(label).width + 28, CONTENT_WIDTH - 320)

    ctx.beginPath()
    ctx.roundRect(x, y - 20, chipWidth, 34, 17)
    ctx.fillStyle = CANVAS_TOKENS.surfaceRaised
    ctx.fill()
    ctx.strokeStyle = CANVAS_TOKENS.border
    ctx.lineWidth = 1
    ctx.stroke()

    ctx.fillStyle = CANVAS_TOKENS.textSecondary
    ctx.fillText(label, x + 14, y + 2)
    y += 46
  }
}

function drawFooter(ctx: CanvasRenderingContext2D): void {
  const y = HEIGHT - 40

  ctx.fillStyle = CANVAS_TOKENS.border
  ctx.fillRect(0, y - 20, WIDTH, 1)

  ctx.fillStyle = CANVAS_TOKENS.textMuted
  ctx.font = `14px ${FONT}`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(SITE.name, 40, y + 4)

  ctx.textAlign = 'right'
  ctx.font = `12px ${FONT}`
  ctx.fillText(SITE.tagline, WIDTH - 40, y + 4)
}

export function drawShareCard(canvas: HTMLCanvasElement, session: AnalysisSession): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  canvas.width = WIDTH
  canvas.height = HEIGHT

  drawBackground(ctx)
  drawHallmark(ctx, session.result.score)
  drawVerifiedRequirements(ctx, session, drawSummary(ctx, session))
  drawFooter(ctx)
}

export const SHARE_CARD_ASPECT_RATIO = `${WIDTH}/${HEIGHT}`
