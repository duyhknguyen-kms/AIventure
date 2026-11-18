# Discovered Rules — AIventure

Hard constraints evidenced in the codebase and confirmed in the practices-discovery interview (2026-11-18).
Each rule cites its source. Rules that are PoC-scope deferrals rather than permanent constraints are excluded.

---

## Mandated

- ALWAYS validate all external API responses with Zod schemas before mapping to domain types (`HimalayasJobSchema`, `RemotiveJobSchema` in `src/lib/sources/`; documented in `dependencies.md` §Zod and in `code-quality-assessment.md` §TypeScript defensive patterns).

- ALWAYS use `.passthrough()` and `.nullish()` on Zod schemas for upstream API responses to remain forward-compatible when the upstream API adds or removes fields (documented in `dependencies.md` §Zod and enforced in both source adapters).

- ALWAYS apply `AbortSignal.timeout(10_000)` to every upstream HTTP fetch to prevent unbounded hangs (`code-quality-assessment.md` §TypeScript "notable defensive patterns").

- ALWAYS dynamically import `pdfjs-dist` and `mammoth` (browser-only libraries) with `await import(…)` to prevent them from being included in the initial server-side bundle (`dependencies.md` §pdfjs-dist "critical constraint" and §mammoth "critical constraint").

- ALWAYS use `localStorage` with Zod `safeParse` when reading stored criteria, so that schema-drift between app versions never throws and always falls back gracefully to `DEFAULT_CRITERIA` (`dependencies.md` §Zod, `code-quality-assessment.md` §TypeScript).

- ALWAYS use `applicationLink` directly as the job application URL — never wrap it in a redirect — to comply with the Himalayas Terms of Service (`business-overview.md` §Business Constraints).

- ALWAYS cap the Remotive feed to one full-feed fetch per cache window (default 6 hours) with no `search` parameter, to comply with the Remotive Terms of Service (`business-overview.md` §Business Constraints; enforced in `cache.ts` and `remotive.ts`).

- ALWAYS keep environment variables server-side only: use no `NEXT_PUBLIC_` prefix so secrets cannot leak to client bundles (`technology-stack.md` §Environment Variables, `dependencies.md` §Dependency Boundaries).

- ALWAYS enforce 80% line-coverage in CI — any PR that drops total line coverage below 80% must fail the CI pipeline (confirmed in practices-discovery interview Q3).

- ALWAYS mock LLM API responses in unit tests — never call live LLM APIs in the CI pipeline. Use deterministic fixture responses to test prompting logic and response-mapping code (confirmed in practices-discovery interview Q3 follow-up).

## Forbidden

- NEVER render `descriptionHtml` from upstream APIs via `dangerouslySetInnerHTML`; always use the `descriptionText` (HTML-stripped) field for display (`dependencies.md` §Security Notes; enforced throughout `src/components/`).

- NEVER import `pdfjs-dist` or `mammoth` from server-side files (API routes or server components); they are browser-only libraries and must only be called from `"use client"` components (`dependencies.md` §Dependency Boundaries).

- NEVER hardcode credentials, API keys, or secrets in source code or committed files; use environment variables or a secrets manager (`construction` phase memory guardrail; `dependencies.md` §Security Notes).

- NEVER introduce circular imports between `src/lib/` and `src/components/`; the `lib/` tree is a pure dependency-only layer with no React imports (`code-structure.md` §Import Graph, `architecture.md` §Matching Engine).

- NEVER call a live LLM API in the CI pipeline; all LLM-touching code paths must be exercisable with mocked responses (confirmed in practices-discovery interview Q3 follow-up; aligns with the server-side secrets rule above).
