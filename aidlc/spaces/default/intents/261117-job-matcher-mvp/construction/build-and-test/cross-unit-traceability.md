# Cross-Unit Traceability

**Stage:** build-and-test  
**Intent:** 261117-job-matcher-mvp  
**Note:** This is a zero-unit express-scope build; all requirements are covered in one pass.

---

| Requirement | Test File(s) | Status |
|-------------|-------------|--------|
| FR1 — Ingest from Himalayas + Remotive | `sources.himalayas.test.ts`, `sources.remotive.test.ts`, `aggregate.test.ts` | ✅ |
| FR2 — Normalize to Job model | `normalize.test.ts`, `salary.test.ts` | ✅ |
| FR3 — Deduplicate | `aggregate.test.ts` | ✅ |
| FR4 — Server cache (TTL, stale-on-error) | `aggregate.test.ts` | ✅ |
| FR5 — Criteria persistence (localStorage) | `useCriteria.test.tsx`, `criteria.test.ts` | ✅ |
| FR6 — Hard filters (F1–F3) | `filters.test.ts` | ✅ |
| FR7 — Weighted scoring + ranking | `score.test.ts` | ✅ |
| FR8 — Benefit detection | `benefits.test.ts` | ✅ |
| FR9 — MUI dashboard (WCAG AA) | `a11y/*.a11y.test.tsx`, `Dashboard.test.tsx` | ✅ |
| FR10 — Search by keyword | `route.jobs.test.ts`, `Dashboard.test.tsx` | ✅ |
| NFR3 — WCAG 2.2 AA | `a11y/*.a11y.test.tsx` | ✅ |
| NFR6 — Testability | 30 test files, 366 tests | ✅ |
