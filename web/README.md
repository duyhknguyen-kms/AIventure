# AIventure — web app

Next.js 16 application inside the AIventure monorepo.  
See the root [`README.md`](../README.md) for the full architecture and file-structure guide.

---

## Setup

```bash
# From the repo root
cd web
cp .env.example .env.local   # optional: add HIMALAYAS_API_KEY
npm install
```

**Node.js 20+ required.** If `node` is not on PATH:

```bash
# macOS arm64 — one-time install
curl -fsSL https://nodejs.org/dist/v26.13.1/node-v26.13.1-darwin-arm64.tar.gz \
  | tar -xz -C ~/.local/node --strip-components=1
echo 'export PATH="$HOME/.local/node/bin:$PATH"' >> ~/.zshrc && source ~/.zshrc
```

---

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on http://localhost:3000 (Turbopack) |
| `npm test` | Run all 269 tests once (vitest --run) |
| `npm run lint` | ESLint |
| `npm run build` | Production build |

---

## Environment variables

Copy `.env.example` to `.env.local`. Never commit `.env.local`.

| Variable | Default | Notes |
|---|---|---|
| `HIMALAYAS_API_KEY` | (empty) | Optional. Free key at himalayas.app/api-keys. Server-side only. |
| `CACHE_TTL_SECONDS` | `21600` | 6 h. Keep ≥ 21600 for Remotive's 4-call/day limit. |
| `HIMALAYAS_MAX_PAGES` | `5` | 5 pages × 20 jobs = 100 Himalayas jobs per refresh. |

---

## Project structure (brief)

```
src/
├── app/
│   ├── layout.tsx          MUI providers, metadata, font
│   ├── page.tsx            Dashboard (client component)
│   └── api/jobs/route.ts   GET /api/jobs
├── components/             UI components (see root README for details)
├── hooks/
│   └── useCriteria.ts      localStorage persistence
└── lib/
    ├── types.ts            Shared types
    ├── config.ts           Weights, TTL, URLs
    ├── sources/            Himalayas + Remotive adapters
    ├── normalize/          Pure field-value converters
    ├── aggregate/          Cache, dedupe, merge
    ├── matching/           Filters + scorer (pure, browser-side)
    └── cv/                 PDF/DOCX parser + criteria extractor
tests/
├── a11y/                   axe-core WCAG 2.x AA tests
├── fixtures/               Recorded API responses (10 jobs each)
└── *.test.ts               Unit + integration tests
```

Full file listing with per-file descriptions: see root [`README.md`](../README.md#file-structure).

---

## Testing approach

- **Logic tests** run in the `node` environment (vitest default for `.test.ts` files).
- **Component / a11y tests** run in `jsdom` via `// @vitest-environment jsdom` docblock.
- No network calls in tests — adapters use `vi.stubGlobal("fetch", ...)` with recorded fixtures.
- Coverage target: every module has a happy-path test + at least 2 edge cases.
