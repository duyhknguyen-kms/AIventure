# Test Results

**Intent:** 261117-job-matcher-mvp  
**Date:** 2026-11-17  
**Runner:** Vitest v5.1.0  
**Command:** `cd web && npm test`

## Summary

| Metric | Result |
|---|---|
| Test files | 18 passed (18) |
| Tests | **289 passed (289)** |
| Failures | 0 |
| TypeScript errors | 0 |
| Lint errors | 0 |
| Lint warnings | 5 (unused vars in test files — non-blocking) |
| Duration | ~4.5 s |

## By test file

| File | Tests | Coverage area |
|---|---|---|
| `theme.test.ts` | 8 | WCAG contrast ratios |
| `normalize.test.ts` | 65 | HTML stripping, employment, seniority, timezone, location |
| `salary.test.ts` | 19 | Salary parsing (§4.3 table + edge cases) |
| `sources.himalayas.test.ts` | 11 | Himalayas adapter: mapping, pagination, 429 |
| `sources.remotive.test.ts` | 13 | Remotive adapter: mapping, salary, optional fields |
| `benefits.test.ts` | 11 | Benefit detection (all 9 types) |
| `filters.test.ts` | 16 | Hard filters F1/F2/F3 |
| `score.test.ts` | 18 | Scorer (golden test §7.5 = 88%) + rankJobs |
| `aggregate.test.ts` | 11 | Dedupe, merge, cache, partial failure |
| `route.jobs.test.ts` | 9 | GET /api/jobs: 200/400/502 |
| `improve-filters.test.ts` | 21 | Filter fix regressions (country regions, company haystack, hyphens) |
| `improve-pagination-highlight.test.ts` | 17 | Pagination logic + HighlightText segments |
| `improve-cv.test.ts` | 17 | CV extraction: skills, seniority, titles, merge |
| `a11y/JobCard.a11y.test.tsx` | 7 | Zero axe violations, accessible name, match badge |
| `a11y/CriteriaForm.a11y.test.tsx` | 11 | Zero axe violations, labels, fieldset groups |
| `a11y/JobDetailPanel.a11y.test.tsx` | 7 | Zero axe violations, focus, Esc, Apply label |
| `a11y/Dashboard.a11y.test.tsx` | 6 | Zero axe violations, landmarks, skip link |
| `components/JobCard.bugfix.test.tsx` | 20 | Match badge hidden when no active criteria |

## Quality gates

| Gate | Target | Result |
|---|---|---|
| Tests pass | 100% | ✅ 289/289 |
| TypeScript | 0 errors | ✅ |
| Lint | 0 errors | ✅ (5 warnings in test files) |
| axe WCAG 2.x AA | 0 violations | ✅ |
| §7.5 golden test | 88% | ✅ |
| `express` scope floor | existing suite green | ✅ |

## Coverage notes

Test strategy is **Minimal** (scope: express). Obligations:
- One verifiable test per requirement at the narrowest effective level ✅
- At least one happy-path unit test per component ✅
- Existing suite remains green ✅

The `express` scope floor adds no extra coverage percentage requirement. All 29 FRs have at least one test via the normalize, salary, sources, filters, score, aggregate, and route test files.
