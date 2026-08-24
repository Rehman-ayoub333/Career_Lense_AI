# CLAUDE.md — Rules for building CareerLens AI

## ALWAYS do this first
1. Read SPEC.md completely before writing any code
2. Check which week/section we're building today
3. Confirm the feature you're about to build exists in SPEC.md

## Architecture rules (never break these)
- ALL prompts live in lib/prompts.ts ONLY — never inline a prompt elsewhere
- ALL AI provider calls go through lib/ai/ ONLY. The registry in lib/ai/index.ts
  has exactly ONE provider: Google Gemini. There is no Anthropic/Claude provider
  despite the project name — if you add one, update the privacy policy in the
  same change, because it names the data processor.
- ALL TypeScript types live in types/index.ts ONLY
- ALL localStorage operations go through lib/history.ts ONLY
- API routes live in app/api/ ONLY — never call a model from a client component
- The landing page (`/`) and the application (`/analyze`) are SEPARATE ROUTES.
  Never put the analysis tool, an upload zone or a CV input on `/`. The landing
  page sells; the application works. They shared a route once and the page ended
  up unmounting its own marketing sections, restoring scroll across the swap, and
  publishing state to a module-level store so the navbar could discover whether
  its anchors still existed.

## Code quality rules
- TypeScript strict mode — zero 'any' types allowed
- No console.log — use proper error handling
- Every API route must handle: 400 (validation), 429 (rate limit), 500 (server error)
- Every component must have: loading state, error state, empty state
- Every interactive element must be keyboard accessible

## Design rules
- Colors from CSS variables only — never hardcode hex values in components
- LAYOUT spacing (margins, gaps, section and card padding) from this scale ONLY:
  0.5 1 1.5 2 3 4 6 8 12 16 20 24
  Note what is absent: 5, 7, 9, 10, 14. `mt-10` is NOT legal — it is the value
  most often reached for by mistake, because it exists in stock Tailwind.
  CONTROL padding (inside a button, badge, tag or chat bubble) may also use 2.5
  and 3.5, inside components/ui/ and message bubbles only.
- Animations via Framer Motion only — no CSS animation for interactive elements
- Icons via Lucide React only — no mixing icon libraries
- Never add a new dependency without asking first

## What to do when uncertain
- ASK before building — don't guess and build wrong thing
- If SPEC is unclear on something, ask for clarification
- If a feature isn't in SPEC.md, don't build it

## Current session task
Landing redesign, Pass 1 of 4 — route separation (`/` and `/analyze`), the
navigation, the hero, and the design tokens the hero needs (`--text-hero`, the
`--font-display` editorial face, the atmosphere layer).

Passes 2-4 redesign the remaining sections and are NOT in scope:
- Pass 2: Problem, How It Works, The Result
- Pass 3: Features, Scholarship Focus, Why We're Different
- Pass 4: Founder, Mission, Social Proof, Final CTA, Footer

`DemoPreview` and `FeatureCards` on `/` are still the pre-redesign design. The
seam below the hero is known and deliberate — do not patch it piecemeal.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
