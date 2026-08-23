# Frontend Component Architecture — Final

Specification only — no implementation. File paths are exact intended locations under `careerlens/src/`.

## New components

### `components/tool/results/evidence/EvidenceDocument.tsx`
**Responsibility:** render the CV text as continuous prose with inline evidence markers at the character offsets corresponding to each `verified`/`uncertain` claim's `evidence_quote`. **Props:** `{ cvText: string, claims: PublicVerifiedClaim[] }`. **State:** which marker (if any) is currently expanded/hovered — local `useState<string | null>` (claim id). **Inputs:** the raw CV text and the claims array, both straight from `AnalysisResult` — no re-derivation. **Outputs:** none (leaf rendering component; marker interaction calls a passed-in `onMarkerActivate` callback owned by the parent for analytics-free interaction tracking, i.e. none — this callback exists only so `AssessmentPanel`'s checklist and the document can highlight the same claim in sync). **Dependencies:** a small internal utility to locate `evidence_quote` substrings within `cvText` for span rendering (case-sensitive best-effort against the *original*, non-normalized text, since this is a *display* concern — the *verification* match already happened server-side in `grounding.ts` against normalized text; if the original-text span can't be located exactly for display purposes, the claim still renders in the checklist, just without an inline document marker — this is a defined, non-crashing degradation, not a bug). **Accessibility:** each marker is a `<mark>`-equivalent with `role="button"`, `tabIndex=0`, and an `aria-label` stating the full tier + requirement (e.g. "Verified: 3+ years Python experience — press to see why"). **Responsive:** full-width on all breakpoints; markers remain inline (never collapse to a separate list on mobile — the document stays the primary object at every width, per `FRONTEND_UX_SPEC_FINAL.md`).

### `components/tool/results/evidence/ClaimMarker.tsx`
**Responsibility:** the inline highlighted span plus its expand/hover annotation card (requirement, rationale, tier). **Props:** `{ claim: PublicVerifiedClaim, expanded: boolean, onToggle: () => void }`. **State:** none (controlled by parent). **Accessibility:** annotation card is a native `<details>`/`<summary>` pair or an ARIA `aria-expanded` disclosure pattern (implementer's choice, but must be one of these two well-established patterns, not a custom one) so keyboard and screen-reader behaviour is correct by construction. **Responsive:** annotation card becomes a bottom sheet on mobile rather than an inline popover (avoids clipping at narrow widths).

### `components/tool/results/evidence/RequirementChecklist.tsx`
**Responsibility:** the three-tier list in the assessment panel (verified / uncertain / unresolved groups, each with a count and the requirement strings). **Props:** `{ claims: PublicVerifiedClaim[], activeClaimId: string | null, onClaimSelect: (id: string) => void }`. **State:** none. **Accessibility:** a real list (`<ul>`/`<li>`), each item a button associating with the matching document marker via the shared `onClaimSelect`. **Responsive:** unchanged structure at all widths; becomes the content of the mobile summary bar's expanded state.

### `components/tool/results/evidence/CoverageSummary.tsx`
**Responsibility:** render `coverage.overall`/`byCategory`/counts as plain, legible stats — no chart, no gauge (consistent with §19 "no false precision" — this is a literal count, shown as a literal count, e.g. "14 / 17 requirements verified"). **Props:** `{ coverage: CoverageSummary }`. **Accessibility:** the fraction is stated in full sentence form for screen readers (`aria-label="14 out of 17 requirements verified"`), not just visually as "14/17."

### `components/tool/results/evidence/ATSChecklist.tsx`
**Responsibility:** render the 8 fixed `ats_checks` (status + label + note). **Props:** `{ checks: ATSCheck[] }`. **State:** none. **Accessibility:** a real list; status is carried by a text label, never by colour alone. `source` (`'deterministic'`/`'model'`) is rendered as a small transparency label rather than hidden — that is the field's stated purpose per `DATA_CONTRACTS_FINAL.md`, and a model assertion and a measurement must remain distinguishable to the reader. **Added by ADR-19.**

### `components/tool/results/evidence/CompensationSummary.tsx`
**Responsibility:** render `salary_range` and `salary_context` as plain text. **Props:** `{ salary_range: string, salary_context: string }`. **State:** none. **Note:** no chart, no range bar — this is a model estimate, not a measurement, and must not be dressed as one. **Added by ADR-19.**

### `components/tool/AssessmentPanel.tsx`
**Responsibility:** composes `Hallmark` + `CoverageSummary` + `RequirementChecklist` + `ATSChecklist` + `CompensationSummary` (both per ADR-19, below the checklist and above the footer) + the existing `Summary`/`KeyActions` + the existing three-action footer (New analysis / Share / Download). Replaces `ScorePanel.tsx` 1:1 in the component tree, keeping its `lg:sticky lg:top-20` behaviour. **Props:** `{ session: AnalysisSession, onNewAnalysis: () => void, activeClaimId: string | null, onClaimSelect: (id: string) => void }`.

## Modified components
| Component | Change |
|---|---|
| `components/ui/Badge.tsx` | `TagVariant` → `'verified' \| 'uncertain' \| 'unresolved' \| 'neutral'`; `role="status"` stays absent (unchanged decision) |
| `components/ui/Hallmark.tsx` | Add accessible sentence (pattern from `HistoryPanel.tsx`); compact label `text-xs` not `text-[0.6875rem]` |
| `components/tool/AnalyzeTool.tsx` | Results branch renders `AssessmentPanel` + `EvidenceDocument` + narrowed `ResultsTabs`; input-form column balance and full-width Analyse button fixed |
| `components/tool/results/tabs/ResultsTabs.tsx` | Narrows to `Rewrite`, `Cover Letter`, `Interview Prep`, `Chat` |
| `lib/share-card.ts` | Not a component, but its output changes per `DESIGN_SYSTEM_FINAL.md`/Master Plan §21 |
| `app/analyze/page.tsx` | Real (not `sr-only`) `<h1>` |

## Deleted components
`components/tool/results/tabs/SkillsTab.tsx`, `KeywordsTab.tsx`, `ATSTab.tsx`, `components/tool/results/ScorePanel/ScorePanel.tsx` (superseded by `AssessmentPanel.tsx`; confirm zero remaining imports before deletion).

## Layout components, navigation, upload — unchanged
`Navbar`, `Footer`, `Container`, `UploadZone` (gains a real-`<button>` fix per accessibility requirements, not a redesign), `ModeSelector`, `HistoryPanel` — all confirmed already in the target visual language, no component-level change beyond the accessibility fixes already itemized elsewhere.

## Loading/error/empty states
`LoadingOverlay` unchanged mechanism, copy updated (§`FRONTEND_UX_SPEC_FINAL.md`). `EmptyState` (existing shared component) reused for: zero-claims results, a tools tab whose generation failed, empty history. No new empty/loading/error primitive components are needed — the existing `components/ui/Feedback.tsx` set already covers the surface area; only call sites change.
