# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - All-Inactive Factors Badge Renders
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface a counterexample that demonstrates the chip renders when `match.factors.every(f => !f.active)`
  - **Scoped PBT Approach**: Scope the property to the concrete failing case — a `MatchResult` with all 7 `FactorResult` entries having `active: false` and `matchPercent: 100`
  - Create `web/tests/components/JobCard.bugfix.test.tsx` (jsdom environment, `@testing-library/react` + Vitest)
  - Import the existing `makeJob` / `makeMatch` helpers pattern from `web/tests/a11y/JobCard.a11y.test.tsx`, or replicate locally
  - Define `makeAllInactiveMatch()`: returns a `MatchResult` with `matchPercent: 100` and `factors` set to all 7 `FactorResult` objects with `active: false` (`skills`, `title`, `seniority`, `salary`, `employment`, `timezone`, `benefits`)
  - Write a parameterized test using `it.each` over representative all-inactive inputs (7-factor array, empty-factors array `[]`) that asserts no element with `/100%/` or `/Strong match/i` text exists in the rendered DOM (use `queryByText` or `container.textContent`)
  - Also assert the `button` element's `aria-label` does NOT contain `%`
  - Run test on UNFIXED code: `cd web && npm test -- --run tests/components/JobCard.bugfix.test.tsx`
  - **EXPECTED OUTCOME**: Test FAILS — chip with "100% · Strong match" is found (confirms bug exists)
  - Document counterexamples found (e.g., `"100% · Strong match"` chip rendered when `factors.every(f => !f.active)`)
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Active Criteria Badge Renders Correctly
  - **IMPORTANT**: Follow observation-first methodology — observe unfixed code behavior first
  - Observe on UNFIXED code: `JobCard` with one active factor (`skills.active: true`, `matchPercent: 88`) renders chip with "88% · Strong match"
  - Observe: `matchPercent: 60` with active factor renders "60% · Medium match" chip with `warning` color
  - Observe: `matchPercent: 30` with active factor renders "30% · Low match" chip with `error` color
  - In `web/tests/components/JobCard.bugfix.test.tsx`, add parameterized preservation tests using `it.each` over the following generated inputs:
    - `[88, "Strong match", "success"]` — single active `skills` factor
    - `[75, "Strong match", "success"]` — lower boundary of `success`
    - `[74, "Medium match", "warning"]` — upper boundary of `warning`
    - `[50, "Medium match", "warning"]` — lower boundary of `warning`
    - `[49, "Low match", "error"]` — upper boundary of `error`
    - `[0, "Low match", "error"]` — minimum score with active factors
    - Mixed: only `salary` factor active, `matchPercent: 55` → chip shown
    - All 7 factors active, `matchPercent: 100` → chip shown (not hidden — bug condition does NOT apply)
  - For each input: render `JobCard` with a `MatchResult` where `factors.some(f => f.active)` is `true`; assert chip text matches `/${pct}%/` and `/${label}/i`
  - Also assert `button` aria-label contains `%` and the level label string
  - Run tests on UNFIXED code: `cd web && npm test -- --run tests/components/JobCard.bugfix.test.tsx`
  - **EXPECTED OUTCOME**: All preservation tests PASS (confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Fix: hide match badge when no criteria are active

  - [x] 3.1 Implement the fix in `web/src/components/JobCard.tsx`
    - Directly after the `const { pct, label: levelLabel, color }` destructure, add:
      ```tsx
      const hasActiveCriteria = match.factors.some((f) => f.active);
      ```
    - In `CardHeader`, change the `action` prop from an unconditional `<Chip>` to:
      ```tsx
      action={
        hasActiveCriteria ? (
          <Chip
            label={`${pct}% · ${levelLabel}`}
            color={color}
            size="small"
            sx={{ mt: 1, mr: 1 }}
          />
        ) : undefined
      }
      ```
    - Update the `CardActionArea` `aria-label` to:
      ```tsx
      aria-label={
        hasActiveCriteria
          ? `${job.title} at ${job.company}, ${pct}% ${levelLabel}`
          : `${job.title} at ${job.company}`
      }
      ```
    - No other files require changes — scoring engine, types, and all other components are untouched
    - _Bug_Condition: `isBugCondition(match)` = `match.factors.every(f => !f.active)` (from design §Bug Condition)_
    - _Expected_Behavior: `hasActiveCriteria ? render Chip : undefined` (from design §Fix Implementation)_
    - _Preservation: all inputs where `match.factors.some(f => f.active)` are unaffected (from design §Preservation Requirements)_
    - _Requirements: 2.1, 2.2, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - All-Inactive Factors Badge Hidden
    - **IMPORTANT**: Re-run the SAME test file from task 1 — do NOT write new tests
    - The test from task 1 asserts chip is absent for all-inactive `MatchResult` inputs
    - When this test passes, it confirms the fix correctly suppresses the misleading badge
    - Run: `cd web && npm test -- --run tests/components/JobCard.bugfix.test.tsx`
    - **EXPECTED OUTCOME**: Bug condition tests PASS (confirms bug is fixed)
    - Also verify `aria-label` assertions pass (no `%` when all factors inactive)
    - _Requirements: 2.1, 2.2_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Active Criteria Badge Rendering Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run the full test file: `cd web && npm test -- --run tests/components/JobCard.bugfix.test.tsx`
    - **EXPECTED OUTCOME**: All preservation tests PASS (confirms no regressions)
    - Chip label, color, and aria-label behavior for active-criteria inputs must be identical to pre-fix baseline
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4. Checkpoint — Ensure all tests pass
  - Run the full web test suite: `cd web && npm test`
  - Confirm `tests/components/JobCard.bugfix.test.tsx` passes entirely (both bug condition and preservation suites)
  - Confirm existing tests in `tests/a11y/JobCard.a11y.test.tsx` still pass — note: the existing `makeMatch()` in that file uses `factors: []`, which will now be treated as all-inactive; the aria-label and chip assertions in that file should be reviewed and updated if they assert on match percentage text (see `"match badge text includes the level word"` test)
  - Confirm `tests/score.test.ts` passes — the scoring engine is unchanged
  - Ensure all tests pass; ask the user if questions arise
