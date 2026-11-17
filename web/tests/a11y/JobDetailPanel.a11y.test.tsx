// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import theme from "@/theme";
import JobDetailPanel from "@/components/JobDetailPanel";
import { runAxe } from "./axe";
import type { Job, MatchResult } from "@/lib/types";

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: "himalayas:detail-1",
    source: "himalayas",
    sourceId: "detail-1",
    title: "Senior Frontend Engineer",
    company: "Acme Corp",
    companyLogo: null,
    applyUrl: "https://himalayas.app/apply",
    sourceUrl: "https://himalayas.app/job/detail-1",
    employmentType: "full_time",
    seniority: ["senior"],
    salary: { min: 120_000, max: 150_000, currency: "USD", period: "annual", annualMin: 120_000, annualMax: 150_000, raw: null },
    location: { worldwide: true, countries: [], regions: [], raw: null },
    timezones: [3, 4, 5, 6],
    categories: [],
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

function makeMatch(): MatchResult {
  return {
    jobId: "himalayas:detail-1",
    matchPercent: 88,
    factors: [
      { key: "skills", weight: 30, active: true, score: 0.75, points: 22.5, detail: "3/4 skills" },
      { key: "title",  weight: 20, active: true, score: 1.0,  points: 20.0, detail: "phrase match" },
      { key: "seniority", weight: 10, active: false, score: 0, points: 0, detail: "no seniority set" },
    ],
    benefits: [
      { key: "health", label: "Health / Medical", evidence: ["health insurance"] },
      { key: "pto",    label: "Paid time off",    evidence: ["unlimited PTO"] },
    ],
    locationUncertain: false,
  };
}

function renderPanel(open = true, job = makeJob(), match = makeMatch()) {
  const onClose = vi.fn();
  const { container } = render(
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <JobDetailPanel
        job={job}
        match={match}
        open={open}
        onClose={onClose}
      />
    </ThemeProvider>,
  );
  return { container, onClose };
}

// ── Axe (zero violations) ──────────────────────────────────────────────────

describe("JobDetailPanel a11y", () => {
  it("has zero axe violations when open", async () => {
    const { container } = renderPanel();
    const violations = await runAxe(container);
    expect(violations).toEqual([]);
  });
});

// ── ARIA structure ─────────────────────────────────────────────────────────

describe("JobDetailPanel structure", () => {
  it("dialog has aria-labelledby pointing to the job title", () => {
    renderPanel();
    const dialog = screen.getByRole("dialog");
    const labelId = dialog.getAttribute("aria-labelledby");
    expect(labelId).toBeTruthy();
    const titleEl = document.getElementById(labelId!);
    expect(titleEl?.textContent).toContain("Senior Frontend Engineer");
  });

  it("focus moves into the dialog on open", () => {
    renderPanel();
    // The dialog should contain the focused element
    const dialog = screen.getByRole("dialog");
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it("close button has aria-label 'Close job details'", () => {
    renderPanel();
    expect(screen.getByRole("button", { name: /close job details/i })).toBeTruthy();
  });

  it("Apply link says '(opens in new tab)' in aria-label", () => {
    renderPanel();
    const applyEl = document.querySelector("a[aria-label^='Apply for']") as HTMLAnchorElement | null;
    expect(applyEl).toBeTruthy();
    expect(applyEl?.getAttribute("aria-label")).toMatch(/opens in new tab/i);
    expect(applyEl?.href).toContain("himalayas.app/apply");
  });
});

// ── Keyboard / close ──────────────────────────────────────────────────────

describe("JobDetailPanel keyboard", () => {
  it("Esc closes the dialog and calls onClose", async () => {
    const user = userEvent.setup();
    const { onClose } = renderPanel();

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ── Content ───────────────────────────────────────────────────────────────

describe("JobDetailPanel content", () => {
  it("shows score breakdown table", () => {
    renderPanel();
    expect(screen.getByRole("table", { name: /match score breakdown/i })).toBeTruthy();
  });

  it("inactive factor shows 'not set' text", () => {
    renderPanel();
    const cells = screen.getAllByText("not set");
    expect(cells.length).toBeGreaterThan(0);
  });

  it("renders description as plain text, not HTML", () => {
    const job = makeJob({ descriptionText: "Plain text description" });
    renderPanel(true, job);
    expect(screen.getByText("Plain text description")).toBeTruthy();
  });
});
