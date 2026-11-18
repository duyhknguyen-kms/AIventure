# Dependencies — AIventure

This document explains the rationale behind key dependency choices, not just what is listed in `package.json`.

---

## Runtime Dependencies

### `next@16.4.6` — Application Framework

**Chosen for:** App Router (server components + route handlers in one project), `next/font` for optimised font loading, built-in TypeScript support, Vercel deployment path if needed.

**Version locked at 16.4.6** (not `^`) because Next.js 16 is the first stable release with experimental caching flags (`cacheComponents`, `partialPrefetching`) that the project explicitly opts out of (`next.config.ts` leaves them disabled). This ensures reproducible builds.

**Trade-off:** Next.js App Router adds complexity over Pages Router for a single-page app. The benefit is clean route handler colocation (`/api/jobs/route.ts`) and future server component opportunities.

---

### `react@19.3.0` + `react-dom@19.3.0`

**Chosen for:** React 19 is required by MUI v9. The `use()` hook and improved async rendering are not used in this codebase, but the version is a hard constraint of the MUI version choice.

---

### `@mui/material@^9.5.0` + `@mui/icons-material@^9.5.0`

**Chosen for:** Complete, accessible component primitives that satisfy WCAG 2.2 AA out of the box (focus rings, label associations, keyboard navigation). MUI v9 is the first version compatible with React 19.

**Key usage patterns:**
- `Autocomplete` with `freeSolo` for chip-based keyword input.
- `Dialog` for CV scan preview and job detail panel.
- `Pagination` for job list paging.
- `LinearProgress` with ARIA attributes for the score breakdown table.
- `AppBar` + `Drawer` for responsive navigation.
- `ThemeProvider` + `createTheme` for WCAG AA colour palette.

**Trade-off:** MUI adds ~300 KB to the initial bundle (Emotion CSS-in-JS at runtime). For a PoC, the accessibility and velocity benefits outweigh the bundle cost.

---

### `@mui/material-nextjs@^9.5.0`

**Chosen for:** `AppRouterCacheProvider` is required to make Emotion SSR work correctly with the Next.js App Router (prevents style flicker on hydration).

---

### `@emotion/react@^11.14.0` + `@emotion/styled@^11.14.1` + `@emotion/cache@^11.14.0`

**Chosen for:** MUI v9 peer dependencies. Emotion is MUI's default styling engine. `@emotion/cache` is needed for `AppRouterCacheProvider`.

---

### `zod@^4.6.7` — Runtime Validation

**Chosen for:** Schema-first validation with TypeScript type inference. Used in three places:

1. **Himalayas API response** (`HimalayasJobSchema`) — `.passthrough()` and `.nullish()` on optional fields ensure forward compatibility when the upstream API adds new fields.
2. **Remotive API response** (`RemotiveJobSchema`) — same pattern.
3. **Stored criteria** (`CriteriaSchema`) — validates data read from `localStorage`, protecting against schema drift between app versions.

**Version 4** is used (not v3). The API surface is compatible; v4 offers improved error messages.

---

### `pdfjs-dist@^6.5.438` — PDF Parsing

**Chosen for:** Mozilla's PDF.js is the most robust open-source browser PDF parser. Version 6.5.438 is used for stability with the specific worker path (`pdfjs-dist/build/pdf.worker.min.mjs`).

**Critical constraint:** Dynamically imported (`await import("pdfjs-dist")`) to avoid adding PDF.js (~1 MB) to the initial JavaScript bundle. The worker is pointed at the bundled path via `GlobalWorkerOptions.workerSrc`.

**Limitation:** Cannot parse image-based (scanned) PDFs. Encrypted PDFs throw and are caught with a user-facing error message.

---

### `mammoth@^1.13.0` — DOCX Parsing

**Chosen for:** Simple, well-maintained DOCX text extraction. `mammoth.extractRawText({ arrayBuffer })` returns clean plain text without HTML conversion overhead.

**Critical constraint:** Dynamically imported (`await import("mammoth")`) to avoid bundle bloat.

**Limitation:** Complex DOCX features (embedded images, tables) are ignored; plain text is all that is needed for skills extraction.

---

## Development Dependencies

### `vitest@^5.1.0`

**Chosen over Jest** for: native ESM support (required by pdfjs-dist), faster test execution, `@vitest-environment` per-file switching (node vs jsdom without separate `jest.config.*` files), and native TypeScript support without Babel.

The `// @vitest-environment node` comment in many test files overrides the default `jsdom` environment, allowing pure-logic tests to run faster without a DOM.

---

### `@vitest/coverage-v8@^5.1.0`

**Chosen over Istanbul (c8)** for: V8-native coverage collection without instrumentation overhead. Reports are generated in text, JSON, and HTML formats.

---

### `@testing-library/react@^16.3.3` + related

**Chosen for:** Behaviour-driven component tests. Component tests render into jsdom and query by accessible role/label rather than DOM structure, which naturally reinforces accessibility requirements.

---

### `axe-core@^4.14.1`

**Chosen for:** Automated WCAG 2.x AA rule checking in jsdom. Runs as part of the test suite (`tests/a11y/`). `color-contrast` rule is disabled (jsdom has no layout engine); contrast is verified manually against the WCAG relative-luminance formula in `theme.ts`.

WCAG tags used: `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`.

---

### `jsdom@^31.0.1`

**Chosen for:** DOM simulation for Vitest. Required by `@testing-library/react` and `axe-core`. Version 31 tracks recent browser APIs.

---

### `@vitejs/plugin-react@^6.3.0`

**Chosen for:** React Fast Refresh and JSX transform in Vitest. Version 6 is compatible with React 19.

---

### `vite-tsconfig-paths@^6.1.1`

**Chosen for:** Resolves the `@/` TypeScript path alias in Vitest without duplicating alias configuration.

---

## Dependency Boundaries

| Constraint | Detail |
|-----------|--------|
| `pdfjs-dist` and `mammoth` are client-only | Only imported inside `parseCv.ts`, which is only called from `CvScanner.tsx` (a `"use client"` component). Never imported from server files. |
| Zod is used on both server and client | Server: validates upstream API responses. Client: validates criteria read from localStorage. |
| MUI is client-only in practice | All components are `"use client"`. The theme is defined with `"use client"` for `useTheme`. |
| No `NEXT_PUBLIC_` env vars | All environment variables are server-only; no secrets can leak to the browser. |
| No circular imports | The `lib/` tree is a pure dependency-only layer with no React imports. Components import from `lib/`; `lib/` never imports from `components/`. |

---

## Security Notes

- `pdfjs-dist` and `mammoth` receive arbitrary user-uploaded files. Both libraries are well-maintained with active CVE monitoring. File size is capped at 5 MB before parsing.
- `descriptionHtml` from upstream APIs is stored but **never rendered via `dangerouslySetInnerHTML`**. Only `descriptionText` (HTML-stripped) is displayed.
- `HIMALAYAS_API_KEY` is a server-side environment variable; it never appears in URLs, logs, or client-side code.
