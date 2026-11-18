# Code Structure — AIventure

## Repository Layout

```
AIventure/                         ← repo root
├── README.md                      ← product brief
├── SPEC.md                        ← technical spec (PoC bootstrap)
├── Improve-plan.md                ← post-MVP improvement log (all 4 items done)
├── PROGRESS.md                    ← session progress notes
├── AGENTS.md                      ← AI-DLC multi-harness onboarding
├── .gitignore
├── .github/
│   └── workflows/
│       └── ci.yml                 ← CI pipeline (Node 22, build + lint + test)
├── aidlc/                         ← AI-DLC workspace (not application code)
│   └── spaces/default/…
└── web/                           ← Next.js application root
    ├── package.json
    ├── package-lock.json
    ├── tsconfig.json
    ├── next.config.ts
    ├── vitest.config.ts
    ├── vitest.setup.ts
    ├── eslint.config.mjs
    ├── .env.example
    ├── .env.local                 ← git-ignored
    ├── public/
    └── src/
        ├── theme.ts               ← MUI theme (WCAG AA palette)
        ├── app/
        │   ├── layout.tsx         ← Root layout: lang, fonts, ThemeProvider, CssBaseline
        │   ├── page.tsx           ← Dashboard (single client-component shell)
        │   └── api/
        │       └── jobs/
        │           └── route.ts   ← GET /api/jobs
        ├── components/            ← 12 presentational React components
        │   ├── BenefitChips.tsx
        │   ├── CriteriaForm.tsx
        │   ├── CvScanner.tsx
        │   ├── HighlightText.tsx
        │   ├── JobCard.tsx
        │   ├── JobDetailPanel.tsx
        │   ├── JobList.tsx
        │   ├── LiveAnnouncer.tsx
        │   ├── ScoreBreakdown.tsx
        │   ├── SkipLink.tsx
        │   ├── SourceAttribution.tsx
        │   └── SourceStatusBanner.tsx
        ├── hooks/
        │   └── useCriteria.ts     ← localStorage ↔ Criteria state
        └── lib/                   ← Pure business-logic library
            ├── types.ts           ← All shared TypeScript types
            ├── config.ts          ← Weights, TTL, page limits, API URLs, storage key
            ├── aggregate/
            │   ├── aggregate.ts   ← aggregateJobs() — parallel fetch, dedupe, sort
            │   ├── cache.ts       ← In-memory TTL cache on globalThis
            │   └── dedupe.ts      ← dedupeJobs() — company+title key, Himalayas wins
            ├── sources/
            │   ├── himalayas.ts   ← fetchHimalayas(q?, maxPages?) → Job[]
            │   └── remotive.ts    ← fetchRemotive() → Job[]
            ├── normalize/
            │   ├── countries.ts   ← COUNTRY_NAME_MAP, COUNTRY_REGION, countryNameToAlpha2()
            │   ├── employment.ts  ← normalizeEmploymentType()
            │   ├── html.ts        ← stripHtml()
            │   ├── location.ts    ← parseRemotiveLocation()
            │   ├── seniority.ts   ← normalizeSeniority(), inferSeniorityFromTitle(), SENIORITY_LADDER
            │   └── timezone.ts    ← parseUtcOffset()
            ├── matching/
            │   ├── criteria.ts    ← CriteriaSchema (Zod), DEFAULT_CRITERIA, CRITERIA_STORAGE_KEY
            │   ├── benefits.ts    ← BENEFIT_DICTIONARY, extractBenefits()
            │   ├── filters.ts     ← applyHardFilters(), haystack(), isLocationUncertain()
            │   ├── salary.ts      ← parseSalaryText(), annualize()
            │   └── score.ts       ← scoreJob(), rankJobs()
            └── cv/
                ├── extractCriteria.ts  ← extractSkills(), extractJobTitles(), extractSeniority(), mergeExtracted()
                ├── parseCv.ts          ← parseCv(file) → ParseResult; PDF + DOCX, client-side only
                └── skills-dictionary.ts ← SKILLS_DICTIONARY (~120 entries)
```

## Test Layout

```
web/tests/
├── fixtures/
│   ├── himalayas-browse.json      ← Recorded API response for Himalayas browse
│   ├── himalayas-search.json      ← Recorded API response for Himalayas search
│   └── remotive.json              ← Recorded Remotive feed
├── aggregate.test.ts
├── benefits.test.ts
├── filters.test.ts
├── improve-cv.test.ts             ← CV extraction tests (Item 4)
├── improve-filters.test.ts        ← Filter regression tests (Item 1)
├── improve-pagination-highlight.test.ts ← Pagination + HighlightText logic (Items 2+3)
├── normalize.test.ts
├── route.jobs.test.ts
├── salary.test.ts
├── score.test.ts
├── sources.himalayas.test.ts
├── sources.remotive.test.ts
├── theme.test.ts
└── a11y/
    ├── axe.ts                     ← runAxe(container) helper (WCAG 2.2 AA)
    ├── CriteriaForm.a11y.test.tsx
    ├── Dashboard.a11y.test.tsx
    ├── JobCard.a11y.test.tsx
    └── JobDetailPanel.a11y.test.tsx
components/
    └── JobCard.bugfix.test.tsx
```

**Total: 22 test files, 289 passing tests (0 TS errors, 0 lint errors).**

## Module Count

| Directory | Files |
|-----------|------:|
| `src/app` | 2 (+ 1 route) |
| `src/components` | 12 |
| `src/hooks` | 1 |
| `src/lib/aggregate` | 3 |
| `src/lib/sources` | 2 |
| `src/lib/normalize` | 6 |
| `src/lib/matching` | 5 |
| `src/lib/cv` | 3 |
| `src/` (root) | 2 (`theme.ts`, `lib/types.ts`, `lib/config.ts`) |
| **Total** | **39** |

## Naming Conventions

| Entity | Convention | Examples |
|--------|-----------|---------|
| Files | kebab-case | `extractCriteria.ts`, `JobDetailPanel.tsx` |
| React components | PascalCase default export | `CriteriaForm`, `JobList` |
| Types / interfaces | PascalCase | `Job`, `MatchResult`, `Criteria` |
| Enum-like string literals | snake_case or camelCase per domain | `"full_time"`, `"himalayas"` |
| Constants | SCREAMING_SNAKE_CASE | `WEIGHTS`, `BENEFIT_DICTIONARY`, `SKILLS_DICTIONARY` |
| Pure functions | camelCase | `scoreJob`, `rankJobs`, `parseSalaryText` |
| Hooks | camelCase with `use` prefix | `useCriteria` |
| Path alias | `@/` → `web/src/` | `@/lib/types`, `@/components/JobCard` |

## Configuration Files

| File | Purpose |
|------|---------|
| `web/tsconfig.json` | TypeScript strict mode, `@/` path alias |
| `web/vitest.config.ts` | Vitest with `jsdom` default, `v8` coverage, `@/` alias |
| `web/vitest.setup.ts` | `@testing-library/jest-dom` matchers |
| `web/eslint.config.mjs` | ESLint with `eslint-config-next` |
| `web/next.config.ts` | Minimal; experimental flags disabled |
| `web/.env.example` | Documents three environment variables |

## Import Graph (key dependencies)

```
page.tsx
  └── @/hooks/useCriteria
  └── @/lib/matching/score (rankJobs)
  └── @/components/*

/api/jobs/route.ts
  └── @/lib/aggregate/aggregate (aggregateJobs)
        └── @/lib/sources/himalayas
        └── @/lib/sources/remotive
        └── @/lib/aggregate/dedupe
        └── @/lib/aggregate/cache
              └── @/lib/config

@/lib/sources/himalayas
  └── @/lib/matching/salary (annualize)
  └── @/lib/normalize/{employment, seniority, html, location}
  └── @/lib/config

@/lib/matching/score
  └── @/lib/matching/{benefits, filters, criteria}
  └── @/lib/normalize/seniority (SENIORITY_LADDER)
  └── @/lib/config (WEIGHTS)
  └── @/lib/types

@/lib/cv/extractCriteria
  └── @/lib/cv/skills-dictionary
  └── @/lib/normalize/seniority
  └── @/lib/matching/criteria (Criteria type)
  └── @/lib/types
```

No circular imports. The `lib/` tree is a pure dependency-only layer with no React imports and no `"use client"` directives.
