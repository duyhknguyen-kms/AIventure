# User Stories

**Stage:** user-stories
**Intent:** 261118-ai-job-enhancement
**Date:** 2026-11-18
**Source requirements:** `inception/requirements-analysis/requirements.md`

---

## Epic 1: Enhanced CV Parsing (FR1)

### US-001 — Broader skills recognition after CV upload

**Persona:** P1 (Alex — Remote Job Seeker)
**Requirement:** FR1.1

> As a job seeker uploading my CV,
> I want my skills extracted from a wider set of technologies
> so that I do not have to manually add modern tools the app does not recognise.

**Acceptance Criteria:**

- **Given** I upload a CV that mentions "Bun", "Vitest", "Zod", "tRPC", "Turborepo", "Playwright", "Kubernetes", "dbt", and "PyTorch"
- **When** `extractSkills()` runs against the extracted CV text
- **Then** all nine skills are present in the returned list (the expanded dictionary covers them)

- **Given** my CV mentions "React.js" and "PostgreSQL"
- **When** `extractSkills()` runs
- **Then** "React" and "Postgres" are matched (alias normalisation) so I see the canonical form

- **Given** I upload a CV with no skills the dictionary covers
- **When** extraction runs
- **Then** an empty list is returned — no false positives

**Out of scope:** LLM-based extraction (deferred). The dictionary remains a static TypeScript file.

**Test file:** `web/tests/improve-cv.test.ts` (expand existing suite)

---

### US-002 — Accurate job title extraction from role history

**Persona:** P1 (Alex — Remote Job Seeker)
**Requirement:** FR1.2

> As a job seeker,
> I want the app to pick up my actual job titles from my CV's work history
> so that the target-titles field is pre-filled with roles I have actually held.

**Acceptance Criteria:**

- **Given** my CV contains "Senior Software Engineer at ACME (2022–2024)"
- **When** `extractJobTitles()` runs
- **Then** "Senior Software Engineer" is in the returned list

- **Given** my CV contains "Staff Platform Engineer\nABC Corp | Jan 2021 – Mar 2022"
- **When** `extractJobTitles()` runs
- **Then** "Staff Platform Engineer" is in the returned list

- **Given** an extracted title "senior software engineer" (lowercase from parsing)
- **When** normalisation runs
- **Then** the stored title is "Senior Software Engineer" (title case)

- **Given** my CV lists the same role twice in different sections
- **When** extraction runs
- **Then** the deduped list contains the title once

- **Given** the CV mentions only technologies with no role history
- **When** `extractJobTitles()` runs
- **Then** the returned list is empty — no spurious titles

**Test file:** `web/tests/improve-cv.test.ts` (extend with new fixtures)

---

## Epic 2: QA Validation Layer (FR2)

### US-003 — Expanded golden dataset for scoring regression safety

**Persona:** P2 (Jordan — Developer / QA Engineer)
**Requirement:** FR2.1

> As a developer maintaining the matching engine,
> I want a broad golden dataset of job+criteria pairs with known expected scores
> so that any scoring regression is caught immediately by CI.

**Acceptance Criteria:**

- **Given** `web/tests/fixtures/golden-scoring.json` exists with ≥10 entries
- **When** each entry's `job` and `criteria` are passed to `scoreJob()`
- **Then** the returned `matchPercent` is within ±2 percentage points of `expectedMatchPercent`

- **Given** a golden entry with all criteria fields empty (zero active factors)
- **When** `scoreJob()` runs
- **Then** `matchPercent === 100` (every job is a perfect match when no preferences are set)

- **Given** a golden entry that is a salary-only match (all other criteria empty, only `minSalary` set)
- **When** `scoreJob()` runs
- **Then** only the salary factor contributes to the score

- **Given** a golden entry with no matching skills and no matching title
- **When** `scoreJob()` runs
- **Then** `matchPercent` is in [0, 100] — not negative, not > 100

- **Given** the golden dataset file is updated
- **When** `npm test` runs in CI
- **Then** all golden entries pass within tolerance — a regression fails the build

**Test file:** `web/tests/score-golden.test.ts` (new file)
**Fixture:** `web/tests/fixtures/golden-scoring.json` (new file)

---

### US-004 — Property-based tests for scoring invariants

**Persona:** P2 (Jordan — Developer / QA Engineer)
**Requirement:** FR2.2

> As a developer,
> I want property-based tests that verify the scorer behaves correctly for any valid input
> so that edge cases I did not think of are caught before they reach users.

**Acceptance Criteria:**

- **Given** any randomly generated valid `Job` object and any randomly generated valid `Criteria` object
- **When** `scoreJob(job, criteria)` runs
- **Then** `matchPercent` is an integer (not a float) in [0, 100]

- **Given** any valid `Job` and a `Criteria` with all array fields empty and all nullable fields null
- **When** `scoreJob()` runs
- **Then** `matchPercent === 100`

- **Given** a list of randomly generated valid jobs
- **When** `rankJobs(jobs, criteria)` runs
- **Then** the `ranked` array is sorted: `ranked[i].match.matchPercent >= ranked[i+1].match.matchPercent` for all i

- **Given** a job with `publishedAt = "2024-01-01"` and another with `publishedAt = "2024-06-01"` that tie on `matchPercent`
- **When** `rankJobs()` runs
- **Then** the more recently published job appears first

- **Given** `scoreJob()` is called with a `Criteria` where only one factor is active
- **When** it runs
- **Then** `matchPercent` is determined solely by that factor's score and weight (all others are excluded from the divisor)

**Library:** any property-based library that integrates with Vitest (e.g., `fast-check`) — no preference stated
**Test file:** `web/tests/score-property.test.ts` (new file)

---

### US-005 — Requirements traceability matrix

**Persona:** P2 (Jordan — Developer / QA Engineer)
**Requirement:** FR2.3

> As a developer,
> I want a traceability matrix that links every requirement to a test case
> so that I can see at a glance whether the codebase is fully tested against the spec.

**Acceptance Criteria:**

- **Given** the requirements in `requirements.md` (FR1–FR2, NFR1–NFR3)
- **When** the traceability matrix at `qa/traceability-matrix.md` is produced
- **Then** every FR and NFR has a row with: requirement ID, description, test file, test case name or description, and status (Covered / Not Covered)

- **Given** a requirement that has no automated test
- **When** it appears in the matrix
- **Then** its status is "Not Covered" with a brief rationale (e.g., "browser-API coupling; accepted gap")

- **Given** the matrix is produced
- **When** I look up FR1.1
- **Then** I see it maps to `improve-cv.test.ts` with the specific test case names

- **Given** the existing 289 tests
- **When** the matrix is produced
- **Then** all existing requirements from the Express MVP (FR1–FR10) are also represented in the matrix (carried forward from `qa/traceability-matrix.md`)

**Output:** `qa/traceability-matrix.md` (extends the existing file from the Express QA stage)

---

## Coverage summary

| Story | Requirement | Persona | Priority |
|---|---|---|---|
| US-001 | FR1.1 | P1 | Must |
| US-002 | FR1.2 | P1 | Must |
| US-003 | FR2.1 | P2 | Must |
| US-004 | FR2.2 | P2 | Must |
| US-005 | FR2.3 | P2 | Should |

**NFR coverage:**
- NFR1 (80% coverage): covered implicitly — all new test files contribute to coverage; CI enforces the floor.
- NFR2 (accessibility): no new UI components in this intent; existing axe suite remains the check.
- NFR3 (backward compatibility): covered by US-001 through US-004 not modifying existing passing tests.

## Assumptions & Open Questions

None. All requirements are locked and all stories are independently testable.

## Sources

Initial description: `project-description.json`
Requirements: `inception/requirements-analysis/requirements.md`
Brownfield evidence: `codekb/AIventure/business-overview.md`, `component-inventory.md`
Team practices: `inception/practices-discovery/team-practices.md`
