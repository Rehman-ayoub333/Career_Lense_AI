import { CANVAS_TOKENS, SCORE_CANVAS_COLORS, SCORE_CANVAS_SOFT } from '@/config/design-tokens'
import { SITE } from '@/config/site'
import { getScoreToken } from '@/lib/scoring'
import type { AnalysisSession } from '@/types'

/**
 * Renders a shareable score card to a canvas.
 *
 * Lived inside `ShareCard.tsx`, where 180 lines of drawing code surrounded a
 * 40-line dialog. Every colour was a hex literal duplicating globals.css, so the
 * card kept rendering the previous palette after the design tokens changed;
 * they now come from `CANVAS_TOKENS`, which is the one place the Canvas API's
 * inability to read CSS custom properties is paid for.
 */

const WIDTH = 1200
const HEIGHT = 630

const FONT = 'system-ui, sans-serif'
const CONTENT_X = 380
const BAR_WIDTH = 700
const BAR_HEIGHT = 8
const BAR_RADIUS = 4

interface Bar {
  label: string
  value: number
  color: string
}

function barsFor(session: AnalysisSession): Bar[] {
  const { result, mode } = session

  return mode === 'scholarship'
    ? [
        { label: 'Research', value: result.research_score ?? 0, color: CANVAS_TOKENS.blue },
        { label: 'Leadership', value: result.leadership_score ?? 0, color: CANVAS_TOKENS.violet },
        { label: 'Academic', value: result.academic_score ?? 0, color: CANVAS_TOKENS.green },
      ]
    : [
        { label: 'Skills', value: result.skills_score, color: CANVAS_TOKENS.blue },
        { label: 'Experience', value: result.experience_score, color: CANVAS_TOKENS.amber },
        { label: 'Education', value: result.education_score, color: CANVAS_TOKENS.green },
      ]
}

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

function drawScoreDial(ctx: CanvasRenderingContext2D, session: AnalysisSession): void {
  const { result } = session
  const token = getScoreToken(result.score)
  const color = SCORE_CANVAS_COLORS[token]

  const cx = 200
  const cy = 260
  const radius = 100

  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.strokeStyle = CANVAS_TOKENS.trackFill
  ctx.lineWidth = 16
  ctx.stroke()

  const startAngle = -Math.PI / 2
  ctx.beginPath()
  ctx.arc(cx, cy, radius, startAngle, startAngle + (Math.PI * 2 * result.score) / 100)
  ctx.strokeStyle = color
  ctx.lineWidth = 16
  ctx.lineCap = 'round'
  ctx.stroke()

  ctx.fillStyle = color
  ctx.font = `bold 72px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(String(result.score), cx, cy)

  // Verdict pill.
  ctx.font = `bold 14px ${FONT}`
  const verdict = result.verdict.toUpperCase()
  const verdictY = cy + radius + 40
  const pillWidth = ctx.measureText(verdict).width + 24

  ctx.beginPath()
  ctx.roundRect(cx - pillWidth / 2, verdictY - 14, pillWidth, 28, 14)
  ctx.fillStyle = SCORE_CANVAS_SOFT[token]
  ctx.fill()

  ctx.fillStyle = color
  ctx.fillText(verdict, cx, verdictY + 1)
}

/** Draws the right-hand column and returns the y position it finished at. */
function drawSummary(ctx: CanvasRenderingContext2D, session: AnalysisSession): number {
  const { jobTitle, mode } = session
  let y = 80

  ctx.fillStyle = CANVAS_TOKENS.textPrimary
  ctx.font = `bold 28px ${FONT}`
  ctx.textAlign = 'left'
  ctx.fillText(mode === 'scholarship' ? 'Scholarship Analysis' : 'CV Analysis', CONTENT_X, y)

  y += 40
  ctx.fillStyle = CANVAS_TOKENS.textMuted
  ctx.font = `18px ${FONT}`
  ctx.fillText(jobTitle.length > 50 ? `${jobTitle.slice(0, 47)}…` : jobTitle, CONTENT_X, y)

  y += 50
  for (const bar of barsFor(session)) {
    ctx.fillStyle = CANVAS_TOKENS.textPrimary
    ctx.font = `14px ${FONT}`
    ctx.textAlign = 'left'
    ctx.fillText(bar.label, CONTENT_X, y)

    ctx.textAlign = 'right'
    ctx.fillStyle = CANVAS_TOKENS.textMuted
    ctx.fillText(`${bar.value}%`, CONTENT_X + BAR_WIDTH, y)

    y += 14
    ctx.beginPath()
    ctx.roundRect(CONTENT_X, y, BAR_WIDTH, BAR_HEIGHT, BAR_RADIUS)
    ctx.fillStyle = CANVAS_TOKENS.trackFill
    ctx.fill()

    ctx.beginPath()
    ctx.roundRect(
      CONTENT_X,
      y,
      Math.max(BAR_RADIUS * 2, (BAR_WIDTH * bar.value) / 100),
      BAR_HEIGHT,
      BAR_RADIUS
    )
    ctx.fillStyle = bar.color
    ctx.fill()

    y += 40
  }

  return y
}

function drawMatchedSkills(
  ctx: CanvasRenderingContext2D,
  session: AnalysisSession,
  startY: number
): void {
  let y = startY + 10

  ctx.fillStyle = CANVAS_TOKENS.textPrimary
  ctx.font = `bold 14px ${FONT}`
  ctx.textAlign = 'left'
  ctx.fillText('MATCHED SKILLS', CONTENT_X, y)

  y += 24
  ctx.font = `13px ${FONT}`
  let x = CONTENT_X

  for (const skill of session.result.skills_matched.slice(0, 6)) {
    const chipWidth = ctx.measureText(skill).width + 20
    if (x + chipWidth > CONTENT_X + BAR_WIDTH) break

    ctx.beginPath()
    ctx.roundRect(x, y - 12, chipWidth, 26, 13)
    ctx.fillStyle = CANVAS_TOKENS.greenSoft
    ctx.fill()

    ctx.fillStyle = CANVAS_TOKENS.greenText
    ctx.fillText(skill, x + 10, y + 2)
    x += chipWidth + 8
  }
}

function drawFooter(ctx: CanvasRenderingContext2D): void {
  const y = HEIGHT - 40

  ctx.fillStyle = CANVAS_TOKENS.border
  ctx.fillRect(0, y - 20, WIDTH, 1)

  ctx.fillStyle = CANVAS_TOKENS.textMuted
  ctx.font = `14px ${FONT}`
  ctx.textAlign = 'left'
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
  drawScoreDial(ctx, session)
  drawMatchedSkills(ctx, session, drawSummary(ctx, session))
  drawFooter(ctx)
}

export const SHARE_CARD_ASPECT_RATIO = `${WIDTH}/${HEIGHT}`
