# Requirements Analysis

**Stage:** requirements-analysis  
**Intent:** 261117-job-matcher-mvp  
**Date:** 2026-11-17

---

## Intent Analysis

AIventure is a 2-day PoC MVP that automates remote job discovery and matching by:
1. Aggregating job listings from multiple public APIs (Himalayas, Remotive)
2. Normalizing heterogeneous data into a unified model
3. Scoring jobs against user-defined criteria using deterministic algorithms
4. Presenting ranked recommendations through an accessible dashboard

The user seeks to eliminate manual job-board browsing by automatically surfacing the best-fit opportunities based on skills, preferences, and requirements.

---

## Functional Requirements

### FR1: Multi-Source Job Aggregation
**Description:** The system shall fetch and aggregate remote job listings from Himalayas and Remotive public APIs.

**Acceptance Criteria:**
- **Given** the system initializes
- **When** `/api/jobs` is called
- **Then** jobs from both Himalayas (browse endpoint, up to 5 pages of 20 jobs) and Remotive (full feed) are fetched in parallel

#### FR1.1: Himalayas API Integration
**Description:** The system shall integrate with the Himalayas Remote Jobs API using cursor-based pagination.

**Acceptance Criteria:**
- **Given** a request for jobs
- **When** fetching from Himalayas
- **Then** the system fetches up to `HIMALAYAS_MAX_PAGES` pages (default 5) using cursor pagination
- **And** the optional `HIMALAYAS_API_KEY` is used as a Bearer token if present
- **And** 429 rate-limit responses with `Retry-After` are handled without tight retry loops

#### FR1.2: Remotive API Integration
**Description:** The system shall integrate with the Remotive Remote Jobs API and cache the full feed.

**Acceptance Criteria:**
- **Given** a request for jobs
- **When** fetching from Remotive
- **Then** the full feed is fetched once per cache window
- **And** search filtering is applied locally rather than via repeated upstream calls

#### FR1.3: Partial-Failure Resilience
**Description:** The system shall return partial results when one source fails.

**Acceptance Criteria:**
- **Given** one source fails with an error
- **When** the other source succeeds
- **Then** the API returns `200` with jobs from the healthy source and `sources[].ok = false` for the failed source
- **And** the error message is included in the response

### FR2: Job Data Normalization
**Description:** The system shall normalize heterogeneous job data from multiple sources into a unified `Job` model.

**Acceptance Criteria:**
- **Given** raw job data from Himalayas or Remotive
- **When** processing the response
- **Then** all jobs are transformed into the `Job` interface with fields: `id`, `source`, `sourceId`, `title`, `company`, `companyLogo`, `applyUrl`, `sourceUrl`, `employmentType`, `seniority`, `salary`, `location`, `timezones`, `categories`, `tags`, `excerpt`, `descriptionHtml`, `descriptionText`, `publishedAt`, `expiresAt`, `alsoOn`
- **And** missing or unparseable optional fields are set to `null` without failing the entire job

#### FR2.1: Salary Parsing
**Description:** The system shall parse free-text salary strings (Remotive) into structured salary objects.

**Acceptance Criteria:**
- **Given** a salary string like "$170k - $200k" or "€60k" or "$50 - $70 /hr"
- **When** parsing the salary
- **Then** the system extracts `min`, `max`, `currency`, `period` and computes `annualMin`, `annualMax`
- **And** unparse able values (e.g., "Competitive", empty) return `null`
- **And** out-of-range values (< 1,000 or > 10,000,000 annual) return `null`

#### FR2.2: Location Parsing
**Description:** The system shall parse Remotive's free-text location strings into structured location objects.

**Acceptance Criteria:**
- **Given** a location string like "Worldwide", "USA, Canada", or "Europe"
- **When** parsing the location
- **Then** the system identifies `worldwide` boolean, `countries` array (ISO alpha-2), and `regions` array
- **And** unparseable locations are kept with `worldwide = false`, empty arrays, and the original text in `raw`

#### FR2.3: Employment Type Normalization
**Description:** The system shall normalize employment type values from both sources into a standard enum.

**Acceptance Criteria:**
- **Given** employment type values like "Full Time", "full_time", "Contractor", etc.
- **When** normalizing
- **Then** the system maps them to: `full_time`, `part_time`, `contract`, `temporary`, `internship`, `other`, or `null`

#### FR2.4: Seniority Normalization
**Description:** The system shall normalize seniority from Himalayas enums and infer it from Remotive job titles.

**Acceptance Criteria:**
- **Given** Himalayas `seniority` array or Remotive job title
- **When** normalizing
- **Then** Himalayas values are mapped to `entry`, `mid`, `senior`, `manager`, `director`, `executive`
- **And** Remotive titles are parsed with regex patterns to infer seniority
- **And** the result is an array of seniority levels (empty if unknown)

### FR3: Job Deduplication
**Description:** The system shall detect and merge duplicate jobs across sources.

**Acceptance Criteria:**
- **Given** jobs from both sources
- **When** a job appears in both (normalized company + title match)
- **Then** the Himalayas record is kept as the primary
- **And** the Remotive source is added to the primary job's `alsoOn` array with its URL

### FR4: Server-Side Caching
**Description:** The system shall cache aggregated job data in memory with a time-to-live (TTL).

**Acceptance Criteria:**
- **Given** a job data fetch
- **When** the same request is made within the TTL window (default 6 hours)
- **Then** cached data is returned without hitting upstream APIs
- **And** the `SourceStatus` indicates `cached: true`

#### FR4.1: Stale-On-Error Caching
**Description:** The system shall return stale cached data when a refresh fails.

**Acceptance Criteria:**
- **Given** cached data exists but is expired
- **When** an upstream refresh fails
- **Then** the stale data is returned with `cached: true` and the error noted in `SourceStatus.error`

#### FR4.2: Rate-Limit Backoff
**Description:** The system shall respect upstream rate limits and not retry in tight loops.

**Acceptance Criteria:**
- **Given** a 429 response with `Retry-After`
- **When** handling the error
- **Then** the source is blocked until the `Retry-After` time expires
- **And** subsequent requests within the block window return stale data or a failure status without retrying

### FR5: User Criteria Management
**Description:** Users shall define job-matching criteria that persist across sessions.

**Acceptance Criteria:**
- **Given** a user sets criteria (keywords, titles, excluded keywords, seniority, employment types, min salary, country, timezone, benefits)
- **When** the page reloads
- **Then** criteria are restored from `localStorage` under a versioned key (`aiventure.criteria.v1`)
- **And** invalid or missing criteria default to `DEFAULT_CRITERIA`

#### FR5.1: Criteria Editing
**Description:** Users shall edit criteria through a form with labeled inputs.

**Acceptance Criteria:**
- **Given** the criteria form
- **When** the user adds/removes keywords, changes seniority, or adjusts salary
- **Then** changes are debounced (300 ms) and saved to `localStorage`
- **And** the job list re-ranks immediately without a network request

### FR6: Job Filtering
**Description:** The system shall apply hard filters to exclude ineligible jobs before scoring.

**Acceptance Criteria:**
- **Given** user criteria
- **When** filtering jobs
- **Then** jobs are excluded if:
  - **F1 (Location):** user's country is not in `location.countries` or `location.regions`, and `location.worldwide` is false (unless location is unparseable)
  - **F2 (Excluded keywords):** any excluded keyword matches the job's title, tags, categories, or description
  - **F3 (Salary floor):** salary is known, currency matches, and `salary.annualMax` < user's `minSalary.amount`
- **And** excluded jobs are counted and can be revealed with a "Show excluded (n)" button

### FR7: Job Scoring & Ranking
**Description:** The system shall score each job 0–100 based on weighted factors and rank by match percentage.

**Acceptance Criteria:**
- **Given** a job and user criteria
- **When** scoring
- **Then** the system computes a weighted score from 7 factors: skills (30%), title (20%), seniority (10%), salary (15%), employment (5%), timezone (5%), benefits (15%)
- **And** only active factors (those with non-empty criteria) contribute to the score
- **And** the final `matchPercent` is an integer 0–100
- **And** jobs are sorted by `matchPercent` descending, ties broken by `publishedAt` descending

#### FR7.1: Skills Factor
**Acceptance Criteria:**
- **Given** user-defined keywords
- **When** scoring the skills factor
- **Then** the score is `matchedKeywords / total keywords` where each keyword is checked with word boundaries in the job's title, tags, categories, and description

#### FR7.2: Title Factor
**Acceptance Criteria:**
- **Given** user-defined target titles
- **When** scoring the title factor
- **Then** score is 1.0 if any target phrase appears in the job title; otherwise the best token overlap ratio across all target titles

#### FR7.3: Seniority Factor
**Acceptance Criteria:**
- **Given** user-defined seniority preferences
- **When** scoring the seniority factor
- **Then** score is 1.0 if job seniority intersects with user preferences; 0.5 if the nearest level is 1 step away or job seniority is unknown; else 0

#### FR7.4: Salary Factor
**Acceptance Criteria:**
- **Given** user-defined minimum salary
- **When** scoring the salary factor
- **Then** score is 1.0 if `annualMin ≥ user amount`; 0.75 if user amount is between `annualMin` and `annualMax`; 0.5 if salary is unknown or currency differs

#### FR7.5: Employment Type Factor
**Acceptance Criteria:**
- **Given** user-defined employment type preferences
- **When** scoring
- **Then** score is 1.0 if job's type is in the list; 0.5 if null; else 0

#### FR7.6: Timezone Factor
**Acceptance Criteria:**
- **Given** user-defined timezone offset
- **When** scoring
- **Then** score is 1.0 if job accepts all timezones or contains a value within 0.5 h of user offset; 0.5 if nearest is within 2 h or timezones is unknown; else 0

#### FR7.7: Benefits Factor
**Acceptance Criteria:**
- **Given** user-defined must-have and nice-to-have benefits
- **When** scoring
- **Then** score is `(2 × mustFound + niceFound) / (2 × mustTotal + niceTotal)` where benefits are detected via keyword matching in the job description

### FR8: Benefit Detection
**Description:** The system shall automatically detect company benefits mentioned in job descriptions.

**Acceptance Criteria:**
- **Given** a job with `descriptionText` and optional `excerpt`
- **When** analyzing benefits
- **Then** the system detects up to 9 benefit categories (health, retirement, equity, PTO, parental leave, learning, home office, flexible hours, wellness) using regex patterns
- **And** each detected benefit includes up to 2 evidence snippets (±60 chars around the match)

#### FR8.1: HTML Stripping
**Acceptance Criteria:**
- **Given** `descriptionHtml`
- **When** converting to `descriptionText`
- **Then** `<br>`, `</p>`, and `</li>` are replaced with newlines; all other tags are removed; common entities are decoded; whitespace is collapsed

### FR9: Dashboard UI
**Description:** The system shall present a web dashboard showing ranked job recommendations.

**Acceptance Criteria:**
- **Given** a user visits the application
- **When** the dashboard loads
- **Then** jobs are displayed as cards with: title, company, logo, match %, employment type, salary, location, detected benefits, and source attribution
- **And** a criteria form is visible on large screens and in a drawer on small screens

#### FR9.1: Job Card Display
**Acceptance Criteria:**
- **Given** a ranked job
- **When** rendering the card
- **Then** the card shows: title (h3), company, match badge with both number and text level ("88% · Strong match"), salary formatted as "CUR min–max/period", benefit chips, and visible source credit linking to the job on its source site

#### FR9.2: Job Detail Panel
**Acceptance Criteria:**
- **Given** a user clicks a job card
- **When** the detail panel opens
- **Then** the panel shows: full job details, score breakdown table, detected benefits with evidence quotes, plain-text description, Apply button (opens `applyUrl` in new tab), and source attribution

#### FR9.3: Criteria Form
**Acceptance Criteria:**
- **Given** the criteria form
- **When** rendered
- **Then** inputs for keywords (chips), target titles (chips), excluded keywords (chips), seniority (multi-select), employment types (multi-select), minimum salary (number + currency select), country (select), timezone (select), must-have benefits (checkboxes), nice-to-have benefits (checkboxes), and Reset button are present and labeled

#### FR9.4: Sort & Filter Controls
**Acceptance Criteria:**
- **Given** the job list
- **When** controls are visible
- **Then** the user can sort by match % (default), newest, or salary; filter by minimum match % (slider), source toggle, and "salary known only" switch

#### FR9.5: Loading State
**Acceptance Criteria:**
- **Given** `/api/jobs` is pending
- **When** rendering
- **Then** 6 MUI `Skeleton` cards are shown
- **And** the results container has `aria-busy="true"`
- **And** "Loading jobs" is announced via `LiveAnnouncer`

#### FR9.6: Empty States
**Acceptance Criteria:**
- **Given** no jobs are returned
- **When** rendering
- **Then** "No jobs available right now" is shown with a Retry button

**And**
- **Given** all jobs are filtered out
- **When** rendering
- **Then** "No jobs match your criteria" is shown with "Show excluded (n)" and "Reset criteria" buttons

#### FR9.7: Partial Failure State
**Acceptance Criteria:**
- **Given** one source fails
- **When** rendering
- **Then** a `SourceStatusBanner` (MUI `Alert`) is shown naming the source and its error
- **And** jobs from the healthy source are displayed

#### FR9.8: Total Failure State
**Acceptance Criteria:**
- **Given** both sources fail and no cache exists
- **When** rendering
- **Then** an error card with per-source errors and a Retry button is shown

### FR10: Search
**Description:** Users shall search jobs by free-text query.

**Acceptance Criteria:**
- **Given** a search input
- **When** the user enters a query (max 100 chars)
- **Then** Himalayas search endpoint is called with the query
- **And** Remotive jobs are filtered locally by the query
- **And** invalid queries (> 100 chars) return `400 { error }`

---

## Non-Functional Requirements

### NFR1: Performance
**Target:** API response time < 2 seconds for 90% of requests when upstream APIs respond within 1 second

**Acceptance Criteria:**
- **Given** a job fetch request
- **When** both sources are healthy
- **Then** the response is returned in < 2 seconds

### NFR2: Availability
**Target:** The application remains functional when one source is unavailable

**Acceptance Criteria:**
- **Given** Remotive returns 429 or times out
- **When** fetching jobs
- **Then** the application serves Himalayas jobs only and displays a warning

### NFR3: Accessibility
**Target:** WCAG 2.2 Level AA conformance

**Acceptance Criteria:**
- **Given** the dashboard
- **When** tested with axe-core
- **Then** zero violations with `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa` rule tags

**And**
- **Given** keyboard-only navigation
- **When** a user tabs through the interface
- **Then** all interactive elements are reachable, focus order follows visual order, and focus is visible

**And**
- **Given** a screen reader (NVDA + Chrome/Firefox)
- **When** navigating the page
- **Then** headings, landmarks, card names, live announcements, and dialog titles are correctly announced

**And**
- **Given** 320 px viewport width or 200 % browser zoom
- **When** rendering
- **Then** no horizontal scroll occurs and no text is clipped

**And**
- **Given** OS "reduce motion" preference is on
- **When** rendering
- **Then** skeleton wave animations and slide transitions are disabled

#### NFR3.1: Semantic HTML
**Acceptance Criteria:**
- **Given** the page structure
- **When** rendering
- **Then** `<html lang="en">`, one `h1` ("AIventure – Job matches"), headings in order (`h2` for "Criteria" and "Results", `h3` per job title), and landmarks (`header`, `aside`, `main id="main"`, `footer`) are present

#### NFR3.2: Keyboard Navigation
**Acceptance Criteria:**
- **Given** keyboard-only interaction
- **When** using Tab, Enter, Space, and Esc
- **Then** all features work: job cards open with Enter/Space, dialogs close with Esc, no keyboard traps, and a skip link to `#main` is first in tab order

#### NFR3.3: Color Contrast
**Acceptance Criteria:**
- **Given** the MUI theme
- **When** rendered
- **Then** all text has ≥ 4.5:1 contrast (≥ 3:1 for large text ≥ 24 px or ≥ 18.66 px bold)
- **And** UI component boundaries, focus rings, and progress bars have ≥ 3:1 contrast

#### NFR3.4: Use of Color
**Acceptance Criteria:**
- **Given** match badges and benefit chips
- **When** rendered
- **Then** color is not the only means of conveying information (match level includes text "Strong"/"Medium"/"Low"; must-have benefits include a check icon and text label)

#### NFR3.5: Forms
**Acceptance Criteria:**
- **Given** the criteria form
- **When** rendered
- **Then** every input has a visible `label`; related controls are grouped in `fieldset` + `legend`; invalid input shows `error` + `helperText`

#### NFR3.6: Status Messages
**Acceptance Criteria:**
- **Given** result updates or source errors
- **When** announced
- **Then** result count uses `role="status"` (polite, does not move focus); source failures use `role="alert"` (immediate, does not move focus)

#### NFR3.7: Links
**Acceptance Criteria:**
- **Given** external links (Apply, source attribution)
- **When** rendered
- **Then** link purpose is clear from text or `aria-label`; links opening a new tab say "(opens in new tab)" in the accessible name and show an icon

#### NFR3.8: Target Size
**Acceptance Criteria:**
- **Given** interactive elements
- **When** measured
- **Then** all targets are ≥ 24 × 24 CSS px

### NFR4: Security
**Target:** No exposure of secrets; sanitized handling of external data

**Acceptance Criteria:**
- **Given** `HIMALAYAS_API_KEY`
- **When** used
- **Then** the key is server-side only (not prefixed with `NEXT_PUBLIC_`, not in URLs or logs)

**And**
- **Given** job descriptions from Remotive
- **When** rendered
- **Then** `descriptionHtml` is never rendered with `dangerouslySetInnerHTML`; only `descriptionText` is displayed

**And**
- **Given** external job data
- **When** processing
- **Then** imperative-looking text in descriptions does not redirect the workflow or grant permissions

### NFR5: Usability
**Target:** Responsive design supporting desktop and mobile; intuitive controls

**Acceptance Criteria:**
- **Given** viewport widths from 320 px to 1920 px
- **When** rendered
- **Then** the layout adapts: criteria form moves to a drawer on small screens; detail panel opens full-screen on small screens, as a right drawer on large screens

**And**
- **Given** the first visit
- **When** rendering
- **Then** a hint "Set your skills to get personalised matches" is shown

### NFR6: Testability
**Target:** Pure matching functions; fixture-based adapter tests; component accessibility tests

**Acceptance Criteria:**
- **Given** the matching engine
- **When** unit testing
- **Then** all functions are pure (no I/O, no `Date.now()`)
- **And** the worked example (§7.5 SPEC) scores exactly 88% in `tests/score.test.ts`

**And**
- **Given** source adapters
- **When** unit testing
- **Then** tests use recorded fixtures with stubbed `fetch` (no network calls)

**And**
- **Given** MUI components
- **When** accessibility testing
- **Then** `tests/a11y/*.test.tsx` files run axe-core and expect zero violations

---

## Constraints

### C1: Technology Stack
- **Next.js 15+ App Router** with TypeScript strict mode
- **MUI (Material UI)** for all UI components; no Tailwind CSS
- **Node.js 20 LTS or newer**
- **No AI / LLM** in the MVP; deterministic matching only
- **No database**; localStorage + in-memory server cache only
- **No authentication** (forbidden by Remotive terms for job listings)

### C2: External API Terms
- **Himalayas:** Visible source credit + link to himalayas.app; Apply uses `applicationLink`; no redistribution to other aggregators
- **Remotive:** Link back to job URL + mention Remotive as source; no signup/email gates; max ~4 calls/day; jobs delayed 24 h; no submission to third-party sites

### C3: Timeline
- **2-day PoC MVP** with 8 build tasks split over Day 1 (data + engine) and Day 2 (UI + polish)

### C4: App Folder
- Next.js app lives in `web/` subfolder because the repo root holds AI-DLC files

---

## Assumptions

### A1: API Stability
**Assumption:** Himalayas and Remotive API schemas remain stable during the 2-day development window.  
**Rationale:** No versioning info in their docs; the spec marks Remotive details "to verify on first call."  
**Risk:** Schema changes could break adapters.  
**Owner:** Developer (verify field presence on first real call; adjust Zod schemas if needed)

### A2: Feed Size
**Assumption:** Himalayas provides ≥ 50 jobs within 5 pages, and Remotive's feed is < 100 jobs.  
**Rationale:** A 2026-11-17 check found 17 Remotive jobs and Himalayas pagination supports 20/page.  
**Risk:** Fewer than 50 total jobs fails success criterion S2.  
**Owner:** Developer (increase `HIMALAYAS_MAX_PAGES` if needed)

### A3: Browser Support
**Assumption:** The application targets evergreen browsers (Chrome, Firefox, Safari, Edge) supporting ES2020+ and CSS Grid.  
**Rationale:** Next.js 15 + MUI modern requirements.  
**Risk:** Older browsers (IE11, legacy mobile browsers) may not work.  
**Owner:** Out of scope for MVP

### A4: Locale
**Assumption:** All UI text and job data are in English; no i18n in MVP.  
**Rationale:** Both APIs serve primarily English-language jobs.  
**Risk:** Non-English job descriptions may not match benefit keywords.  
**Owner:** Post-MVP (benefit dictionary localization)

### A5: Currency
**Assumption:** No currency conversion; salary comparison only works when currencies match.  
**Rationale:** MVP avoids exchange rate APIs.  
**Risk:** Jobs in different currencies score 0.5 on salary factor regardless of actual value.  
**Owner:** Post-MVP enhancement (listed in open items)

### A6: Deployment
**Assumption:** The PoC runs locally (`npm run dev`); no production deployment in MVP.  
**Rationale:** 2-day timeline focuses on functionality.  
**Risk:** Production deployment may reveal issues (CORS, environment variables, build optimizations).  
**Owner:** Post-MVP

---

## Out of Scope

### OS1: AI/LLM Integration
Semantic skill matching, LLM-based benefit extraction, and "why this matches" explanations are **post-MVP**. The MVP uses deterministic keyword matching and scoring only.

### OS2: Authentication & User Accounts
No login, no multi-user support, no user profiles. Criteria are stored in browser localStorage only.

### OS3: Database Persistence
No persistent storage. Jobs are cached in server memory; criteria in localStorage. Multi-profile support and SQLite are **post-MVP**.

### OS4: Currency Conversion
No exchange-rate API integration. Salary comparison across currencies scores 0.5 (unknown equivalent).

### OS5: Job Alerts
No email notifications or job-alert subscriptions.

### OS6: Redistribution
No RSS feeds, no JSON feeds for third parties, no `JobPosting` structured data, no sitemap of job pages (forbidden by both API terms).

### OS7: HTML Scraping
Only official JSON APIs are used. No web scraping of job-board HTML.

### OS8: "Still Open?" Check
The optional Himalayas single-job endpoint (`GET /companies/:company/jobs/:slug` → 410 if closed) is **post-MVP**.

### OS9: Production Deployment
No CI/CD pipeline, no hosting configuration. The PoC runs locally only.

---

## Open Questions

### OQ1: Remotive API Verification
**Question:** Does the Remotive API honor the `limit` parameter? (A test call with `limit=1` returned all 17 jobs.)  
**Impact:** Affects whether partial-feed fetches are possible or if we always get the full feed.  
**Resolution:** Verify on first real call in Task 3.

### OQ2: Himalayas Timezone Format
**Question:** What is the exact format of `timezoneRestrictions` strings? (e.g., "+3", "UTC+03:00", or "+03:00"?)  
**Impact:** Affects timezone parsing logic in `normalize/timezone.ts`.  
**Resolution:** Verify against the first recorded fixture in Task 2.

### OQ3: Himalayas `salaryPeriod` Presence
**Question:** Is `salaryPeriod` always present when salary is known, or can it be null?  
**Impact:** Affects the default fallback to "annual" in the adapter.  
**Resolution:** Verify against the first recorded fixture in Task 2.

### OQ4: Free Himalayas API Key
**Question:** Should we request a free Himalayas API key for higher rate limits (60 req/min, 10,000/day)?  
**Impact:** Reduces risk of hitting public rate limits during development and demo.  
**Resolution:** Decide before the demo (open item O3).

### OQ5: Remotive Field Optionality
**Question:** Which Remotive fields are optional? (e.g., can `company_logo`, `salary`, `candidate_required_location` be absent?)  
**Impact:** Affects Zod schema `.nullish()` vs `.optional()` declarations.  
**Resolution:** Verify on first real call in Task 3.

---

## Traceability Note

This document defines requirements with stable IDs (`FR{n}`, `FR{n}.{m}`, `NFR{n}`). Downstream stages (User Stories, if added; Code Generation) must preserve these IDs exactly for traceability. The traceability matrix is recorded separately in `traceability.json`.
