# Code Generation Summary

**Stage:** code-generation  
**Intent:** 261117-job-matcher-mvp  
**Date:** 2026-11-17  
**Scope:** express

---

## Files Created / Modified

### Core Library (`web/src/lib/`)
- `types.ts` — Job, Salary, JobLocation, Criteria, MatchResult, FactorResult, DetectedBenefit, SourceStatus
- `config.ts` — WEIGHTS, CACHE_TTL_SECONDS, HIMALAYAS_MAX_PAGES, CRITERIA_STORAGE_KEY
- `format.ts` — formatSalary, formatLocation, formatEmploymentType, matchBadgeLabel, initials, formatPostedDate
- `normalize/html.ts` — stripHtml
- `normalize/employment.ts` — normalizeEmploymentType
- `normalize/seniority.ts` — normalizeSeniority, inferSeniorityFromTitle, SENIORITY_LADDER
- `normalize/location.ts` — parseRemotiveLocation, COUNTRY_LOOKUP (134 country names)
- `normalize/timezone.ts` — parseUtcOffset
- `matching/salary.ts` — parseSalaryText, annualize
- `matching/benefits.ts` — BENEFIT_DICTIONARY, extractBenefits
- `matching/criteria.ts` — CriteriaSchema (Zod), DEFAULT_CRITERIA, BenefitKey
- `matching/filters.ts` — applyHardFilters (F1 location, F2 excluded keywords, F3 salary floor)
- `matching/score.ts` — scoreJob, rankJobs (7-factor weighted scoring)
- `matching/sort.ts` — sortRankedJobs, SORT_OPTIONS
- `sources/http.ts` — shared fetch helper with timeout, UpstreamError, Retry-After
- `sources/himalayas.ts` — fetchHimalayas, Zod schemas, cursor/page pagination
- `sources/remotive.ts` — fetchRemotive, Zod schemas, full-feed approach
- `aggregate/cache.ts` — TTL cache on globalThis, stale-on-error, in-flight dedupe
- `aggregate/dedupe.ts` — dedupeJobs (keeps Himalayas, fills alsoOn)
- `aggregate/aggregate.ts` — aggregateJobs (parallel fetch, partial results, q filtering)
- `jobsClient.ts` — typed /api/jobs client

### App (`web/src/app/`)
- `layout.tsx` — MUI wiring, AppRouterCacheProvider, ThemeProvider, metadata
- `page.tsx` — renders Dashboard
- `api/jobs/route.ts` — GET /api/jobs (Zod-validated q, 200/400/502)

### Hooks (`web/src/hooks/`)
- `useCriteria.ts` — localStorage persistence, debounced write, SSR-safe
- `useJobs.ts` — fetch with AbortController, stale result while loading

### Components (`web/src/components/`)
- `theme.ts` — WCAG AA palette, rounded corners, hover animations, glass AppBar
- `SkipLink.tsx` — "Skip to job results" anchor
- `LiveAnnouncer.tsx` — polite aria-live region, 500 ms debounce
- `SourceAttribution.tsx` — source credit with "(opens in new tab)" aria-label
- `SourceStatusBanner.tsx` — MUI Alert for partial/total failures
- `BenefitChips.tsx` — must-have (filled+check), missing (outlined+cross), detected
- `JobCard.tsx` — card with lift+shadow hover, meta chips, match badge (number+level)
- `ScoreBreakdown.tsx` — factor table with LinearProgress bars
- `CriteriaForm.tsx` — chip inputs, multi-selects, benefit checkboxes, reset dialog
- `JobDetailPanel.tsx` — responsive Drawer/Dialog with score, evidence, Apply button
- `JobList.tsx` — sort select, min-match slider, source toggle, salary switch, excluded list
- `Dashboard.tsx` — hero banner, feature strip, criteria sidebar (desktop) / Drawer (mobile), detail panel

## Key Implementation Decisions

- **Real fixture formats (O1/O2 resolved):** Himalayas `locationRestrictions` = country name strings (not `{alpha2}`); `timezoneRestrictions` = numbers including fractional offsets; `salaryPeriod` always present. Remotive feed = 17 jobs, `limit` parameter not honoured (no extra call made), `company_logo_url` optional.
- **Salary fix:** Remotive `$35,3k-$52k` (European decimal comma) now parses correctly to 35,300–52,000.
- **Country table:** 134 country names from real Himalayas recordings, all mapped to ISO alpha-2.
- **Route settings:** Removed `runtime` / `dynamic` exports from `/api/jobs` because `next.config.ts` enables `cacheComponents`, which is incompatible with them. The route is still Node and still dynamic (reads `request.url`).
- **Expiry order:** Expired jobs dropped before dedupe to prevent an expired Himalayas copy hiding a live Remotive one.
- **Modern UI:** Frosted-glass AppBar, animated hero gradient, card lift+shadow on hover, fade-slide-up entry animation, pill filter controls, responsive criteria sidebar.

## Test Coverage

- 27 test files, 335 tests passing
- Logic: normalize, salary, benefits, filters, score, aggregate, sources, route
- Component: BenefitChips, JobCard, ScoreBreakdown, CriteriaForm, JobDetailPanel, JobList, Dashboard
- a11y: JobCard, CriteriaForm, JobDetailPanel, Dashboard (axe WCAG 2.2 AA)
- Build: `npm run build` succeeds, TypeScript strict, ESLint clean

## Tests Written But Not Executed In This Stage

- None — all tests run in `npm test` via Vitest in jsdom/node environment.

## Deviations

- Step 1: Next.js 16.4.6 (not 15) installed; `@mui/material-nextjs/v16-appRouter` used.
- Step 2: Vitest pinned to ^4 (v5 needs @types/node ≥ 22); `vite-tsconfig-paths` not installed (config already maps `@/`).
- Step 19/20: Real API responses recorded 2026-11-17; fixtures are real data, not hand-written. Himalayas `locationRestrictions` = country name strings (not `{alpha2}` as SPEC says); `timezoneRestrictions` = numbers. Remotive `limit` param unverified.
- Step 24: `runtime`/`dynamic` exports removed from route.ts (incompatible with `cacheComponents: true` in next.config.ts).
