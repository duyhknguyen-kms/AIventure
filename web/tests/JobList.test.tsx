// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { JobList } from "@/components/JobList";
import { DEFAULT_CRITERIA } from "@/lib/matching/criteria";
import { rankJobs } from "@/lib/matching/score";
import { renderWithTheme } from "./helpers/ui";
import { makeJob, makeSources } from "./helpers/jobs";
import type { JobsResult } from "@/lib/jobsClient";

function okResult(jobCount = 2): JobsResult {
  return {
    ok: true,
    data: { fetchedAt: "2026-11-17T09:00:00.000Z", sources: makeSources({ himalayas: { count: jobCount } }), jobs: Array.from({ length: jobCount }, (_, i) => makeJob({ sourceId: `j${i}` })) },
  };
}

function setup(overrides: Partial<Parameters<typeof JobList>[0]> = {}) {
  const jobs = Array.from({ length: 3 }, (_, i) =>
    makeJob({ sourceId: `j${i}`, title: `Job ${i}`, company: "Co" })
  );
  const { ranked, excluded } = rankJobs(jobs, DEFAULT_CRITERIA);
  renderWithTheme(
    <JobList
      ranked={ranked}
      excluded={excluded}
      loading={false}
      result={okResult(3)}
      criteria={DEFAULT_CRITERIA}
      onRetry={vi.fn()}
      {...overrides}
    />
  );
  return { ranked, excluded };
}

describe("JobList", () => {
  it("renders job cards", () => {
    setup();
    expect(screen.getAllByTestId("job-card")).toHaveLength(3);
  });

  it("shows skeleton cards while loading", () => {
    setup({ loading: true, result: null });
    expect(screen.queryByTestId("job-list")).not.toBeInTheDocument();
    expect(screen.getByTestId("job-skeletons")).toBeInTheDocument();
  });

  it("shows empty state when no jobs match filter", () => {
    setup({ ranked: [] });
    expect(screen.getByTestId("jl-empty")).toBeInTheDocument();
  });

  it("shows excluded jobs toggle when exclusions exist", async () => {
    const user = userEvent.setup();
    const jobs = [makeJob({ sourceId: "x", title: "PHP Developer" })];
    const { ranked, excluded } = rankJobs(jobs, { ...DEFAULT_CRITERIA, excludedKeywords: ["PHP"] });
    renderWithTheme(
      <JobList ranked={ranked} excluded={excluded} loading={false} result={okResult()} criteria={DEFAULT_CRITERIA} onRetry={vi.fn()} />
    );
    const toggle = screen.getByTestId("jl-excluded-toggle");
    expect(toggle).toHaveTextContent(/Show excluded/i);
    await user.click(toggle);
    expect(screen.getByTestId("jl-excluded-list")).toBeVisible();
  });

  it("renders filter controls", () => {
    setup();
    expect(screen.getByTestId("sort-select")).toBeInTheDocument();
    expect(screen.getByTestId("jl-min-match")).toBeInTheDocument();
    expect(screen.getByTestId("jl-source-filter")).toBeInTheDocument();
    expect(screen.getByTestId("jl-salary-only")).toBeInTheDocument();
  });

  it("filters by source toggle", async () => {
    const user = userEvent.setup();
    const jobs = [
      makeJob({ sourceId: "h1", source: "himalayas", title: "H job" }),
      makeJob({ sourceId: "r1", source: "remotive", title: "R job" }),
    ];
    const { ranked, excluded } = rankJobs(jobs, DEFAULT_CRITERIA);
    renderWithTheme(<JobList ranked={ranked} excluded={excluded} loading={false} result={okResult()} criteria={DEFAULT_CRITERIA} onRetry={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /himalayas only/i }));
    expect(screen.getAllByTestId("job-card")).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("H job");
  });
});
