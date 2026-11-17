// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import theme from "@/theme";
import JobCard from "@/components/JobCard";
import { runAxe } from "./axe";
import type { Job, MatchResult } from "@/lib/types";

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: "himalayas:test-1",
    source: "himalayas",
    sourceId: "test-1",
    title: "Senior Frontend Engineer",
    company: "Acme Corp",
    companyLogo: "https://cdn.example.com/acme.png",
    applyUrl: "https://himalayas.app/apply",
    sourceUrl: "https://himalayas.app/job/test-1",
    employmentType: "full_time",
    seniority: ["senior"],
    salary: {
      min: 120_000, max: 150_000, currency: "USD",
      period: "annual", annualMin: 120_000, annualMax: 150_000, raw: null,
    },
    location: { worldwide: true, countries: [], regions: [], raw: null },
    timezones: [3, 4, 5, 6],
    categories: ["Engineering"],
    tags: [],
    excerpt: null,
    descriptionHtml: "",
    descriptionText: "Build our React design system with TypeScript. We offer health insurance and unlimited PTO.",
    publishedAt: "2026-11-16T08:00:00.000Z",
    expiresAt: null,
    alsoOn: [],
    ...overrides,
  };
}

function makeMatch(overrides: Partial<MatchResult> = {}): MatchResult {
  return {
    jobId: "himalayas:test-1",
    matchPercent: 88,
    factors: [],
    benefits: [
      { key: "health", label: "Health / Medical", evidence: ["health insurance"] },
      { key: "pto", label: "Paid time off", evidence: ["unlimited PTO"] },
    ],
    locationUncertain: false,
    ...overrides,
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

// ── Axe (zero violations) ──────────────────────────────────────────────────

describe("JobCard a11y", () => {
  it("has zero axe violations", async () => {
    const container = renderCard(makeJob(), makeMatch());
    const violations = await runAxe(container);
    expect(violations).toEqual([]);
  });

  it("has zero axe violations when logo is missing (initials Avatar)", async () => {
    const container = renderCard(
      makeJob({ companyLogo: null }),
      makeMatch(),
    );
    const violations = await runAxe(container);
    expect(violations).toEqual([]);
  });
});

// ── Accessible name ────────────────────────────────────────────────────────

describe("JobCard accessible name", () => {
  it("action area has accessible name containing title and company", () => {
    const container = renderCard(makeJob(), makeMatch());
    // CardActionArea renders as a native <button>, not role="button"
    const btn = container.querySelector("button") as HTMLElement;
    const label = btn?.getAttribute("aria-label") ?? "";
    expect(label).toContain("Senior Frontend Engineer");
    expect(label).toContain("Acme Corp");
  });

  it("match badge text includes the level word, not only a colour", () => {
    const container = renderCard(makeJob(), makeMatch({ matchPercent: 88 }));
    const text = container.textContent ?? "";
    expect(text).toMatch(/Strong match/i);
    expect(text).toMatch(/88%/);
  });

  it("medium match (60%) shows 'Medium match'", () => {
    const container = renderCard(makeJob(), makeMatch({ matchPercent: 60 }));
    expect(container.textContent).toMatch(/Medium match/i);
  });

  it("low match (30%) shows 'Low match'", () => {
    const container = renderCard(makeJob(), makeMatch({ matchPercent: 30 }));
    expect(container.textContent).toMatch(/Low match/i);
  });
});

// ── Source attribution ────────────────────────────────────────────────────

describe("JobCard source attribution", () => {
  it("source link includes '(opens in new tab)' in aria-label", () => {
    const container = renderCard(makeJob(), makeMatch());
    const links = container.querySelectorAll("a");
    const sourceLink = Array.from(links).find(
      (l) => l.getAttribute("aria-label")?.includes("opens in new tab"),
    );
    expect(sourceLink).toBeDefined();
  });
});
