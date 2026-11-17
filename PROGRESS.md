# AIventure — Build Progress

> Last updated: 2026-11-17  
> Tests: **269 passing** · TypeScript errors: **0**  
> Dev server: `cd web && npm run dev` → http://localhost:3000

---

## Stage summary

| # | Name | Status | Tests |
|---|------|--------|-------|
| 1 | Scaffold | ✅ Done | 8 |
| 2 | Himalayas adapter | ✅ Done | +30 → 38 |
| 3 | Remotive adapter | ✅ Done | +13 → 51 |
| 4 | Aggregation + API | ✅ Done | +29 → 131 (note: some tests rewritten) |
| 5 | Matching engine | ✅ Done | +51 → 182 |
| 6 | Dashboard list | ✅ Done | +7 → 189 |
| 7 | Criteria + persistence | ✅ Done | +11 → 200 |
| 8 | Detail + polish | ✅ Done | +15 → 215 |
| I1 | Filter fixes | ✅ Done | +21 → 236 |
| I2 | Pagination | ✅ Done | +8 → 244 |
| I3 | Highlight text | ✅ Done | +9 → 253 |
| I4 | CV scan | ✅ Done | +16 → 269 |

---

## Stage details

### ✅ Stage 1 — Scaffold
- `src/app/layout.tsx` — MUI `AppRouterCacheProvider`, `ThemeProvider`, `CssBaseline`, metadata
- `src/theme.ts` — WCAG AA palette (#1565c0 primary, #1b5e20 success, #8a4b00 warning), Roboto font, reduced-motion global override, scroll-padding-top for sticky AppBar, focus ring ≥ 3:1
- `vitest.config.ts`, `vitest.setup.ts` — test harness; jsdom default, node per-file override
- `.env.example` / `.env.local`
- `tests/theme.test.ts` — WCAG contrast ratio smoke tests (8 tests)

---

### ✅ Stage 2 — Himalayas adapter
- `src/lib/types.ts` — all shared types: `Job`, `Salary`, `JobLocation`, `MatchResult`, `FactorResult`, `DetectedBenefit`, `SourceStatus`
- `src/lib/config.ts` — scoring weights (sum-verified at import), TTL, page limits, API URLs
- `src/lib/normalize/employment.ts` — `normalizeEmploymentType()`
- `src/lib/normalize/seniority.ts` — `normalizeSeniority()`, `inferSeniorityFromTitle()`, `SENIORITY_LADDER`
- `src/lib/normalize/timezone.ts` — `parseUtcOffset()`: numbers and strings
- `src/lib/normalize/html.ts` — `stripHtml()`: block→newline, entity decode, collapse whitespace
- `src/lib/matching/salary.ts` — `parseSalaryText()`, `annualize()`
- `src/lib/sources/himalayas.ts` — Zod schema, cursor/page loop, `toJob()`
- `tests/fixtures/himalayas-browse.json`, `himalayas-search.json` — recorded from live API
- Tests: normalize.test.ts, salary.test.ts, sources.himalayas.test.ts
- **Real API deviations handled:** `locationRestrictions` = string[] (not objects); `timezoneRestrictions` = number[]

---

### ✅ Stage 3 — Remotive adapter
- `src/lib/sources/remotive.ts` — Zod schema, full feed fetch, `toJob()`, `publication_date` appended `Z` for UTC
- `tests/fixtures/remotive.json` — recorded from live API
- Tests: sources.remotive.test.ts
- **Real API findings:** `limit` param ignored (full feed 17 jobs always); `company_logo_url` extra field used as primary

---

### ✅ Stage 4 — Aggregation + API
- `src/lib/aggregate/cache.ts` — TTL `Map` on `globalThis.__aiventureCache`; in-flight promise dedupe; stale-on-error; 429 `blockedUntil` per key
- `src/lib/aggregate/dedupe.ts` — `dedupeJobs()`: key = `norm(company)+"|"+norm(title)`; Himalayas wins; other → `alsoOn`
- `src/lib/aggregate/aggregate.ts` — `aggregateJobs()`: parallel `Promise.allSettled`, local q-filter, dedupe, drop expired, sort by `publishedAt` desc
- `src/app/api/jobs/route.ts` — `GET /api/jobs`: Zod validates `q`, returns 200/400/502; `runtime=nodejs`, `dynamic=force-dynamic`
- `next.config.ts` — `cacheComponents: false` (was incompatible with route segment configs)
- Tests: aggregate.test.ts, route.jobs.test.ts

---

### ✅ Stage 5 — Matching engine
- `src/lib/matching/criteria.ts` — `CriteriaSchema` (Zod), `DEFAULT_CRITERIA`, `BenefitKeyEnum`, `CRITERIA_STORAGE_KEY`
- `src/lib/matching/benefits.ts` — 9-entry `BENEFIT_DICTIONARY`; `extractBenefits()`: regex over `descriptionText+excerpt`; evidence snippets ±60 chars; "diversity, equity" suppressed
- `src/lib/matching/filters.ts` — `applyHardFilters()`: F1 location (worldwide/country/region/uncertain), F2 excluded keywords (word-boundary, hyphen-normalised), F3 salary floor (annualMax < floor)
- `src/lib/matching/score.ts` — `scoreJob()` (7 factors), `rankJobs()` (filter → score → sort desc, tie-break by publishedAt)
- Tests: benefits.test.ts, filters.test.ts, score.test.ts
- **Golden test:** §7.5 worked example = exactly **88%** ✅

---

### ✅ Stage 6 — Dashboard list
- `src/app/page.tsx` — client shell; `fetch("/api/jobs")` on mount; re-ranks with `rankJobs` on criteria change; loading/error/partial-fail states
- `src/components/SkipLink.tsx` — first focusable; visible on focus; "Skip to job results" → `#main`
- `src/components/LiveAnnouncer.tsx` — `role="status"` `aria-live="polite"` region, 500 ms debounce
- `src/components/JobCard.tsx` — Avatar initials fallback; match badge number+text+colour; SourceAttribution outside CardActionArea (avoids nested-interactive a11y violation)
- `src/components/JobList.tsx` — sort (match/newest/salary); 6 skeleton cards while loading; show-excluded toggle
- `src/components/BenefitChips.tsx` — filled+check for must-haves; outlined for detected; missing must-haves shown
- `src/components/SourceAttribution.tsx` — `aria-label="View … on … (opens in new tab)"`
- `src/components/SourceStatusBanner.tsx` — `severity="warning"|"error"`; `role="alert"` via MUI Alert; Retry; only shown when `ok === false` (not on normal cache hits)
- `tests/a11y/axe.ts`, `tests/a11y/JobCard.a11y.test.tsx`

---

### ✅ Stage 7 — Criteria + persistence
- `src/hooks/useCriteria.ts` — SSR-safe; reads localStorage on mount; Zod validates; falls back to `DEFAULT_CRITERIA`; writes debounced 300 ms
- `src/components/CriteriaForm.tsx` — chip Autocomplete (MUI v9 `renderValue`), seniority/employment/benefit checkboxes in `fieldset`+`legend`, salary+currency pair, country Autocomplete, UTC offset Select, Reset with confirm Dialog
- `src/app/page.tsx` — wired to `useCriteria`; re-ranks with `rankJobs` on every criteria change (pure, zero extra network); responsive Drawer on mobile / sidebar on desktop
- **MUI v9 fixes:** `renderTags` → `renderValue`; `inputProps` → `slotProps.htmlInput`; `PaperProps` → `slotProps.paper`
- `tests/a11y/CriteriaForm.a11y.test.tsx` — zero violations; all inputs by label; all fieldset groups (11 tests)

---

### ✅ Stage 8 — Detail + polish
- `src/components/ScoreBreakdown.tsx` — `<Table>` with `<caption>`; `LinearProgress` per factor; inactive = "not set" text
- `src/components/JobDetailPanel.tsx` — `Dialog` with `aria-labelledby`; close `aria-label`; Apply `<a>` with "(opens in new tab)"; plain-text description (`whiteSpace: pre-line`); `alsoOn` links
- `src/app/page.tsx` — card click → `selectedJob` state → `JobDetailPanel`
- `tests/a11y/JobDetailPanel.a11y.test.tsx` — 7 tests (zero violations, focus-in-dialog, Esc, Apply label)
- `tests/a11y/Dashboard.a11y.test.tsx` — 6 tests (one h1, main, skip link first, role=alert, role=status)

---

### ✅ Improvement 1 — Filter fixes (post-MVP)
- `src/lib/normalize/countries.ts` (**new**) — unified `COUNTRY_NAME_MAP` (~100 entries) + `COUNTRY_REGION` (all continents) + `REGION_ALIAS_MAP`; replaces the two separate maps that had drifted
- `src/lib/normalize/location.ts` — now imports from `countries.ts`; added alpha-2 passthrough for 2-letter codes
- `src/lib/matching/filters.ts` — COUNTRY_REGION expanded (now includes AFRICA, MIDDLE_EAST, ASIA); `company` added to `haystack()`; hyphens normalised before keyword matching; salary exclusion reason shows `/yr` units
- `src/lib/matching/score.ts` — `company` added to `haystack()`; hyphens normalised in `termMatches()`
- `tests/improve-filters.test.ts` — 21 regression tests

---

### ✅ Improvement 2 — Pagination (post-MVP)
- `src/components/JobList.tsx` — `PAGE_SIZE = 10`; MUI `Pagination`; resets to page 1 on `ranked` change or sort change; `onAnnounce` callback for `LiveAnnouncer`; passes `keywords`/`targetTitles` to `JobCard`
- `tests/improve-pagination-highlight.test.ts` — 8 pagination logic tests

---

### ✅ Improvement 3 — Highlight matched criteria (post-MVP)
- `src/components/HighlightText.tsx` (**new**) — splits text into plain/match/warn segments; word-boundary + hyphen-normalised regex; renders `<mark>` with background + bold; visually-hidden "Contains highlighted matches" for screen readers
- `src/components/JobCard.tsx` — title wrapped in `HighlightText` with `keywords + targetTitles`
- `src/components/JobDetailPanel.tsx` — description wrapped in `HighlightText`; `excludedKeywords` shown as red `warnTerms`
- `src/app/page.tsx` — threads `keywords`, `targetTitles`, `excludedKeywords` to `JobList` → `JobCard` / `JobDetailPanel`
- `tests/improve-pagination-highlight.test.ts` — 9 segment logic tests

---

### ✅ Improvement 4 — CV / Resume scan (post-MVP)
- `src/lib/cv/parseCv.ts` — `parseCv(file)`: PDF via `pdfjs-dist` (WebWorker, lazy import), DOCX via `mammoth` (lazy import); client-side only; max 5 MB; descriptive errors for scanned/encrypted PDFs
- `src/lib/cv/extractCriteria.ts` — `extractSkills()` (skills dictionary match), `extractJobTitles()` (label patterns + date-range heuristic), `extractSeniority()` (title regex + years-of-experience), `mergeExtracted()` (append, no overwrite)
- `src/lib/cv/skills-dictionary.ts` — ~120 common tech skills
- `src/components/CvScanner.tsx` — "Scan CV" button; loading state; preview Dialog with per-item checkboxes; "Apply to criteria" merges confirmed items
- `src/components/CriteriaForm.tsx` — `CvScanner` wired at top of form
- `tests/improve-cv.test.ts` — 17 tests (skills, seniority, titles, merge)

---

## Compliance checklist

**Himalayas API terms**
- ✅ Every card shows "Source: Himalayas" linking to the job on himalayas.app
- ✅ Footer links to https://himalayas.app
- ✅ Apply uses `applicationLink` from the API, never rebuilt
- ✅ No RSS/JSON feed or `JobPosting` structured data
- ✅ `HIMALAYAS_API_KEY` is server-side only
- ✅ Max 1 upstream call per 6 h TTL window

**Remotive API terms**
- ✅ Every card links back to Remotive `url` and names Remotive as source
- ✅ No login or email required to view listings
- ✅ At most ~4 upstream calls/day (6 h TTL, full feed once, local q-filter)
- ℹ️ Remotive listings may be delayed 24 h (inherent in their public feed)

**Accessibility (WCAG 2.2 AA)**
- ✅ Automated: 269 tests, zero axe violations in jsdom
- ✅ Keyboard: skip link, all inputs by Tab, Esc closes dialogs, focus returns to card
- ✅ Colour: match level = number + text + colour; must-have benefits = icon + text + colour
- ✅ No `dangerouslySetInnerHTML`; description as plain text
- ✅ `prefers-reduced-motion` global CSS override in theme
- ⬜ Manual: axe DevTools scan in real browser
- ⬜ Manual: NVDA + Chrome screen reader walkthrough
- ⬜ Manual: 320 px / 200% zoom
