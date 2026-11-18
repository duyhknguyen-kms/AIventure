---
slug: qa-validation
name: QA Validation & Test Planning
phase: operation
execution: CONDITIONAL
condition: Runs when explicitly included in a scope plan or invoked via --single. Requires build-and-test to have completed. Analyses existing test results and requirements, then produces a comprehensive QA validation report.
lead_agent: aidlc-quality-agent
support_agents: []
mode: inline
reviewer: aidlc-architecture-reviewer-agent
review_artifact: qa-report
review_class: advisory
reviewer_max_iterations: 1
produces:
  - qa-user-stories
  - qa-functional-spec-review
  - qa-test-plan
  - qa-test-cases
  - qa-traceability-matrix
  - qa-report
consumes:
  - artifact: requirements
    required: true
  - artifact: build-and-test-summary
    required: true
  - artifact: cross-unit-traceability
    required: false
  - artifact: code-summary
    required: false
  - artifact: code-generation-plan
    required: false
requires_stage:
  - build-and-test
scopes:
  - express
  - classic
  - feature
  - mvp
  - enterprise
inputs: "requirements.md (from requirements-analysis), build-and-test-summary.md, OPTIONAL: cross-unit-traceability.md, code-summary.md, code-generation-plan.md"
outputs: "qa-user-stories.md, qa-functional-spec-review.md, qa-test-plan.md, qa-test-cases.md, qa-traceability-matrix.md, qa-report.md (under <record>/operation/qa-validation/, engine-resolved). Consolidated outputs also written to qa/ in the workspace root."
---

# QA Validation & Test Planning

## Steps

### Step 1: Load source artifacts

Read all available inputs from the active intent's record dir:
- `<record>/inception/requirements-analysis/requirements.md` — functional requirements, NFRs, acceptance criteria, constraints
- `<record>/construction/build-and-test/build-and-test-summary.md` — quality gate results, test strategy, NFR compliance
- `<record>/construction/build-and-test/test-results.md` — per-file test counts, pass/fail results, coverage notes
- `<record>/construction/build-and-test/cross-unit-traceability.md` — FR → unit → test file mapping (if present)
- `<record>/construction/code-generation/code-summary.md` — delivered files, unit breakdown (if present)
- `<record>/construction/code-generation/code-generation-plan.md` — implementation decisions (if present)

Do NOT invent business rules, test results, or coverage numbers that are not present in these artifacts. If a source is absent, note it in the QA report and work with what is available.

### Step 2: Generate QA-Ready User Stories

Create `<record>/operation/qa-validation/qa-user-stories.md`.

For each functional requirement (FR) and significant sub-requirement in `requirements.md`:
- Write a QA-perspective user story in the format: *As a [actor], I want [action] so that [outcome]*
- Write Given/When/Then acceptance criteria derived directly from the requirement's stated acceptance criteria — do not invent new ones
- Assign each story a stable ID (`QA-US-{n}`) and cross-reference the originating FR ID
- Flag any requirement whose acceptance criteria are ambiguous, untestable, or missing a measurable threshold

Group stories by functional area (Aggregation, Normalization, Filtering, Scoring, UI, NFRs).

### Step 3: Functional Specification Review

Create `<record>/operation/qa-validation/qa-functional-spec-review.md`.

Review the requirements against the implemented artifacts:
- For each FR, determine whether it is Covered, Partially Covered, Uncovered, or Out of Scope
- For Partially Covered or Uncovered items, identify: what is missing, which test file (if any) exercises it, and what test case would provide coverage
- Review NFRs (accessibility, security, performance, testability) for testability gaps
- List assumptions from the requirements doc and assess whether the implementation addressed them
- Identify open questions that remain unresolved from the requirements doc

### Step 4: Test Plan

Create `<record>/operation/qa-validation/qa-test-plan.md`.

The test plan must cover:
- **Scope**: what is in and out of scope for this QA cycle
- **Test strategy**: the testing levels present (unit, integration, accessibility, component), mapped to the express-scope Minimal strategy
- **Tools and frameworks**: list what was used (Vitest, axe-core, jsdom, etc.)
- **Entry and exit criteria**: what state the build must be in to start QA; what constitutes QA sign-off
- **Test environment**: describe where tests run (Node, jsdom, etc.) and any browser-based gaps
- **Risk register**: list top 3–5 test risks (e.g., no real browser test, no live API test, no E2E)
- **Schedule**: this stage runs post-build; outputs are validation of the completed build

### Step 5: Test Cases

Create `<record>/operation/qa-validation/qa-test-cases.md`.

Write test cases for each functional area. For each test case:
- Assign a stable ID (`TC-{area}-{n}`, e.g., `TC-AGG-001`)
- State: Requirement ID, Test Type (unit/integration/accessibility/e2e), Preconditions, Steps, Expected Result, Actual Result (from test-results.md if covered; "Not executed" if not), Status (Pass / Fail / Not Executed / Covered by existing test)
- Cover: happy path, at least two negative/error scenarios, and one edge case per requirement area

Do NOT mark a test case as "Pass" unless it maps to a named test in `test-results.md` or `cross-unit-traceability.md`. All remaining cases are "Not Executed" with a note on whether a new test would be needed.

Mandatory test case groups:
- API aggregation and partial failure (FR1, FR1.1–FR1.3)
- Data normalization (FR2–FR2.4)
- Deduplication (FR3)
- Caching and stale data (FR4–FR4.2)
- Criteria persistence (FR5–FR5.1)
- Filtering (FR6)
- Scoring factors (FR7–FR7.7)
- Benefit detection (FR8–FR8.1)
- UI rendering and states (FR9–FR9.8)
- Search (FR10)
- Accessibility (NFR3–NFR3.8)
- Security (NFR4)

### Step 6: Traceability Matrix

Create `<record>/operation/qa-validation/qa-traceability-matrix.md`.

Build a matrix with one row per FR and NFR:

| Requirement ID | Description | QA-US ID | Test Case IDs | Test File | Covered? |
|---|---|---|---|---|---|

For every row:
- Map to the QA user story from Step 2
- Map to the test cases from Step 5
- Map to the existing test file from `cross-unit-traceability.md` or `test-results.md`
- Mark Covered (existing test passes), Partially Covered (some AC tested), Uncovered (no test), or N/A (out of scope/post-MVP)

### Step 7: Execute available tests and record actual results

Attempt to run the project's test suite to collect fresh evidence for the test cases:

1. Run `cd web && npm test` and capture output
2. Run `cd web && npx tsc --noEmit` to confirm TypeScript passes
3. Update `qa-test-cases.md` Actual Result and Status columns from this run's output
4. If tests cannot run (missing deps, environment issue), record the failure and use the evidence from `test-results.md` as the basis

Do NOT claim tests passed without execution evidence from this run or `test-results.md`.

### Step 8: QA Report

Create `<record>/operation/qa-validation/qa-report.md`.

The report covers:
- **Executive summary**: overall QA verdict (Ready / Conditionally Ready / Not Ready), test date, scope
- **Quality gate status**: table of gates (test count, pass rate, TypeScript, lint, axe, golden test) with actual values
- **Coverage analysis**: % of FRs covered by tests, uncovered items with risk rating (Critical/High/Medium/Low)
- **Defects found**: list any defects identified during this stage (ID, severity, description, affected requirement, status)
- **Risks**: top risks not mitigated by the existing test suite (no live API test, no real browser E2E, no load test)
- **Recommendation**: sign-off for the current scope, explicit list of what requires attention before a production release
- **Traceability summary**: link to the traceability matrix

### Step 9: Write consolidated outputs to workspace qa/ directory

After all record-dir artifacts are written, copy or regenerate the same content to:
- `qa/user-stories.md`
- `qa/functional-spec-review.md`
- `qa/test-plan.md`
- `qa/test-cases.md`
- `qa/traceability-matrix.md`
- `qa/qa-report.md`

This makes the QA outputs accessible at the workspace root for direct reference outside the AI-DLC record tree.

### Step 10: Completion

Run `aidlc engine orchestrate report --stage qa-validation --result <outcome>` to close the stage attempt.

Present:

```
# :white_check_mark: QA Validation & Test Planning Complete
```

Summary of QA verdict, coverage rate, and top 3 risks. Then:

```
**Review:** `<record>/operation/qa-validation/` and `qa/`
```

Approval gate: 2-option (Approve / Request Changes).

## Sensors

This stage imports `required-sections` and `upstream-coverage`.

Upstream targets: `requirements`, `build-and-test-summary`.

## Learn

When `directive.protocol_modules` lists `learnings`, follow `stage-protocol-learnings.md`.
