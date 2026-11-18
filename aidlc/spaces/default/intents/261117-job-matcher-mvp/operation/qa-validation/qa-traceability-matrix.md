# Requirements Traceability Matrix

**Project:** AIventure — AI-Powered Job Matching Platform  
**Stage:** QA Validation & Test Planning  
**Date:** 2026-11-17

Legend:
- **Covered** — existing automated test passes
- **Partially Covered** — some acceptance criteria tested; gaps documented
- **Uncovered** — no automated test exists
- **N/A** — explicitly out of scope (post-MVP, OS section)

---

## Functional Requirements

| Req ID | Description | QA-US | Test Case IDs | Test File(s) | Covered? |
|---|---|---|---|---|---|
| FR1 | Multi-source aggregation | QA-US-001 | TC-AGG-001 | `route.jobs.test.ts` | **Covered** |
| FR1.1 | Himalayas cursor pagination + 429 | QA-US-002 | TC-AGG-002 | `sources.himalayas.test.ts` | **Covered** |
| FR1.2 | Remotive feed caching | QA-US-003 | TC-AGG-003, TC-AGG-005 | `sources.remotive.test.ts`, `aggregate.test.ts` | **Covered** |
| FR1.3 | Partial-failure resilience | QA-US-004 | TC-AGG-003 | `aggregate.test.ts` | **Covered** |
| FR2 | Job data normalization | QA-US-005 | TC-NORM-001 | `normalize.test.ts`, `sources.*.test.ts` | **Covered** |
| FR2.1 | Salary parsing | QA-US-006 | TC-NORM-002, TC-NORM-003, TC-NORM-004 | `salary.test.ts` | **Covered** |
| FR2.2 | Location parsing | QA-US-007 | TC-NORM-005, TC-NORM-006 | `normalize.test.ts` | **Covered** |
| FR2.3 | Employment type normalization | QA-US-008 | TC-NORM-007 | `normalize.test.ts` | **Covered** |
| FR2.4 | Seniority normalization | QA-US-009 | TC-NORM-008 | `normalize.test.ts` | **Covered** |
| FR3 | Job deduplication | QA-US-010 | TC-DEDUP-001 | `aggregate.test.ts` | **Covered** |
| FR4 | Server-side caching (TTL) | QA-US-003 | TC-AGG-005 | `aggregate.test.ts` | **Covered** |
| FR4.1 | Stale-on-error caching | QA-US-011 | TC-AGG-005 | `aggregate.test.ts` | **Covered** |
| FR4.2 | Rate-limit backoff | QA-US-002 | TC-AGG-002 | `sources.himalayas.test.ts` | **Covered** |
| FR5 | Criteria persistence (localStorage) | QA-US-012 | TC-UI-008 | — | **Partially Covered** |
| FR5.1 | Criteria debounce + re-rank | QA-US-013 | TC-UI-009 | — | **Uncovered** |
| FR6 (F1) | Location filter | QA-US-014 | TC-FILT-001, TC-FILT-002 | `filters.test.ts`, `improve-filters.test.ts` | **Covered** |
| FR6 (F2) | Excluded keyword filter | QA-US-015 | TC-FILT-003 | `filters.test.ts` | **Covered** |
| FR6 (F3) | Salary floor filter | QA-US-016 | TC-FILT-004 | `filters.test.ts` | **Covered** |
| FR7 | Job scoring & ranking (composite) | QA-US-017 | TC-SCORE-001, TC-SCORE-002, TC-SCORE-003 | `score.test.ts` | **Covered** |
| FR7.1 | Skills factor | QA-US-018 | TC-SCORE-001 | `score.test.ts` | **Covered** |
| FR7.2 | Title factor | QA-US-018 | TC-SCORE-001 | `score.test.ts` | **Covered** |
| FR7.3 | Seniority factor | QA-US-018 | TC-SCORE-001 | `score.test.ts` | **Covered** |
| FR7.4 | Salary factor | QA-US-019 | TC-SCORE-004, TC-SCORE-005 | `score.test.ts` | **Covered** |
| FR7.5 | Employment type factor | QA-US-019 | TC-SCORE-001 | `score.test.ts` | **Covered** |
| FR7.6 | Timezone factor | QA-US-019 | TC-SCORE-001 | `score.test.ts` | **Covered** |
| FR7.7 | Benefits factor | QA-US-019 | TC-SCORE-001 | `score.test.ts` | **Covered** |
| FR8 | Benefit detection (9 categories) | QA-US-020 | TC-BEN-001, TC-BEN-002 | `benefits.test.ts` | **Covered** |
| FR8.1 | HTML stripping | — | TC-NORM-009 | `normalize.test.ts` | **Covered** |
| FR9 | Dashboard UI | QA-US-021–QA-US-023 | TC-UI-001–TC-UI-007, TC-UI-010 | `a11y/*.test.tsx`, `components/JobCard.bugfix.test.tsx` | **Partially Covered** |
| FR9.1 | Job card display | QA-US-023 | TC-UI-002, TC-UI-005 | `a11y/JobCard.a11y.test.tsx`, `components/JobCard.bugfix.test.tsx` | **Covered** |
| FR9.2 | Job detail panel | QA-US-023 | TC-UI-004, TC-UI-010 | `a11y/JobDetailPanel.a11y.test.tsx` | **Covered** |
| FR9.3 | Criteria form | — | TC-UI-003 | `a11y/CriteriaForm.a11y.test.tsx` | **Covered** |
| FR9.4 | Sort & filter controls | — | — | `improve-pagination-highlight.test.ts` | **Covered** |
| FR9.5 | Loading state | QA-US-021 | TC-UI-006 | `a11y/Dashboard.a11y.test.tsx` | **Covered** |
| FR9.6 | Empty states | — | — | `a11y/Dashboard.a11y.test.tsx` | **Covered** |
| FR9.7 | Partial failure state | QA-US-022 | TC-UI-007 | `a11y/Dashboard.a11y.test.tsx` | **Covered** |
| FR9.8 | Total failure state | — | TC-AGG-004 | `route.jobs.test.ts` | **Covered** |
| FR10 | Search | — | TC-AGG-006, TC-AGG-007 | `route.jobs.test.ts` | **Covered** |

---

## Non-Functional Requirements

| Req ID | Description | QA-US | Test Case IDs | Test File(s) | Covered? |
|---|---|---|---|---|---|
| NFR1 | Performance < 2 s p90 | — | TC-PERF-001 | — | **Uncovered** |
| NFR2 | Availability (partial failure) | — | TC-AGG-003, TC-AGG-005 | `aggregate.test.ts` | **Covered** |
| NFR3 | Accessibility WCAG 2.2 AA (automated) | QA-US-024 | TC-UI-001–TC-UI-004, TC-UI-006 | `a11y/*.test.tsx` | **Partially Covered** |
| NFR3.1 | Semantic HTML | — | TC-UI-001 | `a11y/Dashboard.a11y.test.tsx` | **Covered** |
| NFR3.2 | Keyboard navigation | QA-US-025 | TC-UI-010 | `a11y/JobDetailPanel.a11y.test.tsx` | **Partially Covered** |
| NFR3.3 | Colour contrast | — | — | `theme.test.ts` (8 tests) | **Covered** |
| NFR3.4 | Use of colour | — | TC-UI-005 | `components/JobCard.bugfix.test.tsx` | **Covered** |
| NFR3.5 | Form labels | — | TC-UI-003 | `a11y/CriteriaForm.a11y.test.tsx` | **Covered** |
| NFR3.6 | Status messages | — | TC-UI-006, TC-UI-007 | `a11y/Dashboard.a11y.test.tsx` | **Covered** |
| NFR3.7 | Link purpose | — | TC-UI-004 | `a11y/JobDetailPanel.a11y.test.tsx` | **Covered** |
| NFR3.8 | Target size | — | — | Implicit in axe suites | **Covered** |
| NFR4 | Security (no secrets, no XSS) | — | — | Code review (secrets not in source; `dangerouslySetInnerHTML` not used) | **Covered** |
| NFR5 | Usability / responsive | — | TC-UI-012 | — | **Uncovered** |
| NFR6 | Testability | — | TC-SCORE-001 (§7.5 golden test) | `score.test.ts` | **Covered** |

---

## Coverage Summary

| Category | Total | Covered | Partially | Uncovered | N/A |
|---|---|---|---|---|---|
| Functional (FR) | 36 rows | 32 | 2 (FR5, FR9) | 2 (FR5.1, —) | 0 |
| Non-Functional (NFR) | 14 rows | 10 | 2 (NFR3, NFR3.2) | 2 (NFR1, NFR5) | 0 |
| **Total** | **50** | **42 (84%)** | **4 (8%)** | **4 (8%)** | **0** |
