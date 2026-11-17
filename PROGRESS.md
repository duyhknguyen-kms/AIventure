# AIventure — Build Progress

Tracks the 8-stage roadmap from `SPEC.md §14`.

## Stages

| # | Name | Status | Tests |
|---|------|--------|-------|
| 1 | Scaffold | ✅ Done | 8 pass |
| 2 | Himalayas adapter | ✅ Done | +30 (38 total) |
| 3 | Remotive adapter | ✅ Done | +13 (51 total) |
| 4 | Aggregation + API | ✅ Done | +29 (131 total) |
| 5 | Matching engine | ✅ Done | +51 (182 total) |
| 6 | Dashboard list | ⬜ Pending | — |
| 7 | Criteria + persistence | ⬜ Pending | — |
| 8 | Detail + polish | ⬜ Pending | — |

---

## Stage Details

### ✅ Stage 1 — Scaffold
- `src/app/layout.tsx` — MUI `AppRouterCacheProvider` + `ThemeProvider`
- `src/theme.ts` — WCAG AA palette, Roboto font
- `vitest.config.ts`, `vitest.setup.ts` — test harness
- `.env.example` / `.env.local`
- `tests/theme.test.ts` — contrast ratio smoke tests

### ✅ Stage 2 — Himalayas adapter
- `src/lib/types.ts` — all shared types
- `src/lib/config.ts` — weights, TTL, URLs
- `src/lib/normalize/{html,employment,seniority,timezone,location}.ts`
- `src/lib/matching/salary.ts` — `parseSalaryText`, `annualize`
- `src/lib/sources/himalayas.ts` — Zod schema, cursor/page loop, `toJob`
- `tests/fixtures/himalayas-browse.json`, `himalayas-search.json`
- `tests/{normalize,salary,sources.himalayas}.test.ts`
- **Real API deviations handled:** `locationRestrictions` = string[] of country names; `timezoneRestrictions` = number[]

### ✅ Stage 3 — Remotive adapter
- `src/lib/sources/remotive.ts` — Zod schema, `toJob`, `fetchRemotive`
- `tests/fixtures/remotive.json`
- `tests/sources.remotive.test.ts`
- **Real API findings:** `limit` param ignored (full feed always); `company_logo_url` extra field used; `publication_date` has no TZ → appended `Z`

### ✅ Stage 4 — Aggregation + API
- `src/lib/aggregate/cache.ts` — TTL cache, in-flight dedupe, stale-on-error, 429 blocking
- `src/lib/aggregate/dedupe.ts` — Himalayas wins on collision, Remotive credited via `alsoOn`
- `src/lib/aggregate/aggregate.ts` — parallel fetch, local q-filter, dedupe, sort, expiry
- `src/app/api/jobs/route.ts` — `GET /api/jobs`, Zod validation, 200/400/502
- `tests/{aggregate,route.jobs}.test.ts`

### ✅ Stage 5 — Matching engine
- `src/lib/matching/criteria.ts` — `CriteriaSchema`, `DEFAULT_CRITERIA`, `BenefitKeyEnum`
- `src/lib/matching/benefits.ts` — `BENEFIT_DICTIONARY`, `extractBenefits()`
- `src/lib/matching/filters.ts` — `applyHardFilters()`, `isLocationUncertain()`
- `src/lib/matching/score.ts` — `scoreJob()`, `rankJobs()`
- `tests/benefits.test.ts` — 11 tests
- `tests/filters.test.ts` — 16 tests (F1/F2/F3)
- `tests/score.test.ts` — 18 tests including §7.5 golden test = 88%

### ⬜ Stage 6 — Dashboard list
Files to create:
- [ ] `src/app/page.tsx` — landmarks, h1, SkipLink, LiveAnnouncer, fetch `/api/jobs`
- [ ] `src/components/SkipLink.tsx`
- [ ] `src/components/LiveAnnouncer.tsx`
- [ ] `src/components/JobList.tsx`
- [ ] `src/components/JobCard.tsx`
- [ ] `src/components/BenefitChips.tsx`
- [ ] `src/components/SourceAttribution.tsx`
- [ ] `src/components/SourceStatusBanner.tsx`
- [ ] `tests/a11y/axe.ts`
- [ ] `tests/a11y/JobCard.a11y.test.tsx`

### ⬜ Stage 7 — Criteria + persistence
Files to create:
- [ ] `src/hooks/useCriteria.ts` — localStorage, 300 ms debounce
- [ ] `src/components/CriteriaForm.tsx`
- [ ] `tests/a11y/CriteriaForm.a11y.test.tsx`

### ⬜ Stage 8 — Detail + polish
Files to create:
- [ ] `src/components/JobDetailPanel.tsx`
- [ ] `src/components/ScoreBreakdown.tsx`
- [ ] `tests/a11y/JobDetailPanel.a11y.test.tsx`
- [ ] `tests/a11y/Dashboard.a11y.test.tsx`
- [ ] §10.5 / §11 accessibility + compliance checklists
