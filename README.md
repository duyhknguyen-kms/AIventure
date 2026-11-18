# AIventure — AI Smart Job Aggregator & Matching Platform

An intelligent job search platform that pulls listings from Himalayas and Remotive, then scores every job against your personal criteria — skills, seniority, salary, location, timezone, and benefits — entirely in the browser with no AI/LLM calls.

> **269 tests · 0 TypeScript errors · WCAG 2.2 AA**

---

## Quick start

```bash
cd web
cp .env.example .env.local
npm install
npm run dev        # http://localhost:3000
npm test           # run all tests
```

> Node.js 20+ required. See `web/README.md` for a one-line install if needed.

---

## How it works

```
Himalayas API ─┐
               ├─▶ aggregate (dedupe + cache) ─▶ GET /api/jobs
Remotive API  ─┘                                      │
                                                       ▼
                                              browser receives Job[]
                                                       │
                                               rankJobs(jobs, criteria)
                                               [pure, no network call]
                                                       │
                                               ranked cards + match %
```

1. On load, the server fetches both APIs in parallel, dedupes by company+title, and caches results for 6 hours.
2. The browser receives the full job list unscored.
3. Every criteria change triggers an instant client-side re-rank — zero extra network requests.

---

## Matching logic

**Stage 1 — Hard filters** (pass or fail, no partial credit)

| Filter | Rule |
|---|---|
| F1 Location | Keep if worldwide, country matches, or region matches (APAC / EUROPE / AMERICAS / AFRICA / MIDDLE\_EAST) |
| F2 Excluded keywords | Exclude if any excluded term appears (word boundary) in title + company + description |
| F3 Salary floor | Exclude if salary is known, same currency, and `annualMax < minSalary` |

**Stage 2 — Weighted score** (0–100%)

| Factor | Weight |
|---|---|
| Skills / keywords | 30 |
| Job title match | 20 |
| Salary | 15 |
| Benefits | 15 |
| Seniority | 10 |
| Employment type | 5 |
| Timezone | 5 |

Only factors the user has actually set count. Empty criteria → 100% for all jobs, sorted by recency.

---

## File structure

```
AIventure/
├── README.md
├── PROGRESS.md          build log — all 12 stages + current test count
├── Improve-plan.md      post-MVP improvements plan (4 items, all done)
├── SPEC.md              full product & technical specification
└── web/                 Next.js application
    ├── .env.example
    ├── src/
    │   ├── theme.ts                    MUI theme — WCAG AA colours, reduced-motion
    │   ├── app/
    │   │   ├── layout.tsx              Root layout — providers, metadata, font
    │   │   ├── page.tsx                Dashboard shell — fetch, re-rank, state
    │   │   └── api/jobs/route.ts       GET /api/jobs endpoint
    │   ├── components/
    │   │   ├── CriteriaForm.tsx        All criteria inputs + CV scan button
    │   │   ├── CvScanner.tsx           Upload PDF/DOCX → auto-fill criteria
    │   │   ├── JobList.tsx             Paginated list (10/page), sort, excluded toggle
    │   │   ├── JobCard.tsx             Card — match badge, salary, benefits, source link
    │   │   ├── JobDetailPanel.tsx      Modal — score breakdown, evidence, Apply button
    │   │   ├── ScoreBreakdown.tsx      Factor table with progress bars
    │   │   ├── BenefitChips.tsx        Benefit chips — must-haves highlighted
    │   │   ├── HighlightText.tsx       Wraps matched terms in <mark>
    │   │   ├── SourceAttribution.tsx   "Source: Himalayas / Remotive" link
    │   │   ├── SourceStatusBanner.tsx  Warning when a source is down
    │   │   ├── SkipLink.tsx            "Skip to results" — first focusable element
    │   │   └── LiveAnnouncer.tsx       Screen reader live region for re-rank updates
    │   ├── hooks/
    │   │   └── useCriteria.ts          Criteria ↔ localStorage (Zod validated, debounced)
    │   └── lib/
    │       ├── types.ts                Shared types — Job, Criteria, MatchResult, …
    │       ├── config.ts               Weights, TTL, page sizes, API URLs
    │       ├── sources/
    │       │   ├── himalayas.ts        Fetch + validate + normalize Himalayas jobs
    │       │   └── remotive.ts         Fetch + validate + normalize Remotive jobs
    │       ├── normalize/
    │       │   ├── countries.ts        Country name → alpha-2, alpha-2 → region (~100 countries)
    │       │   ├── location.ts         Parse Remotive free-text location
    │       │   ├── seniority.ts        Map seniority labels; infer from title
    │       │   ├── employment.ts       Map employment type strings
    │       │   ├── timezone.ts         Parse UTC offset strings and numbers
    │       │   └── html.ts             Strip HTML → plain text
    │       ├── aggregate/
    │       │   ├── aggregate.ts        Merge sources, filter, dedupe, sort
    │       │   ├── cache.ts            TTL cache with stale-on-error + 429 blocking
    │       │   └── dedupe.ts           Deduplicate by company + title
    │       ├── matching/
    │       │   ├── criteria.ts         Zod schema + DEFAULT_CRITERIA
    │       │   ├── benefits.ts         Detect 9 benefit types from job description
    │       │   ├── filters.ts          Hard filters F1 / F2 / F3
    │       │   ├── salary.ts           Parse free-text salary; annualize periods
    │       │   └── score.ts            Score 7 factors; rankJobs()
    │       └── cv/
    │           ├── parseCv.ts          PDF (pdfjs-dist) + DOCX (mammoth) → text
    │           ├── extractCriteria.ts  Extract skills / titles / seniority from CV text
    │           └── skills-dictionary.ts ~120 tech skills for matching
    └── tests/
        ├── fixtures/                   Recorded API responses (10 jobs each source)
        ├── a11y/                       axe-core WCAG tests for 4 key components
        ├── improve-*.test.ts           Post-MVP improvement regression tests
        └── *.test.ts                   Unit + integration tests (one file per module)
```

---

## API

```
GET /api/jobs?q=<optional>
```

Returns `{ jobs, sources, fetchedAt }`. One source failing returns 200 with partial data. Both sources failing with no cache returns 502.

---

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `HIMALAYAS_API_KEY` | — | Optional free key — higher rate limits. Server-side only. |
| `CACHE_TTL_SECONDS` | `21600` | Cache lifetime (6 h). Keep ≥ 21600 for Remotive's 4 calls/day limit. |
| `HIMALAYAS_MAX_PAGES` | `5` | Pages to browse (20 jobs/page). |

---

## Scripts

```bash
npm run dev      # development server
npm test         # all tests (vitest --run)
npm run lint     # ESLint
npm run build    # production build
```

# AI-DLC Quality Engineering Pipeline (`.kiro/`)

This repository uses **Kiro IDE**, **Kiro CLI**, **StrykerJS**, and **Husky** to enforce an automated, shift-left Quality Engineering (QE) pipeline across every stage of the **AI-Driven Development Life Cycle (AI-DLC)**.

---

## 1. Architecture Overview

```text
.kiro/
├── agents/
│   ├── spec-qa-architect.json                # Pre-code Spec & Design auditor (.kiro/specs/ only)
│   ├── spec-qa-architect-prompt.md
│   ├── qa-contract-reviewer.json             # Read-only API & DB breaking-change auditor
│   ├── qa-contract-reviewer-prompt.md
│   ├── qa-edge-case-reviewer.json            # Read-only adversarial code & diff auditor
│   ├── qa-edge-case-reviewer-prompt.md
│   ├── qa-test-writer.json                   # Test-only builder & mutant killer (*.test.* only)
│   └── qa-test-writer-prompt.md
├── hooks/
│   ├── auto-enrich-spec-ac.kiro.hook         # Auto-appends boundary/security AC to requirements.md
│   ├── auto-stress-test-design-spec.kiro.hook # Auto-audits design.md before tasks.md generation
│   ├── auto-traceability-audit.kiro.hook     # Verifies 100% AC-to-Task mapping in tasks.md
│   ├── auto-contract-guard.kiro.hook         # Guards API routes, DTOs & DB migrations on save
│   ├── auto-sync-unit-tests.kiro.hook        # Auto-updates & runs baseline unit tests on save
│   ├── chained-qa-audit-and-test.kiro.hook   # Manual 2-phase Reviewer -> Test-Writer pipeline
│   ├── kill-survived-mutants.kiro.hook       # Runs StrykerJS & hardens weak test assertions
│   └── pre-commit-qa-gate.kiro.hook          # Manual pre-commit security & test hygiene check
└── steering/
    ├── api-contract-standards.md             # Consumer-driven contract & schema validation rules
    ├── qa-documentation.md                   # Enforces English-only QA artifacts & specs
    ├── qa-standards.md                       # Enforces AAA pattern & 4-category test coverage
    ├── spec-qa-enrichment.md                 # Enforces EARS boundary, security & performance AC
    └── spec-traceability-gate.md             # Enforces 1:1 traceability from Spec to Tasks