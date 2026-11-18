# Reverse Engineering Scan — Metadata

## Scan Identity

| Field | Value |
|-------|-------|
| Scan date | 2026-11-18 |
| Intent | `261118-ai-job-enhancement` |
| Agent | `aidlc-developer-agent` (sole pipeline link; collaborators off) |
| Trigger | Brownfield reverse engineering for enhancement intent |
| Workspace | `/Users/ninhnguyen/Desktop/KMS/AIventure` |
| Main app | `/Users/ninhnguyen/Desktop/KMS/AIventure/web/` |

## Codebase Snapshot

| Metric | Value |
|--------|-------|
| Source files (`web/src`) | 39 |
| Test files (`web/tests`) | 22 |
| Passing tests | 289 |
| TypeScript errors | 0 |
| ESLint errors | 0 |

## Artifacts Produced

| # | File | Description |
|---|------|-------------|
| 1 | `business-overview.md` | Product purpose, users, value proposition, goals, non-goals, constraints |
| 2 | `architecture.md` | System layers, data flow, component interactions, deployment model |
| 3 | `code-structure.md` | Directory layout, module count, naming conventions, import graph |
| 4 | `api-documentation.md` | GET /api/jobs contract, all types, upstream APIs |
| 5 | `component-inventory.md` | All 12 React components: purpose, props, accessibility notes |
| 6 | `technology-stack.md` | All runtime and dev deps with versions |
| 7 | `dependencies.md` | Key dependency choices and rationale |
| 8 | `code-quality-assessment.md` | Test coverage, known issues, tech debt, positive indicators |
| 9 | `reverse-engineering-timestamp.md` | This file |

## Pipeline Link Artifact

| File | Path |
|------|------|
| `developer-scan.md` | `aidlc/spaces/default/intents/261118-ai-job-enhancement/inception/reverse-engineering/developer-scan.md` |

## Files Read During Scan

The following source files were read to produce accurate (not inferred) content:

```
web/package.json
web/src/lib/types.ts
web/src/lib/config.ts
web/src/lib/cv/parseCv.ts
web/src/lib/cv/extractCriteria.ts
web/src/lib/cv/skills-dictionary.ts
web/src/lib/matching/criteria.ts
web/src/lib/matching/benefits.ts
web/src/lib/matching/filters.ts
web/src/lib/matching/score.ts
web/src/lib/matching/salary.ts
web/src/lib/sources/himalayas.ts
web/src/lib/sources/remotive.ts
web/src/lib/aggregate/aggregate.ts
web/src/lib/aggregate/cache.ts
web/src/lib/aggregate/dedupe.ts
web/src/lib/normalize/countries.ts  (via grep)
web/src/lib/normalize/employment.ts
web/src/lib/normalize/seniority.ts
web/src/lib/normalize/location.ts
web/src/lib/normalize/html.ts       (referenced; not fully read)
web/src/lib/normalize/timezone.ts   (referenced; not fully read)
web/src/app/api/jobs/route.ts
web/src/app/page.tsx
web/src/app/layout.tsx
web/src/theme.ts
web/src/hooks/useCriteria.ts
web/src/components/BenefitChips.tsx
web/src/components/CriteriaForm.tsx
web/src/components/CvScanner.tsx
web/src/components/HighlightText.tsx
web/src/components/JobCard.tsx
web/src/components/JobDetailPanel.tsx
web/src/components/JobList.tsx
web/src/components/LiveAnnouncer.tsx
web/src/components/ScoreBreakdown.tsx
web/src/components/SkipLink.tsx
web/src/components/SourceAttribution.tsx
web/src/components/SourceStatusBanner.tsx
web/vitest.config.ts
web/next.config.ts
web/.env.example
web/tests/score.test.ts
web/tests/aggregate.test.ts
web/tests/improve-cv.test.ts
web/tests/improve-filters.test.ts
web/tests/improve-pagination-highlight.test.ts
web/tests/a11y/axe.ts
web/tests/a11y/JobCard.a11y.test.tsx
SPEC.md
Improve-plan.md
```

## Scan Method

Manual file-by-file reading using `read_file` and `list_directory` tools. No automated static analysis tool (AST parser, dependency graph extractor) was used. Artifact content is derived from actual source code, not inferred from filenames or high-level descriptions.

## Confidence Notes

- All type definitions, function signatures, weight values, scoring formulas, and algorithm descriptions are sourced directly from the code.
- `parseCv.ts` internals (dynamic import paths, error messages) are confirmed from source.
- Test counts (289 passing) and error counts (0 TS, 0 lint) are stated from the prompt fact-sheet and consistent with the test files read.
- Country/region map specifics (`countries.ts`) were confirmed from the test file `improve-filters.test.ts` and `filters.ts`; the full map was not read but its ~100-entry coverage is documented in `Improve-plan.md`.
