// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/jobs/route";
import { clearCache } from "@/lib/aggregate/cache";
import type { Job } from "@/lib/types";

// Mock the aggregator so the route test makes no network calls
vi.mock("@/lib/aggregate/aggregate", () => ({
  aggregateJobs: vi.fn(),
}));

import { aggregateJobs } from "@/lib/aggregate/aggregate";

function makeJob(id: string): Job {
  return {
    id,
    source: "himalayas",
    sourceId: id,
    title: "Engineer",
    company: "Acme",
    companyLogo: null,
    applyUrl: "https://example.com/apply",
    sourceUrl: "https://example.com/job",
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
    publishedAt: new Date().toISOString(),
    expiresAt: null,
    alsoOn: [],
  };
}

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost:3000/api/jobs");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return { nextUrl: url } as unknown as import("next/server").NextRequest;
}

function okAggregate(jobs: Job[] = [makeJob("himalayas:1")]) {
  return {
    jobs,
    fetchedAt: new Date().toISOString(),
    sources: [
      { name: "himalayas" as const, ok: true, count: jobs.length, cached: false },
      { name: "remotive" as const, ok: true, count: 0, cached: false },
    ],
  };
}

beforeEach(() => {
  clearCache();
  vi.clearAllMocks();
});

// ── 200 responses ──────────────────────────────────────────────────────────

describe("GET /api/jobs — 200", () => {
  it("returns jobs, sources, and fetchedAt", async () => {
    vi.mocked(aggregateJobs).mockResolvedValue(okAggregate());

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(body.jobs)).toBe(true);
    expect(Array.isArray(body.sources)).toBe(true);
    expect(typeof body.fetchedAt).toBe("string");
  });

  it("passes q to aggregateJobs", async () => {
    vi.mocked(aggregateJobs).mockResolvedValue(okAggregate());

    await GET(makeRequest({ q: "react" }));

    expect(aggregateJobs).toHaveBeenCalledWith({ q: "react" });
  });

  it("returns 200 even when one source failed (partial results)", async () => {
    vi.mocked(aggregateJobs).mockResolvedValue({
      jobs: [makeJob("himalayas:1")],
      fetchedAt: new Date().toISOString(),
      sources: [
        { name: "himalayas", ok: true, count: 1, cached: false },
        { name: "remotive", ok: false, count: 0, cached: false, error: "HTTP 503" },
      ],
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
  });
});

// ── 400 — invalid q ────────────────────────────────────────────────────────

describe("GET /api/jobs — 400", () => {
  it("rejects q longer than 100 characters", async () => {
    const q = "a".repeat(101);
    const res = await GET(makeRequest({ q }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("accepts q exactly 100 characters", async () => {
    vi.mocked(aggregateJobs).mockResolvedValue(okAggregate());
    const q = "a".repeat(100);
    const res = await GET(makeRequest({ q }));
    expect(res.status).toBe(200);
  });
});

// ── 502 — both sources fail ────────────────────────────────────────────────

describe("GET /api/jobs — 502", () => {
  it("returns 502 when all sources fail with no cached data", async () => {
    vi.mocked(aggregateJobs).mockResolvedValue({
      jobs: [],
      fetchedAt: new Date().toISOString(),
      sources: [
        { name: "himalayas", ok: false, count: 0, cached: false, error: "HTTP 503" },
        { name: "remotive", ok: false, count: 0, cached: false, error: "HTTP 503" },
      ],
    });

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(502);
    expect(body.error).toBe("All sources unavailable");
    expect(Array.isArray(body.sources)).toBe(true);
  });
});
