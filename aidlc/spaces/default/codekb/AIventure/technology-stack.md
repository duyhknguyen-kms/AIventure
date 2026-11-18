# Technology Stack — AIventure

All version numbers are from `web/package.json` and confirmed against installed `node_modules`.

---

## Runtime

| Technology | Version | Role |
|-----------|---------|------|
| Node.js | 26 (dev/local); **22 (CI)** | Server runtime (Next.js App Router, API routes) |
| Browser (Chrome/Firefox/Safari) | modern | Client-side rendering, CV parsing, criteria storage |

> CI runs Node.js 22 (see `.github/workflows/ci.yml`). Development uses Node.js 26. No version-specific APIs rely on the difference.

---

## Framework

| Package | Version | Role |
|---------|---------|------|
| `next` | 16.4.6 | App Router, server components, API routes, static optimisation |
| `react` | 19.3.0 | UI rendering |
| `react-dom` | 19.3.0 | DOM rendering |

---

## UI / Styling

| Package | Version | Role |
|---------|---------|------|
| `@mui/material` | ^9.5.0 | Full MUI component library (Button, Dialog, Chip, Table, Pagination, …) |
| `@mui/icons-material` | ^9.5.0 | Material icon SVGs (`TuneIcon`, `CloseIcon`, `LaunchIcon`, `UploadFileIcon`, …) |
| `@mui/material-nextjs` | ^9.5.0 | `AppRouterCacheProvider` for Emotion/Next.js integration |
| `@emotion/react` | ^11.14.0 | CSS-in-JS runtime (MUI peer dependency) |
| `@emotion/styled` | ^11.14.1 | MUI `styled()` API |
| `@emotion/cache` | ^11.14.0 | Server-side Emotion cache for Next.js SSR |

Custom theme is defined in `src/theme.ts`. All WCAG 2.2 AA contrast ratios are manually verified (primary #1565c0 at 5.7:1, success #1b5e20 at 7.9:1, warning #8a4b00 at 6.8:1, error #c62828 at 5.6:1 — all against white).

---

## Validation

| Package | Version | Role |
|---------|---------|------|
| `zod` | ^4.6.7 | Runtime schema validation for all external API responses (`HimalayasJobSchema`, `RemotiveJobSchema`) and stored criteria (`CriteriaSchema`) |

---

## Document Parsing (CV Scanning)

| Package | Version | Role |
|---------|---------|------|
| `pdfjs-dist` | ^6.5.438 | Client-side PDF text extraction (Mozilla PDF.js); dynamically imported to avoid initial bundle bloat |
| `mammoth` | ^1.13.0 | Client-side DOCX text extraction; dynamically imported |

Both libraries are **browser-only**; they are never called from server code.

---

## Testing

| Package | Version | Role |
|---------|---------|------|
| `vitest` | ^5.1.0 | Test runner (replaces Jest); supports both `node` and `jsdom` environments per-file |
| `@vitest/coverage-v8` | ^5.1.0 | V8-based code coverage reports (text, JSON, HTML) |
| `@testing-library/react` | ^16.3.3 | React component rendering for tests |
| `@testing-library/dom` | ^10.4.2 | DOM queries and assertions |
| `@testing-library/jest-dom` | ^7.0.1 | Custom Jest-DOM matchers (extended by `vitest.setup.ts`) |
| `@testing-library/user-event` | ^14.6.12 | Simulated user interactions |
| `axe-core` | ^4.14.1 | Automated WCAG accessibility rule checking (run via `runAxe()` helper in `tests/a11y/`) |
| `jsdom` | ^31.0.1 | DOM environment for Vitest (used by component and a11y tests) |
| `@vitejs/plugin-react` | ^6.3.0 | Vite/Vitest React plugin (JSX transform) |
| `vite-tsconfig-paths` | ^6.1.1 | Resolves `@/` TypeScript path alias in Vitest |

---

## Language / Tooling

| Package | Version | Role |
|---------|---------|------|
| `typescript` | ^5 | TypeScript compiler, `strict: true` |
| `@types/node` | ^22.20.5 | Node.js type definitions |
| `@types/react` | ^19 | React type definitions |
| `@types/react-dom` | ^19 | ReactDOM type definitions |
| `eslint` | ^9 | JavaScript/TypeScript linter |
| `eslint-config-next` | 16.4.6 | Next.js ESLint rules (includes React, React Hooks, and import rules) |

---

## CI/CD

Defined in `.github/workflows/ci.yml`:

| Step | Command |
|------|---------|
| Install | `npm ci` |
| Lint | `npm run lint` (→ `eslint`) |
| Type-check | `tsc --noEmit` |
| Test | `npm run test` (→ `vitest --run`) |
| Build | `npm run build` (→ `next build`) |

Node.js version in CI: **22**.

---

## Environment Variables

All are server-side only (no `NEXT_PUBLIC_` prefix):

| Variable | Default | Description |
|----------|---------|-------------|
| `HIMALAYAS_API_KEY` | (empty) | Optional API key; raises Himalayas rate limit to 60 req/min, 10,000/day |
| `CACHE_TTL_SECONDS` | `21600` (6 h) | In-memory cache TTL for upstream responses |
| `HIMALAYAS_MAX_PAGES` | `5` | Max Himalayas pages per refresh (20 jobs/page → 100 jobs) |

---

## Notable Absent Technologies

The following are explicitly excluded from the MVP:

| Technology | Reason |
|-----------|--------|
| AI/LLM (OpenAI, Anthropic, etc.) | Non-goal in MVP; explicitly deferred to enhancement intent |
| Database (Postgres, SQLite, Redis, etc.) | No persistence layer needed; in-memory cache suffices |
| Tailwind CSS | MUI `sx` prop and Emotion `styled()` used exclusively |
| tRPC / GraphQL | Single server-rendered API route; full RPC layer is overkill |
| Authentication | Explicitly out of scope (Remotive ToS also prohibits sign-up gating) |
| Docker / container config | PoC; not containerised |
| Sentry / observability SDK | PoC; `console.warn` / `console.error` only |
