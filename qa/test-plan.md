# QA Test Plan

**Project:** AIventure — AI-Powered Job Matching Platform  
**Stage:** QA Validation & Test Planning  
**Date:** 2026-11-17  
**Scope:** Express workflow — post-build validation of the completed codebase  
**QA Lead:** aidlc-quality-agent (AI-DLC qa-validation stage)

---

## 1. Scope

### In Scope
- All 22 Functional Requirements (FR1–FR10 and sub-requirements)
- All 10 Non-Functional Requirements (NFR1–NFR6)
- 289 existing automated tests (Vitest + axe-core)
- Traceability validation: requirements → test cases → results
- Coverage gap analysis

### Out of Scope
- Live API calls to Himalayas or Remotive (all mocked)
- Production deployment validation (Assumption A6)
- End-to-end browser automation (no Playwright/Cypress in scope)
- Manual screen reader testing (flagged as a gap, not performed here)
- Load/performance testing (NFR1 gap — out of PoC scope)

---

## 2. Test Strategy

This project uses the **Minimal test strategy** (Express scope). The strategy means:
- One verifiable test per requirement at the narrowest effective level
- At least one happy-path unit test per component
- Existing suite remains green

### Testing levels present

| Level | Framework | Environment | Scope |
|---|---|---|---|
| Unit | Vitest 5.1.0 | Node.js | Business logic, adapters, normalization, scoring |
| Component (Accessibility) | Vitest + axe-core | jsdom | UI components (4 suites) |
| Integration (API route) | Vitest + mock `fetch` | Node.js | `GET /api/jobs` route handler |
| Regression | Vitest | Node.js | Bug fixes: filters, pagination, CV extraction, match badge |

### Not present (gaps)
- End-to-end (real browser) tests
- Performance / load tests
- Contract tests against live APIs
- Manual exploratory testing

---

## 3. Tools and Frameworks

| Tool | Version | Purpose |
|---|---|---|
| Vitest | 5.1.0 | Test runner |
| axe-core | (via `@axe-core/react`) | Accessibility assertions |
| jsdom | (Vitest default) | DOM simulation for UI tests |
| TypeScript | (project version) | Type checking (`npx tsc --noEmit`) |
| ESLint | (project version) | Static analysis (`npm run lint`) |

---

## 4. Entry and Exit Criteria

### Entry Criteria (required before QA starts)
- [x] `npm test` exits 0 with 289 passing tests
- [x] `npx tsc --noEmit` exits 0
- [x] `npm run lint` exits 0 (5 non-blocking warnings in test files permitted)
- [x] All build-and-test gates passed (from `build-and-test-summary.md`)

All entry criteria are met. QA proceeds.

### Exit Criteria (required for QA sign-off)
- [x] All FRs with automated coverage confirmed as Covered or Partially Covered with documented gaps
- [x] Traceability matrix complete: every FR and NFR has a row with coverage verdict
- [x] Defects (if any) documented with severity and status
- [x] Risk register documented
- [x] QA report with final verdict produced

---

## 5. Test Environment

| Aspect | Detail |
|---|---|
| OS | macOS (darwin) |
| Runtime | Node.js 20 LTS |
| Test runner environment | Node.js (unit tests), jsdom (component tests) |
| Browser coverage | jsdom only — **no real browser engine used** |
| Live APIs | None — all network calls stubbed with mocked `fetch` |
| Deployment | Local (`npm run dev`) — no production deployment |

**Browser testing gap:** Tests marked as browser evidence in the matrix were checked in jsdom. jsdom does not simulate real browser behaviour for `fetch`, CSS, layout, or screen reader announcements. Features requiring real browser validation are marked `Unverified (browser)` in the test cases.

---

## 6. Risk Register

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Real browser behaviour differs from jsdom (layout, `fetch`, animations) | Medium | Medium | Manual smoke test before demo; add Playwright for ≥1 happy-path E2E before production |
| R2 | Live Himalayas / Remotive API schema changes break adapters | Medium | High | Fixture-based tests catch regressions; re-verify field presence on first real API call |
| R3 | Performance target (< 2 s) unvalidated — could fail under real network conditions | Low (PoC) / High (prod) | High (prod) | Add `autocannon` or `k6` smoke test before any production release |
| R4 | NVDA + Chrome screen reader announces content differently than axe-core reports | Low | Medium | Manual accessibility audit with real AT before production |
| R5 | localStorage persistence regression (no automated test) | Low | Medium | Add `useCriteria.test.ts` with `vi.mock` for localStorage |

---

## 7. Schedule

| Activity | Status |
|---|---|
| Requirements loaded from `requirements.md` | Complete |
| Existing test run (`npm test`) | Complete (289 pass, 0 fail) |
| Coverage gap analysis (`functional-spec-review.md`) | Complete |
| QA user stories produced (`user-stories.md`) | Complete |
| Test cases documented (`test-cases.md`) | Complete |
| Traceability matrix produced (`traceability-matrix.md`) | Complete |
| QA report produced (`qa-report.md`) | Complete |

---

## 8. Approvals

This QA Test Plan is produced by the `qa-validation` stage of the AI-DLC Express workflow for the `261117-job-matcher-mvp` intent. It reflects the state of the codebase as delivered by the Code Generation and Build and Test stages on 2026-11-17.
