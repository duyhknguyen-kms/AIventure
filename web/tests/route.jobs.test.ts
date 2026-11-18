// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as route from "@/app/api/jobs/route";
import { type AggregateResult, aggregateJobs } from "@/lib/aggregate/aggregate";
import type { Job, SourceStatus } from "@/lib/types";

// Hoisted above the imports by vitest: the route sees the mock.
vi.mock("@/lib/aggregate/aggregate", () => ({ aggregateJobs: vi.fn() }));

const mockedAggregate = vi.mocked(aggregateJobs);

const job: Job = {
  id: "himalayas:https://himalayas.app/companies/acme/jobs/x",
  source: "himalayas",
  sourceId: "https://himalayas.app/companies/acme/jobs/x",
  title: "Senior Frontend Engineer",
  company: "Acme",
  companyLogo: null,
  applyUrl: "https://himalayas.app/companies/acme/jobs/x/apply",
  sourceUrl: "https://himalayas.app/companies/acme/jobs/x",
  employmentType: "full_time",
  seniority: ["senior"],
  salary: null,
  location: { worldwide: true, countries: [], regions: [], raw: null },
  timezones: [],
  categories: [],
  tags: [],
  excerpt: null,
  descriptionHtml: "<p>Hi</p>",
  descriptionText: "Hi",
  publishedAt: "2026-11-16T08:00:00.000Z",
  expiresAt: null,
  alsoOn: [],
};

const ok = (name: SourceStatus["name"], count: number): SourceStatus => ({ name, ok: true, count, cached: false });
const failed = (name: SourceStatus["name"], error: string): SourceStatus => ({ name, ok: false, count: 0, cached: false, error });

function result(sources: SourceStatus[], jobs: Job[] = []): AggregateResult {
  return { fetchedAt: "2026-11-17T09:00:00.000Z", sources, jobs };
}

const get = (query = "") => route.GET(new Request(`http://localhost/api/jobs${query}`));

beforeEach(() => {
  mockedAggregate.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/jobs", () => {
  it("exports only GET, with no segment config that cacheComponents rejects at build", () => {
    // `runtime` and `dynamic` fail `next build` with cacheComponents on; the
    // handler is dynamic because it reads request.url (Node is the default runtime).
    expect(Object.keys(route).sort()).toEqual(["GET"]);
  });

  it("returns { fetchedAt, sources, jobs } with 200", async () => {
    mockedAggregate.mockResolvedValue(result([ok("himalayas", 1), ok("remotive", 0)], [job]));

    const response = await get("?q=%20react%20");

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      fetchedAt: "2026-11-17T09:00:00.000Z",
      sources: [ok("himalayas", 1), ok("remotive", 0)],
      jobs: [job],
    });
    expect(mockedAggregate).toHaveBeenCalledWith({ q: "react" });
  });

  it("calls aggregateJobs without q when it is missing or blank", async () => {
    mockedAggregate.mockResolvedValue(result([ok("himalayas", 0), ok("remotive", 0)]));
    await get();
    await get("?q=%20%20");
    expect(mockedAggregate).toHaveBeenNthCalledWith(1, { q: undefined });
    expect(mockedAggregate).toHaveBeenNthCalledWith(2, { q: undefined });
  });

  it("still returns 200 when one source failed", async () => {
    const sources = [ok("himalayas", 1), failed("remotive", "HTTP 429 (retry after 60s)")];
    mockedAggregate.mockResolvedValue(result(sources, [job]));

    const response = await get();

    expect(response.status).toBe(200);
    expect((await response.json()).sources).toEqual(sources);
  });

  it("returns 400 when q is longer than 100 characters", async () => {
    const response = await get(`?q=${"a".repeat(101)}`);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: expect.stringContaining("100") });
    expect(mockedAggregate).not.toHaveBeenCalled();
  });

  it("accepts exactly 100 characters", async () => {
    mockedAggregate.mockResolvedValue(result([ok("himalayas", 0), ok("remotive", 0)]));
    expect((await get(`?q=${"a".repeat(100)}`)).status).toBe(200);
  });

  it("returns 502 when both sources fail and no stale cache exists", async () => {
    const sources = [failed("himalayas", "Network error"), failed("remotive", "HTTP 503")];
    mockedAggregate.mockResolvedValue(result(sources));

    const response = await get();

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "All sources unavailable", sources });
  });

  it("returns a generic 500 and logs the error on the server", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mockedAggregate.mockRejectedValue(new Error("boom: internal detail"));

    const response = await get();

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: "Internal server error" });
    expect(JSON.stringify(body)).not.toContain("internal detail");
    expect(log).toHaveBeenCalledWith("[api/jobs] unexpected error:", expect.stringContaining("boom"));
  });
});
