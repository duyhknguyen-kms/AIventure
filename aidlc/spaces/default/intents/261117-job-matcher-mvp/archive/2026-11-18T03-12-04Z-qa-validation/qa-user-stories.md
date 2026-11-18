# QA-Ready User Stories

**Project:** AIventure — AI-Powered Job Matching Platform  
**Stage:** QA Validation & Test Planning  
**Date:** 2026-11-17  
**Source:** `inception/requirements-analysis/requirements.md`

---

## Group 1: Job Aggregation

### QA-US-001 — Multi-source job fetch
**Source:** FR1  
*As a job seeker, I want the system to fetch jobs from both Himalayas and Remotive in parallel so that I see the widest possible set of opportunities.*

**Acceptance Criteria:**
- Given the system receives a request for `/api/jobs`
- When both APIs are reachable
- Then jobs from both sources are present in the response within 2 seconds

**Testability note:** Covered by `route.jobs.test.ts` (stubbed fetch).

---

### QA-US-002 — Himalayas cursor pagination
**Source:** FR1.1  
*As a job seeker, I want the system to page through Himalayas results so that more than 20 jobs are available.*

**Acceptance Criteria:**
- Given `HIMALAYAS_MAX_PAGES = 5`
- When fetching from Himalayas
- Then up to 5 pages of 20 jobs are requested using cursor pagination
- And a 429 response with `Retry-After` is not retried within the block window

**Testability note:** Covered by `sources.himalayas.test.ts`.

---

### QA-US-003 — Remotive feed caching
**Source:** FR1.2  
*As a job seeker, I want the Remotive feed fetched once per cache window so that the application does not spam the API.*

**Acceptance Criteria:**
- Given the cache is fresh (within TTL)
- When `/api/jobs` is called again
- Then no new upstream call to Remotive is made
- And `SourceStatus.cached = true`

**Testability note:** Covered by `aggregate.test.ts`.

---

### QA-US-004 — Partial source failure resilience
**Source:** FR1.3  
*As a job seeker, I want to still see jobs when one source fails so that a single API outage does not leave me with nothing.*

**Acceptance Criteria:**
- Given Remotive returns a 5xx error
- When `/api/jobs` is called
- Then the response status is 200
- And it contains jobs from Himalayas
- And `sources[remotive].ok = false` with an error message

**Testability note:** Covered by `aggregate.test.ts`.

---

## Group 2: Data Normalization

### QA-US-005 — Unified Job model
**Source:** FR2  
*As a developer, I want all jobs mapped to a consistent `Job` interface so that the matching engine and UI work with predictable data.*

**Acceptance Criteria:**
- Given raw data from either source
- When normalized
- Then the `Job` object contains all required fields: `id`, `source`, `title`, `company`, `applyUrl`, `employmentType`, `seniority`, `salary`, `location`, `timezones`, `categories`, `tags`, `publishedAt`
- And missing optional fields are `null`, not undefined or missing keys

**Testability note:** Covered by `normalize.test.ts`, `sources.himalayas.test.ts`, `sources.remotive.test.ts`.

---

### QA-US-006 — Salary parsing
**Source:** FR2.1  
*As a job seeker, I want salary strings like "$170k–$200k" parsed into min/max/currency so that I can filter by minimum salary.*

**Acceptance Criteria:**
- Given a salary string `"$170k - $200k"`
- When parsed
- Then `min=170000, max=200000, currency="USD", period="annual"` are returned
- And strings like "Competitive" or "" return `null`
- And values outside 1,000–10,000,000 annual return `null`

**Testability note:** Covered by `salary.test.ts` (19 tests, 0 failures).

---

### QA-US-007 — Location parsing
**Source:** FR2.2  
*As a job seeker, I want location strings parsed into structured country/region data so that the location filter works.*

**Acceptance Criteria:**
- Given `"USA, Canada"`
- When parsed
- Then `countries = ["US","CA"]`, `worldwide = false`
- And `"Worldwide"` → `worldwide = true`
- And unparseable strings → `worldwide = false`, empty arrays, original text in `raw`

**Testability note:** Covered by `normalize.test.ts`.

---

### QA-US-008 — Employment type normalization
**Source:** FR2.3  
*As a job seeker, I want free-text employment types normalized to an enum so that filters work across both sources.*

**Acceptance Criteria:**
- Given `"Full Time"` or `"full_time"`
- When normalized
- Then the value is `"full_time"`
- And unknown values map to `"other"` or `null`

**Testability note:** Covered by `normalize.test.ts`.

---

### QA-US-009 — Seniority normalization
**Source:** FR2.4  
*As a job seeker, I want seniority normalized from multiple formats so that the seniority filter works across sources.*

**Acceptance Criteria:**
- Given a Himalayas seniority array `["senior"]`
- When normalized
- Then the result is `["senior"]`
- And a Remotive title containing "Senior" infers `["senior"]`
- And unknown titles return `[]`

**Testability note:** Covered by `normalize.test.ts`.

---

## Group 3: Deduplication & Caching

### QA-US-010 — Cross-source deduplication
**Source:** FR3  
*As a job seeker, I want duplicate jobs from both sources merged into one so that I do not see the same job twice.*

**Acceptance Criteria:**
- Given the same job appears on both Himalayas and Remotive
- When deduplicated
- Then only one record appears (Himalayas primary)
- And the Remotive URL is added to `alsoOn`

**Testability note:** Covered by `aggregate.test.ts`.

---

### QA-US-011 — Stale cache on upstream failure
**Source:** FR4.1  
*As a job seeker, I want stale cached data served when a refresh fails so that the site remains functional despite transient API issues.*

**Acceptance Criteria:**
- Given cached data exists but is expired
- When an upstream refresh fails
- Then stale data is returned
- And `SourceStatus.cached = true` with the error noted

**Testability note:** Covered by `aggregate.test.ts`.

---

## Group 4: User Criteria

### QA-US-012 — Criteria persistence across page loads
**Source:** FR5  
*As a job seeker, I want my criteria saved to localStorage so that I do not have to re-enter them every time.*

**Acceptance Criteria:**
- Given I set skills, titles, and salary criteria
- When I reload the page
- Then the same criteria are restored
- And missing or malformed stored values default to `DEFAULT_CRITERIA`

**Testability note:** Partially covered by `a11y/CriteriaForm.a11y.test.tsx`; direct localStorage round-trip not tested.  
**Gap:** No unit test for `localStorage` persistence round-trip.

---

### QA-US-013 — Criteria debounce and re-rank
**Source:** FR5.1  
*As a job seeker, I want the job list to re-rank immediately when I update criteria so that I get instant feedback.*

**Acceptance Criteria:**
- Given I change a keyword in the criteria form
- When 300 ms elapse
- Then the job list re-ranks without a network request
- And criteria are saved to localStorage

**Testability note:** Not covered by automated tests.  
**Gap:** No integration test for debounced re-rank behaviour.

---

## Group 5: Filtering

### QA-US-014 — Location filter (F1)
**Source:** FR6  
*As a job seeker, I want jobs outside my country excluded so that I only see jobs I am eligible for.*

**Acceptance Criteria:**
- Given my country is `"AU"` and a job restricts to `["US","CA"]`
- When filtered
- Then the job is excluded
- And the excluded count is shown with "Show excluded (n)"

**Testability note:** Covered by `filters.test.ts`.

---

### QA-US-015 — Excluded keyword filter (F2)
**Source:** FR6  
*As a job seeker, I want jobs with excluded keywords removed so that I do not see roles I cannot do.*

**Acceptance Criteria:**
- Given I exclude the keyword `"PHP"`
- When a job's title or description contains `"PHP"`
- Then it is excluded

**Testability note:** Covered by `filters.test.ts`.

---

### QA-US-016 — Salary floor filter (F3)
**Source:** FR6  
*As a job seeker, I want jobs below my minimum salary excluded so that I only see adequately compensated roles.*

**Acceptance Criteria:**
- Given my minimum salary is `$120,000 USD annual`
- When a job has `annualMax < $120,000` in USD
- Then it is excluded
- And jobs with unknown salary or different currency are NOT excluded

**Testability note:** Covered by `filters.test.ts`.

---

## Group 6: Scoring

### QA-US-017 — Composite job scoring
**Source:** FR7  
*As a job seeker, I want jobs ranked 0–100 by how well they match my criteria so that the best matches appear first.*

**Acceptance Criteria:**
- Given active criteria (skills, titles, seniority, salary, employment, timezone, benefits)
- When scoring
- Then each job receives a `matchPercent` integer 0–100
- And only active factors contribute
- And jobs are sorted descending by `matchPercent`, ties broken by `publishedAt`

**Testability note:** Covered by `score.test.ts` (golden test §7.5 = 88%).

---

### QA-US-018 — Skills factor (FR7.1)
**Source:** FR7.1  
*As a job seeker, I want keyword matching to use word boundaries so that "React" does not match "Reactive".*

**Testability note:** Covered by `score.test.ts`.

---

### QA-US-019 — Salary factor (FR7.4)
**Source:** FR7.4  
*As a job seeker, I want salary factor scores to grade from full to partial so that borderline-salary jobs still rank reasonably.*

**Testability note:** Covered by `score.test.ts`.

---

## Group 7: Benefit Detection

### QA-US-020 — Benefit detection
**Source:** FR8  
*As a job seeker, I want benefits extracted from job descriptions so that I can see at a glance what a role offers.*

**Acceptance Criteria:**
- Given a job description containing "health insurance", "equity", "home office"
- When analysed
- Then `health`, `equity`, `homeOffice` are detected with up to 2 evidence snippets each

**Testability note:** Covered by `benefits.test.ts`.

---

## Group 8: UI

### QA-US-021 — Dashboard loading state
**Source:** FR9.5  
*As a job seeker, I want to see skeleton cards while jobs load so that the page does not appear broken.*

**Testability note:** Covered by `a11y/Dashboard.a11y.test.tsx` (jsdom).  
**Gap:** Not tested in a real browser.

---

### QA-US-022 — Partial source failure banner
**Source:** FR9.7  
*As a job seeker, I want a warning shown when one source fails so that I know the results are incomplete.*

**Testability note:** Covered by `a11y/Dashboard.a11y.test.tsx`.

---

### QA-US-023 — Job detail panel
**Source:** FR9.2  
*As a job seeker, I want to click a job and see full details, score breakdown, and an Apply button so that I can act on a match.*

**Testability note:** Covered by `a11y/JobDetailPanel.a11y.test.tsx` (focus, Esc, Apply label).

---

## Group 9: Accessibility

### QA-US-024 — Zero axe violations
**Source:** NFR3  
*As a user with assistive technology, I want the application to have zero axe-core violations so that I can use it with a screen reader.*

**Testability note:** Covered by all 4 `a11y/*.test.tsx` suites (0 violations).

---

### QA-US-025 — Keyboard navigation
**Source:** NFR3.2  
*As a keyboard-only user, I want all features reachable by Tab/Enter/Esc so that I do not need a mouse.*

**Testability note:** Partially covered by `a11y/*.test.tsx` (jsdom).  
**Gap:** Not validated with a real browser and keyboard.

---

## Flagged items (untestable or ambiguous acceptance criteria)

| ID | Issue |
|---|---|
| FR5 | No automated test for localStorage round-trip across a real page reload |
| FR5.1 | No automated test for 300 ms debounce timing |
| NFR1 | No load/performance test executed; `< 2 s` target is unverified beyond mocked tests |
| NFR3.2 | Keyboard navigation tested only in jsdom, not a real browser |
| OQ1–OQ5 | Open questions from requirements doc not resolved in test suite |
