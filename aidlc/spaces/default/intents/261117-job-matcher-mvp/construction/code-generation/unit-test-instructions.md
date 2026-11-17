# Unit Test Instructions

**Stage:** code-generation  
**Intent:** 261117-job-matcher-mvp  
**Date:** 2026-11-17  
**Scope:** express

---

## Test Framework Setup

### Dependencies

All test dependencies are installed in Step 2 of the code generation plan:

```bash
cd web
npm install --save-dev vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom axe-core
```

### Configuration

Vitest is configured in `web/vitest.config.ts` (created in Step 3):

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/app/**', // Next.js app structure, tested via component tests
        '**/*.d.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

Setup file `web/vitest.setup.ts`:

```typescript
import '@testing-library/jest-dom';
```

---

## Running Tests

### All Tests

Run the full test suite:

```bash
cd web
npm test
```

Or with Vitest's watch mode:

```bash
npm test -- --watch
```

### Specific Test Files

Run a single test file:

```bash
npm test -- tests/normalize.test.ts
```

Run tests matching a pattern:

```bash
npm test -- tests/sources.*.test.ts
```

### Coverage

Generate coverage report:

```bash
npm test -- --coverage
```

Coverage targets are checked by the full project test suite. Individual unit tests may not hit the 80% line coverage floor alone, as integration and component tests contribute to the overall coverage.

### UI Mode

Vitest's UI mode provides a visual test runner:

```bash
npm run test:ui
```

---

## Test Structure

### Unit Tests (Pure Functions)

**Location:** `web/tests/`

Test files for pure utility functions, adapters, and business logic:

- `normalize.test.ts` — HTML stripping, employment type, seniority, location, timezone parsing
- `salary.test.ts` — Salary parsing and annualization
- `benefits.test.ts` — Benefit keyword detection and evidence extraction
- `filters.test.ts` — Hard filters (location, excluded keywords, salary floor)
- `score.test.ts` — Factor scoring, weighted match calculation, ranking (includes §7.5 SPEC golden test)
- `aggregate.test.ts` — Job aggregation, deduplication, expiration filtering
- `sources.himalayas.test.ts` — Himalayas adapter with fixtures
- `sources.remotive.test.ts` — Remotive adapter with fixtures
- `route.jobs.test.ts` — `/api/jobs` route handler

**Pattern:**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { functionUnderTest } from '@/lib/module';

describe('functionUnderTest', () => {
  it('should handle the happy path', () => {
    const result = functionUnderTest(input);
    expect(result).toEqual(expectedOutput);
  });

  it('should handle edge case', () => {
    const result = functionUnderTest(edgeInput);
    expect(result).toBe(expectedEdgeOutput);
  });
});
```

### Component Tests

**Location:** `web/tests/` or inline `web/src/components/*.test.tsx`

Test files for React components using `@testing-library/react`:

- Component rendering, prop handling, user interactions
- Mock data provided as props (no API calls in component tests)
- Use `render()`, `screen`, `userEvent` from Testing Library

**Pattern:**

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JobCard } from '@/components/JobCard';

describe('JobCard', () => {
  it('displays job title and company', () => {
    const mockJob = { id: '1', title: 'Engineer', company: 'Acme', /* ... */ };
    const mockMatch = { matchPercent: 88, /* ... */ };
    
    render(<JobCard job={mockJob} match={mockMatch} onClick={() => {}} />);
    
    expect(screen.getByText('Engineer')).toBeInTheDocument();
    expect(screen.getByText('Acme')).toBeInTheDocument();
  });
});
```

### Accessibility Tests

**Location:** `web/tests/a11y/`

Test files running axe-core on rendered components:

- `axe.ts` — Helper function `runAxe(container)` with WCAG 2.2 AA rule tags
- `JobCard.a11y.test.tsx`
- `CriteriaForm.a11y.test.tsx`
- `JobDetailPanel.a11y.test.tsx`
- `Dashboard.a11y.test.tsx`

**Pattern:**

```typescript
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { runAxe } from './axe';
import { JobCard } from '@/components/JobCard';

describe('JobCard accessibility', () => {
  it('has no axe violations', async () => {
    const { container } = render(<JobCard job={mockJob} match={mockMatch} onClick={() => {}} />);
    const results = await runAxe(container);
    expect(results.violations).toHaveLength(0);
  });
});
```

`web/tests/a11y/axe.ts` helper:

```typescript
import { configureAxe } from 'axe-core';

const axe = configureAxe({
  rules: [
    { id: 'color-contrast', enabled: true },
    { id: 'label', enabled: true },
    // ... all WCAG 2.2 AA rules
  ],
});

export async function runAxe(container: HTMLElement) {
  return await axe.run(container, {
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'],
    },
  });
}
```

---

## Expected Coverage Targets

### Minimal Strategy (Express Scope)

- **Requirement-driven unit tests:** At least 1 test per requirement (functional and non-functional)
- **Happy-path floor:** Each component and utility function has at least one happy-path test
- **Approximate test count:** ~30 unit tests (logic/utils), ~15 component tests, ~4 a11y tests

### Scope Floor (Express)

- **Test strategy:** Minimal (as above)
- **Coverage floor:** No additional floor beyond Minimal strategy for express scope
- **Existing test suite:** N/A (greenfield project)

### Project-Wide Coverage Floor

The team's Testing Posture (from `aidlc/spaces/default/memory/team.md`) defines an 80% line coverage floor. This floor is measured by running the **full test suite** on the **assembled project**, not by individual unit-scoped commands.

The unit-scoped test commands below may report < 80% coverage because they only run tests for specific modules. This is expected and acceptable. The 80% floor will be verified in the Build and Test stage, which runs all tests together.

---

## Mocking & Stubbing Guidance

### External APIs (fetch)

Use Vitest's `vi.mock()` to stub `fetch` in source adapter tests:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchHimalayas } from '@/lib/sources/himalayas';

beforeEach(() => {
  global.fetch = vi.fn();
});

it('fetches and transforms Himalayas jobs', async () => {
  const mockResponse = { jobs: [/* fixture data */], nextCursor: null };
  (global.fetch as any).mockResolvedValueOnce({
    ok: true,
    json: async () => mockResponse,
  });

  const jobs = await fetchHimalayas();
  
  expect(jobs).toHaveLength(1);
  expect(jobs[0].source).toBe('himalayas');
});
```

### localStorage

Mock `window.localStorage` in `useCriteria` hook tests:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

beforeEach(() => {
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    clear: vi.fn(),
  };
  global.localStorage = localStorageMock as any;
});
```

### globalThis Cache

Mock or clear `globalThis.__aiventureCache` in cache module tests:

```typescript
beforeEach(() => {
  globalThis.__aiventureCache = undefined;
});
```

---

## Test Data Management

### Fixtures

Recorded API responses are stored in `web/tests/fixtures/`:

- `himalayas-browse.json` — Sample response from browse endpoint (Step 19)
- `himalayas-search.json` — Sample response from search endpoint (Step 19)
- `remotive.json` — Sample response from `/api/remote-jobs` (Step 20, first real call)

Fixtures are committed to version control. They represent real API responses observed during development and serve as the source of truth for adapter tests.

### Golden Tests

The §7.5 SPEC worked example is a **golden test** in `tests/score.test.ts`:

```typescript
it('matches the §7.5 SPEC worked example', () => {
  const job = {
    // ... Senior Frontend Engineer job from SPEC
  };
  const criteria = {
    keywords: ['react', 'typescript', 'node', 'graphql'],
    targetTitles: ['frontend engineer'],
    seniority: ['senior'],
    // ... rest of criteria from SPEC
  };
  
  const result = scoreJob(job, criteria);
  
  expect(result.matchPercent).toBe(88); // exact
  expect(result.factors.find(f => f.key === 'skills')!.score).toBe(0.75);
  expect(result.factors.find(f => f.key === 'benefits')!.score).toBeCloseTo(0.8333, 4);
});
```

This test must pass exactly as specified. Any changes to the scoring algorithm must preserve this expected output or update the SPEC if the algorithm is intentionally changed.

---

## Assertions & Matchers

Use Vitest's built-in assertions and `@testing-library/jest-dom` matchers:

### Standard Assertions

- `expect(value).toBe(expected)` — strict equality
- `expect(value).toEqual(expected)` — deep equality
- `expect(value).toHaveLength(n)` — array/string length
- `expect(value).toBeNull()` / `.toBeUndefined()` — nullish checks
- `expect(fn).toThrow()` — exception assertions

### DOM Matchers (jest-dom)

- `expect(element).toBeInTheDocument()`
- `expect(element).toHaveTextContent('text')`
- `expect(element).toHaveAttribute('aria-label', 'value')`
- `expect(element).toHaveClass('className')`
- `expect(element).toBeVisible()` / `.toBeDisabled()`

### Floating-Point Comparisons

For score calculations with fractional results:

```typescript
expect(result).toBeCloseTo(0.8333, 4); // 4 decimal places
```

---

## Example: Complete Unit Test for Salary Parsing

```typescript
// web/tests/salary.test.ts
import { describe, it, expect } from 'vitest';
import { parseSalaryText, annualize } from '@/lib/matching/salary';

describe('parseSalaryText', () => {
  it('parses "$170k - $200k" correctly', () => {
    const result = parseSalaryText('$170k - $200k');
    expect(result).toEqual({
      min: 170000,
      max: 200000,
      currency: 'USD',
      period: 'annual',
      annualMin: 170000,
      annualMax: 200000,
      raw: '$170k - $200k',
    });
  });

  it('parses "€60k" as single value', () => {
    const result = parseSalaryText('€60k');
    expect(result).toEqual({
      min: 60000,
      max: 60000,
      currency: 'EUR',
      period: 'annual',
      annualMin: 60000,
      annualMax: 60000,
      raw: '€60k',
    });
  });

  it('parses "$50 - $70 /hr" with period', () => {
    const result = parseSalaryText('$50 - $70 /hr');
    expect(result).toEqual({
      min: 50,
      max: 70,
      currency: 'USD',
      period: 'hourly',
      annualMin: 104000,
      annualMax: 145600,
      raw: '$50 - $70 /hr',
    });
  });

  it('returns null for "Competitive"', () => {
    expect(parseSalaryText('Competitive')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseSalaryText('')).toBeNull();
  });

  it('returns null for out-of-range annual max', () => {
    expect(parseSalaryText('$20,000,000')).toBeNull(); // > 10M
  });
});

describe('annualize', () => {
  it('converts hourly to annual', () => {
    expect(annualize(50, 'hourly')).toBe(104000); // 50 × 2080
  });

  it('converts monthly to annual', () => {
    expect(annualize(5000, 'monthly')).toBe(60000); // 5000 × 12
  });

  it('returns annual unchanged', () => {
    expect(annualize(100000, 'annual')).toBe(100000);
  });
});
```

---

## Notes

- **No network calls in tests:** All external API calls are mocked with fixtures.
- **Fast execution:** The full unit test suite should complete in < 5 seconds.
- **Deterministic:** Tests do not depend on current time, random values, or external state (except seeded mocks).
- **Isolation:** Each test can run independently in any order.
- **Readability:** Test names are descriptive sentences; each test asserts one logical behavior.

---

## Summary

- **Framework:** Vitest with jsdom environment
- **Test command:** `npm test` (from `web/` directory)
- **Coverage command:** `npm test -- --coverage`
- **Test count:** ~50 total (30 unit + 15 component + 4 a11y + 1 route)
- **Coverage floor:** 80% line coverage (verified in Build and Test stage, not per-unit)
- **Fixtures:** Stored in `web/tests/fixtures/`, committed to repo
- **Golden test:** §7.5 SPEC example must score exactly 88%

