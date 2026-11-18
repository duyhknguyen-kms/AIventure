# Test Results

**Stage:** build-and-test  
**Date:** 2026-11-18  
**Runner:** Vitest 4.x  
**Command:** `npm test` (from `web/`)

---

## Summary

| Metric | Value |
|--------|-------|
| Test files | 30 passed |
| Tests | 366 passed |
| Duration | ~8 s |
| Failures | 0 |
| TypeScript errors | 0 |
| Lint errors | 0 |
| Build | ✅ succeeded |

---

## Test Files

| File | Tests | Category |
|------|-------|----------|
| `theme.test.ts` | 8 | UI — WCAG contrast |
| `config.test.ts` | 9 | Weights + env config |
| `normalize.test.ts` | 65 | Normalize utilities |
| `salary.test.ts` | 20 | Salary parsing |
| `benefits.test.ts` | 11 | Benefit detection |
| `criteria.test.ts` | 19 | Zod schema |
| `useCriteria.test.tsx` | 10 | Hook persistence |
| `filters.test.ts` | 17 | Hard filters (F1-F3) |
| `score.test.ts` | 17 | Scoring engine (incl. §7.5 golden test) |
| `aggregate.test.ts` | 18 | Cache + dedupe + aggregation |
| `sources.himalayas.test.ts` | 15 | Himalayas adapter |
| `sources.remotive.test.ts` | 10 | Remotive adapter |
| `countries.raw.test.ts` | 3 | Country lookup completeness |
| `route.jobs.test.ts` | 8 | /api/jobs route |
| `format.test.ts` | (component helpers) | |
| `sort.test.ts` | — | Sort utilities |
| `jobsClient.test.ts` | — | API client |
| `components.test.tsx` | — | Component helpers |
| `CriteriaForm.test.tsx` | 9 | CriteriaForm |
| `ScoreBreakdown.test.tsx` | 6 | ScoreBreakdown |
| `JobList.test.tsx` | 6 | JobList |
| `JobDetailPanel.test.tsx` | 6 | JobDetailPanel |
| `Dashboard.test.tsx` | 9 | Dashboard states |
| `CVUpload.test.tsx` | 9 | CV upload |
| `cvParser.test.ts` | 12 | CV text extraction |
| `ChatWidget.test.tsx` | 10 | Chat widget |
| `a11y/JobCard.a11y.test.tsx` | 3 | WCAG 2.2 AA |
| `a11y/CriteriaForm.a11y.test.tsx` | 2 | WCAG 2.2 AA |
| `a11y/JobDetailPanel.a11y.test.tsx` | 3 | WCAG 2.2 AA |
| `a11y/Dashboard.a11y.test.tsx` | 5 | WCAG 2.2 AA |

---

## Key Verifications

- **§7.5 golden test**: `scoreJob` on the SPEC §7.5 example = **88%** ✅
- **Weights sum**: `Object.values(WEIGHTS).reduce((a, b) => a + b)` = **100** ✅
- **axe WCAG 2.2 AA**: zero violations on JobCard, CriteriaForm, JobDetailPanel, Dashboard ✅
- **Route 400**: `GET /api/jobs?q=${"x".repeat(101)}` returns 400 ✅
- **Route 502**: both sources failing with no cache returns 502 ✅
- **Source integration**: real API responses recorded 2026-11-17; 134 country names in COUNTRY_LOOKUP all mapped ✅

## Loop-Back Log

No loop-backs required. All tests passed on the first run.
