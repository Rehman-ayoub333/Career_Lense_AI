# Design System — Final

**Canonical source of the underlying values remains `careerlens/src/app/globals.css`** (HSL channels, Tailwind v4 `@theme`, per-token measured contrast ratios already documented there). This document restates every value **in HEX** (the brief's requested format) for portability into design tools and thesis figures, adds the semantic-usage layer this redesign requires, and defines the two genuinely new pieces (the `unresolved` identity colour, and the evidence-marker/highlight convention). Hex values below are derived by standard HSL→RGB conversion from the exact HSL channels already in `globals.css` — implementers should keep `globals.css`'s HSL declarations as the literal source of truth and treat this table as a verified reference, not a second place to hand-edit colour.

## Brand direction
"Premium technical product + calm intelligence + editorial precision + modern research instrument" — already substantially achieved by the existing landing-page redesign (assay-hallmark scoring, editorial furniture, measured-contrast tokens, four-layer atmosphere/film-grain). **This plan extends that language into the results experience; it does not invent a new one.**

## Colour palette
| Role | Token | HSL (canonical, `globals.css`) | HEX (derived) | Usage |
|---|---|---|---|---|
| Background | `--bg` | `222 47% 6%` | `#080C16` | Page base |
| Surface | `--surface` | `222 47% 9%` | `#0C1322` | First elevation step |
| Elevated surface | `--surface-raised` | `222 44% 13%` | `#131B30` | Cards, panels |
| Surface (hover) | `--surface-hover` | `222 42% 16%` | `#18223A` | Interactive hover fill |
| Border | `--border` | `222 30% 22%` | `#273149` | Hairlines |
| Border (strong) | `--border-strong` | `220 25% 32%` | `#3D4B66` | Focusable/interactive boundaries |
| Text (primary) | `--text-primary` | `210 40% 97%` | `#F4F7FA` | 18.19:1 on `--bg` |
| Text (secondary) | `--text-secondary` | `214 22% 74%` | `#AEBBCB` | 9.98:1 on `--bg` |
| Text (muted) | `--text-muted` | `215 16% 60%` | `#8996A9` | 6.51:1 on `--bg` |
| Primary/brand accent | `--violet` / `--violet-text` | `262 83% 58%` / `262 95% 78%` | `#7C3BED` / `#B992FC` | Interactive fill / accessible text sibling (7.94:1) |
| **Verified** (was "success/green") | `--green` / `--green-text` | `160 84% 39%` / `158 72% 55%` | `#10B77F` / `#3ADFA2` | A claim has mechanical evidence. **Never** "this is a good candidate." |
| **Uncertain** (was "warning/amber") | `--amber` / `--amber-text` | `38 92% 50%` / `38 95% 60%` | `#F59F0A` / `#FAB338` | Partial/borderline evidence, and unrelated system cautions (rate limits) — same calm epistemic register, no split needed |
| **Unresolved** — *new token, this plan* | `--unresolved` / `--unresolved-text` | `220 18% 46%` / `220 20% 66%` | `#606E8A` / `#97A3BA` | A gap in the document. Deliberately a calm slate-blue — visually distinct enough to scan, explicitly not alarming, never red. Sits between `--border-strong` and `--text-muted` in weight so it reads as "quiet information," not "problem." |
| **Error** (system only) | `--red` / `--red-text` | `352 84% 60%` / `352 88% 70%` | `#EF435A` / `#F66F81` | Network/validation/rate-limit failures **only**. Never appears inside an analysis result. If you're about to use this token to describe something about a CV, stop — that's the exact violation this system exists to prevent. |
| **Information** | `--blue` / `--blue-text` | `217 91% 60%` / `213 94% 70%` | `#3C83F6` / `#6BABFA` | Neutral informational content (salary context, research-mode panels) |

**Secondary/accent:** no new hues — `Button`'s existing `secondary` variant (neutral surface + border, no colour) and `ghost` variant serve the "secondary action" role already; `--violet` remains the single accent, used sparingly (primary CTA, active/focus states, links) per the existing, preserved doctrine that a second accent hue would dilute it.

**Rule, restated as the single most important line in this document:** every colour above communicates a *state of the evidence or the system*, never a *judgment of the person*. `--unresolved` retiring the old `Tag variant="missing"` red usage is the specific, mechanical fix for the specific, confirmed doctrinal violation this whole redesign exists to close.

## Typography
Unchanged: **Geist** (`--font-sans`, UI), **Geist Mono** (`--font-mono`, data/citations — its role explicitly extends to evidence-quote annotations in the new marked-document view, a natural fit for a register already reserved for "folios, references, findings"), **Instrument Serif** (`--font-display`, editorial emphasis only, landing page, never UI chrome). Type scale unchanged (`--text-xs` 12px through `--text-hero` fluid clamp) — the one correction: `Hallmark`'s compact label moves from `0.6875rem` (11px, below the system's own stated floor) to `--text-xs` (12px).

## Spacing
Unchanged scale: `0.5 1 1.5 2 3 4 6 8 12 16 20 24` for layout (nested `careerlens/CLAUDE.md`'s set is authoritative per the resolved `CLAUDE.md` conflict — excludes `5 7 9 10 14`); `2.5`/`3.5` permitted only inside `components/ui/` and message bubbles.

## Border radius, shadows
Unchanged: `--radius-sm` 6px / `-md` 10px / `-lg` 14px / `-xl` 20px / `-full`; two-layer contact+ambient shadow system (`--shadow-sm/md/lg`), `--shadow-focus` for the focus ring's outer glow. No new radius or shadow tokens are needed for the evidence UI — `ClaimMarker`'s inline highlight uses text-background colour only, not a box shadow.

## Evidence markers / document highlighting (new convention, no new tokens required)
Reuses the existing alpha-compositing pattern already present in the codebase (`hsl(var(--green) / 0.12)` etc.): a `verified` span gets `hsl(var(--green) / 0.14)` background with a `hsl(var(--green) / 0.4)` underline; `uncertain` the amber equivalents; `unresolved` claims are **not** highlighted inline in the document at all (there's no span to highlight — nothing was found), and instead surface as a small margin annotation near the most relevant section, styled with `--unresolved`/`--unresolved-text`.

## Icons
Unchanged: Lucide React only, 14/16/20/32px at stroke 2.25/2/1.75/1.5. New icons needed: a verification-tier glyph set — `CheckCircle2` (verified), `CircleDashed` or `HelpCircle` (uncertain), `Circle` (unresolved, deliberately the plainest glyph in the set, consistent with the "quiet information" framing) — all from the existing Lucide dependency, no new icon library.

## Buttons, inputs, cards, badges, tables, tooltips, modals, toasts, loading indicators
All unchanged in mechanism (one `Button` implementation/4 variants/3 sizes; `Card` 3 elevations; `Modal`'s `role="dialog"` pattern; `Tabs`' ARIA pattern). The one component whose *semantics* change is `Badge`/`Tag` — `TagVariant` becomes `'verified' | 'uncertain' | 'unresolved' | 'neutral'`, per the table above, replacing `'match' | 'missing' | 'extra'` everywhere. No new tooltip/toast component is introduced — the `ClaimMarker`'s hover/click annotation card is a new, purpose-specific component (`FRONTEND_COMPONENT_ARCHITECTURE.md`), not a generic tooltip, because it needs to hold structured content (requirement + rationale + tier), not a one-line string.

## Motion
Unchanged tokens (`MOTION.duration.fast/base/slow`, `--ease-out`/`--ease-in-out`). `MotionConfig` finally wired into `layout.tsx` (closes the confirmed gap). New principle: motion may represent a literal count changing (evidence-coverage tally incrementing) but never the interpretive score (no count-up, no colour-by-value) — an extension of the existing Hallmark doctrine, not an exception to it.

## Accessibility contrast — verified
Every token pair above already carries a measured ratio in `globals.css`'s own comments (18.19:1 / 9.98:1 / 6.51:1 for text; 7.94:1 for the violet-text focus ring). The new `--unresolved-text` (`#97A3BA` on `#080C16`) should be measured and recorded the same way during implementation — **flagged in `OPEN_QUESTIONS_FINAL.md` as a NON-BLOCKING implementation-time check**, since the exact ratio depends on final rendering, not on this specification.
