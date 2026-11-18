// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type AggregateDeps,
  aggregateJobs,
  himalayasCacheKey,
  isExpired,
  matchesQuery,
  normalizeQuery,
} from "@/lib/aggregate/aggregate";
import { blockedUntil, getEntry, getOrFetch, resetCache } from "@/lib/aggregate/cache";
import { dedupeJobs, dedupeKey, norm } from "@/lib/aggregate/dedupe";
import { UpstreamError } from "@/lib/sources/http";
import type { Job } from "@/lib/types";

const T0 = Date.parse("2026-11-17T09:00:00.000Z");
const TTL = 600; // seconds

function makeJob(overrides: Partial<Job> = {}): Job {
  const source = overrides.source ?? "himalayas";
  const sourceId = overrides.sourceId ?? "job-1";
  return {
    id: `${source}:${sourceId}`,
    source,
    sourceId,
    title: "Senior Frontend Engineer",
    company: "Acme",
    companyLogo: null,
    applyUrl: `https://${source}.example/${sourceId}/apply`,
    sourceUrl: `https://${source}.example/${sourceId}`,
    employmentType: "full_time",
    seniority: ["senior"],
    salary: null,
    location: { worldwide: true, countries: [], regions: [], raw: null },
    timezones: [],
    categories: [],
    tags: [],
    excerpt: null,
    descriptionHtml: "",
    descriptionText: "",
    publishedAt: "2026-11-10T00:00:00.000Z",
    expiresAt: null,
    alsoOn: [],
    ...overrides,
  };
}

/** A controllable clock plus stubbed sources. */
function setup(himalayas: Job[], remotive: Job[]) {
  let now = T0;
  const deps: AggregateDeps = {
    fetchHimalayas: vi.fn(async () => himalayas),
    fetchRemotive: vi.fn(async () => remotive),
    now: () => now,
    ttlSeconds: TTL,
  };
  return {
    deps,
    advance(seconds: number) {
      now += seconds * 1000;
    },
  };
}

const rateLimited = (source: "himalayas" | "remotive", seconds: number | null) =>
  new UpstreamError(source, `HTTP 429 (retry after ${seconds ?? 60}s)`, { status: 429, retryAfterSeconds: seconds });

beforeEach(() => {
  resetCache();
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  resetCache();
});

describe("aggregateJobs", () => {
  it("merges both sources, keeps the Himalayas record of a duplicate and fills alsoOn", async () => {
    const hFrontend = makeJob({ sourceId: "h1", publishedAt: "2026-11-15T00:00:00.000Z" });
    const hBackend = makeJob({ sourceId: "h2", title: "Backend Engineer", publishedAt: "2026-11-12T00:00:00.000Z" });
    const rFrontend = makeJob({ source: "remotive", sourceId: "r1", company: "Acme Inc.", publishedAt: "2026-11-16T00:00:00.000Z" });
    const rDesigner = makeJob({ source: "remotive", sourceId: "r2", title: "Designer", company: "Pixel", publishedAt: "2026-11-14T00:00:00.000Z" });
    const { deps } = setup([hFrontend, hBackend], [rFrontend, rDesigner]);

    const result = await aggregateJobs({}, deps);

    expect(result.jobs.map((j) => j.id)).toEqual(["himalayas:h1", "remotive:r2", "himalayas:h2"]);
    expect(result.jobs[0].alsoOn).toEqual([{ source: "remotive", url: "https://remotive.example/r1" }]);
    expect(result.sources).toEqual([
      { name: "himalayas", ok: true, count: 2, cached: false },
      { name: "remotive", ok: true, count: 2, cached: false },
    ]);
    expect(result.fetchedAt).toBe("2026-11-17T09:00:00.000Z");
    expect(deps.fetchHimalayas).toHaveBeenCalledWith(undefined);
  });

  it("returns partial results with ok: false when one source rejects", async () => {
    const { deps } = setup([makeJob()], []);
    deps.fetchRemotive = vi.fn(async () => {
      throw new UpstreamError("remotive", "HTTP 503", { status: 503 });
    });

    const result = await aggregateJobs({}, deps);

    expect(result.jobs).toHaveLength(1);
    expect(result.sources[0]).toMatchObject({ name: "himalayas", ok: true, count: 1 });
    expect(result.sources[1]).toEqual({ name: "remotive", ok: false, count: 0, cached: false, error: "HTTP 503" });
  });

  it("reports both sources failed with no jobs, and hides unexpected error details", async () => {
    const { deps } = setup([], []);
    deps.fetchHimalayas = vi.fn().mockRejectedValue(new UpstreamError("himalayas", "Network error"));
    deps.fetchRemotive = vi.fn().mockRejectedValue(new TypeError("secret internal detail"));

    const result = await aggregateJobs({}, deps);

    expect(result.jobs).toEqual([]);
    expect(result.sources.map((s) => [s.ok, s.error])).toEqual([
      [false, "Network error"],
      [false, "Unexpected error"],
    ]);
    expect(console.error).toHaveBeenCalled();
  });

  it("serves a cache hit within the TTL without calling upstream, then refreshes after it", async () => {
    const { deps, advance } = setup([makeJob()], [makeJob({ source: "remotive", sourceId: "r1", title: "Other" })]);

    await aggregateJobs({}, deps);
    advance(TTL - 1);
    const second = await aggregateJobs({}, deps);

    expect(deps.fetchHimalayas).toHaveBeenCalledTimes(1);
    expect(deps.fetchRemotive).toHaveBeenCalledTimes(1);
    expect(second.sources.every((s) => s.cached && s.ok)).toBe(true);

    advance(2);
    const third = await aggregateJobs({}, deps);
    expect(deps.fetchHimalayas).toHaveBeenCalledTimes(2);
    expect(third.sources.every((s) => !s.cached)).toBe(true);
  });

  it("returns stale data with cached: true and error when a refresh fails", async () => {
    const { deps, advance } = setup([makeJob()], []);
    await aggregateJobs({}, deps);

    advance(TTL + 1);
    deps.fetchHimalayas = vi.fn().mockRejectedValue(new UpstreamError("himalayas", "HTTP 503", { status: 503 }));
    const result = await aggregateJobs({}, deps);

    expect(result.jobs.map((j) => j.id)).toEqual(["himalayas:job-1"]);
    expect(result.sources[0]).toEqual({ name: "himalayas", ok: true, count: 1, cached: true, error: "HTTP 503" });
  });

  it("filters q locally and fetches Remotive once for different queries", async () => {
    const reactJob = makeJob({ source: "remotive", sourceId: "r1", title: "React Developer", company: "Beta" });
    const goJob = makeJob({ source: "remotive", sourceId: "r2", title: "Go Developer", company: "Gamma", tags: ["golang"] });
    const hReact = makeJob({ sourceId: "h1", title: "Frontend Engineer", descriptionText: "We use React and Node." });
    const { deps } = setup([hReact], [reactJob, goJob]);

    const react = await aggregateJobs({ q: "  REACT " }, deps);
    const golang = await aggregateJobs({ q: "golang developer" }, deps);

    expect(react.jobs.map((j) => j.id).sort()).toEqual(["himalayas:h1", "remotive:r1"]);
    expect(react.sources[1].count).toBe(1);
    expect(golang.jobs.map((j) => j.id)).toEqual(["remotive:r2"]);
    expect(deps.fetchHimalayas).toHaveBeenNthCalledWith(1, "react");
    expect(deps.fetchHimalayas).toHaveBeenNthCalledWith(2, "golang developer");
    expect(deps.fetchRemotive).toHaveBeenCalledTimes(1);
  });

  it("drops jobs whose expiresAt is in the past", async () => {
    const expired = makeJob({ sourceId: "old", title: "Old", expiresAt: "2026-11-17T08:59:59.000Z" });
    const open = makeJob({ sourceId: "new", title: "New", expiresAt: "2026-12-01T00:00:00.000Z" });
    const { deps } = setup([expired, open], []);

    const result = await aggregateJobs({}, deps);

    expect(result.jobs.map((j) => j.sourceId)).toEqual(["new"]);
    expect(result.sources[0].count).toBe(1);
  });

  it("blocks a rate-limited source until Retry-After passes", async () => {
    const { deps, advance } = setup([], [makeJob({ source: "remotive", sourceId: "r1" })]);
    deps.fetchHimalayas = vi.fn().mockRejectedValue(rateLimited("himalayas", 120));

    const first = await aggregateJobs({}, deps);
    advance(60);
    const second = await aggregateJobs({}, deps);

    expect(first.sources[0]).toMatchObject({ ok: false, error: "HTTP 429 (retry after 120s)" });
    expect(second.sources[0]).toMatchObject({ ok: false, error: "HTTP 429 (retry after 60s)" });
    expect(deps.fetchHimalayas).toHaveBeenCalledTimes(1);
    expect(second.jobs).toHaveLength(1); // Remotive still delivered

    advance(61);
    await aggregateJobs({}, deps);
    expect(deps.fetchHimalayas).toHaveBeenCalledTimes(2);
  });
});

describe("aggregate helpers", () => {
  it("normalizes queries and builds cache keys", () => {
    expect(normalizeQuery("  React   Native ")).toBe("react native");
    expect(normalizeQuery("   ")).toBeUndefined();
    expect(himalayasCacheKey(undefined)).toBe("himalayas:browse");
    expect(himalayasCacheKey("react")).toBe("himalayas:search:react");
  });

  it("matches every query token across title, company, tags, categories and description", () => {
    const job = makeJob({ company: "Acme", tags: ["graphql"], categories: ["Engineering"], descriptionText: "Remote first" });
    expect(matchesQuery(job, "acme graphql")).toBe(true);
    expect(matchesQuery(job, "engineering remote")).toBe(true);
    expect(matchesQuery(job, "acme python")).toBe(false);
  });

  it("treats null and unparseable expiresAt as not expired", () => {
    expect(isExpired(makeJob({ expiresAt: null }), T0)).toBe(false);
    expect(isExpired(makeJob({ expiresAt: "soon" }), T0)).toBe(false);
    expect(isExpired(makeJob({ expiresAt: "2026-11-17T08:00:00.000Z" }), T0)).toBe(true);
  });
});

describe("getOrFetch (cache)", () => {
  it("shares one in-flight fetch between concurrent callers", async () => {
    let resolve!: (value: string[]) => void;
    const fetcher = vi.fn(() => new Promise<string[]>((r) => (resolve = r)));
    const opts = { key: "k", source: "remotive" as const, fetcher, ttlSeconds: TTL, now: () => T0 };

    const a = getOrFetch(opts);
    const b = getOrFetch(opts);
    resolve(["x"]);

    const [ra, rb] = await Promise.all([a, b]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(ra).toEqual(rb);
    expect(ra).toEqual({ value: ["x"], cached: false, fetchedAt: "2026-11-17T09:00:00.000Z" });
    expect(getEntry("k")?.expiresAt).toBe(T0 + TTL * 1000);
  });

  it("stores the cache on globalThis.__aiventureCache", async () => {
    await getOrFetch({ key: "g", source: "himalayas", fetcher: async () => 1, ttlSeconds: TTL, now: () => T0 });
    expect(globalThis.__aiventureCache?.get("g")?.value).toBe(1);
  });

  it("defaults the block to 60 s when a 429 has no Retry-After", async () => {
    const fetcher = vi.fn().mockRejectedValue(rateLimited("himalayas", null));
    await expect(
      getOrFetch({ key: "h", source: "himalayas", fetcher, ttlSeconds: TTL, now: () => T0 }),
    ).rejects.toBeInstanceOf(UpstreamError);
    expect(blockedUntil("himalayas", T0)).toBe(T0 + 60_000);
    expect(blockedUntil("himalayas", T0 + 60_000)).toBeNull();
  });

  it("rethrows when a fetch fails and nothing stale exists", async () => {
    const fetcher = vi.fn().mockRejectedValue(new UpstreamError("remotive", "HTTP 500", { status: 500 }));
    await expect(
      getOrFetch({ key: "r", source: "remotive", fetcher, ttlSeconds: TTL, now: () => T0 }),
    ).rejects.toThrow("HTTP 500");
    expect(getEntry("r")).toBeUndefined();
  });
});

describe("dedupeJobs", () => {
  it("normalizes company and title for the key", () => {
    expect(norm("  Acme, Inc. ")).toBe("acme");
    expect(norm("Widgets GmbH")).toBe("widgets");
    expect(norm("Sr. Front-end   Engineer!")).toBe("sr front end engineer");
    expect(dedupeKey({ company: "ACME LLC", title: "Senior Frontend Engineer" })).toBe(
      dedupeKey({ company: "acme", title: "senior frontend engineer" }),
    );
  });

  it("keeps the Himalayas record even when the Remotive one comes first", () => {
    const remotive = makeJob({ source: "remotive", sourceId: "r1" });
    const himalayas = makeJob({ sourceId: "h1" });

    const result = dedupeJobs([remotive, himalayas]);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("himalayas:h1");
    expect(result[0].alsoOn).toEqual([{ source: "remotive", url: remotive.sourceUrl }]);
    expect(himalayas.alsoOn).toEqual([]); // input not mutated
  });

  it("keeps same-source jobs with the same key and different keys apart", () => {
    const a = makeJob({ sourceId: "h1" });
    const b = makeJob({ sourceId: "h2" });
    const c = makeJob({ sourceId: "h3", title: "Designer" });
    expect(dedupeJobs([a, b, c]).map((j) => j.id)).toEqual(["himalayas:h1", "himalayas:h2", "himalayas:h3"]);
    expect(dedupeJobs([])).toEqual([]);
  });
});
