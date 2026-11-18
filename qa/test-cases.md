# Test Cases

**Project:** AIventure — AI-Powered Job Matching Platform  
**Stage:** QA Validation & Test Planning  
**Date:** 2026-11-17

Legend:  
- **Status:** Pass = covered and passing in `test-results.md` | Not Executed = no automated test | Covered (existing) = mapped to a named test

---

## Area: AGG — API Aggregation (FR1–FR1.3, FR4–FR4.2)

### TC-AGG-001 — Both sources return jobs on happy path
| Field | Value |
|---|---|
| Requirement | FR1 |
| Type | Integration |
| Preconditions | Both API mocks return valid job arrays |
| Steps | Call `GET /api/jobs` with stubbed fetch |
| Expected | Response 200; both sources in `sources[]` with `ok: true`; `jobs` array non-empty |
| Actual | 200, jobs present, sources ok (from `route.jobs.test.ts`) |
| Status | **Pass** (covered by `route.jobs.test.ts`) |

### TC-AGG-002 — Himalayas 429 triggers backoff (negative)
| Field | Value |
|---|---|
| Requirement | FR1.1, FR4.2 |
| Type | Unit |
| Preconditions | Himalayas mock returns 429 with `Retry-After: 60` |
| Steps | Call Himalayas adapter; check retry behaviour |
| Expected | No immediate retry; source blocked for 60 s; stale data returned |
| Actual | Covered (from `sources.himalayas.test.ts`) |
| Status | **Pass** |

### TC-AGG-003 — One source fails; partial results returned
| Field | Value |
|---|---|
| Requirement | FR1.3 |
| Type | Integration |
| Preconditions | Remotive mock returns 500; Himalayas mock returns valid jobs |
| Steps | Call `GET /api/jobs` |
| Expected | Status 200; `sources[remotive].ok = false` with error; Himalayas jobs present |
| Actual | Covered (from `aggregate.test.ts`) |
| Status | **Pass** |

### TC-AGG-004 — Both sources fail with no cache (edge case)
| Field | Value |
|---|---|
| Requirement | FR9.8 |
| Type | Integration |
| Preconditions | Both API mocks return errors; no cached data |
| Steps | Call `GET /api/jobs` |
| Expected | Error response or empty jobs array; both sources `ok: false` |
| Actual | Covered (from `route.jobs.test.ts` — 502 test) |
| Status | **Pass** |

### TC-AGG-005 — Stale cache served on refresh failure
| Field | Value |
|---|---|
| Requirement | FR4.1 |
| Type | Unit |
| Preconditions | Cache exists but is expired; next upstream call fails |
| Steps | Trigger cache expiry; call `GET /api/jobs` |
| Expected | Stale jobs returned; `SourceStatus.cached = true`; error noted |
| Actual | Covered (from `aggregate.test.ts`) |
| Status | **Pass** |

### TC-AGG-006 — Search query forwarded to Himalayas (FR10)
| Field | Value |
|---|---|
| Requirement | FR10 |
| Type | Integration |
| Preconditions | Valid query string <= 100 chars |
| Steps | Call `GET /api/jobs?q=react` |
| Expected | Himalayas adapter called with search endpoint; Remotive filtered locally |
| Actual | Covered (from `route.jobs.test.ts`) |
| Status | **Pass** |

### TC-AGG-007 — Search query > 100 chars returns 400
| Field | Value |
|---|---|
| Requirement | FR10 |
| Type | Negative |
| Preconditions | Query string of 101 characters |
| Steps | Call `GET /api/jobs?q=<101-char string>` |
| Expected | Response 400 `{ error: "..." }` |
| Actual | Covered (from `route.jobs.test.ts`) |
| Status | **Pass** |

---

## Area: NORM — Data Normalization (FR2–FR2.4)

### TC-NORM-001 — All required Job fields populated
| Field | Value |
|---|---|
| Requirement | FR2 |
| Type | Unit |
| Preconditions | Valid Himalayas raw job fixture |
| Steps | Run `normalizeHimalayas(fixture)` |
| Expected | All 20 required fields present; optionals `null` not undefined |
| Actual | Covered (from `normalize.test.ts`, `sources.himalayas.test.ts`) |
| Status | **Pass** |

### TC-NORM-002 — Salary "$170k–$200k" parsed correctly
| Field | Value |
|---|---|
| Requirement | FR2.1 |
| Type | Unit |
| Preconditions | Input string `"$170k - $200k"` |
| Steps | Call `parseSalary("$170k - $200k")` |
| Expected | `{ min:170000, max:200000, currency:"USD", period:"annual", annualMin:170000, annualMax:200000 }` |
| Actual | Covered (from `salary.test.ts`) |
| Status | **Pass** |

### TC-NORM-003 — Unparseable salary returns null
| Field | Value |
|---|---|
| Requirement | FR2.1 |
| Type | Negative |
| Preconditions | Input `"Competitive"` |
| Steps | Call `parseSalary("Competitive")` |
| Expected | `null` |
| Actual | Covered (from `salary.test.ts`) |
| Status | **Pass** |

### TC-NORM-004 — Out-of-range salary returns null
| Field | Value |
|---|---|
| Requirement | FR2.1 |
| Type | Edge case |
| Preconditions | Input `"$1 - $500"` (< 1,000 annual threshold) |
| Steps | Call `parseSalary("$1 - $500")` |
| Expected | `null` |
| Actual | Covered (from `salary.test.ts`) |
| Status | **Pass** |

### TC-NORM-005 — "USA, Canada" location parsed
| Field | Value |
|---|---|
| Requirement | FR2.2 |
| Type | Unit |
| Steps | Parse location `"USA, Canada"` |
| Expected | `{ worldwide:false, countries:["US","CA"], regions:[] }` |
| Actual | Covered (from `normalize.test.ts`) |
| Status | **Pass** |

### TC-NORM-006 — "Worldwide" location parsed
| Field | Value |
|---|---|
| Requirement | FR2.2 |
| Type | Unit |
| Steps | Parse location `"Worldwide"` |
| Expected | `{ worldwide:true, countries:[], regions:[] }` |
| Actual | Covered (from `normalize.test.ts`) |
| Status | **Pass** |

### TC-NORM-007 — "Full Time" normalized to enum
| Field | Value |
|---|---|
| Requirement | FR2.3 |
| Type | Unit |
| Steps | Normalize `"Full Time"` |
| Expected | `"full_time"` |
| Actual | Covered (from `normalize.test.ts`) |
| Status | **Pass** |

### TC-NORM-008 — Seniority inferred from title "Senior Engineer"
| Field | Value |
|---|---|
| Requirement | FR2.4 |
| Type | Unit |
| Steps | Infer seniority from Remotive title `"Senior Backend Engineer"` |
| Expected | `["senior"]` |
| Actual | Covered (from `normalize.test.ts`) |
| Status | **Pass** |

### TC-NORM-009 — HTML stripping removes tags and decodes entities
| Field | Value |
|---|---|
| Requirement | FR8.1 |
| Type | Unit |
| Steps | Strip `"<p>Hello &amp; World</p>"` |
| Expected | `"Hello & World"` with newline at `</p>` |
| Actual | Covered (from `normalize.test.ts`) |
| Status | **Pass** |

---

## Area: DEDUP — Deduplication (FR3)

### TC-DEDUP-001 — Duplicate job merged; Himalayas primary
| Field | Value |
|---|---|
| Requirement | FR3 |
| Type | Unit |
| Preconditions | Same normalized company+title appears in both sources |
| Steps | Run `deduplicateJobs([...himalayas, ...remotive])` |
| Expected | One job record; `source = "himalayas"`; Remotive URL in `alsoOn` |
| Actual | Covered (from `aggregate.test.ts`) |
| Status | **Pass** |

---

## Area: FILT — Filtering (FR6)

### TC-FILT-001 — Job outside user's country excluded (F1)
| Field | Value |
|---|---|
| Requirement | FR6 |
| Type | Unit |
| Preconditions | User country `"AU"`; job restricts to `["US","CA"]` |
| Steps | Apply `filterJobs([job], criteria)` |
| Expected | Job is excluded; excluded count = 1 |
| Actual | Covered (from `filters.test.ts`) |
| Status | **Pass** |

### TC-FILT-002 — Worldwide job NOT excluded by location filter
| Field | Value |
|---|---|
| Requirement | FR6 |
| Type | Edge case |
| Preconditions | User country `"AU"`; job has `worldwide = true` |
| Steps | Apply filter |
| Expected | Job is NOT excluded |
| Actual | Covered (from `filters.test.ts`) |
| Status | **Pass** |

### TC-FILT-003 — Excluded keyword in job title filters job
| Field | Value |
|---|---|
| Requirement | FR6 (F2) |
| Type | Unit |
| Preconditions | Excluded keywords = `["PHP"]`; job title contains "PHP Developer" |
| Steps | Apply filter |
| Expected | Job excluded |
| Actual | Covered (from `filters.test.ts`) |
| Status | **Pass** |

### TC-FILT-004 — Salary below floor excluded; unknown salary NOT excluded
| Field | Value |
|---|---|
| Requirement | FR6 (F3) |
| Type | Unit / Edge case |
| Steps | Test `annualMax < minSalary` (excluded) and `salary = null` (not excluded) |
| Expected | Below floor: excluded. `null` salary: not excluded |
| Actual | Covered (from `filters.test.ts`) |
| Status | **Pass** |

---

## Area: SCORE — Scoring (FR7–FR7.7)

### TC-SCORE-001 — Golden test: §7.5 worked example scores 88%
| Field | Value |
|---|---|
| Requirement | FR7, NFR6 |
| Type | Unit |
| Steps | Run `scoreJob(goldenJob, goldenCriteria)` |
| Expected | `matchPercent = 88` |
| Actual | 88% (from `score.test.ts`, build-and-test-summary.md) |
| Status | **Pass** |

### TC-SCORE-002 — Only active factors contribute to score
| Field | Value |
|---|---|
| Requirement | FR7 |
| Type | Unit |
| Steps | Score job with empty keywords (skills factor inactive) |
| Expected | Skills factor excluded from divisor |
| Actual | Covered (from `score.test.ts`) |
| Status | **Pass** |

### TC-SCORE-003 — Jobs sorted descending by matchPercent
| Field | Value |
|---|---|
| Requirement | FR7 |
| Type | Unit |
| Steps | Call `rankJobs([...])` on mixed-score jobs |
| Expected | Jobs sorted descending; ties broken by `publishedAt` descending |
| Actual | Covered (from `score.test.ts`) |
| Status | **Pass** |

### TC-SCORE-004 — Salary factor: annualMin >= user amount → 1.0
| Field | Value |
|---|---|
| Requirement | FR7.4 |
| Type | Unit |
| Steps | Score salary factor with `annualMin >= userAmount` |
| Expected | Salary factor = 1.0 |
| Actual | Covered (from `score.test.ts`) |
| Status | **Pass** |

### TC-SCORE-005 — Salary factor: currency mismatch → 0.5
| Field | Value |
|---|---|
| Requirement | FR7.4 |
| Type | Edge case |
| Steps | Score salary factor with job in EUR vs user in USD |
| Expected | Salary factor = 0.5 |
| Actual | Covered (from `score.test.ts`) |
| Status | **Pass** |

---

## Area: BEN — Benefit Detection (FR8)

### TC-BEN-001 — Health insurance detected with evidence
| Field | Value |
|---|---|
| Requirement | FR8 |
| Type | Unit |
| Steps | Run benefit detection on description containing "health insurance" |
| Expected | `health` benefit detected; ≤2 evidence snippets |
| Actual | Covered (from `benefits.test.ts`) |
| Status | **Pass** |

### TC-BEN-002 — All 9 benefit types detectable
| Field | Value |
|---|---|
| Requirement | FR8 |
| Type | Unit |
| Steps | Run detection on description containing triggers for all 9 categories |
| Expected | All 9 categories detected |
| Actual | Covered (from `benefits.test.ts`) |
| Status | **Pass** |

---

## Area: UI — Dashboard UI (FR9–FR9.8)

### TC-UI-001 — Zero axe violations on Dashboard
| Field | Value |
|---|---|
| Requirement | NFR3 |
| Type | Accessibility |
| Steps | Render Dashboard in jsdom + run axe |
| Expected | 0 violations with WCAG2.1 AA ruleset |
| Actual | 0 violations (from `a11y/Dashboard.a11y.test.tsx`) |
| Status | **Pass** |

### TC-UI-002 — Zero axe violations on JobCard
| Field | Value |
|---|---|
| Requirement | NFR3, FR9.1 |
| Type | Accessibility |
| Steps | Render JobCard in jsdom + run axe |
| Expected | 0 violations |
| Actual | 0 violations (from `a11y/JobCard.a11y.test.tsx`) |
| Status | **Pass** |

### TC-UI-003 — Zero axe violations on CriteriaForm
| Field | Value |
|---|---|
| Requirement | NFR3, FR9.3 |
| Type | Accessibility |
| Steps | Render CriteriaForm in jsdom + run axe |
| Expected | 0 violations |
| Actual | 0 violations (from `a11y/CriteriaForm.a11y.test.tsx`) |
| Status | **Pass** |

### TC-UI-004 — Zero axe violations on JobDetailPanel
| Field | Value |
|---|---|
| Requirement | NFR3, FR9.2 |
| Type | Accessibility |
| Steps | Render JobDetailPanel in jsdom + run axe |
| Expected | 0 violations |
| Actual | 0 violations (from `a11y/JobDetailPanel.a11y.test.tsx`) |
| Status | **Pass** |

### TC-UI-005 — Match badge hidden when no active criteria
| Field | Value |
|---|---|
| Requirement | FR9.1 |
| Type | Regression |
| Steps | Render JobCard with all scoring factors inactive |
| Expected | Match badge not shown |
| Actual | Covered (from `components/JobCard.bugfix.test.tsx`) |
| Status | **Pass** |

### TC-UI-006 — Loading state announces via LiveAnnouncer (FR9.5)
| Field | Value |
|---|---|
| Requirement | FR9.5 |
| Type | Accessibility |
| Steps | Render Dashboard in loading state |
| Expected | `aria-busy="true"` on results container; "Loading jobs" in live region |
| Actual | Covered (from `a11y/Dashboard.a11y.test.tsx`) |
| Status | **Pass** |

### TC-UI-007 — Source failure banner shown for partial failure (FR9.7)
| Field | Value |
|---|---|
| Requirement | FR9.7 |
| Type | Integration |
| Steps | Render Dashboard with `sources[remotive].ok = false` |
| Expected | MUI `Alert` shown naming the failed source |
| Actual | Covered (from `a11y/Dashboard.a11y.test.tsx`) |
| Status | **Pass** |

### TC-UI-008 — criteria persistence localStorage round-trip
| Field | Value |
|---|---|
| Requirement | FR5 |
| Type | Unit |
| Preconditions | `localStorage` available |
| Steps | Set criteria; simulate page reload; check criteria restored |
| Expected | Criteria match what was set |
| Actual | **Not Executed** — no automated test for this flow |
| Status | **Not Executed** |
| Note | Add `useCriteria.test.ts` with `vi.mock('localStorage')` |

### TC-UI-009 — Criteria re-rank without network request (FR5.1)
| Field | Value |
|---|---|
| Requirement | FR5.1 |
| Type | Integration |
| Steps | Change keyword; wait 300 ms; verify job list changed without fetch call |
| Expected | Jobs re-ranked; no outbound network call |
| Actual | **Not Executed** — no debounce integration test |
| Status | **Not Executed** |

### TC-UI-010 — Keyboard focus trap in JobDetailPanel Esc closes
| Field | Value |
|---|---|
| Requirement | NFR3.2, FR9.2 |
| Type | Accessibility |
| Steps | Open detail panel; press Esc |
| Expected | Panel closes; focus returns to trigger card |
| Actual | Covered (from `a11y/JobDetailPanel.a11y.test.tsx`) |
| Status | **Pass** |

### TC-UI-011 — NVDA + Chrome screen reader announces job cards correctly
| Field | Value |
|---|---|
| Requirement | NFR3 |
| Type | Manual / Accessibility |
| Steps | Use NVDA + Chrome; navigate to job list; listen to card announcements |
| Expected | Heading, company, match %, employment type announced correctly |
| Actual | **Not Executed** — manual test not performed |
| Status | **Not Executed** |

### TC-UI-012 — 320px viewport: no horizontal scroll
| Field | Value |
|---|---|
| Requirement | NFR3, NFR5 |
| Type | Manual / Responsive |
| Steps | Set viewport to 320 px; check for horizontal scroll |
| Expected | No horizontal scroll |
| Actual | **Not Executed** — no responsive test |
| Status | **Not Executed** |

---

## Area: PERF — Performance (NFR1)

### TC-PERF-001 — API response under 2 seconds (90th percentile)
| Field | Value |
|---|---|
| Requirement | NFR1 |
| Type | Performance |
| Preconditions | Live Himalayas + Remotive APIs accessible |
| Steps | Run 100 requests to `GET /api/jobs`; measure p90 latency |
| Expected | p90 < 2000 ms |
| Actual | **Not Executed** — no load test; mocked tests only |
| Status | **Not Executed** |
| Risk | High for production |

---

## Summary

| Status | Count |
|---|---|
| Pass (covered by existing tests) | 25 |
| Not Executed (gap — no automated test) | 5 |
| **Total** | **30** |
