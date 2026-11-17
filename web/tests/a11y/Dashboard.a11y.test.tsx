// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import theme from "@/theme";
import { runAxe } from "./axe";
import type { Job, SourceStatus } from "@/lib/types";

// Mock useCriteria so the test never touches localStorage
vi.mock("@/hooks/useCriteria", () => ({
  useCriteria: () => [
    {
      version: 1, keywords: [], targetTitles: [], excludedKeywords: [],
      seniority: [], employmentTypes: [], minSalary: null,
      country: null, timezoneOffset: null,
      mustHaveBenefits: [], niceToHaveBenefits: [],
    },
    vi.fn(),
  ],
}));

function makeJob(id: string): Job {
  return {
    id: `himalayas:${id}`, source: "himalayas", sourceId: id,
    title: `Engineer ${id}`, company: "Acme",
    companyLogo: null, applyUrl: "https://example.com/apply",
    sourceUrl: "https://example.com/job",
    employmentType: "full_time", seniority: ["senior"],
    salary: null,
    location: { worldwide: true, countries: [], regions: [], raw: null },
    timezones: null, categories: [], tags: [],
    excerpt: null, descriptionHtml: "", descriptionText: "",
    publishedAt: "2026-11-15T00:00:00.000Z", expiresAt: null, alsoOn: [],
  };
}

function makeApiResponse(jobs: Job[], sources: SourceStatus[]) {
  return { jobs, sources, fetchedAt: new Date().toISOString() };
}

async function renderDashboard(fetchResult: unknown) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => fetchResult,
  }));

  const HomePage = (await import("@/app/page")).default;

  const { container } = render(
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <HomePage />
    </ThemeProvider>,
  );
  return container;
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

const okSources: SourceStatus[] = [
  { name: "himalayas", ok: true, count: 2, cached: false },
  { name: "remotive",  ok: true, count: 0, cached: false },
];

// ── Structure ─────────────────────────────────────────────────────────────

describe("Dashboard structure", () => {
  it("has exactly one h1", async () => {
    const container = await renderDashboard(makeApiResponse([makeJob("1"), makeJob("2")], okSources));
    await waitFor(() => expect(screen.queryByRole("progressbar")).toBeNull());
    const headings = container.querySelectorAll("h1");
    expect(headings).toHaveLength(1);
    expect(headings[0].textContent).toContain("AIventure");
  });

  it("has a main landmark", async () => {
    const container = await renderDashboard(makeApiResponse([makeJob("1")], okSources));
    await waitFor(() => screen.getByRole("main"));
    expect(screen.getByRole("main")).toBeTruthy();
  });

  it("skip link is first focusable element", async () => {
    const container = await renderDashboard(makeApiResponse([makeJob("1")], okSources));
    const allFocusable = container.querySelectorAll("a, button, input, select, textarea, [tabindex]");
    const first = allFocusable[0];
    expect(first?.tagName.toLowerCase()).toBe("a");
    expect(first?.textContent).toContain("Skip");
  });
});

// ── Axe (zero violations) ──────────────────────────────────────────────────

describe("Dashboard a11y", () => {
  it("has zero axe violations after loading", async () => {
    const container = await renderDashboard(makeApiResponse([makeJob("1"), makeJob("2")], okSources));
    // Wait for loading state to clear
    await waitFor(() => expect(screen.queryByRole("progressbar")).toBeNull(), { timeout: 3000 });
    const violations = await runAxe(container);
    expect(violations).toEqual([]);
  });

  it("partial-failure Alert has role='alert'", async () => {
    const degradedSources: SourceStatus[] = [
      { name: "himalayas", ok: true,  count: 1, cached: false },
      { name: "remotive",  ok: false, count: 0, cached: false, error: "HTTP 503" },
    ];
    await renderDashboard(makeApiResponse([makeJob("1")], degradedSources));
    await waitFor(() => screen.getByRole("alert"));
    expect(screen.getByRole("alert")).toBeTruthy();
  });

  it("result count region has role='status'", async () => {
    const container = await renderDashboard(makeApiResponse([makeJob("1")], okSources));
    await waitFor(() => expect(screen.queryByRole("progressbar")).toBeNull());
    const statusRegion = container.querySelector("[role=status]");
    expect(statusRegion).toBeTruthy();
  });
});
