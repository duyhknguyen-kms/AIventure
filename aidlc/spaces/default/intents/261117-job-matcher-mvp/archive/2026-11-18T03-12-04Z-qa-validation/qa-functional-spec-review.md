# Functional Specification Review

**Project:** AIventure — AI-Powered Job Matching Platform  
**Stage:** QA Validation & Test Planning  
**Date:** 2026-11-17  
**Sources:** requirements.md, build-and-test-summary.md, test-results.md, cross-unit-traceability.md

---

## Coverage Summary

| Category | Total | Covered | Partially Covered | Uncovered | N/A |
|---|---|---|---|---|---|
| Functional Requirements (FRs) | 22 | 17 | 3 | 2 | 0 |
| Non-Functional Requirements (NFRs) | 10 | 7 | 2 | 1 | 0 |

**Overall FR coverage: 77% fully covered, 14% partial, 9% uncovered**

---

## Functional Requirements Review

### FR1 — Multi-Source Job Aggregation
**Status: Covered**  
Tests: `route.jobs.test.ts` (200/400/502 responses), `aggregate.test.ts` (parallel fetch, dedup, cache).  
Evidence: `route.jobs.test.ts` — 9 tests, 0 failures.

---

### FR1.1 — Himalayas API Integration
**Status: Covered**  
Tests: `sources.himalayas.test.ts` (mapping, pagination, 429 backoff).  
Evidence: 11 tests, 0 failures.  
Implementation note: `locationRestrictions = string[]` and `timezoneRestrictions = number[]` differed from spec; handled correctly per code-summary.md.

---

### FR1.2 — Remotive API Integration
**Status: Covered**  
Tests: `sources.remotive.test.ts` (mapping, salary, optional fields).  
Evidence: 13 tests, 0 failures.

---

### FR1.3 — Partial-Failure Resilience
**Status: Covered**  
Tests: `aggregate.test.ts` (partial failure path).  
Evidence: Included in 11-test aggregate suite.

---

### FR2 — Job Data Normalization
**Status: Covered**  
Tests: `normalize.test.ts` (HTML stripping, employment, seniority, timezone, location).  
Evidence: 65 normalization tests, 0 failures.

---

### FR2.1 — Salary Parsing
**Status: Covered**  
Tests: `salary.test.ts`.  
Evidence: 19 tests covering §4.3 table and edge cases. All pass.

---

### FR2.2 — Location Parsing
**Status: Covered**  
Tests: `normalize.test.ts` (location section).

---

### FR2.3 — Employment Type Normalization
**Status: Covered**  
Tests: `normalize.test.ts`.

---

### FR2.4 — Seniority Normalization
**Status: Covered**  
Tests: `normalize.test.ts`.

---

### FR3 — Job Deduplication
**Status: Covered**  
Tests: `aggregate.test.ts` (dedupe, merge).

---

### FR4 — Server-Side Caching
**Status: Covered**  
Tests: `aggregate.test.ts` (cache served on second call).

---

### FR4.1 — Stale-On-Error Caching
**Status: Covered**  
Tests: `aggregate.test.ts` (stale data on source failure).

---

### FR4.2 — Rate-Limit Backoff
**Status: Covered**  
Tests: `sources.himalayas.test.ts` (429 with Retry-After).

---

### FR5 — User Criteria Management (localStorage persistence)
**Status: Partially Covered**  
Tests: `a11y/CriteriaForm.a11y.test.tsx` covers form rendering and labels, but not localStorage round-trip across a page reload.  
**Gap:** No unit test for `localStorage.getItem` / `localStorage.setItem` round-trip with `aiventure.criteria.v1`.  
**Risk:** Medium — criteria persistence is a core UX feature; a regression would only be caught manually.

---

### FR5.1 — Criteria Debounce and Re-rank
**Status: Partially Covered**  
Criteria form is rendered; but no test verifies the 300 ms debounce timing or that re-rank occurs without a network request.  
**Gap:** Integration test needed for the debounce → re-rank flow.  
**Risk:** Low — debounce is a UX concern, not a data-correctness concern.

---

### FR6 — Job Filtering (F1, F2, F3)
**Status: Covered**  
Tests: `filters.test.ts` (16 tests covering location, excluded keyword, salary floor).  
Also covered by `improve-filters.test.ts` (21 tests: country regions, company haystack, hyphens).

---

### FR7 — Job Scoring & Ranking
**Status: Covered**  
Tests: `score.test.ts` (18 tests: scorer, golden test §7.5 = 88%, rankJobs).

---

### FR7.1–FR7.7 — Individual Scoring Factors
**Status: Covered**  
Tests: `score.test.ts`.

---

### FR8 — Benefit Detection
**Status: Covered**  
Tests: `benefits.test.ts` (11 tests covering all 9 benefit types).

---

### FR8.1 — HTML Stripping
**Status: Covered**  
Tests: `normalize.test.ts`.

---

### FR9 — Dashboard UI
**Status: Partially Covered**  
Tests: `a11y/Dashboard.a11y.test.tsx`, `a11y/JobCard.a11y.test.tsx`, `a11y/CriteriaForm.a11y.test.tsx`, `a11y/JobDetailPanel.a11y.test.tsx`, `components/JobCard.bugfix.test.tsx`.  
**Covered:** Accessibility structure, focus management, landmark/heading structure, loading state, failure states, match badge, skip link.  
**Not covered:** Visual layout correctness in a real browser, responsive breakpoints, MUI Skeleton animation (jsdom limitation), screen reader announcement text under NVDA.  
**Risk:** Medium — UI functional correctness is verified; visual and assistive-technology behaviour requires manual testing.

---

### FR10 — Search
**Status: Covered**  
Tests: `route.jobs.test.ts` (Himalayas search endpoint call, Remotive local filter, 400 on invalid query).

---

## Non-Functional Requirements Review

### NFR1 — Performance (< 2 s, 90th percentile)
**Status: Uncovered**  
No load test or latency measurement was executed. All tests use mocked fetch; real API latency is unknown.  
**Gap:** No performance test exists. The target is an assumption, not a measured result.  
**Risk:** High for production. Low for PoC (as noted in Assumption A6: production deployment is out of scope).

---

### NFR2 — Availability (partial failure)
**Status: Covered**  
Tests: `aggregate.test.ts` covers single-source failure path and 429 backoff.

---

### NFR3 — Accessibility (WCAG 2.2 AA)
**Status: Covered (automated scope)**  
Four axe-core test suites pass with 0 violations.  
**Gap:** Manual testing with NVDA + Chrome/Firefox not performed. 320 px viewport and "reduce motion" preference not programmatically tested.  
**Risk:** Medium — axe catches roughly 30–40% of WCAG issues; manual testing required for full conformance.

---

### NFR3.1–NFR3.8 — Specific Accessibility Sub-requirements
**Status: Partially Covered**  
Semantic HTML, keyboard focus, contrast (theme.test.ts: 8 tests on WCAG contrast ratios), colour-independence (match badge text + icon), form labels (CriteriaForm suite), status/alert roles, link purpose, target size.  
**Gap:** Contrast tests cover the theme definition, not actual rendered components. `role="status"` / `role="alert"` are asserted by axe; direct attribute tests not present.

---

### NFR4 — Security
**Status: Covered**  
Evidence from requirements-analysis and build-and-test-summary: `HIMALAYAS_API_KEY` not prefixed `NEXT_PUBLIC_`, `descriptionHtml` not rendered via `dangerouslySetInnerHTML`.  
**Note:** No SAST/DAST scan executed. No penetration test performed. These are out of scope for the Express PoC.

---

### NFR5 — Usability (responsive design)
**Status: Uncovered**  
No automated test covers responsive layout breakpoints or drawer behaviour on small screens.  
**Risk:** Low for PoC; medium for production.

---

### NFR6 — Testability
**Status: Covered**  
Pure functions confirmed (no I/O in matching engine). Fixture-based adapter tests confirmed. axe test suites present.  
Evidence: `score.test.ts` golden test asserts exactly 88%.

---

## Assumptions Review

| Assumption | Status |
|---|---|
| A1: API stability | Unknown — APIs not hit in test suite (all mocked) |
| A2: Feed size (≥50 jobs) | Unknown — not verifiable from test suite alone |
| A3: Evergreen browser support | Unverified in real browser; jsdom used |
| A4: English locale | Addressed — benefit keywords hardcoded in English |
| A5: No currency conversion | Implemented as stated (0.5 score for mismatched currency) |
| A6: Local-only deployment | Reflected in test strategy (no E2E, no live API) |

---

## Open Questions Status

| OQ | Status |
|---|---|
| OQ1: Remotive `limit` parameter | Unresolved — tests use mocked responses |
| OQ2: Himalayas timezone format | Resolved in code (`number[]` per code-summary.md) |
| OQ3: Himalayas `salaryPeriod` | Resolved with null-safe fallback |
| OQ4: Free Himalayas API key | Unresolved — out of QA scope |
| OQ5: Remotive field optionality | Resolved — `.nullish()` used in Zod schemas |

---

## Summary of Gaps

| Priority | Gap | FR/NFR | Recommended Action |
|---|---|---|---|
| Medium | No localStorage persistence test | FR5 | Add `useCriteria.test.ts` with mock localStorage |
| Medium | No browser-level UI test | FR9, NFR3.2 | Manual testing or add Playwright E2E for one happy path |
| High (prod) | No performance test | NFR1 | Add `k6` or `autocannon` smoke test before production |
| Medium | No NVDA+browser screen reader test | NFR3 | Manual accessibility audit with real AT |
| Low | No debounce timing test | FR5.1 | Add integration test with fake timers |
