# default-card-match-badge-hidden Bugfix Design

## Overview

The job board shows a "100% · Strong match" chip on every card when no search criteria have been set. This score is a sentinel value: `scoreJob()` in `src/lib/matching/score.ts` returns `matchPercent = 100` specifically when `activeFactors.length === 0`, not because the job is actually a good match. The fix is a one-line conditional in `src/components/JobCard.tsx` — render the `Chip` only when at least one factor is active (`match.factors.some(f => f.active)`). No changes are required to the scoring engine or type definitions.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the misleading badge — all seven `FactorResult` entries in `match.factors` have `active: false`
- **Property (P)**: The desired behavior when C holds — no `Chip` is rendered on `JobCard`
- **Preservation**: All existing badge rendering, scoring, and aria-label behavior when at least one factor is active
- **`scoreJob()`**: The function in `src/lib/matching/score.ts` that scores one job against the user's criteria and populates `MatchResult.factors[]`
- **`FactorResult.active`**: A boolean on each of the 7 factor results (`skills`, `title`, `seniority`, `salary`, `employment`, `timezone`, `benefits`) that is `false` when the user has not configured that factor's criteria field(s)
- **`DEFAULT_CRITERIA`**: The initial criteria value in `src/lib/matching/criteria.ts` — every array is `[]` and every nullable field is `null`, causing all 7 factors to be inactive
- **`matchPercent = 100`**: The sentinel value `scoreJob()` deliberately returns when `activeFactors.length === 0`; it is not a real compatibility score

## Bug Details

### Bug Condition

The bug manifests when a `JobCard` receives a `MatchResult` whose every factor is inactive. The `CardHeader` `action` prop in `JobCard.tsx` unconditionally renders the `Chip` component, so the sentinel 100% score is always displayed, even though it carries no meaning.

**Formal Specification:**
```
FUNCTION isBugCondition(match: MatchResult)
  INPUT: match of type MatchResult
  OUTPUT: boolean

  RETURN match.factors.every(f => f.active === false)
  -- equivalently: !match.factors.some(f => f.active)
END FUNCTION
```

### Examples

- **Default state (bug present)**: User opens the app without touching `CriteriaForm`. All criteria are `DEFAULT_CRITERIA`. Every job card shows "100% · Strong match" (green chip). — Expected: no chip at all.
- **Keywords only**: User types `react` in the keywords field. `skills` factor becomes active (`active: true`). A job with React in its description scores 100%, a job without scores 0%. — Expected: chip is shown, scores vary. ✓ unaffected by the fix.
- **Mixed active/inactive**: User sets `minSalary` but nothing else. Only the `salary` factor is active. `matchPercent` is computed from that factor alone. — Expected: chip shown with the salary-based score. ✓ unaffected by the fix.
- **Edge case — empty keywords array reset**: User adds a keyword then removes it, returning to `[]`. `skills` factor reverts to `active: false`. If all other factors are also inactive after the reset, the chip should disappear. — Expected: chip hidden.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- When at least one criteria field is non-empty/non-null, the match badge chip MUST continue to render with the correct percentage and label
- The `matchLevel()` color logic (`success` ≥ 75%, `warning` ≥ 50%, `error` < 50%) MUST remain unchanged
- `scoreJob()` logic, `rankJobs()` ordering, and all `FactorResult` computations MUST remain unchanged — the fix is view-only
- `CardActionArea`'s aria-label MUST remain descriptive when the chip is shown; when the chip is hidden it MUST drop the misleading "100% Strong match" portion
- `BenefitChips`, `HighlightText`, `SourceAttribution`, and all other `JobCard` sub-components MUST remain unaffected

**Scope:**
All inputs where `match.factors.some(f => f.active)` is `true` must be completely unaffected by the fix. This includes:
- Any criteria configuration with ≥ 1 active factor
- Partial criteria (e.g., keywords set, all others empty)
- All matchPercent values (0–100) under active criteria

## Hypothesized Root Cause

The `Chip` in `src/components/JobCard.tsx` is rendered unconditionally in the `action` prop of `CardHeader` with no guard on whether the score is meaningful:

```tsx
// Current code (line ~82 in JobCard.tsx)
action={
  <Chip
    label={`${pct}% · ${levelLabel}`}
    color={color}
    size="small"
    sx={{ mt: 1, mr: 1 }}
  />
}
```

There is no check on `match.factors` before rendering. The scoring engine's convention of returning `matchPercent = 100` as a sentinel for "no active factors" is a valid internal representation, but `JobCard` has no awareness of it. The root cause is a **missing presentation-layer guard** between the scoring engine's sentinel value and the UI component that renders it.

No secondary causes are suspected. The `active` field is already present and accurate on every `FactorResult`; the fix simply needs to read it.

## Correctness Properties

Property 1: Bug Condition — Badge hidden when no criteria are active

_For any_ `MatchResult` where the bug condition holds (`match.factors.every(f => !f.active)`), the fixed `JobCard` SHALL NOT render the `Chip` component in the `CardHeader` action slot, and the `CardActionArea` aria-label SHALL NOT include a match percentage or match level label.

**Validates: Requirements 2.1, 2.2**

Property 2: Preservation — Badge shown correctly when criteria are active

_For any_ `MatchResult` where the bug condition does NOT hold (`match.factors.some(f => f.active)`), the fixed `JobCard` SHALL render the `Chip` with the same `label`, `color`, and `size` as before the fix, and the `CardActionArea` aria-label SHALL continue to include the match percentage and level label.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

**File:** `src/components/JobCard.tsx`

**Scope:** Presentation layer only — no changes to scoring engine, types, or other components.

**Specific Changes:**

1. **Derive `hasActiveCriteria` flag**: After destructuring `match`, add:
   ```tsx
   const hasActiveCriteria = match.factors.some((f) => f.active);
   ```

2. **Guard the `Chip` render**: Change the `action` prop on `CardHeader` from an unconditional `<Chip>` to a conditional expression:
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

3. **Update `aria-label`** on `CardActionArea` to avoid announcing a fake score:
   ```tsx
   aria-label={
     hasActiveCriteria
       ? `${job.title} at ${job.company}, ${pct}% ${levelLabel}`
       : `${job.title} at ${job.company}`
   }
   ```

No other files require changes. `scoreJob()` retains its sentinel `matchPercent = 100` behavior — the scoring contract is unchanged and the value is still used when criteria are active.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface a counterexample that demonstrates the chip renders on unfixed code when all factors are inactive, then verify the fix suppresses it and that all active-criteria paths continue to work.

### Exploratory Bug Condition Checking

**Goal:** Surface a counterexample that demonstrates the chip renders when all factors are inactive, confirming the root cause before the fix is applied.

**Test Plan:** Render `JobCard` in a test environment with a `MatchResult` whose every factor has `active: false` and `matchPercent: 100`. Assert that a chip with "100%" text exists in the DOM. This test MUST FAIL on unfixed code (chip found) and PASS on fixed code (chip absent).

**Test Cases:**

1. **All-inactive MatchResult**: Render `JobCard` with `DEFAULT_CRITERIA`-derived `MatchResult` (all 7 factors `active: false`, `matchPercent: 100`). Assert chip is absent. (Fails on unfixed code — chip is present)
2. **Single inactive factor**: Render with `scoreJob(job, DEFAULT_CRITERIA)` result directly from the engine. Assert the chip text `"100%"` does not appear. (Fails on unfixed code)
3. **Reset to default**: Simulate user clearing all criteria after having set some. Assert chip disappears. (Fails on unfixed code)
4. **Empty factors array edge case**: `MatchResult` with `factors: []`. Assert chip is absent. (Documents graceful handling of unexpected engine output)

**Expected Counterexamples:**
- Chip with label matching `/100%/` is found in the DOM when all factors are inactive
- Root cause confirmed: unconditional `<Chip>` render in `CardHeader` action prop

### Fix Checking

**Goal:** Verify that for all inputs where the bug condition holds, the fixed `JobCard` produces the expected behavior (no chip rendered).

**Pseudocode:**
```
FOR ALL match WHERE isBugCondition(match) DO
  result := render JobCard_fixed(job, match)
  ASSERT chip is absent from result
  ASSERT aria-label does NOT contain "%"
END FOR
```

### Preservation Checking

**Goal:** Verify that for all inputs where the bug condition does NOT hold, the fixed `JobCard` renders the chip exactly as before.

**Pseudocode:**
```
FOR ALL match WHERE NOT isBugCondition(match) DO
  ASSERT JobCard_original(job, match).chip = JobCard_fixed(job, match).chip
END FOR
```

**Testing Approach:** Property-based testing is well-suited for preservation checking because the space of `matchPercent` values and active-factor combinations is large. Generating random `MatchResult` values with at least one `active: true` factor covers edge cases at thresholds (50%, 75%) that manual unit tests might miss.

**Test Cases:**

1. **Chip shown with active skills factor**: One keyword set → `skills.active = true`. Assert chip rendered with correct label and `success`/`warning`/`error` color.
2. **Threshold boundary — 75%**: `matchPercent = 75` with active factors. Assert `color="success"` and label `"Strong match"`.
3. **Threshold boundary — 74%**: `matchPercent = 74` with active factors. Assert `color="warning"` and label `"Medium match"`.
4. **Threshold boundary — 50%** and **49%**: Assert `warning` and `error` colors respectively.
5. **Mixed active/inactive**: Only `salary` factor active. Assert chip shown with salary-based score.
6. **All factors active, 0%**: All criteria set but no match. Assert chip shown with `color="error"`.
7. **Aria-label with active criteria**: Assert aria-label includes `%` and match level string.

### Unit Tests

- Render `JobCard` with all-inactive `MatchResult` → assert no chip in DOM
- Render `JobCard` with one or more active factors → assert chip present with correct label
- Verify `hasActiveCriteria` derived value is `false` for `DEFAULT_CRITERIA`-scored results
- Verify aria-label omits match text when chip is hidden
- Verify aria-label includes match text when chip is shown

### Property-Based Tests

- Generate random `MatchResult` where `factors.every(f => !f.active)` → assert chip absent for any such input
- Generate random `MatchResult` where `factors.some(f => f.active)` → assert chip present and label matches `matchLevel(matchPercent)` for any such input
- Generate `matchPercent` values across 0–100 with at least one active factor → assert color thresholds are correct

### Integration Tests

- Full page render with `DEFAULT_CRITERIA` → assert no chip visible on any `JobCard` in the list
- Full page render after user sets one keyword → assert chip appears on all `JobCard` items
- Full page render with partial criteria → assert chip present and scores vary across jobs
