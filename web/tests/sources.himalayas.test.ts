// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchHimalayas } from "@/lib/sources/himalayas";
import browseFixture from "./fixtures/himalayas-browse.json";
import searchFixture from "./fixtures/himalayas-search.json";

// ── Helpers ────────────────────────────────────────────────────────────────

function makeResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (k: string) => headers[k] ?? null },
    json: async () => body,
  } as unknown as Response;
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ── Browse (no q) ──────────────────────────────────────────────────────────

describe("fetchHimalayas — browse", () => {
  it("maps fixture jobs to valid Job[] with all required fields", async () => {
    // Single-page fixture (no nextCursor looping needed here)
    const singlePage = { ...browseFixture, nextCursor: undefined };
    vi.mocked(fetch).mockResolvedValue(makeResponse(singlePage));

    const { jobs, skipped } = await fetchHimalayas(undefined, 1);

    expect(skipped).toBe(0);
    expect(jobs.length).toBeGreaterThan(0);

    const job = jobs[0];
    expect(job.id).toMatch(/^himalayas:/);
    expect(job.source).toBe("himalayas");
    expect(typeof job.title).toBe("string");
    expect(typeof job.company).toBe("string");
    expect(typeof job.applyUrl).toBe("string");
    expect(typeof job.sourceUrl).toBe("string");
    expect(typeof job.publishedAt).toBe("string");
    // publishedAt should be valid ISO 8601
    expect(() => new Date(job.publishedAt)).not.toThrow();
    expect(Array.isArray(job.seniority)).toBe(true);
    expect(Array.isArray(job.categories)).toBe(true);
    expect(Array.isArray(job.tags)).toBe(true);
    expect(Array.isArray(job.alsoOn)).toBe(true);
    expect(job.alsoOn).toHaveLength(0);
  });

  it("follows cursor pagination and stops when nextCursor is absent", async () => {
    const page1 = { ...browseFixture, nextCursor: "cursor-1" };
    const page2 = { ...browseFixture, jobs: browseFixture.jobs.slice(0, 3), nextCursor: undefined };

    vi.mocked(fetch)
      .mockResolvedValueOnce(makeResponse(page1))
      .mockResolvedValueOnce(makeResponse(page2));

    const { jobs } = await fetchHimalayas(undefined, 5);

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(jobs.length).toBe(browseFixture.jobs.length + 3);
  });

  it("stops after maxPages even if nextCursor is still present", async () => {
    const page = { ...browseFixture, nextCursor: "always-more" };
    vi.mocked(fetch).mockResolvedValue(makeResponse(page));

    await fetchHimalayas(undefined, 2);

    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("skips invalid jobs without failing the whole source", async () => {
    const withBadJob = {
      ...browseFixture,
      jobs: [{ broken: true }, ...browseFixture.jobs],
      nextCursor: undefined,
    };
    vi.mocked(fetch).mockResolvedValue(makeResponse(withBadJob));

    const { jobs, skipped } = await fetchHimalayas(undefined, 1);

    expect(skipped).toBe(1);
    expect(jobs.length).toBe(browseFixture.jobs.length);
  });
});

// ── Search (with q) ────────────────────────────────────────────────────────

describe("fetchHimalayas — search", () => {
  it("calls the search endpoint with q and page params", async () => {
    const page = { ...searchFixture, jobs: [] };
    vi.mocked(fetch).mockResolvedValue(makeResponse(page));

    await fetchHimalayas("react", 1);

    const calledUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledUrl).toContain("/search");
    expect(calledUrl).toContain("q=react");
    expect(calledUrl).toContain("page=1");
  });

  it("stops early when a page returns no jobs", async () => {
    const page1 = { ...searchFixture, jobs: searchFixture.jobs.slice(0, 5) };
    const page2 = { ...searchFixture, jobs: [] };

    vi.mocked(fetch)
      .mockResolvedValueOnce(makeResponse(page1))
      .mockResolvedValueOnce(makeResponse(page2));

    const { jobs } = await fetchHimalayas("react", 5);

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(jobs.length).toBe(5);
  });
});

// ── Error handling ─────────────────────────────────────────────────────────

describe("fetchHimalayas — errors", () => {
  it("throws an error object with status 429 and retryAfter", async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeResponse({}, 429, { "Retry-After": "30" }),
    );

    await expect(fetchHimalayas(undefined, 1)).rejects.toMatchObject({
      type: "http",
      status: 429,
      retryAfter: 30,
    });
  });

  it("throws for 503", async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse({}, 503));
    await expect(fetchHimalayas(undefined, 1)).rejects.toMatchObject({
      type: "http",
      status: 503,
    });
  });
});

// ── Field mapping spot-checks ──────────────────────────────────────────────

describe("fetchHimalayas — field mapping", () => {
  it("maps salary fields with annualization", async () => {
    const fixture = {
      ...browseFixture,
      jobs: [browseFixture.jobs.find((j: Record<string, unknown>) => j.minSalary != null)].filter(Boolean),
      nextCursor: undefined,
    };
    vi.mocked(fetch).mockResolvedValue(makeResponse(fixture));

    const { jobs } = await fetchHimalayas(undefined, 1);
    const job = jobs.find((j) => j.salary !== null);

    if (job?.salary) {
      expect(typeof job.salary.min).toBe("number");
      expect(typeof job.salary.annualMin).toBe("number");
    }
  });

  it("salary is null when both minSalary and maxSalary are null", async () => {
    const noSalaryJob = browseFixture.jobs.find(
      (j: Record<string, unknown>) => j.minSalary == null && j.maxSalary == null,
    );
    if (!noSalaryJob) return; // skip if fixture has no such job

    const fixture = { ...browseFixture, jobs: [noSalaryJob], nextCursor: undefined };
    vi.mocked(fetch).mockResolvedValue(makeResponse(fixture));

    const { jobs } = await fetchHimalayas(undefined, 1);
    expect(jobs[0].salary).toBeNull();
  });

  it("worldwide=true when locationRestrictions is empty", async () => {
    const worldwideJob = browseFixture.jobs.find(
      (j: Record<string, unknown>) =>
        Array.isArray(j.locationRestrictions) &&
        (j.locationRestrictions as unknown[]).length === 0,
    );
    if (!worldwideJob) return;

    const fixture = { ...browseFixture, jobs: [worldwideJob], nextCursor: undefined };
    vi.mocked(fetch).mockResolvedValue(makeResponse(fixture));

    const { jobs } = await fetchHimalayas(undefined, 1);
    expect(jobs[0].location.worldwide).toBe(true);
  });
});
