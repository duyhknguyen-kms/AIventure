# AIventure

Personalised remote job matches from [Himalayas](https://himalayas.app) and [Remotive](https://remotive.com), ranked by your skills, salary floor and benefit preferences.

Next.js 16 application inside the AIventure monorepo.  
See the root [`README.md`](../README.md) for the full architecture and file-structure guide.

```bash
# 1. Install dependencies (from the repo root)
cd web
npm install

# 2. Set up environment variables
cp .env.example .env.local
# Edit .env.local to add your optional Himalayas API key

# 3. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Running Tests

```bash
# Run the full test suite once
npm test

# Watch mode
npm run test:watch

# Generate a coverage report
npm test -- --coverage
```

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `HIMALAYAS_API_KEY` | No | — | Free key from [himalayas.app/api-keys](https://himalayas.app/api-keys); raises rate limits. Never use `NEXT_PUBLIC_`. |
| `CACHE_TTL_SECONDS` | No | `21600` (6 h) | Upstream response cache lifetime. Remotive advises ≤ 4 calls/day. |
| `HIMALAYAS_MAX_PAGES` | No | `5` | Browse/search pages fetched per refresh (20 jobs/page). |

Copy `.env.example` to `.env.local` (git-ignored by Next.js) before running.

## Tech Stack

- **Next.js 16** (App Router) · **React 19** · **TypeScript** (strict)
- **MUI 9** (Material UI) — all UI uses MUI components and the custom theme
- **Zod** — validates every external API response and stored criteria
- **Vitest** + **Testing Library** + **axe-core** — unit, component and WCAG a11y tests

## Architecture

```
web/src/
├── app/
│   ├── layout.tsx          # MUI theme + CssBaseline wiring
│   ├── page.tsx            # Renders <Dashboard />
│   └── api/jobs/route.ts   # GET /api/jobs — aggregates, dedupes, scores
├── components/             # UI components (CriteriaForm, JobCard, JobDetailPanel, …)
├── hooks/                  # useCriteria (localStorage), useJobs (fetch)
└── lib/
    ├── sources/            # Himalayas + Remotive adapters
    ├── aggregate/          # Cache, dedupe, merge
    ├── matching/           # Scoring, filtering, criteria schema
    └── normalize/          # Employment type, seniority, location, salary
```

Data is sourced directly from Himalayas and Remotive public APIs. All scoring happens in the browser — no extra network calls on criteria changes.
