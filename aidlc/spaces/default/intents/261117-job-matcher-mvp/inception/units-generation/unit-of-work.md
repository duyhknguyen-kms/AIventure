# Unit of Work — AIventure

**Intent:** 261117-job-matcher-mvp  
**Stage:** units-generation  
**Date:** 2026-11-17  
**Lead:** Architect Agent  
**Scope:** MVP · `express` plan  
**Deployment model:** Monolithic Next.js application (`web/`) — all units deploy together as one process. Unit boundaries are logical (independently testable, independently understandable), not deployment boundaries.

---

## Unit Table

| Unit ID | Directory | Name | Kind | Complexity | Deployment |
|---|---|---|---|---|---|
| U1 | `u1-data-sources` | Data Sources & API | service | L | embedded |
| U2 | `u2-matching-engine` | Matching Engine | library | L | embedded |
| U3 | `u3-dashboard-core` | Dashboard Core | ui | M | embedded |
| U4 | `u4-criteria-form` | Criteria Form & Persistence | ui | M | embedded |
| U5 | `u5-detail-panel` | Job Detail Panel | ui | S | embedded |
| U6 | `u6-cv-scanner` | CV Scanner | ui | M | embedded |
| U7 | `u7-pagination-highlight` | Pagination, Highlight & Bugfixes | ui | S | embedded |

---

## Unit Specifications

### U1 · `u1-data-sources` — Data Sources & API
**Kind:** `service`  
**Complexity:** L  
**Deployment:** Embedded in Next.js server runtime

**Responsibilities:**
- Himalayas API adapter: cursor-paginated browse, search, Zod schema validation, `toJob()` normalization
- Remotive API adapter: full feed fetch, Zod schema validation, `toJob()` normalization
- Shared normalisation layer: employment type, seniority, timezone, HTML stripping, country names → alpha-2, location free-text parsing, salary text parsing + annualization
- Deduplication: `norm(company)+"|"+norm(title)` key; Himalayas wins; duplicate credited via `alsoOn`
- TTL cache: `globalThis.__aiventureCache`, in-flight dedupe, stale-on-error, 429 blocking
- `GET /api/jobs` route handler: Zod-validates `q`, calls `aggregateJobs()`, returns 200/400/502

**Boundaries:**
- Owns everything under `src/lib/sources/`, `src/lib/normalize/`, `src/lib/aggregate/`, and `src/app/api/jobs/`
- Exposes a single server-side function: `aggregateJobs({ q? }) → { jobs, sources, fetchedAt }`
- Exposes `Job` and `SourceStatus` types consumed by all other units

**Key constraints:**
- API keys server-side only — never in client code, URLs, or logs
- Remotive: max ~4 upstream calls/day → full feed once per 6 h cache window, `q` filtered locally
- No `dangerouslySetInnerHTML` — HTML stripped to plain text before it leaves this unit
- `cacheComponents: false` in `next.config.ts` (incompatible with `runtime=nodejs` on route)

---

### U2 · `u2-matching-engine` — Matching Engine
**Kind:** `library`  
**Complexity:** L  
**Deployment:** Runs in-browser (client-side); functions are pure and can also run server-side

**Responsibilities:**
- `Criteria` schema (Zod) + `DEFAULT_CRITERIA` + `CRITERIA_STORAGE_KEY`
- Benefit detection: 9-entry regex dictionary over `descriptionText + excerpt`; evidence snippets ±60 chars
- Hard filters: F1 location (worldwide/country/region/uncertain), F2 excluded keywords (word-boundary + hyphen-normalised), F3 salary floor
- 7-factor weighted scorer: skills (30), title (20), salary (15), benefits (15), seniority (10), employment (5), timezone (5)
- `scoreJob(job, criteria) → MatchResult`; `rankJobs(jobs, criteria) → { ranked, excluded }`

**Boundaries:**
- Owns everything under `src/lib/matching/`
- Consumes `Job` from U1 and `Criteria` from itself
- No I/O of any kind — pure functions, testable without mocks

**Key constraints:**
- Inactive factors excluded from denominator: empty criteria → 100% for all jobs
- §7.5 golden test = 88% — the scoring formula is locked by this test
- Hyphen normalisation: "on-site" and "on site" treated identically
- `company` included in `haystack()` so company-name keywords score correctly

---

### U3 · `u3-dashboard-core` — Dashboard Core
**Kind:** `ui`  
**Complexity:** M  
**Deployment:** Client component (browser)

**Responsibilities:**
- `src/app/page.tsx` — shell: `fetch("/api/jobs")`, re-ranks with `rankJobs` on every criteria change, loading/error/partial-fail states
- `JobCard` — Avatar initials, match badge (number + text + colour; hidden when no active criteria), benefit chips, source attribution
- `JobList` — sort (match/newest/salary), 6 skeleton cards, excluded toggle
- `BenefitChips` — filled+check for must-haves, outlined for detected, missing shown
- `SourceAttribution` — `aria-label` with "(opens in new tab)"
- `SourceStatusBanner` — `role="alert"`, shown only on `ok === false` (not normal cache hits)
- `SkipLink`, `LiveAnnouncer` — WCAG keyboard + screen-reader support

**Boundaries:**
- Owns `src/app/page.tsx` and `src/components/{JobCard,JobList,BenefitChips,SourceAttribution,SourceStatusBanner,SkipLink,LiveAnnouncer}.tsx`
- Consumes `Job` + `SourceStatus` from U1; `MatchResult` from U2
- Renders data, never fetches directly (except the initial `GET /api/jobs`)

**Key constraints:**
- `SourceAttribution` must live outside `CardActionArea` — link nested in button = axe `nested-interactive` violation
- Match badge hidden when `match.factors.every(f => !f.active)` (US-01 bugfix)
- Match level = number + text + colour — never colour alone (WCAG 1.4.1)

---

### U4 · `u4-criteria-form` — Criteria Form & Persistence
**Kind:** `ui`  
**Complexity:** M  
**Deployment:** Client component (browser)

**Responsibilities:**
- `CriteriaForm` — chip Autocomplete (keywords/titles/excluded), seniority+employment checkboxes in `fieldset`+`legend`, salary+currency pair, country Autocomplete, UTC offset Select, benefit checkboxes, Reset with confirmation Dialog
- `useCriteria` hook — SSR-safe localStorage read on mount; Zod-validates on load; falls back to `DEFAULT_CRITERIA`; debounced 300 ms write

**Boundaries:**
- Owns `src/components/CriteriaForm.tsx` and `src/hooks/useCriteria.ts`
- Consumes `Criteria` schema from U2
- Provides `criteria` state to `page.tsx` for re-ranking

**Key constraints:**
- MUI v9 API: `renderTags` → `renderValue`; `inputProps` → `slotProps.htmlInput`; `PaperProps` → `slotProps.paper`
- Every input has a visible label; grouped controls use `fieldset` + `legend` (WCAG 1.3.1)
- Mobile: form moves into a `Drawer` opened from the AppBar (< md breakpoint)

---

### U5 · `u5-detail-panel` — Job Detail Panel
**Kind:** `ui`  
**Complexity:** S  
**Deployment:** Client component (browser)

**Responsibilities:**
- `JobDetailPanel` — `Dialog` with `aria-labelledby`, close `aria-label="Close job details"`, Apply `<a>` with "(opens in new tab)", plain-text description (`whiteSpace: pre-line`), `alsoOn` links
- `ScoreBreakdown` — `<Table>` with `<caption>`, `LinearProgress` per factor, inactive factors show "not set" text (not just greyed out)

**Boundaries:**
- Owns `src/components/{JobDetailPanel,ScoreBreakdown}.tsx`
- Consumes `Job` from U1 and `MatchResult` from U2
- Opens from card click in U3

**Key constraints:**
- Description as plain text only — `dangerouslySetInnerHTML` forbidden (Remotive HTML is untrusted)
- Apply uses `job.applyUrl` from the API, never rebuilt or replaced
- Esc closes dialog; focus returns to the opening card (MUI Dialog default)

---

### U6 · `u6-cv-scanner` — CV Scanner
**Kind:** `ui`  
**Complexity:** M  
**Deployment:** Client-only (browser — file never reaches server)

**Responsibilities:**
- `parseCv(file)` — PDF via `pdfjs-dist` (WebWorker, dynamically imported), DOCX via `mammoth` (dynamically imported); max 5 MB; descriptive errors for scanned/encrypted PDFs
- `extractCriteria(text)` — skills from ~120-entry dictionary, job titles from label+date-range heuristics, seniority from title regex + years-of-experience
- `mergeExtracted(current, extracted)` — append-only, existing criteria never overwritten
- `CvScanner` — file picker, spinner, preview Dialog with per-item checkboxes, "Apply to criteria" button

**Boundaries:**
- Owns `src/lib/cv/` and `src/components/CvScanner.tsx`
- Mounted at top of CriteriaForm (U4)
- Writes into `criteria` state via `onChange` from `useCriteria`

**Key constraints:**
- Dynamic imports only — pdfjs-dist and mammoth must NOT appear in the initial bundle
- File never leaves the browser — no server endpoint, no storage
- Preview Dialog lets users deselect any item before applying

---

### U7 · `u7-pagination-highlight` — Pagination, Highlight & Bugfixes
**Kind:** `ui`  
**Complexity:** S  
**Deployment:** Client component (browser)

**Responsibilities:**
- Pagination: `PAGE_SIZE = 10`, MUI `Pagination`, page reset on `ranked` change or sort change, `onAnnounce` for `LiveAnnouncer` ("Page 2 of 7, showing jobs 11–20")
- `HighlightText` — splits text into plain/match/warn segments; word-boundary + hyphen-normalised; `<mark>` background + bold; visually-hidden "Contains highlighted matches" for screen readers
- Wires `keywords`, `targetTitles`, `excludedKeywords` from `page.tsx` through `JobList` → `JobCard` → `JobDetailPanel`
- Match badge hidden when no criteria active (bugfix in U3; regression tests in this unit)

**Boundaries:**
- Owns `src/components/HighlightText.tsx`
- Updates to `src/components/JobList.tsx` (pagination)
- Updates to `src/components/JobCard.tsx` and `JobDetailPanel.tsx` (highlight wiring)

**Key constraints:**
- Highlight regex uses same word-boundary + hyphen-normalisation as `filters.ts` — must stay in sync
- `<mark>` uses background + bold (not colour alone) — WCAG 1.4.1
- Excluded keywords highlighted in red (`error.light`)

---

## Deployment Model

All units deploy as a single Next.js process. The `service` designation for U1 reflects that it owns the server-side `GET /api/jobs` route; `library` for U2 reflects that it is pure functions with no server-side runtime; `ui` for U3–U7 reflects that they are React client components.

No unit is independently deployable in this PoC. The boundary distinction matters for:
1. Construction sequencing (U1 and U2 have no dependencies — can be built first and in parallel)
2. Test isolation (U2's pure functions are tested without U1 or any browser environment)
3. Responsibilities (each unit has a clear owner and a clear surface area)
