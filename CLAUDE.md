# CLAUDE.md — Rules for building CareerLens AI

## ALWAYS do this first
1. Read SPEC.md completely before writing any code
2. Check which week/section we're building today
3. Confirm the feature you're about to build exists in SPEC.md

## Architecture rules (never break these)
- ALL prompts live in lib/prompts.ts ONLY — never inline a prompt elsewhere
- ALL AI provider calls go through lib/ai/ ONLY (was lib/claude.ts). The registry
  in lib/ai/index.ts currently has exactly ONE provider: Google Gemini. There is
  no Anthropic/Claude provider despite the project name — if you add one, update
  the privacy policy in the same change, because it names the data processor.
- ALL TypeScript types live in types/index.ts ONLY
  (API wire types live in lib/api/contract.ts — the wire format and the domain
  model are allowed to differ, but neither is ever re-declared in a component)
- ALL localStorage operations go through lib/history.ts ONLY
- API routes live in app/api/ ONLY — never call a model from a client component
- ALL client→server calls go through lib/api/client.ts ONLY — never a raw fetch
- ALL shared UI primitives live in components/ui/ — never hand-roll a button,
  card, modal, tab list, badge or empty state in a feature component

## Code quality rules
- TypeScript strict mode — zero 'any' types allowed
- No console.log — use proper error handling
- Every API route must handle: 400 (validation), 429 (rate limit), 500 (server error)
- Every component must have: loading state, error state, empty state
- Every interactive element must be keyboard accessible

## Design rules
- Colors from CSS variables only — never hardcode hex values in components
- Fill tokens (--violet, --green, --amber, --red, --blue) are for backgrounds,
  borders and icons ≥20px. For TEXT always use the -text sibling
  (--violet-text, --green-text, …); the base tones fail WCAG AA as text
- LAYOUT spacing (margins, gaps, section and card padding) from this scale ONLY:
  0.5 1 1.5 2 3 4 6 8 12 16 20 24
  (excluded: 2.5, 3.5, 5, 7, 9, 11 — a smaller scale forces intentional choices)
- CONTROL padding (the inside of a button, badge, tag or chat bubble) may also
  use 2.5 and 3.5. Optical sizing of a control is a different problem from
  laying out a page, and 8px/12px are respectively too tight and too loose for
  a 36px-tall button. These two steps are allowed inside components/ui/ and in
  message bubbles — nowhere else.
- Animations via Framer Motion only — no CSS animation for interactive elements
- Every Framer duration/easing comes from MOTION in config/design-tokens.ts
- Never `transition-all` — always name the properties being animated
- Icons via Lucide React only, at 14 / 16 / 20 / 32px with stroke 2.25 / 2 / 1.75 / 1.5
- Never add a new dependency without asking first

## What to do when uncertain
- ASK before building — don't guess and build wrong thing
- If SPEC is unclear on something, ask for clarification
- If a feature isn't in SPEC.md, don't build it

## Current session task
Project setup — Day 1-2 of the Week 1 roadmap (SPEC Section 20): folder structure, globals.css, types, prompts, Claude wrapper, .gitignore, and CLAUDE.md.
