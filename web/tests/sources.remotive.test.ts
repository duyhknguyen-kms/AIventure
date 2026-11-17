// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchRemotive } from "@/lib/sources/remotive";
import fixture from "./fixtures/remotive.json";

// ── Helpers ────────────────────────────────────────────────────────────────

function makeResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    json: async () => body,
  } as unknown as Response;
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ── Happy path ─────────────────────────────────────────────────────────────

describe("fetchRemotive — happy path", () => {
  it("maps fixture to valid Job[] with all required fields", async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(fixture));

    const { jobs, skipped } = await fetchRemotive();

    expect(skipped).toBe(0);
    expect(jobs.length).toBe(fixture.jobs.length);

    const job = jobs[0];
    expect(job.id).toMatch(/^remotive:\d+$/);
    expect(job.source).toBe("remotive");
    expect(typeof job.title).toBe("string");
    expect(typeof job.company).toBe("string");
    expect(typeof job.applyUrl).toBe("string");
    expect(typeof job.sourceUrl).toBe("string");
    expect(typeof job.publishedAt).toBe("string");
    expect(() => new Date(job.publishedAt)).not.toThrow();
    expect(Array.isArray(job.seniority)).toBe(true);
    expect(Array.isArray(job.categories)).toBe(true);
    expect(Array.isArray(job.tags)).toBe(true);
    expect(job.alsoOn).toHaveLength(0);
    expect(job.timezones).toBeNull();     // Remotive doesn't provide timezone data
    expect(job.expiresAt).toBeNull();
  });

  it("produces the same Job shape as the Himalayas adapter", async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(fixture));
    const { jobs } = await fetchRemotive();

    const shapeKeys: (keyof import("@/lib/types").Job)[] = [
      "id", "source", "sourceId", "title", "company", "companyLogo",
      "applyUrl", "sourceUrl", "employmentType", "seniority", "salary",
      "location", "timezones", "categories", "tags", "excerpt",
      "descriptionHtml", "descriptionText", "publishedAt", "expiresAt", "alsoOn",
    ];
    for (const job of jobs) {
      for (const key of shapeKeys) {
        expect(key in job, `missing field "${key}"`).toBe(true);
      }
    }
  });
});

// ── Free-text salary parsing ────────────────────────────────────────────────

describe("fetchRemotive — salary", () => {
  it("parses free-text salary '$170k - $200k' into a Salary object", async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(fixture));
    const { jobs } = await fetchRemotive();

    const job = jobs.find((j) => j.salary !== null);
    expect(job).toBeDefined();
    expect(job!.salary!.currency).toBe("USD");
    expect(typeof job!.salary!.annualMin).toBe("number");
    expect(typeof job!.salary!.annualMax).toBe("number");
  });

  it("salary is null when field is empty or null", async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(fixture));
    const { jobs } = await fetchRemotive();

    const nullSalaryJob = jobs.find((j) => j.salary === null);
    expect(nullSalaryJob).toBeDefined();
  });
});

// ── Missing optional fields ────────────────────────────────────────────────

describe("fetchRemotive — missing optional fields", () => {
  it("handles missing company_logo gracefully", async () => {
    const noLogo = {
      ...fixture,
      jobs: fixture.jobs.map((j) => ({ ...j, company_logo: null, company_logo_url: null })),
    };
    vi.mocked(fetch).mockResolvedValue(makeResponse(noLogo));

    const { jobs } = await fetchRemotive();
    expect(jobs.every((j) => j.companyLogo === null)).toBe(true);
  });

  it("handles missing tags (defaults to [])", async () => {
    const noTags = {
      ...fixture,
      jobs: fixture.jobs.map((j) => ({ ...j, tags: null })),
    };
    vi.mocked(fetch).mockResolvedValue(makeResponse(noTags));

    const { jobs } = await fetchRemotive();
    expect(jobs.every((j) => Array.isArray(j.tags))).toBe(true);
  });

  it("handles missing category (defaults to [])", async () => {
    const noCat = {
      ...fixture,
      jobs: fixture.jobs.map((j) => ({ ...j, category: null })),
    };
    vi.mocked(fetch).mockResolvedValue(makeResponse(noCat));

    const { jobs } = await fetchRemotive();
    expect(jobs.every((j) => Array.isArray(j.categories))).toBe(true);
  });

  it("skips invalid jobs without failing the whole fetch", async () => {
    const withBad = {
      ...fixture,
      jobs: [{ broken: true }, ...fixture.jobs],
    };
    vi.mocked(fetch).mockResolvedValue(makeResponse(withBad));

    const { jobs, skipped } = await fetchRemotive();
    expect(skipped).toBe(1);
    expect(jobs.length).toBe(fixture.jobs.length);
  });
});

// ── publication_date UTC handling ──────────────────────────────────────────

describe("fetchRemotive — publication_date", () => {
  it("treats publication_date without offset as UTC ISO string", async () => {
    const dateJob = {
      ...fixture,
      jobs: [{ ...fixture.jobs[0], publication_date: "2026-11-14T20:33:53" }],
    };
    vi.mocked(fetch).mockResolvedValue(makeResponse(dateJob));

    const { jobs } = await fetchRemotive();
    expect(jobs[0].publishedAt).toBe("2026-11-14T20:33:53.000Z");
  });
});

// ── Error handling ─────────────────────────────────────────────────────────

describe("fetchRemotive — errors", () => {
  it("throws for HTTP 500", async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse({}, 500));
    await expect(fetchRemotive()).rejects.toMatchObject({ type: "http", status: 500 });
  });

  it("throws for HTTP 403", async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse({}, 403));
    await expect(fetchRemotive()).rejects.toMatchObject({ type: "http", status: 403 });
  });
});
