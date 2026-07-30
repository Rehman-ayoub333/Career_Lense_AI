import type { ScoreToken } from '@/lib/scoring'

/**
 * Canvas-safe mirror of the design tokens.
 *
 * The Canvas 2D API takes CSS colour strings but cannot resolve custom
 * properties — `ctx.fillStyle = 'hsl(var(--violet))'` silently paints black.
 * The share-card renderer therefore needs literal values.
 *
 * Previously those literals were typed inline in the renderer (`#0D1117`,
 * `#7C3AED`, `rgba(16, 185, 129, 0.12)`, …), which meant the share card kept
 * rendering the old palette after globals.css changed. Centralising them does
 * not make the duplication disappear — nothing can, given the API — but it
 * reduces it to one file, expressed in the same HSL channels as globals.css so
 * the two can be diffed by eye.
 *
 * The channel triples below must match `:root` in `app/globals.css`.
 */

const hsl = (h: number, s: number, l: number, alpha?: number): string =>
  alpha === undefined ? `hsl(${h} ${s}% ${l}%)` : `hsl(${h} ${s}% ${l}% / ${alpha})`

export const CANVAS_TOKENS = {
  bg: hsl(222, 47, 6),
  surface: hsl(222, 47, 9),
  surfaceRaised: hsl(222, 44, 13),
  border: hsl(222, 30, 22),

  textPrimary: hsl(210, 40, 97),
  textSecondary: hsl(214, 22, 74),
  textMuted: hsl(215, 16, 60),

  violet: hsl(262, 83, 58),
  violetSoft: hsl(262, 83, 58, 0.12),
  green: hsl(160, 84, 39),
  greenText: hsl(158, 72, 55),
  greenSoft: hsl(160, 84, 39, 0.14),
  amber: hsl(38, 92, 50),
  red: hsl(352, 84, 60),
  blue: hsl(217, 91, 60),

  trackFill: hsl(210, 40, 97, 0.07),

  /** Corner-to-corner wash behind the share card. */
  violetWash: hsl(262, 83, 58, 0.06),
  blueWash: hsl(217, 91, 60, 0.04),
} as const

/** Resolves a score band token to a literal colour for canvas rendering. */
export const SCORE_CANVAS_COLORS: Record<ScoreToken, string> = {
  red: CANVAS_TOKENS.red,
  amber: CANVAS_TOKENS.amber,
  blue: CANVAS_TOKENS.blue,
  green: CANVAS_TOKENS.green,
}

/**
 * Translucent fills matching `SCORE_CANVAS_COLORS`.
 *
 * Canvas has no colour-mix, and the previous `` `${scoreColor}20` `` trick only
 * worked while the palette was expressed as hex — appending an alpha pair to an
 * `hsl()` string produces an invalid colour that silently paints black.
 */
export const SCORE_CANVAS_SOFT: Record<ScoreToken, string> = {
  red: hsl(352, 84, 60, 0.14),
  amber: hsl(38, 92, 50, 0.14),
  blue: hsl(217, 91, 60, 0.14),
  green: hsl(160, 84, 39, 0.14),
}

/**
 * Motion constants mirroring the CSS custom properties.
 *
 * Framer Motion needs numbers, not CSS duration strings, so these are the JS
 * half of the same system. Springs are preferred for anything the user causes
 * directly; tweens for entrances, where a predictable end time matters.
 */
export const MOTION = {
  duration: { fast: 0.12, base: 0.2, slow: 0.32 },
  /** Mirrors `--ease-out` in globals.css. */
  easeOut: [0.16, 1, 0.3, 1],
  /** Mirrors `--ease-in-out`. */
  easeInOut: [0.65, 0, 0.35, 1],
  spring: { type: 'spring', stiffness: 320, damping: 30, mass: 0.8 },
  /** Gentler spring for large travel, e.g. the score gauge. */
  softSpring: { type: 'spring', stiffness: 90, damping: 22 },
  /** Delay between siblings in a staggered entrance. */
  stagger: 0.06,
} as const
