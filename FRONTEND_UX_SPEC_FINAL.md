# Frontend UX Specification — Final

## Information architecture (every page)
| Route | Purpose | Primary surface |
|---|---|---|
| `/` | Conversion — sell the mechanism, not just the outcome | 10-section editorial landing (preserved, `ResultSection` rewritten per §6 below) |
| `/analyze` | The application | The evidence experience (§Part 9, own document below refines it further) |
| `/privacy` | Privacy policy | Static, unchanged content, nested-`<main>` bug fixed |
| `/404`, error boundary | Recovery | Static, unchanged content, `metadata`/error-prop bugs fixed |

## Navigation
Unchanged: sticky `Navbar` (3 anchors on `/`, glass-fade on scroll), `Footer` as colophon (6 register entries). No new top-level navigation item is required — `/analyze` remains reachable only via CTA, per the existing, preserved `/` vs `/analyze` separation rule.

## User flow — every screen, `/analyze`
1. **Input screen.** Mode selector, history button, upload zone, CV field (pre-filled demo), opportunity field (pre-filled demo), full-width Analyse button (fixes the confirmed column-imbalance defect). Real page header (fixes the confirmed sr-only-h1 defect).
2. **Loading screen.** `LoadingOverlay`, steps keyed to real completion events (unchanged — already correct). Copy update: the steps now name what's happening in plain terms ("Reading your CV," "Checking evidence," "Preparing recommendations") rather than implying a black box.
3. **Results screen.** The evidence experience — full spec below, §"Results page."
4. **History restore.** Same results screen, populated from a stored session; scroll resets to the top on restore (fixes the confirmed missing-scroll-reset defect).
5. **Share dialog.** Modal, unchanged mechanics, redrawn content per `DESIGN_SYSTEM_FINAL.md`/the Master Plan's share-card section.

## Empty states
Every one of: no history yet, zero claims returned (a CV too short/generic to extract requirements from — a distinct message, not a crash), a tools tab with no content yet (rewrite/cover-letter failed independently — existing `EmptyState` component, retry action added where missing).

## Loading states
Unchanged pattern (`LoadingOverlay`, inline "Regenerating…" on Rewrite, "Thinking…" on Chat, `aria-busy` spinner on upload) — no redesign needed, already correct.

## Error states
See `FAILURE_MODES_FINAL.md` for the full table; this document owns *tone* — error copy is calm and specific ("this is taking longer than expected" not "something went wrong"), never blames the user, always offers a next action.

## Success states
No celebratory animation, no confetti, no colour-coded "success" banner on a high score — consistent with the existing, preserved doctrine that the score does not perform. A completed analysis is presented as a fact, not an achievement.

## Mobile behaviour
Priority order, explicit (score/coverage summary first, evidence document second, recommendations third, tools last), per `CAREERLENS_FINAL_MASTER_PLAN.md` §14.8 — restated here as the authoritative UX spec, not re-derived. Assessment panel collapses to a sticky one-line bar that expands on tap. Tools strip becomes a bottom sheet.

## Desktop behaviour
Two-column layout, sticky assessment panel (`lg:sticky lg:top-[header height]`), scrollable evidence document as the primary reading surface.

## Accessibility (cross-referenced from the Master Plan, restated as binding requirements here)
Skip-to-content link. `Hallmark` accessible sentence. Every verification marker has a text-equivalent, never colour-only. `UploadZone` is a real `<button>` with working `aria-describedby`. One `<main>` per page. `Tabs` keeps its existing correct ARIA implementation. Focus ring unchanged (`--violet-text`, 7.94:1).

## Responsive strategy — breakpoints (unchanged Tailwind defaults, per existing `careerlens/CLAUDE.md`)
`sm` 640px / `md` 768px / `lg` 1024px / `xl` 1280px — the assessment-panel/document split activates at `lg`; below it, the mobile stacked/collapsed behaviour above applies down to `375px` (the documented minimum supported width).

## Landing page — `ResultSection` rewrite scope
Replace the abandoned gap-fields/margin-annotation mockup with a depiction of the actual marked-document evidence view (§Results page below) — this closes the confirmed "landing markets a UI that doesn't exist" defect, and it becomes true *because* the UI now matches, not because the copy was softened. Add one short, honest section stating the evidence-grounding mechanism in plain language: what it does (checks whether a claim's cited text actually appears in your CV), not an unproven outcome claim (no "hallucination-free," no invented percentage).
