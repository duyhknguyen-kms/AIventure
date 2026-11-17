// @vitest-environment jsdom
/**
 * Bug condition exploration tests for JobCard match badge visibility.
 *
 * Bug condition C(X): match.factors.every(f => !f.active)
 * When ALL scoring factors are inactive (default/empty criteria), the match
 * badge Chip should NOT be rendered. Task 1 tests MUST FAIL on unfixed code —
 * that failure confirms the bug exists.
 *
 * Task 2 preservation tests MUST PASS on unfixed code — they establish the
 * baseline behavior to preserve after the fix.
 */
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import theme from "@/theme";
import JobCard from "@/components/JobCard";
import type { Job, MatchResult, FactorResult } from "@/lib/types";

// ── Helpers ────────────────────────────────────────────────────────────────

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: "himalayas:bugfix-1",
    source: "himalayas",
    sourceId: "bugfix-1",
    title: "Frontend Engineer",
    company: "Bugfix Corp",
    companyLogo: null,
    applyUrl: "https://himalayas.app/apply/bugfix-1",
    sourceUrl: "https://himalayas.app/job/bugfix-1",
    employmentType: "full_time",
    seniority: [],
    salary: null,
    location: { worldwide: true, countries: [], regions: [], raw: null },
    timezones: null,
    categories: [],
    tags: [],
    excerpt: null,
    descriptionHtml: "",
    descriptionText: "",
    publishedAt: "2026-11-16T08:00:00.000Z",
    expiresAt: null,
    alsoOn: [],
    ...overrides,
  };
}

/** All 7 factors with active: false — the bug condition. */
function makeAllInactiveFactors(): FactorResult[] {
  const keys: FactorResult["key"][] = [
    "skills",
    "title",
    "seniority",
    "salary",
    "employment",
    "timezone",
    "benefits",
  ];
  return keys.map((key) => ({
    key,
    weight: 1,
    active: false,
    score: 0,
    points: 0,
    detail: `${key}: not configured`,
  }));
}

/**
 * Returns a MatchResult where ALL factors are inactive — this is the bug
 * condition. The match percentage can be anything (scoring still runs).
 */
function makeAllInactiveMatch(matchPercent: number): MatchResult {
  return {
    jobId: "himalayas:bugfix-1",
    matchPercent,
    factors: makeAllInactiveFactors(),
    benefits: [],
    locationUncertain: false,
  };
}

/** Returns a MatchResult where at least one factor is active. */
function makeActiveMatch(
  matchPercent: number,
  activeKey: FactorResult["key"] = "skills",
): MatchResult {
  const factors = makeAllInactiveFactors().map((f) =>
    f.key === activeKey ? { ...f, active: true, score: matchPercent / 100 } : f,
  );
  return {
    jobId: "himalayas:bugfix-1",
    matchPercent,
    factors,
    benefits: [],
    locationUncertain: false,
  };
}

function renderCard(job: Job, match: MatchResult) {
  const { container } = render(
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ul>
        <JobCard job={job} match={match} onClick={() => {}} />
      </ul>
    </ThemeProvider>,
  );
  return container;
}

// ── Task 1: Bug condition exploration ─────────────────────────────────────
//
// These tests encode the EXPECTED (fixed) behavior: when no criteria are
// active the badge chip must be absent.
//
// ON UNFIXED CODE: these tests FAIL — the chip is rendered unconditionally,
// which is the bug. The failure is the counterexample that proves the bug.
//
// Validates: Requirements 1.1, 1.2

describe("Task 1 — Bug condition: match badge hidden when all factors inactive", () => {
  const allInactiveCases: [number, string][] = [
    [100, "Strong match"],
    [50, "Medium match"],
    [0, "Low match"],
  ];

  it.each(allInactiveCases)(
    "matchPercent=%i (%s) with all-inactive factors: chip must NOT be rendered",
    (matchPercent, _levelLabel) => {
      const container = renderCard(makeJob(), makeAllInactiveMatch(matchPercent));
      const text = container.textContent ?? "";

      // No percentage text should appear
      expect(text).not.toMatch(new RegExp(`${matchPercent}%`));

      // No level label should appear anywhere
      expect(text).not.toMatch(/Strong match/i);
      expect(text).not.toMatch(/Medium match/i);
      expect(text).not.toMatch(/Low match/i);

      // The action area aria-label must not contain a percentage
      const btn = container.querySelector("button") as HTMLElement;
      const ariaLabel = btn?.getAttribute("aria-label") ?? "";
      expect(ariaLabel).not.toContain("%");
    },
  );

  it("empty factors array [] treated as all-inactive: chip must NOT be rendered", () => {
    const match: MatchResult = {
      jobId: "himalayas:bugfix-1",
      matchPercent: 100,
      factors: [],
      benefits: [],
      locationUncertain: false,
    };
    const container = renderCard(makeJob(), match);
    const text = container.textContent ?? "";

    expect(text).not.toMatch(/100%/);
    expect(text).not.toMatch(/Strong match/i);

    const btn = container.querySelector("button") as HTMLElement;
    expect(btn?.getAttribute("aria-label")).not.toContain("%");
  });
});

// ── Task 2: Preservation — active criteria still show the badge ────────────
//
// These tests document the baseline behavior that must be preserved after the
// fix. All inputs have at least one active factor, so the chip SHOULD render.
//
// ON UNFIXED CODE: these tests PASS (confirms unfixed baseline is correct here).
//
// Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5

describe("Task 2 — Preservation: match badge renders when at least one factor is active", () => {
  const activeCases: [number, string, FactorResult["key"]][] = [
    [88, "Strong match", "skills"],
    [75, "Strong match", "skills"],
    [74, "Medium match", "title"],
    [50, "Medium match", "salary"],
    [49, "Low match", "seniority"],
    [0, "Low match", "skills"],
  ];

  it.each(activeCases)(
    "matchPercent=%i (%s) with active factor: chip MUST be rendered",
    (matchPercent, levelLabel, activeKey) => {
      const container = renderCard(
        makeJob(),
        makeActiveMatch(matchPercent, activeKey),
      );
      const text = container.textContent ?? "";

      expect(text).toMatch(new RegExp(`${matchPercent}%`));
      expect(text).toMatch(new RegExp(levelLabel, "i"));

      const btn = container.querySelector("button") as HTMLElement;
      const ariaLabel = btn?.getAttribute("aria-label") ?? "";
      expect(ariaLabel).toContain("%");
      expect(ariaLabel).toMatch(new RegExp(levelLabel, "i"));
    },
  );

  it("only salary factor active, matchPercent=55: chip shown with 'Medium match'", () => {
    const container = renderCard(makeJob(), makeActiveMatch(55, "salary"));
    expect(container.textContent).toMatch(/55%/);
    expect(container.textContent).toMatch(/Medium match/i);
  });

  it("all 7 factors active, matchPercent=100: chip shown (bug condition does not apply)", () => {
    const allActiveFactors: FactorResult[] = makeAllInactiveFactors().map(
      (f) => ({ ...f, active: true, score: 1 }),
    );
    const match: MatchResult = {
      jobId: "himalayas:bugfix-1",
      matchPercent: 100,
      factors: allActiveFactors,
      benefits: [],
      locationUncertain: false,
    };
    const container = renderCard(makeJob(), match);
    expect(container.textContent).toMatch(/100%/);
    expect(container.textContent).toMatch(/Strong match/i);
  });
});

// ── Preservation: chip renders when criteria are active ───────────────────
//
// Parameterized suite covering all 3 match levels + mixed/all-active inputs.
// Verifies chip label text (e.g. "88% · Strong match") AND MUI color class.
//
// ON UNFIXED CODE: ALL tests here PASS (unfixed code renders chip unconditionally).
// AFTER FIX:       All tests still PASS (fix only suppresses chip when ALL inactive).
//
// Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5

describe("Preservation: chip renders when criteria are active", () => {
  // [matchPercent, levelLabel, colorClass, activeKey]
  const cases: [number, string, string, FactorResult["key"]][] = [
    [100, "Strong match", "MuiChip-colorSuccess", "skills"],
    [75,  "Strong match", "MuiChip-colorSuccess", "skills"],
    [74,  "Medium match", "MuiChip-colorWarning", "title"],
    [50,  "Medium match", "MuiChip-colorWarning", "salary"],
    [49,  "Low match",    "MuiChip-colorError",   "seniority"],
    [0,   "Low match",    "MuiChip-colorError",   "skills"],
  ];

  it.each(cases)(
    "matchPercent=%i (%s): chip shows full label and correct color",
    (matchPercent, levelLabel, colorClass, activeKey) => {
      const container = renderCard(
        makeJob(),
        makeActiveMatch(matchPercent, activeKey),
      );

      // Full chip label must appear verbatim
      const expectedLabel = `${matchPercent}% · ${levelLabel}`;
      expect(container.textContent).toContain(expectedLabel);

      // Chip element must carry the right MUI color class
      const chip = container.querySelector(`.MuiChip-root`) as HTMLElement;
      expect(chip).not.toBeNull();
      expect(chip!.className).toContain(colorClass);

      // aria-label on the button must include percentage and level
      const btn = container.querySelector("button") as HTMLElement;
      const ariaLabel = btn?.getAttribute("aria-label") ?? "";
      expect(ariaLabel).toContain("%");
      expect(ariaLabel).toMatch(new RegExp(levelLabel, "i"));
    },
  );

  it("mixed factors (skills active, rest inactive), matchPercent=88: chip visible", () => {
    // Some factors active, some not — chip must still render
    const container = renderCard(makeJob(), makeActiveMatch(88, "skills"));
    expect(container.textContent).toContain("88% · Strong match");

    const chip = container.querySelector(".MuiChip-root") as HTMLElement;
    expect(chip).not.toBeNull();
    expect(chip!.className).toContain("MuiChip-colorSuccess");

    const btn = container.querySelector("button") as HTMLElement;
    expect(btn?.getAttribute("aria-label")).toContain("%");
  });

  it("all 7 factors active, matchPercent=88: chip visible (bug condition does not apply)", () => {
    const allActiveFactors: FactorResult[] = makeAllInactiveFactors().map(
      (f) => ({ ...f, active: true, score: 0.88 }),
    );
    const match: MatchResult = {
      jobId: "himalayas:bugfix-1",
      matchPercent: 88,
      factors: allActiveFactors,
      benefits: [],
      locationUncertain: false,
    };
    const container = renderCard(makeJob(), match);

    expect(container.textContent).toContain("88% · Strong match");

    const chip = container.querySelector(".MuiChip-root") as HTMLElement;
    expect(chip).not.toBeNull();
    expect(chip!.className).toContain("MuiChip-colorSuccess");

    const btn = container.querySelector("button") as HTMLElement;
    expect(btn?.getAttribute("aria-label")).toContain("%");
  });
});
