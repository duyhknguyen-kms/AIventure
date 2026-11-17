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
| 6 | Dashboard list | ✅ Done | +7 (189 total) |
| 7 | Criteria + persistence | ✅ Done | +11 (200 total) |
| 8 | Detail + polish | ✅ Done | +15 (215 total) |

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

### ✅ Stage 6 — Dashboard list
- `src/app/page.tsx` — full client shell: AppBar, SkipLink, LiveAnnouncer, criteria sidebar placeholder, JobList, footer
- `src/components/SkipLink.tsx`
- `src/components/LiveAnnouncer.tsx` — debounced 500 ms `role="status"` polite region
- `src/components/JobCard.tsx` — Avatar initials fallback, match badge (number + text level + colour), SourceAttribution outside CardActionArea
- `src/components/JobList.tsx` — sort (match/newest/salary), show-excluded toggle, loading skeletons
- `src/components/BenefitChips.tsx` — filled+check for must-haves, outlined for detected, missing must-haves shown
- `src/components/SourceAttribution.tsx` — `aria-label` includes "(opens in new tab)"
- `src/components/SourceStatusBanner.tsx` — `role="alert"` via MUI Alert, Retry button
- `tests/a11y/axe.ts` — WCAG 2.x AA axe helper
- `tests/a11y/JobCard.a11y.test.tsx` — 7 tests: zero axe violations, accessible name, match badge text, source attribution
- **Key fix:** SourceAttribution link moved outside CardActionArea to avoid nested-interactive axe violation

### ✅ Stage 7 — Criteria + persistence
- `src/hooks/useCriteria.ts` — SSR-safe localStorage read on mount, 300 ms debounced write, Zod validation on load, invalid/missing → DEFAULT_CRITERIA
- `src/components/CriteriaForm.tsx` — All criteria fields: chip Autocomplete (MUI v9 `renderValue`), seniority/employment type checkboxes in `fieldset`+`legend`, salary+currency, country Autocomplete, UTC offset Select, must-have/nice-to-have benefit checkboxes, Reset with confirm Dialog
- `src/app/page.tsx` — Wired to `useCriteria`; re-ranks with `rankJobs` on every criteria change (pure, no network); responsive Drawer on mobile (< md), sidebar on desktop
- `tests/a11y/CriteriaForm.a11y.test.tsx` — 11 tests: zero axe violations, every input findable by label, all 4 fieldsets exposed as group+legend
- **MUI v9 fixes:** `renderTags` → `renderValue`, `inputProps` → `slotProps.htmlInput`, Drawer `PaperProps` → `slotProps.paper`

### ✅ Stage 8 — Detail + polish
- `src/components/ScoreBreakdown.tsx` — `<Table>` with `<caption>`, `LinearProgress` per factor, inactive factors show "not set" text
- `src/components/JobDetailPanel.tsx` — MUI `Dialog` with `aria-labelledby`, close button `aria-label="Close job details"`, Apply as `<a>` with "(opens in new tab)", description as plain text (`whiteSpace: pre-line`), `alsoOn` links, `ScoreBreakdown`, `BenefitChips` with evidence blockquotes
- `src/app/page.tsx` — card click wires to `selectedJob` state, `JobDetailPanel` rendered at page root
- `src/theme.ts` — already had `prefers-reduced-motion` global override (animation/transition → 0.01ms) + scroll-padding-top for sticky AppBar
- `tests/a11y/JobDetailPanel.a11y.test.tsx` — 7 tests: zero axe violations, aria-labelledby, focus-in-dialog, close aria-label, Apply aria-label, Esc closes, score table, inactive "not set", plain-text description
- `tests/a11y/Dashboard.a11y.test.tsx` — 6 tests: one h1, main landmark, skip link first, zero axe violations, partial-failure role=alert, role=status region

---

## Compliance & Accessibility Checklists

### §11 Compliance
**Himalayas**
- ✅ Every card shows "Source: Himalayas" linking to himalayas.app job page
- ✅ Footer links to https://himalayas.app
- ✅ Apply uses `applicationLink` from the API
- ✅ No RSS/JSON feed or JobPosting structured data
- ✅ `HIMALAYAS_API_KEY` is server-only (`.env.local`, not `NEXT_PUBLIC_`)
- ✅ Max 1 upstream call per 6 h TTL window

**Remotive**
- ✅ Every card links back to Remotive `url` and names Remotive as source
- ✅ No login or email required
- ✅ No third-party job board submission
- ✅ At most ~4 calls/day (6 h TTL, full feed once, local q-filter)
- ℹ️ Remotive listings may be delayed 24 h (noted in Remotive feed, not surfaced in UI yet)

### §10.5 Accessibility Checklist
- ✅ `npm test` a11y suite: 215 tests, zero axe violations
- ✅ Keyboard: SkipLink first, all inputs reachable by Tab, dialog closes with Esc, focus returns to card
- ✅ Colour: match level = number + text + colour; benefit chips = icon + text + colour
- ✅ No `dangerouslySetInnerHTML`; description rendered as plain text
- ✅ reduced-motion: global CSS override in theme.ts
- ⬜ Manual: axe DevTools scan in real browser (run before demo)
- ⬜ Manual: NVDA + Chrome screen reader walkthrough
- ⬜ Manual: 320 px / 200% zoom check
