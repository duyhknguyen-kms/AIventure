# Code Generation Plan

**Stage:** code-generation  
**Intent:** 261117-job-matcher-mvp  
**Date:** 2026-11-17  
**Scope:** express

---

## Summary

- Builds: Full-stack Next.js 15 job aggregator with MUI dashboard, matching engine, and WCAG 2.2 AA compliance
- Touches: `web/` folder scaffolding, `src/` with API routes, components, lib modules, hooks, and Vitest test suite
- Tests: ~30 unit tests (pure functions, adapters, filters, scoring, salary/benefit parsing), ~15 component tests (JobCard, CriteriaForm, JobDetailPanel, Dashboard), ~4 a11y tests with axe-core

---

## Testing Contract

```json
{
  "version": 1,
  "methodology": "test-after",
  "source": "org",
  "ordering": "implement each applicable testable layer, then write and run that layer's tests.",
  "scope": "express",
  "test_strategy": "minimal",
  "project_type": "greenfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop`, `classic` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nBuild and Test verifies defined coverage floors and affirmed quality targets;\nthey may not be weakened to make a step pass.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    }
  ],
  "obligations": {
    "strategy": "minimal",
    "strategy_volume": [
      "One verifiable test per requirement at the narrowest effective level.",
      "At least one happy-path unit test per component.",
      "Unit tests are the default; a bugfix/security scope floor may require an integration or E2E regression when that is the narrowest level that reproduces the defect."
    ],
    "scope_floor": [
      "Keep the existing test suite green.",
      "This scope adds no extra new-test floor beyond the selected test strategy."
    ],
    "combination_rule": "Apply every selected-strategy obligation and every scope-floor obligation; neither replaces the other, and a targeted scope regression may add the narrowest necessary test type beyond the strategy default."
  },
  "plan_profile": {
    "methodology": "test-after",
    "runner_step": "Bootstrap the minimal test runner/configuration and record the exact unit-scoped command.",
    "runner_ready_before_first_test": true,
    "testable_layers": [
      "Data model / database behavior",
      "Repository / data access",
      "Business logic",
      "API / endpoint",
      "Frontend behavior"
    ],
    "steps": [
      "Project structure and production configuration skeleton.",
      "Bootstrap the minimal test runner/configuration and record the exact unit-scoped command.",
      "Data model / database behavior - implement.",
      "Data model / database behavior - write and run its tests after implementation.",
      "Repository / data access - implement.",
      "Repository / data access - write and run its tests after implementation.",
      "Business logic - implement.",
      "Business logic - write and run its tests after implementation.",
      "API / endpoint - implement.",
      "API / endpoint - write and run its tests after implementation.",
      "Frontend behavior - implement.",
      "Frontend behavior - write and run its tests after implementation.",
      "Environment/build configuration.",
      "Documentation and traceability."
    ]
  },
  "input_sha256": "sha256:feae9d085aef5a6a689ae09b6eb667008e9265d95c521ecd8210945ff5035031",
  "contract_sha256": "sha256:fe2496254319e21e91034e358a23ba8dee4d3b8b14ac7c6abdf0fec2a8be41ef"
}
```

## Implementation Steps

### Phase 1: Project Scaffolding & Core Infrastructure

- [x] **Step 1: Initialize Next.js 15 App with TypeScript**
  - Scaffold with `npx create-next-app@latest web --typescript --app --src-dir --import-alias "@/*" --use-npm`
  - Accept all App Router defaults
  - Verify `web/tsconfig.json` has `strict: true`
  - **Traces:** FR1 (infrastructure for API), FR9 (infrastructure for dashboard)

- [ ] **Step 2: Install Dependencies**
  - Install MUI: `@mui/material @emotion/react @emotion/styled @mui/icons-material @mui/material-nextjs`
  - Install Zod: `zod`
  - Install dev dependencies: `vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom axe-core`
  - Add scripts to `web/package.json`: `"test": "vitest"`, `"test:ui": "vitest --ui"`
  - **Traces:** C1 (tech stack constraint), NFR6 (testability requirement)

- [x] **Step 3: Configure Vitest**
  - Create `web/vitest.config.ts` with `jsdom` environment, test file patterns, coverage config
  - Set up `@testing-library/react` and `@testing-library/jest-dom` globals
  - **Traces:** NFR6 (testability requirement)

- [x] **Step 4: Create MUI Theme with WCAG AA Contrast**
  - Create `web/src/theme.ts` with custom theme: AA-compliant color palette, focus ring styles, reduced-motion media query support
  - Export `ThemeProvider`-wrapped component
  - **Traces:** NFR3, NFR3.3 (WCAG AA color contrast), C1 (MUI requirement)

- [x] **Step 5: Update Root Layout for MUI + A11y**
  - Update `web/src/app/layout.tsx`:
    - Wrap with `AppRouterCacheProvider` (from `@mui/material-nextjs`)
    - Apply `ThemeProvider` with custom theme
    - Include `CssBaseline`
    - Set `<html lang="en">`
    - Add viewport meta tag
  - **Traces:** NFR3.1 (semantic HTML), NFR3 (WCAG AA)

### Phase 2: Type System & Data Model

- [ ] **Step 6: Define Core Types**
  - Create `web/src/lib/types.ts` with interfaces:
    - `SourceName`, `EmploymentType`, `Seniority`, `SalaryPeriod`
    - `Salary`, `JobLocation`, `Job`
    - `SourceStatus`, `DetectedBenefit`, `FactorResult`, `MatchResult`
  - **Traces:** FR2 (job data normalization), FR7 (scoring types), FR8 (benefit detection)

- [ ] **Step 7: Define Configuration Constants**
  - Create `web/src/lib/config.ts`:
    - `WEIGHTS` object (skills: 30, title: 20, seniority: 10, salary: 15, employment: 5, timezone: 5, benefits: 15)
    - `CACHE_TTL_SECONDS`, `HIMALAYAS_MAX_PAGES`
    - `CRITERIA_STORAGE_KEY`
    - Unit test asserting weights sum to 100
  - **Traces:** FR7 (scoring weights), FR4 (cache config), FR5 (criteria persistence key)

### Phase 3: Normalization Utilities

- [ ] **Step 8: Implement HTML Stripping**
  - Create `web/src/lib/normalize/html.ts`:
    - `stripHtml(html: string): string` — replace `<br>`, `</p>`, `</li>` with newlines, remove all tags, decode entities, collapse whitespace
  - Write unit tests with HTML samples → expected plain text
  - **Traces:** FR2, FR8.1 (HTML stripping for descriptionText and benefit detection)

- [ ] **Step 9: Implement Employment Type Normalization**
  - Create `web/src/lib/normalize/employment.ts`:
    - `normalizeEmploymentType(raw: string | null | undefined): EmploymentType | null` — case-insensitive mapping per §4.2 SPEC table
  - Write unit tests covering all documented cases plus edge cases (null, empty, unknown values)
  - **Traces:** FR2.3 (employment type normalization)

- [ ] **Step 10: Implement Seniority Normalization**
  - Create `web/src/lib/normalize/seniority.ts`:
    - `normalizeSeniority(levels: string[]): Seniority[]` — map Himalayas enum values
    - `inferSeniorityFromTitle(title: string): Seniority[]` — regex patterns for Remotive titles
    - `SENIORITY_LADDER` ordinal array for scoring
  - Write unit tests covering all documented patterns and edge cases
  - **Traces:** FR2.4 (seniority normalization), FR7.3 (seniority factor scoring)

- [ ] **Step 11: Implement Location Parsing**
  - Create `web/src/lib/normalize/location.ts`:
    - `parseRemotiveLocation(raw: string | null | undefined): JobLocation` — parse free text into countries/regions/worldwide
    - Country and region lookup tables (USA → US, Europe → EUROPE, etc.)
  - Write unit tests with documented examples ("Worldwide", "USA, Canada", "Europe", unparseable)
  - **Traces:** FR2.2 (location parsing)

- [ ] **Step 12: Implement Timezone Parsing**
  - Create `web/src/lib/normalize/timezone.ts`:
    - `parseUtcOffset(s: string): number | null` — parse "-5", "+7", "UTC-05:00", "GMT+5:30" to hours
  - Write unit tests with documented formats and edge cases
  - **Traces:** FR2 (timezone parsing for Job model)

### Phase 4: Salary & Benefit Analysis

- [ ] **Step 13: Implement Salary Parsing**
  - Create `web/src/lib/matching/salary.ts`:
    - `parseSalaryText(raw: string | null | undefined): Salary | null` — extract currency, numbers, period per §4.3 SPEC
    - `annualize(amount: number, period: SalaryPeriod): number` — convert to annual
  - Write unit tests with §4.3 SPEC table examples plus edge cases (null, competitive, unparseable, out-of-range)
  - **Traces:** FR2.1 (salary parsing), FR7.4 (salary factor uses annualized values)

- [ ] **Step 14: Implement Benefit Detection**
  - Create `web/src/lib/matching/benefits.ts`:
    - `BENEFIT_DICTIONARY` — 9 categories with regex patterns per §8 SPEC table
    - `extractBenefits(job: Job): DetectedBenefit[]` — detect keywords in descriptionText + excerpt, extract evidence snippets (±60 chars, max 2 per benefit)
  - Write unit tests with mock job descriptions hitting each benefit category
  - **Traces:** FR8 (benefit detection), FR7.7 (benefits factor uses detected benefits)

### Phase 5: Criteria Model & Persistence

- [ ] **Step 15: Define Criteria Schema**
  - Create `web/src/lib/matching/criteria.ts`:
    - `CriteriaSchema` (Zod) per §6 SPEC
    - `BenefitKey` enum
    - `DEFAULT_CRITERIA` (all empty/null)
    - Export `CRITERIA_STORAGE_KEY`
  - Write unit tests validating valid/invalid criteria objects
  - **Traces:** FR5 (criteria persistence), FR6/FR7 (criteria usage in filtering/scoring)

- [ ] **Step 16: Implement useCriteria Hook**
  - Create `web/src/hooks/useCriteria.ts`:
    - React hook reading from `localStorage[CRITERIA_STORAGE_KEY]` on mount (SSR-safe)
    - Zod validation, fallback to `DEFAULT_CRITERIA`
    - Debounced write (300 ms) on criteria change
  - Write unit tests (mock localStorage, verify read/write/validation)
  - **Traces:** FR5, FR5.1 (criteria editing and persistence)

### Phase 6: Filtering & Scoring Engine

- [ ] **Step 17: Implement Hard Filters**
  - Create `web/src/lib/matching/filters.ts`:
    - `applyHardFilters(jobs: Job[], criteria: Criteria): { kept: Job[], excluded: {job, reason}[] }` — apply F1 (location), F2 (excluded keywords), F3 (salary floor) per §7.1 SPEC
  - Write unit tests covering each filter rule with pass/fail cases
  - **Traces:** FR6 (job filtering)

- [ ] **Step 18: Implement Scoring Engine**
  - Create `web/src/lib/matching/score.ts`:
    - `scoreJob(job: Job, criteria: Criteria): MatchResult` — compute 7 factor scores per §7.3 SPEC, weighted sum per §7.2
    - `rankJobs(jobs: Job[], criteria: Criteria): { ranked: (Job & { match: MatchResult })[], excluded: {job, reason}[] }` — filter + score + sort
  - Write unit tests:
    - §7.5 SPEC worked example (must score exactly 88%)
    - Each factor in isolation (skills, title, seniority, salary, employment, timezone, benefits)
    - Empty criteria → 100% match
  - **Traces:** FR7, FR7.1–FR7.7 (scoring and ranking)

### Phase 7: Data Source Adapters

- [ ] **Step 19: Implement Himalayas Adapter**
  - Create `web/src/lib/sources/himalayas.ts`:
    - Zod schema for browse/search response (`.passthrough()` on jobs, `.nullish()` on optional fields)
    - `fetchHimalayas(q?: string): Promise<Job[]>` — walk cursor pagination (browse) or pages (search) up to `HIMALAYAS_MAX_PAGES`, validate with Zod, call `toJob()` per §4.2 SPEC mapping table
    - `toJob()` helper mapping Himalayas job → `Job` interface
    - Use optional `HIMALAYAS_API_KEY` env var as Bearer token if present
    - Handle 429 with `Retry-After`
  - Write unit tests with recorded fixture `tests/fixtures/himalayas-browse.json` and `himalayas-search.json` (stub `fetch`)
  - **Traces:** FR1.1 (Himalayas integration), FR2 (normalization), C2 (API terms)

- [ ] **Step 20: Implement Remotive Adapter**
  - Create `web/src/lib/sources/remotive.ts`:
    - Zod schema for `/api/remote-jobs` response (`.nullish()` on optional fields per OQ5 to verify)
    - `fetchRemotive(): Promise<Job[]>` — fetch full feed once, validate, call `toJob()` per §4.2 SPEC mapping table
    - `toJob()` helper mapping Remotive job → `Job` interface (including salary parsing, location parsing, seniority inference)
  - Write unit tests with recorded fixture `tests/fixtures/remotive.json` (stub `fetch`)
  - Verify and document field optionality in first real call
  - **Traces:** FR1.2 (Remotive integration), FR2 (normalization), C2 (API terms compliance)

### Phase 8: Aggregation & Caching

- [ ] **Step 21: Implement Cache Module**
  - Create `web/src/lib/aggregate/cache.ts`:
    - `Map<string, { value, expiresAt, fetchedAt }>` stored on `globalThis.__aiventureCache`
    - `get(key)` / `set(key, value, ttl)` / `blockedUntil` tracking per source
    - Stale-on-error: return stale with `cached: true` + `error` if refresh fails
    - In-flight dedupe: concurrent requests share one promise
    - Wrap upstream `fetch` with `AbortSignal.timeout(10_000)`
  - Write unit tests (mock `globalThis`, verify TTL, stale-on-error, 429 blocking)
  - **Traces:** FR4, FR4.1 (stale-on-error), FR4.2 (rate-limit backoff)

- [ ] **Step 22: Implement Deduplication**
  - Create `web/src/lib/aggregate/dedupe.ts`:
    - `dedupeJobs(jobs: Job[]): Job[]` — normalize company + title as key, keep Himalayas record, push other source into `alsoOn`
    - `norm(s)` helper: lowercase, strip punctuation, collapse whitespace, remove company suffixes
  - Write unit tests with pairs of jobs (same company+title, different sources)
  - **Traces:** FR3 (job deduplication)

- [ ] **Step 23: Implement Aggregation**
  - Create `web/src/lib/aggregate/aggregate.ts`:
    - `aggregateJobs(opts: { q?: string }): Promise<{ jobs: Job[], sources: SourceStatus[], fetchedAt: string }>` — parallel fetch via cache, local filtering for Remotive `q`, dedupe, sort by publishedAt desc, drop expired
  - Write unit tests (mock both sources, test partial failure, empty results, expired jobs filtered out)
  - **Traces:** FR1, FR1.3 (partial-failure resilience), FR5.3 (aggregation flow)

### Phase 9: API Route

- [ ] **Step 24: Implement /api/jobs Route**
  - Create `web/src/app/api/jobs/route.ts`:
    - `GET /api/jobs?q=<query>` handler
    - Validate `q` length (max 100 chars) → 400 if invalid
    - Call `aggregateJobs({ q })`
    - Return `{ jobs, sources, fetchedAt }` as JSON
    - Handle errors → 500 with `{ error }`
  - Write unit tests (mock `aggregateJobs`, test success, partial failure, validation)
  - **Traces:** FR1, FR10 (search), error handling per FR1.3

### Phase 10: UI Components — Core

- [ ] **Step 25: Implement SkipLink Component**
  - Create `web/src/components/SkipLink.tsx`:
    - Anchor `#main` with accessible label "Skip to main content"
    - Visually hidden until focused (CSS)
  - **Traces:** NFR3.2 (keyboard navigation), NFR3 (WCAG AA)

- [ ] **Step 26: Implement LiveAnnouncer Component**
  - Create `web/src/components/LiveAnnouncer.tsx`:
    - `<div role="status" aria-live="polite" aria-atomic="true">` with message prop
    - Visually hidden (screen reader only)
  - **Traces:** NFR3.6 (status messages), NFR3 (WCAG AA)

- [ ] **Step 27: Implement SourceAttribution Component**
  - Create `web/src/components/SourceAttribution.tsx`:
    - Display source name + link to source URL
    - "Also on <source>" for `alsoOn` array (if present)
    - External link icon + "(opens in new tab)" accessible label
  - Write component test (render, verify links)
  - **Traces:** FR9.1 (job card source credit), C2 (API terms compliance)

- [ ] **Step 28: Implement SourceStatusBanner Component**
  - Create `web/src/components/SourceStatusBanner.tsx`:
    - MUI `Alert` with `severity="warning"` showing source name + error message
    - Shown when `sources[].ok === false`
  - Write component test
  - **Traces:** FR9.7 (partial failure state), NFR3.6 (alert role)

### Phase 11: UI Components — Criteria Form

- [ ] **Step 29: Implement CriteriaForm Component**
  - Create `web/src/components/CriteriaForm.tsx`:
    - MUI form with labeled inputs per §6 SPEC:
      - Keywords (chip input with Autocomplete, max 30)
      - Target titles (chip input, max 10)
      - Excluded keywords (chip input, max 30)
      - Seniority (multi-select with checkboxes in `Select`)
      - Employment types (multi-select)
      - Min salary (TextField number + Select for currency)
      - Country (Select with ISO alpha-2 codes + names)
      - Timezone offset (Select with UTC±N labels)
      - Must-have benefits (checkboxes in FormGroup)
      - Nice-to-have benefits (checkboxes in FormGroup)
    - Reset button → `DEFAULT_CRITERIA`
    - `onChange` callback prop
  - Write component tests (render, change values, verify onChange)
  - **Traces:** FR5.1, FR9.3 (criteria form), NFR3.5 (form accessibility)

- [ ] **Step 30: Run Accessibility Tests on CriteriaForm**
  - Create `web/tests/a11y/CriteriaForm.a11y.test.tsx`:
    - Render CriteriaForm with default criteria
    - Run `axe-core` with WCAG 2.2 AA rule tags
    - Expect zero violations
  - **Traces:** NFR3, NFR6 (accessibility testing)

### Phase 12: UI Components — Job Display

- [ ] **Step 31: Implement BenefitChips Component**
  - Create `web/src/components/BenefitChips.tsx`:
    - Display detected benefits as MUI Chips
    - Must-have benefits include checkmark icon + "Must-have" accessible label
    - Color not sole differentiator (icon + label convey must-have status)
  - Write component test
  - **Traces:** FR8, FR9.1 (benefit chips), NFR3.4 (use of color)

- [ ] **Step 32: Implement ScoreBreakdown Component**
  - Create `web/src/components/ScoreBreakdown.tsx`:
    - MUI `Table` with columns: Factor, Weight, Score, Points, Detail
    - Rows for each active factor from `MatchResult.factors`
    - Footer row: Total match %
  - Write component test
  - **Traces:** FR7, FR9.2 (score breakdown in detail panel)

- [ ] **Step 33: Implement JobCard Component**
  - Create `web/src/components/JobCard.tsx`:
    - MUI `Card` with:
      - Company logo (if available)
      - Title (h3)
      - Company name
      - Match badge: `<Chip label="88% · Strong match">` (number + text level, color not sole indicator)
      - Employment type, salary (formatted "CUR min–max/period" or "Salary not listed")
      - Location (worldwide / countries / "Location flexible")
      - Benefit chips (max 5 visible, "+N more" button)
      - Source attribution (link)
    - `onClick` handler prop
    - `data-testid="job-card"` for test automation
  - Write component tests (render, verify content, onClick)
  - **Traces:** FR9.1 (job card display), NFR3.4 (use of color), NFR3.8 (target size)

- [ ] **Step 34: Run Accessibility Tests on JobCard**
  - Create `web/tests/a11y/JobCard.a11y.test.tsx`:
    - Render JobCard with sample job + match result
    - Run axe-core with WCAG 2.2 AA tags
    - Expect zero violations
  - **Traces:** NFR3, NFR6 (accessibility testing)

- [ ] **Step 35: Implement JobDetailPanel Component**
  - Create `web/src/components/JobDetailPanel.tsx`:
    - MUI `Drawer` (right side on large screens, full-screen on small) or `Dialog` (check responsive behavior)
    - Content:
      - Title (h2, dialog title for screen readers)
      - Company, match %, employment type, salary, location, published date
      - Score breakdown table (ScoreBreakdown component)
      - Detected benefits with evidence quotes (expandable)
      - Description (plain text from `descriptionText`, never `dangerouslySetInnerHTML`)
      - Apply button: primary MUI `Button`, opens `applyUrl` in new tab, "(opens in new tab)" label
      - Source attribution (SourceAttribution component)
    - Close with Esc key
    - Focus management: focus trap inside panel, restore focus to trigger card on close
  - Write component tests (render, close with Esc, Apply button)
  - **Traces:** FR9.2 (job detail panel), NFR3.2 (keyboard Esc), NFR3.7 (links), NFR4 (no dangerouslySetInnerHTML)

- [ ] **Step 36: Run Accessibility Tests on JobDetailPanel**
  - Create `web/tests/a11y/JobDetailPanel.a11y.test.tsx`:
    - Render JobDetailPanel open with sample job
    - Run axe-core
    - Expect zero violations
  - **Traces:** NFR3, NFR6

### Phase 13: UI Components — Job List

- [ ] **Step 37: Implement JobList Component**
  - Create `web/src/components/JobList.tsx`:
    - Render array of `Job & { match: MatchResult }` as JobCard components
    - Sort and filter controls:
      - Sort: select (match %, newest, salary)
      - Min match % slider (0–100)
      - Source toggles (Himalayas, Remotive)
      - "Salary known only" switch
    - "Show excluded (n)" button (if excluded.length > 0) → reveal excluded jobs with reasons
    - Empty state: "No jobs match your criteria" with Reset button
    - Loading state: 6 MUI Skeleton cards, `aria-busy="true"`, LiveAnnouncer "Loading jobs"
    - Total failure state: error card with Retry button
    - Partial failure: SourceStatusBanner + available jobs
  - Write component tests (render states, sorting, filtering)
  - **Traces:** FR6 (filtering), FR7 (sorting), FR9.4 (controls), FR9.5–FR9.8 (states), NFR3.6 (aria-busy, announcements)

### Phase 14: Main Dashboard Page

- [ ] **Step 38: Implement Dashboard Page**
  - Create `web/src/app/page.tsx`:
    - Client component (`'use client'`)
    - Layout:
      - `<header>` with h1 "AIventure – Job matches"
      - SkipLink
      - `<aside>` (large screens) or drawer (small screens) with CriteriaForm
      - `<main id="main">` with JobList, search input (TextField, max 100 chars, debounced 300 ms)
      - `<footer>` with API attribution links
    - State: criteria (from `useCriteria`), search query, selected job (for detail panel)
    - Fetch `/api/jobs?q=${query}` on mount and when query changes
    - Pass criteria to `rankJobs` (client-side re-ranking)
    - Responsive: drawer for criteria on small screens (<= 960px), full-screen detail panel on small screens
    - Reduced motion: disable skeleton wave animation if `prefers-reduced-motion: reduce`
  - **Traces:** FR9, FR10 (search), NFR3 (semantic HTML, landmarks), NFR3.1 (headings), NFR5 (responsive)

- [ ] **Step 39: Run Accessibility Tests on Dashboard**
  - Create `web/tests/a11y/Dashboard.a11y.test.tsx`:
    - Render full dashboard (mock `/api/jobs`)
    - Run axe-core with WCAG 2.2 AA tags
    - Expect zero violations
  - **Traces:** NFR3, NFR6

- [ ] **Step 40: Manual Accessibility Verification**
  - Test keyboard navigation: Tab through all interactive elements, verify focus order follows visual order, no keyboard traps
  - Test with screen reader (NVDA + Chrome recommended):
    - Headings announced correctly (h1, h2 for sections, h3 per job)
    - Landmarks announced (header, aside, main, footer)
    - Card names announced (job title + company)
    - Live announcements work (result count updates)
    - Dialog title announced when detail panel opens
  - Test at 320px width and 200% zoom: no horizontal scroll, no clipped text
  - Test with OS "reduce motion" on: skeleton wave and slide transitions disabled
  - **Traces:** NFR3 (full WCAG AA conformance), NFR3.2 (keyboard), NFR3.6 (screen reader), NFR5 (responsive)

### Phase 15: Environment Configuration

- [ ] **Step 41: Create .env.example**
  - Create `web/.env.example` with:
    - `HIMALAYAS_API_KEY=` (optional)
    - `CACHE_TTL_SECONDS=21600`
    - `HIMALAYAS_MAX_PAGES=5`
  - Add note in README: copy to `.env.local` (git-ignored by Next.js)
  - **Traces:** FR1.1 (optional API key), FR4 (cache config), C1 (no NEXT_PUBLIC_ prefix)

### Phase 16: Documentation

- [ ] **Step 42: Update README (optional for MVP)**
  - Add "Getting Started" section: clone, `cd web`, `cp .env.example .env.local`, `npm install`, `npm run dev`, open http://localhost:3000
  - Add "Running Tests": `npm test`
  - Note: This is optional scaffolding documentation; SPEC.md is the authoritative build spec
  - **Traces:** Documentation for reproducibility

---

## Progress Tracking

Each checkbox above will be ticked `[x]` as the step is completed. The plan is approved as-is and implementation begins at Step 1.

---

## Deviations

- **Step 1:** `create-next-app@latest` installed Next.js **16.4.6** (not 15) with React 19.3. The layout therefore imports `@mui/material-nextjs/v16-appRouter`, as SPEC §12 directs ("match the import path to the installed Next.js major").
- **Step 2:** `test` script is `vitest --run` and `test:watch` is `vitest` (SPEC §12), not `vitest` / `vitest --ui`, so `npm test` runs once instead of watching. Added `@vitest/coverage-v8` (needed by the coverage command in unit-test-instructions.md) and `@testing-library/user-event` / `@testing-library/dom` (SPEC §12).
- **Step 4:** Theme follows the SPEC §10.5 palette and adds: `text.secondary #595959`, outlined-input and chip borders `#767676` (>= 3:1, WCAG 1.4.11), a `:focus-visible` ring, `scroll-padding-top`, and reduced-motion overrides in `CssBaseline`. Added `tests/theme.test.ts` checking these contrast ratios (test-after for the theme layer).
- **Step 5:** Deleted the scaffold's `globals.css` and `page.module.css` (SPEC §12: `CssBaseline` replaces them; `globals.css` also removed link underlines). Replaced the scaffold demo `page.tsx` with a minimal placeholder until Step 38. Font is Roboto via `next/font` (SPEC §12); page title set in `metadata` (SPEC §10.5).
