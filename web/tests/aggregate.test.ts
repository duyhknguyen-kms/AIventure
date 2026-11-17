// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { aggregateJobs } from "@/lib/aggregate/aggregate";
import { clearCache } from "@/lib/aggregate/cache";
import { dedupeJobs } from "@/lib/aggregate/dedupe";
import type { Job } from "@/lib/types";

// ── Helpers ────────────────────────────────────────────────────────────────

function makeJob(overrides: Partial<Job> & { id: string; source: Job["source"] }): Job {
  return {
    sourceId: overrides.id,
    title: "Software Engineer",
    company: "Acme Corp",
    companyLogo: null,
    applyUrl: "https://example.com/apply",
    sourceUrl: "https://example.com/job",
    employmentType: "full_time",
    seniority: ["senior"],
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
    ...overrides,
  };
}

// Mock both source modules so tests make zero network calls
vi.mock("@/lib/sources/himalayas", () => ({
  fetchHimalayas: vi.fn(),
}));
vi.mock("@/lib/sources/remotive", () => ({
  fetchRemotive: vi.fn(),
}));

import { fetchHimalayas } from "@/lib/sources/himalayas";
import { fetchRemotive } from "@/lib/sources/remotive";

beforeEach(() => {
  clearCache();
  vi.clearAllMocks();
});

// ── Deduplication ──────────────────────────────────────────────────────────

describe("dedupeJobs", () => {
  it("keeps Himalayas record on collision and fills alsoOn", () => {
    const himJob = makeJob({
      id: "himalayas:guid-1",
      source: "himalayas",
      company: "Acme Inc",
      title: "Senior Engineer",
    });
    const remJob = makeJob({
      id: "remotive:42",
      source: "remotive",
      company: "Acme Inc",
      title: "Senior Engineer",
      sourceUrl: "https://remotive.com/job/42",
    });

    const result = dedupeJobs([himJob, remJob]);

    expect(result).toHaveLength(1);
    expect(result[0].source).toBe("himalayas");
    expect(result[0].alsoOn).toHaveLength(1);
    expect(result[0].alsoOn[0]).toMatchObject({ source: "remotive", url: "https://remotive.com/job/42" });
  });

  it("strips company suffixes when matching", () => {
    const himJob = makeJob({ id: "himalayas:1", source: "himalayas", company: "Acme LLC", title: "Engineer" });
    const remJob = makeJob({ id: "remotive:1", source: "remotive", company: "Acme", title: "Engineer" });

    const result = dedupeJobs([himJob, remJob]);
    expect(result).toHaveLength(1);
  });

  it("keeps distinct jobs with different titles", () => {
    const a = makeJob({ id: "himalayas:1", source: "himalayas", company: "Acme", title: "Frontend Engineer" });
    const b = makeJob({ id: "remotive:1", source: "remotive", company: "Acme", title: "Backend Engineer" });

    const result = dedupeJobs([a, b]);
    expect(result).toHaveLength(2);
  });

  it("keeps distinct jobs from different companies", () => {
    const a = makeJob({ id: "himalayas:1", source: "himalayas", company: "Acme", title: "Engineer" });
    const b = makeJob({ id: "remotive:1", source: "remotive", company: "Beta", title: "Engineer" });

    const result = dedupeJobs([a, b]);
    expect(result).toHaveLength(2);
  });
});

// ── aggregateJobs — happy path ─────────────────────────────────────────────

describe("aggregateJobs — both sources succeed", () => {
  it("returns merged jobs and sources status", async () => {
    const himJob = makeJob({ id: "himalayas:1", source: "himalayas", company: "Acme", title: "Engineer" });
    const remJob = makeJob({ id: "remotive:1", source: "remotive", company: "Beta", title: "Designer" });

    vi.mocked(fetchHimalayas).mockResolvedValue({ jobs: [himJob], skipped: 0 });
    vi.mocked(fetchRemotive).mockResolvedValue({ jobs: [remJob], skipped: 0 });

    const result = await aggregateJobs();

    expect(result.jobs).toHaveLength(2);
    expect(result.sources).toHaveLength(2);
    expect(result.sources.find((s) => s.name === "himalayas")).toMatchObject({ ok: true, count: 1 });
    expect(result.sources.find((s) => s.name === "remotive")).toMatchObject({ ok: true, count: 1 });
    expect(typeof result.fetchedAt).toBe("string");
  });

  it("sorts jobs by publishedAt descending", async () => {
    const older = makeJob({ id: "himalayas:1", source: "himalayas", title: "Frontend Engineer", publishedAt: "2026-11-10T00:00:00.000Z" });
    const newer = makeJob({ id: "remotive:1", source: "remotive", title: "Backend Engineer", publishedAt: "2026-11-15T00:00:00.000Z" });

    vi.mocked(fetchHimalayas).mockResolvedValue({ jobs: [older], skipped: 0 });
    vi.mocked(fetchRemotive).mockResolvedValue({ jobs: [newer], skipped: 0 });

    const { jobs } = await aggregateJobs();
    expect(jobs[0].publishedAt).toBe("2026-11-15T00:00:00.000Z");
  });

  it("drops expired jobs", async () => {
    const expired = makeJob({
      id: "himalayas:1",
      source: "himalayas",
      expiresAt: "2020-01-01T00:00:00.000Z",
    });

    vi.mocked(fetchHimalayas).mockResolvedValue({ jobs: [expired], skipped: 0 });
    vi.mocked(fetchRemotive).mockResolvedValue({ jobs: [], skipped: 0 });

    const { jobs } = await aggregateJobs();
    expect(jobs).toHaveLength(0);
  });
});

// ── aggregateJobs — partial failure ───────────────────────────────────────

describe("aggregateJobs — one source fails", () => {
  it("returns remaining source's jobs with ok:false for the failed one", async () => {
    const himJob = makeJob({ id: "himalayas:1", source: "himalayas" });

    vi.mocked(fetchHimalayas).mockResolvedValue({ jobs: [himJob], skipped: 0 });
    vi.mocked(fetchRemotive).mockRejectedValue({ type: "http", status: 503 });

    const result = await aggregateJobs();

    expect(result.jobs).toHaveLength(1);
    const rem = result.sources.find((s) => s.name === "remotive")!;
    expect(rem.ok).toBe(false);
    expect(rem.count).toBe(0);
    expect(typeof rem.error).toBe("string");
  });
});

// ── Cache ──────────────────────────────────────────────────────────────────

describe("aggregateJobs — cache", () => {
  it("serves a second call from cache without calling fetchers again", async () => {
    const himJob = makeJob({ id: "himalayas:1", source: "himalayas" });

    vi.mocked(fetchHimalayas).mockResolvedValue({ jobs: [himJob], skipped: 0 });
    vi.mocked(fetchRemotive).mockResolvedValue({ jobs: [], skipped: 0 });

    await aggregateJobs();
    await aggregateJobs();

    expect(fetchHimalayas).toHaveBeenCalledTimes(1);
    expect(fetchRemotive).toHaveBeenCalledTimes(1);
  });

  it("returns stale data on error when cache exists", async () => {
    const himJob = makeJob({ id: "himalayas:1", source: "himalayas" });

    // First call populates cache
    vi.mocked(fetchHimalayas).mockResolvedValue({ jobs: [himJob], skipped: 0 });
    vi.mocked(fetchRemotive).mockResolvedValue({ jobs: [], skipped: 0 });
    await aggregateJobs();

    // Expire the cache manually
    const store = (globalThis as Record<string, unknown>).__aiventureCache as {
      entries: Map<string, { expiresAt: number }>;
    };
    store.entries.forEach((v) => { v.expiresAt = Date.now() - 1; });

    // Second call: sources fail
    vi.mocked(fetchHimalayas).mockRejectedValue({ type: "http", status: 503 });
    vi.mocked(fetchRemotive).mockRejectedValue({ type: "http", status: 503 });

    const result = await aggregateJobs();

    // Stale himalayas data returned
    const him = result.sources.find((s) => s.name === "himalayas")!;
    expect(him.cached).toBe(true);
    expect(him.ok).toBe(false);
    expect(typeof him.error).toBe("string");
  });
});

// ── q filtering ───────────────────────────────────────────────────────────

describe("aggregateJobs — q filtering", () => {
  it("filters jobs locally when q is set", async () => {
    const matchJob = makeJob({
      id: "himalayas:1",
      source: "himalayas",
      title: "React Developer",
      descriptionText: "react typescript",
    });
    const noMatchJob = makeJob({
      id: "remotive:1",
      source: "remotive",
      title: "Backend Engineer",
      descriptionText: "java spring",
    });

    vi.mocked(fetchHimalayas).mockResolvedValue({ jobs: [matchJob], skipped: 0 });
    vi.mocked(fetchRemotive).mockResolvedValue({ jobs: [noMatchJob], skipped: 0 });

    const { jobs } = await aggregateJobs({ q: "react" });
    expect(jobs).toHaveLength(1);
    expect(jobs[0].title).toBe("React Developer");
  });
});
