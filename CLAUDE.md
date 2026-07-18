# CLAUDE.md — Rules for building CareerLens AI

## ALWAYS do this first
1. Read SPEC.md completely before writing any code
2. Check which week/section we're building today
3. Confirm the feature you're about to build exists in SPEC.md

## Architecture rules (never break these)
- ALL prompts live in lib/prompts.ts ONLY — never inline a prompt elsewhere
- ALL Claude API calls go through lib/claude.ts ONLY
- ALL TypeScript types live in types/index.ts ONLY
- ALL localStorage operations go through lib/history.ts ONLY
- API routes live in app/api/ ONLY — never call Claude from client-side components

## Code quality rules
- TypeScript strict mode — zero 'any' types allowed
- No console.log — use proper error handling
- Every API route must handle: 400 (validation), 429 (rate limit), 500 (server error)
- Every component must have: loading state, error state, empty state
- Every interactive element must be keyboard accessible

## Design rules
- Colors from CSS variables only — never hardcode hex values in components
- Spacing from Tailwind scale only — no p-5, p-7, p-9 (odd values)
- Animations via Framer Motion only — no CSS animation for interactive elements
- Icons via Lucide React only — no mixing icon libraries
- Never add a new dependency without asking first

## What to do when uncertain
- ASK before building — don't guess and build wrong thing
- If SPEC is unclear on something, ask for clarification
- If a feature isn't in SPEC.md, don't build it

## Current session task
Project setup — Day 1-2 of the Week 1 roadmap (SPEC Section 20): folder structure, globals.css, types, prompts, Claude wrapper, .gitignore, and CLAUDE.md.
