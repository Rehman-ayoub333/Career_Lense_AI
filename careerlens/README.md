# CareerLens AI

Free, no-signup AI-powered CV analyzer that gives you a match score, ATS compatibility check, skill gap analysis, and rewritten CV bullets in 30 seconds. The only tool that supports both job descriptions **and** European scholarship criteria.

> Built by [Rehman Ayoub](https://linkedin.com/in/rehmanayoub) — a CS student in Pakistan applying for European MS scholarships who couldn't find a single tool that understood what a scholarship committee looks for.

## Features

- **Match Score** — Overall CV-to-JD compatibility score (0-100) with animated gauge
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
- **PDF Upload** — Extract text from PDF, DOCX, or TXT files

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS 4 + CSS variables |
| Animations | Framer Motion |
| AI | Anthropic Claude (claude-sonnet-4-6) with Gemini fallback |
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
│   │   ├── upload/       # PDF/DOCX text extraction
│   │   ├── health/       # Health check
│   │   └── share/        # Share card info
│   └── privacy/          # Privacy policy page
├── components/
│   ├── landing/          # Hero, features, demo preview
│   ├── layout/           # Navbar, footer
│   ├── shared/           # Badge, Tag, ProgressBar, etc.
│   └── tool/             # Analysis tool UI + results tabs
├── hooks/                # useAnalysis (state + API orchestration)
├── lib/                  # claude.ts, prompts.ts, history.ts, etc.
├── types/                # All TypeScript types (single source)
└── utils/                # Score color mapping
```

### AI Pipeline

1. User submits CV + JD → validated and sanitized server-side
2. `/api/analyze` calls Claude with structured JSON schema enforcement
3. `/api/rewrite` + `/api/cover-letter` run in parallel (independent of analysis)
4. JSON responses are validated with type guards before reaching the client
5. Failed JSON parse triggers one automatic retry with a stricter fallback prompt
6. All prompts live in `lib/prompts.ts` with injection defenses (boundary markers)

### Key Design Decisions

- **No database** — localStorage for history, in-memory rate limiting. Zero infrastructure cost.
- **Dual AI provider** — Anthropic Claude primary, Google Gemini fallback. Never fails silently.
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
| `ANTHROPIC_API_KEY` | Yes* | Anthropic Claude API key |
| `GEMINI_API_KEY` | No | Google Gemini API key (fallback) |

\* At least one of `ANTHROPIC_API_KEY` or `GEMINI_API_KEY` must be set.

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
