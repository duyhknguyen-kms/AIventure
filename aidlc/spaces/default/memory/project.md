# Project-Level Rules

> Project-specific specialisation and corrections. Loaded after `org.md` and
> `team.md` as strict-additive guidance.
> Populated by practices-discovery and the self-learning loop.
>
> Use sparingly: most teams don't need a project layer. Reach for it
> only when this specific project needs stable, durable guidance beyond the
> team practice (for example, package-specific release checks or an additional
> regression suite for a legacy component).

## Way of Working

<!-- Project-specific specialisation. Example: -->
<!-- This monorepo requires package-scoped branch names and a package owner -->
<!-- review in addition to the team's normal merge policy. -->
<!-- A project that merges into another branch than team.md names says so on its own line, read before team.md's: -->
<!-- - **Integration branch**: develop -->

## Walking Skeleton

<!-- Project-specific specialisation. Example: -->
<!-- The walking skeleton must exercise the legacy service adapter as well -->
<!-- as the new service boundary. -->

## Testing Posture

<!-- Project-specific specialisation. -->

## Guard Policy

<!-- Project-specific. Mode: strict, relaxed, or off. Strict here holds for every intent, whatever one person asks in chat; relaxed or off here applies to every intent whose policy came from its scope, unless the person sets another; changing this line changes it. A section under the retired Change Control heading, written by an earlier release, is still read. -->

## Deployment

<!-- Project-specific specialisation. -->

## Code Style

<!-- Project-specific specialisation. -->

## Tech Stack

<!-- Technology choices locked for this project. -->

## Decided

<!-- Decisions made in earlier stages that should not be re-asked. -->
<!-- Format: DECIDED: [decision] (Stage [slug], [date]) -->

## Scope Overrides

<!-- Custom scope rules for this project. -->

## Forbidden

<!-- Populated by practices-discovery affirmation gate. -->
<!-- Format: - NEVER [behavior] (affirmed [date]) -->
<!-- Example: - NEVER throw exceptions across service layer boundaries (affirmed 2026-05-17) -->

- NEVER render `descriptionHtml` from upstream APIs via `dangerouslySetInnerHTML`; always use the `descriptionText` (HTML-stripped) field for display (`dependencies.md` §Security Notes; enforced throughout `src/components/`). (affirmed 2026-11-18)

- NEVER import `pdfjs-dist` or `mammoth` from server-side files (API routes or server components); they are browser-only libraries and must only be called from `"use client"` components (`dependencies.md` §Dependency Boundaries). (affirmed 2026-11-18)

- NEVER hardcode credentials, API keys, or secrets in source code or committed files; use environment variables or a secrets manager (`construction` phase memory guardrail; `dependencies.md` §Security Notes). (affirmed 2026-11-18)

- NEVER introduce circular imports between `src/lib/` and `src/components/`; the `lib/` tree is a pure dependency-only layer with no React imports (`code-structure.md` §Import Graph, `architecture.md` §Matching Engine). (affirmed 2026-11-18)

- NEVER call a live LLM API in the CI pipeline; all LLM-touching code paths must be exercisable with mocked responses (confirmed in practices-discovery interview Q3 follow-up; aligns with the server-side secrets rule above). (affirmed 2026-11-18)

## Mandated

<!-- Populated by practices-discovery affirmation gate. -->
<!-- Format: - ALWAYS [behavior] (affirmed [date]) -->
<!-- Example: - ALWAYS use Result<T,E> for fallible operations in service layer (affirmed 2026-05-17) -->

- ALWAYS validate all external API responses with Zod schemas before mapping to domain types (`HimalayasJobSchema`, `RemotiveJobSchema` in `src/lib/sources/`; documented in `dependencies.md` §Zod and in `code-quality-assessment.md` §TypeScript defensive patterns). (affirmed 2026-11-18)

- ALWAYS use `.passthrough()` and `.nullish()` on Zod schemas for upstream API responses to remain forward-compatible when the upstream API adds or removes fields (documented in `dependencies.md` §Zod and enforced in both source adapters). (affirmed 2026-11-18)

- ALWAYS apply `AbortSignal.timeout(10_000)` to every upstream HTTP fetch to prevent unbounded hangs (`code-quality-assessment.md` §TypeScript "notable defensive patterns"). (affirmed 2026-11-18)

- ALWAYS dynamically import `pdfjs-dist` and `mammoth` (browser-only libraries) with `await import(…)` to prevent them from being included in the initial server-side bundle (`dependencies.md` §pdfjs-dist "critical constraint" and §mammoth "critical constraint"). (affirmed 2026-11-18)

- ALWAYS use `localStorage` with Zod `safeParse` when reading stored criteria, so that schema-drift between app versions never throws and always falls back gracefully to `DEFAULT_CRITERIA` (`dependencies.md` §Zod, `code-quality-assessment.md` §TypeScript). (affirmed 2026-11-18)

- ALWAYS use `applicationLink` directly as the job application URL — never wrap it in a redirect — to comply with the Himalayas Terms of Service (`business-overview.md` §Business Constraints). (affirmed 2026-11-18)

- ALWAYS cap the Remotive feed to one full-feed fetch per cache window (default 6 hours) with no `search` parameter, to comply with the Remotive Terms of Service (`business-overview.md` §Business Constraints; enforced in `cache.ts` and `remotive.ts`). (affirmed 2026-11-18)

- ALWAYS keep environment variables server-side only: use no `NEXT_PUBLIC_` prefix so secrets cannot leak to client bundles (`technology-stack.md` §Environment Variables, `dependencies.md` §Dependency Boundaries). (affirmed 2026-11-18)

- ALWAYS enforce 80% line-coverage in CI — any PR that drops total line coverage below 80% must fail the CI pipeline (confirmed in practices-discovery interview Q3). (affirmed 2026-11-18)

- ALWAYS mock LLM API responses in unit tests — never call live LLM APIs in the CI pipeline. Use deterministic fixture responses to test prompting logic and response-mapping code (confirmed in practices-discovery interview Q3 follow-up). (affirmed 2026-11-18)

## Corrections

<!-- Project-specific corrections from human feedback. -->
<!-- Format: NEVER/ALWAYS [behavior] (learned [date]) -->
