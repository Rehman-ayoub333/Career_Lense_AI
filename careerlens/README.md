# CareerLens AI

Free, no-signup AI-powered CV analyzer that gives you a match score, ATS compatibility check, skill gap analysis, and rewritten CV bullets in 30 seconds. The only tool that supports both job descriptions **and** European scholarship criteria.

> Built by [Rehman Ayoub](https://linkedin.com/in/rehmanayoub) — a CS student in Pakistan applying for European MS scholarships who couldn't find a single tool that understood what a scholarship committee looks for.

## Features

- **Match Score** — Overall CV-to-JD compatibility score (0-100), struck as a hallmark: one strike at full value, band carried by a word and never by a colour
- **Scholarship Mode** — Evaluate CVs against DAAD, Stipendium Hungaricum, Chevening criteria
- **Skill Gap Analysis** — Matched, missing, and bonus skills with visual tags
- **ATS Compatibility Check** — 8-point checklist with actionable fix suggestions
- **CV Rewrite** — AI-optimized bullet points with per-bullet copy
- **Cover Letter Generation** — 3-paragraph cover letter tailored to the role
- **Interview Prep** — 5 likely interview questions based on skill gaps
- **Salary Estimation** — Market-based salary range for the role
- **Keyword Analysis** — JD keywords found and missing in your CV
- **Chat with CV** — Conversational AI for follow-up questions
- **Analysis History** — Restore, delete, and review previous analyses
- **Shareable Score Card** — Download a branded PNG score card
- **PDF Upload** — Extract text from PDF or TXT files (`UPLOAD_LIMITS.acceptedExtensions`; DOCX is not supported)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS 4 + CSS variables |
| Animations | Framer Motion |
| AI | Anthropic Claude (claude-haiku-4-5-20251001) |
| PDF Parsing | pdf-parse v2 |
| Icons | Lucide React |
| Deployment | Vercel |

## Architecture

```
src/
├── app/                  # Next.js App Router pages + API routes
│   ├── api/
│   │   ├── analyze/      # Main CV analysis endpoint
│   │   ├── rewrite/      # CV bullet rewrite endpoint
│   │   ├── cover-letter/ # Cover letter generation
│   │   ├── chat/         # Conversational CV Q&A
│   │   ├── upload/       # PDF/TXT text extraction
│   │   └── health/       # Health check
│   ├── analyze/          # The application: upload, inputs, results
│   └── privacy/          # Privacy policy page
├── components/
│   ├── landing/          # Marketing sections; hero/ holds the hero artwork
│   ├── layout/           # Navbar, footer
│   ├── tool/             # Analysis tool UI + results tabs
│   └── ui/               # Shared primitives: Button, Card, Modal, Tabs, …
├── config/               # Design tokens, site constants
├── hooks/                # useAnalysis, useClipboard, useFocusTrap
├── lib/                  # ai/, api/, analysis/, prompts.ts, history.ts, …
└── types/                # All TypeScript types (single source)
```

### AI Pipeline

1. User submits CV + JD → validated and sanitized server-side
2. `/api/analyze` calls Claude with schema enforcement via forced tool use
3. `/api/rewrite` + `/api/cover-letter` run in parallel (independent of analysis)
4. JSON responses are validated with type guards before reaching the client
5. Failed JSON parse triggers one automatic retry with a stricter fallback prompt
6. All prompts live in `lib/prompts.ts` with injection defenses (boundary markers)

### Key Design Decisions

- **Landing and application are separate routes** — `/` sells and never asks for a CV; `/analyze` is the tool. They shared a route until the two jobs started fighting: the page had to unmount its marketing sections when results arrived, restore scroll across the swap, and publish its state to a module-level store so the navbar could tell whether the anchors it linked to still existed. Splitting the routes deleted all three mechanisms, and made the landing page a server component again.
- **No database** — localStorage for history, in-memory rate limiting. Zero infrastructure cost.
- **Swappable AI provider** — one `AiProvider` interface in `lib/ai/`, registered in `lib/ai/index.ts`. Anthropic Claude is the only provider today; ADR-22 swapped it in for Google Gemini through this seam, touching no call site or route, which is the evidence the seam works.
- **Shared rate limit** — Single bucket per IP across all AI endpoints prevents self-blocking.
- **Client-side share cards** — Canvas API generates PNG score cards without server-side image deps.
- **Scholarship-aware prompts** — Separate prompt templates for job vs. scholarship evaluation.

## Local Setup

```bash
# Clone and install
git clone https://github.com/rehmanayoub/careerlens-ai.git
cd careerlens-ai/careerlens
npm install

# Configure environment
cp .env.example .env.local
# Add your API key(s) to .env.local

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key. Create one at [console.anthropic.com](https://console.anthropic.com/settings/keys). |
| `VOYAGE_API_KEY` | No | Voyage AI key, for the `research/` embedding baseline only (ADR-23). The app never reads it. |
| `ANTHROPIC_MODEL` | No | Model override. Defaults to `claude-haiku-4-5-20251001`. |
| `AI_PROVIDER` | No | Active provider. Only `anthropic` ships today. |
| `NEXT_PUBLIC_SITE_URL` | No | Canonical origin. Detected automatically on Vercel. |

`ANTHROPIC_API_KEY` is the only variable the app needs to run. See `.env.example`.

> **Note:** `ANTHROPIC_API_KEY` is **not** read by this application. If you have one
> in `.env.local` from an earlier revision, it does nothing — the app will still
> fail until a valid `ANTHROPIC_API_KEY` is set.

## Deployment

Deploy to Vercel with one click:

1. Push to GitHub
2. Import repository in [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy

## Future Roadmap

- [ ] LinkedIn profile import
- [ ] Batch analysis (multiple JDs at once)
- [ ] Learning path recommendations per missing skill
- [ ] PDF export with formatted layout
- [ ] Analytics dashboard for usage metrics
- [ ] Multi-language CV support

## License

MIT
