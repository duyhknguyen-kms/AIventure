// @vitest-environment jsdom
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Dashboard, FIRST_VISIT_HINT, SKELETON_COUNT } from "@/components/Dashboard";
import type { JobsPayload } from "@/lib/jobsClient";
import type { SourceStatus } from "@/lib/types";
import { runAxe } from "./a11y/axe";
import { makeJob, makeSources, renderWithTheme } from "./helpers/ui";

/** In-memory Storage (Node 22+ shadows jsdom's localStorage; see useCriteria.test.tsx). */
class MemoryStorage implements Storage {
  private items = new Map<string, string>();
  get length(): number {
    return this.items.size;
  }
  clear(): void {
    this.items.clear();
  }
  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }
  key(index: number): string | null {
    return Array.from(this.items.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.items.delete(key);
  }
  setItem(key: string, value: string): void {
    this.items.set(key, String(value));
  }
}

/** The subset of Response that `fetchJobs` reads, with the route's real body shapes. */
function jsonResponse(body: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

function payload(overrides: Partial<JobsPayload> = {}): JobsPayload {
  return {
    fetchedAt: "2026-11-17T09:00:00.000Z",
    sources: makeSources({ himalayas: { count: 2 } }),
    jobs: [
      makeJob({ sourceId: "older", title: "Backend Engineer", company: "Globex", publishedAt: "2026-11-10T08:00:00.000Z" }),
      makeJob({ sourceId: "newer", title: "Senior Frontend Engineer", company: "Acme", publishedAt: "2026-11-16T08:00:00.000Z" }),
    ],
    ...overrides,
  };
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  Object.defineProperty(window, "localStorage", { value: new MemoryStorage(), configurable: true, writable: true });
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Dashboard page states (SPEC §10.4, roadmap Task 6)", () => {
  it("shows 6 skeleton cards with aria-busy and announces Loading jobs while pending", async () => {
    fetchMock.mockReturnValue(new Promise(() => {})); // never settles
    renderWithTheme(<Dashboard />);

    // Wait for the section to appear — JobList renders skeletons inside it
    const resultsSection = await screen.findByTestId("results", {}, { timeout: 2000 });
    expect(resultsSection).toHaveAttribute("aria-busy", "true");
    // Skeletons live inside job-skeletons wrapper (the Stack) inside JobList
    expect(await screen.findByTestId("job-skeletons", {}, { timeout: 2000 })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Loading jobs"), { timeout: 1500 });
    expect(fetchMock).toHaveBeenCalledWith("/api/jobs", expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });

  it("renders ranked job cards in a list, with landmarks, hint, footer credit and announcement", async () => {
    fetchMock.mockResolvedValue(jsonResponse(payload()));
    const { container } = renderWithTheme(<Dashboard />);

    const list = await screen.findByTestId("job-list");
    // Direct children only: each card also holds a nested list of benefit chips.
    const items = Array.from(list.children) as HTMLElement[];
    expect(items.map((item) => item.tagName)).toEqual(["LI", "LI"]);
    // Default criteria: every job 100%, ties broken by newest first.
    expect(within(items[0]).getByRole("heading", { level: 3 })).toHaveTextContent("Senior Frontend Engineer");
    expect(within(items[0]).getByTestId("job-card-match-badge")).toHaveTextContent("100% · Strong match");
    expect(screen.getByTestId("results")).toHaveAttribute("aria-busy", "false");

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/AIventure/);
    expect(screen.getByRole("heading", { level: 2, name: "Results" })).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveAttribute("id", "main");
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toHaveTextContent("Job data from Himalayas and Remotive");
    expect(screen.getByTestId("footer-himalayas-link")).toHaveAttribute("href", "https://himalayas.app");
    expect(screen.getByTestId("footer-remotive-link")).toHaveAttribute("href", "https://remotive.com");
    expect(screen.getByTestId("first-visit-hint")).toHaveTextContent(FIRST_VISIT_HINT);
    expect(screen.queryByTestId("source-status-banner")).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Showing 2 jobs, sorted by match"), {
      timeout: 1500,
    });
    expect(await runAxe(container)).toEqual([]);
  });

  it("puts the skip link first in tab order", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(jsonResponse(payload()));
    renderWithTheme(<Dashboard />);
    await screen.findByTestId("job-list");

    await user.tab();
    expect(screen.getByTestId("skip-link")).toHaveFocus();
    expect(screen.getByTestId("skip-link")).toHaveAttribute("href", "#main");
  });

  it("shows the partial-failure banner as an alert next to the healthy source's jobs", async () => {
    const sources: SourceStatus[] = makeSources({
      himalayas: { count: 2 },
      remotive: { ok: false, count: 0, error: "HTTP 429 (retry after 60s)" },
    });
    fetchMock.mockResolvedValue(jsonResponse(payload({ sources })));
    renderWithTheme(<Dashboard />);

    const banner = await screen.findByTestId("source-status-banner");
    expect(banner).toHaveAttribute("role", "alert");
    expect(banner).toHaveTextContent("Remotive unavailable – showing Himalayas only");
    expect(banner).toHaveTextContent("HTTP 429 (retry after 60s)");
    expect(screen.getAllByTestId("job-card")).toHaveLength(2);
  });

  it("shows per-source errors on a 502 and retries on request", async () => {
    const user = userEvent.setup();
    const sources: SourceStatus[] = makeSources({
      himalayas: { ok: false, count: 0, error: "HTTP 503" },
      remotive: { ok: false, count: 0, error: "Request timed out" },
    });
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ error: "All sources unavailable", sources }, 502))
      .mockResolvedValueOnce(jsonResponse(payload()));
    renderWithTheme(<Dashboard />);

    const failure = await screen.findByTestId("source-status-total-failure");
    expect(failure).toHaveTextContent("Himalayas unavailable: HTTP 503");
    expect(failure).toHaveTextContent("Remotive unavailable: Request timed out");
    expect(screen.queryByTestId("job-list")).not.toBeInTheDocument();

    await user.click(within(failure).getByTestId("source-status-retry-button"));
    expect(await screen.findByTestId("job-list")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.queryByTestId("source-status-total-failure")).not.toBeInTheDocument();
  });

  it("shows the empty state with Retry when the API returns no jobs", async () => {
    fetchMock.mockResolvedValue(jsonResponse(payload({ jobs: [], sources: makeSources({ himalayas: { count: 0 } }) })));
    renderWithTheme(<Dashboard />);

    const empty = await screen.findByTestId("empty-api-state");
    expect(empty).toHaveTextContent("No jobs available right now");
    expect(within(empty).getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("debounces the search and requests /api/jobs?q=", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(jsonResponse(payload()));
    renderWithTheme(<Dashboard />);
    await screen.findByTestId("job-list");

    const input = screen.getByLabelText("Search jobs");
    expect(input).toHaveAttribute("maxLength", "100");
    await user.type(input, "react");
    await waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith("/api/jobs?q=react", expect.anything()));
    // One request for the initial load and one for the settled query, not one per keystroke.
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("re-sorts by salary with unknown salaries last", async () => {
    const jobs = [
      makeJob({ sourceId: "no-salary", title: "No Salary Role", salary: null, publishedAt: "2026-11-17T08:00:00.000Z" }),
      makeJob({
        sourceId: "high",
        title: "High Salary Role",
        publishedAt: "2026-11-01T08:00:00.000Z",
        salary: { min: 200000, max: 250000, currency: "USD", period: "annual", annualMin: 200000, annualMax: 250000, raw: null },
      }),
    ];
    fetchMock.mockResolvedValue(jsonResponse(payload({ jobs })));
    renderWithTheme(<Dashboard />);
    const list = await screen.findByTestId("job-list");
    expect(within(list).getAllByRole("heading", { level: 3 })[0]).toHaveTextContent("No Salary Role");

    fireEvent.change(screen.getByTestId("sort-select"), { target: { value: "salary" } });
    const headings = within(screen.getByTestId("job-list")).getAllByRole("heading", { level: 3 });
    expect(headings.map((h) => h.textContent)).toEqual(["High Salary Role", "No Salary Role"]);
  });

  it("shows a failure card when the server cannot be reached", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    renderWithTheme(<Dashboard />);

    const failure = await screen.findByTestId("source-status-total-failure");
    expect(failure).toHaveTextContent("Could not reach the server");
  });
});
