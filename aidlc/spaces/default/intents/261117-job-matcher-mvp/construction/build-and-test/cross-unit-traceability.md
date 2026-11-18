# Cross-Unit Traceability

**Intent:** 261117-job-matcher-mvp  
**Date:** 2026-11-17

## FR → Unit → Test file mapping

| FR | Description | Unit | Test file |
|---|---|---|---|
| FR1.1 | Himalayas API | u1-data-sources | `sources.himalayas.test.ts` |
| FR1.2 | Remotive API | u1-data-sources | `sources.remotive.test.ts` |
| FR1.3 | Partial-failure resilience | u1-data-sources | `aggregate.test.ts` |
| FR2.1 | Salary parsing | u1-data-sources | `salary.test.ts` |
| FR2.2 | Location parsing | u1-data-sources | `normalize.test.ts` |
| FR2.3 | Employment type | u1-data-sources | `normalize.test.ts` |
| FR2.4 | Seniority | u1-data-sources | `normalize.test.ts` |
| FR3 | Deduplication | u1-data-sources | `aggregate.test.ts` |
| FR4.1 | Stale-on-error cache | u1-data-sources | `aggregate.test.ts` |
| FR4.2 | Rate-limit backoff | u1-data-sources | `sources.himalayas.test.ts` |
| FR5.1 | Criteria editing | u4-criteria-form | `a11y/CriteriaForm.a11y.test.tsx` |
| FR6 | Job filtering | u2-matching-engine | `filters.test.ts` |
| FR7.1–7.7 | Scoring factors | u2-matching-engine | `score.test.ts` |
| FR8.1 | HTML stripping | u1-data-sources | `normalize.test.ts` |
| FR9.1 | Job card display | u3-dashboard-core | `a11y/JobCard.a11y.test.tsx` |
| FR9.2 | Job detail panel | u5-detail-panel | `a11y/JobDetailPanel.a11y.test.tsx` |
| FR9.3 | Criteria form | u4-criteria-form | `a11y/CriteriaForm.a11y.test.tsx` |
| FR9.4 | Sort & filter | u7-pagination-highlight | `improve-pagination-highlight.test.ts` |
| FR9.5–9.6 | Loading / empty states | u3-dashboard-core | `a11y/Dashboard.a11y.test.tsx` |
| FR9.7–9.8 | Failure states | u3-dashboard-core | `a11y/Dashboard.a11y.test.tsx` |
| FR10 | Search | u1-data-sources | `route.jobs.test.ts` |

## Cross-cutting: shared modules used by multiple units

| Module | Used by units |
|---|---|
| `src/lib/types.ts` | All 7 units |
| `src/theme.ts` | U3, U4, U5, U6, U7 |
| `src/lib/normalize/countries.ts` | U1, U2 |
| `normaliseHyphens()` | U2 (`filters.ts`, `score.ts`), U7 (`HighlightText.tsx`) |

## Integration points verified by test suite

| Integration point | Test |
|---|---|
| `GET /api/jobs` returns `{ jobs, sources, fetchedAt }` | `route.jobs.test.ts` |
| Cache served on second call | `aggregate.test.ts` |
| Stale data returned on source failure | `aggregate.test.ts` |
| `rankJobs` output has correct shape | `score.test.ts` |
| Benefit evidence propagates to `MatchResult` | `benefits.test.ts` |
