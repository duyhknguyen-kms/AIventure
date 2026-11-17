# Bugfix Requirements Document

## Introduction

When a user opens the job board without setting any search criteria (DEFAULT_CRITERIA — all arrays empty, all nullable fields null), every job card displays a green "100% · Strong match" chip. This score is not a real match; it is a sentinel value returned by `scoreJob()` solely because no scoring factors were active. Showing it as a match badge misleads users into believing all jobs are perfect fits before they have configured any preferences. The fix removes the badge entirely when no criteria are active.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN all criteria fields are empty (keywords `[]`, targetTitles `[]`, excludedKeywords `[]`, seniority `[]`, employmentTypes `[]`, minSalary `null`, country `null`, timezoneOffset `null`, mustHaveBenefits `[]`, niceToHaveBenefits `[]`) THEN the system displays a "100% · Strong match" chip on every job card

1.2 WHEN `scoreJob()` returns a `MatchResult` whose every `FactorResult` has `active: false` THEN the system renders the match badge chip as if it reflected a genuine compatibility score

### Expected Behavior (Correct)

2.1 WHEN all criteria fields are empty THEN the system SHALL hide the match badge chip on job cards entirely, rendering no percentage and no match level label

2.2 WHEN `scoreJob()` returns a `MatchResult` whose every `FactorResult` has `active: false` THEN the system SHALL NOT render the `Chip` component in the `JobCard` action area

### Unchanged Behavior (Regression Prevention)

3.1 WHEN at least one criteria field is non-empty or non-null THEN the system SHALL CONTINUE TO display the match badge chip with the percentage calculated from active factors

3.2 WHEN criteria are partially filled (some factors active, some inactive) THEN the system SHALL CONTINUE TO compute `matchPercent` from active factors only and display it on the chip

3.3 WHEN criteria are set and `matchPercent` is 75 or above THEN the system SHALL CONTINUE TO show the "Strong match" label with `success` (green) color

3.4 WHEN criteria are set and `matchPercent` is between 50 and 74 inclusive THEN the system SHALL CONTINUE TO show the "Medium match" label with `warning` (yellow) color

3.5 WHEN criteria are set and `matchPercent` is below 50 THEN the system SHALL CONTINUE TO show the "Low match" label with `error` (red) color
