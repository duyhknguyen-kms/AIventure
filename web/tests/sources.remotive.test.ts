// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fixture from "./fixtures/remotive.json";
import { UpstreamError } from "@/lib/sources/http";
import { fetchRemotive, remotiveDateToIso } from "@/lib/sources/remotive";
import type { Job } from "@/lib/types";

/*
 * The fixture is the real Remotive feed recorded on 2026-11-17 (one call,
 * 17 jobs) trimmed to 10 jobs by scripts/trim-fixtures.mjs. Expected values
 * are read from the fixture jobs, looked up by the field under test. Cases
 * the sample lacks (job types freelance and part_time, a job with every
 * optional field missing) are built from a real job by overriding fields.
 */

type FixtureJob = (typeof fixture.jobs)[number];

function stubFetchOnce(response: () => Response) {
  const mock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    void input;
    void init;
    return response();
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}

const json = (body: unknown, init: ResponseInit = {}) =>
  () => new Response(JSON.stringify(body), { status: 200, ...init });

/** The fixture job whose `field` equals `value`; fails loudly if the recording lacks it. */
function fixtureJob<K extends keyof FixtureJob>(field: K, value: FixtureJob[K]): FixtureJob {
  const job = fixture.jobs.find((j) => j[field] === value);
  if (!job) throw new Error(`fixture has no job with ${String(field)} = ${JSON.stringify(value)}`);
  return job;
}

function mapped(jobs: Job[], source: FixtureJob): Job {
  const job = jobs.find((j) => j.sourceId === String(source.id));
  if (!job) throw new Error(`job ${source.id} was not mapped`);
  return job;
}

async function fetchFixture(): Promise<Job[]> {
  stubFetchOnce(json(fixture));
  return fetchRemotive();
}

let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("fetchRemotive", () => {
  it("maps the first recorded job field by field with one request and no search", async () => {
    const first = fixture.jobs[0];
    // Preconditions of the recording this test relies on.
    expect(first).toMatchObject({
      job_type: "full_time",
      salary: "$170k - $200k",
      candidate_required_location: "USA, Canada, USA timezones",
      publication_date: "2026-11-14T20:33:53",
    });
    const mock = stubFetchOnce(json(fixture));

    const jobs = await fetchRemotive();

    expect(mock).toHaveBeenCalledTimes(1);
    expect(String(mock.mock.calls[0][0])).toBe("https://remotive.com/api/remote-jobs");
    expect(jobs).toHaveLength(fixture.jobs.length);
    expect(jobs[0]).toEqual<Job>({
      id: `remotive:${first.id}`,
      source: "remotive",
      sourceId: String(first.id),
      title: first.title,
      company: first.company_name,
      companyLogo: first.company_logo,
      applyUrl: first.url,
      sourceUrl: first.url,
      employmentType: "full_time",
      seniority: ["senior"], // "Tech Lead ..." in the title
      salary: {
        min: 170000,
        max: 200000,
        currency: "USD",
        period: "annual",
        annualMin: 170000,
        annualMax: 200000,
        raw: first.salary,
      },
      location: { worldwide: false, countries: ["US", "CA"], regions: [], raw: first.candidate_required_location },
      timezones: null,
      categories: [first.category],
      tags: first.tags,
      excerpt: null,
      descriptionHtml: first.description,
      descriptionText: expect.stringContaining("About Mitre Media"),
      publishedAt: "2026-11-14T20:33:53.000Z",
      expiresAt: null,
      alsoOn: [],
    });
    expect(jobs[0].descriptionText).not.toMatch(/<[a-z]/i);
  });

  it("parses the recorded free-text salaries", async () => {
    const jobs = await fetchFixture();

    expect(mapped(jobs, fixtureJob("salary", "$35,3k- $52k")).salary).toMatchObject({
      min: 35300,
      max: 52000,
      currency: "USD",
      period: "annual",
    });
    expect(mapped(jobs, fixtureJob("salary", "OTE $25k - $35k")).salary).toMatchObject({
      min: 25000,
      max: 35000,
      currency: "USD",
      raw: "OTE $25k - $35k",
    });
    expect(mapped(jobs, fixtureJob("salary", "$14 - $20/hour")).salary).toMatchObject({
      period: "hourly",
      annualMin: 29120,
      annualMax: 41600,
    });
    expect(mapped(jobs, fixtureJob("salary", "$3.5k–$5k/month")).salary).toMatchObject({
      period: "monthly",
      annualMin: 42000,
      annualMax: 60000,
    });
    // An empty salary string, frequent in the feed, has no salary.
    const emptySalaries = fixture.jobs.filter((j) => j.salary === "");
    expect(emptySalaries.length).toBeGreaterThan(0);
    for (const source of emptySalaries) expect(mapped(jobs, source).salary).toBeNull();
  });

  it("parses the recorded location texts", async () => {
    const jobs = await fetchFixture();

    expect(mapped(jobs, fixtureJob("candidate_required_location", "USA, Canada")).location).toEqual({
      worldwide: false,
      countries: ["US", "CA"],
      regions: [],
      raw: "USA, Canada",
    });
    expect(mapped(jobs, fixtureJob("candidate_required_location", "LATAM, Europe, USA, Canada, APAC")).location).toEqual({
      worldwide: false,
      countries: ["US", "CA"],
      regions: ["AMERICAS", "EUROPE", "APAC"],
      raw: "LATAM, Europe, USA, Canada, APAC",
    });
    expect(mapped(jobs, fixtureJob("candidate_required_location", "USA")).location.countries).toEqual(["US"]);
    expect(mapped(jobs, fixtureJob("candidate_required_location", "Worldwide")).location.worldwide).toBe(true);
  });

  it("maps job types, title seniority and trims company names", async () => {
    const jobs = await fetchFixture();

    for (const source of fixture.jobs) {
      const job = mapped(jobs, source);
      expect(job.employmentType).toBe(source.job_type === "contract" ? "contract" : "full_time");
      expect(job.company).toBe(source.company_name.trim());
    }
    expect(fixture.jobs.some((j) => j.company_name !== j.company_name.trim())).toBe(true);
    expect(mapped(jobs, fixtureJob("title", "Senior Data Engineer")).seniority).toEqual(["senior"]);
    expect(mapped(jobs, fixtureJob("title", "Remote Office Assistant")).seniority).toEqual([]);

    // freelance and part_time appear in the full feed but not in the trimmed sample.
    const base = fixture.jobs[0];
    stubFetchOnce(
      json({
        ...fixture,
        jobs: [
          { ...base, id: 1, job_type: "freelance" },
          { ...base, id: 2, job_type: "part_time" },
        ],
      }),
    );
    const [freelance, partTime] = await fetchRemotive();
    expect(freelance.employmentType).toBe("contract");
    expect(partTime.employmentType).toBe("part_time");
  });

  it("maps a job without the optional company_logo_url and one without any optional field", async () => {
    const noLogoUrl = fixture.jobs.find((j) => !("company_logo_url" in j));
    expect(noLogoUrl).toBeDefined();
    const jobs = await fetchFixture();
    expect(mapped(jobs, noLogoUrl!).companyLogo).toBe(noLogoUrl!.company_logo);

    // Synthetic: a real job with every optional field removed.
    const {
      company_logo: _logo,
      category: _category,
      tags: _tags,
      job_type: _type,
      candidate_required_location: _location,
      salary: _salary,
      description: _description,
      ...required
    } = fixture.jobs[0];
    void [_logo, _category, _tags, _type, _location, _salary, _description];
    stubFetchOnce(json({ ...fixture, jobs: [required] }));

    const [bare] = await fetchRemotive();

    expect(bare).toMatchObject({
      companyLogo: null,
      categories: [],
      tags: [],
      employmentType: null,
      salary: null,
      location: { worldwide: true, countries: [], regions: [], raw: null },
      descriptionHtml: "",
      descriptionText: "",
    });
    expect(warn).not.toHaveBeenCalled();
  });

  it("converts every publication_date without an offset to a UTC ISO string", async () => {
    const jobs = await fetchFixture();

    for (const source of fixture.jobs) {
      expect(source.publication_date).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
      expect(mapped(jobs, source).publishedAt).toBe(`${source.publication_date}.000Z`);
    }
  });

  it("skips invalid jobs, counts them in a log line and drops duplicates", async () => {
    const [good] = fixture.jobs;
    const badDate = { ...good, id: 1, publication_date: "not a date" };
    const badUrl = { ...good, id: 2, url: "javascript:alert(1)" };
    const noTitle = { ...good, id: 3, title: "" };
    stubFetchOnce(json({ ...fixture, jobs: [good, badDate, badUrl, noTitle, good] }));

    const jobs = await fetchRemotive();

    expect(jobs.map((j) => j.id)).toEqual([`remotive:${good.id}`]);
    expect(warn).toHaveBeenCalledWith("[remotive] skipped 3 invalid job(s)");
  });

  it("turns 429 into an UpstreamError carrying Retry-After", async () => {
    stubFetchOnce(() => new Response("", { status: 429, headers: { "Retry-After": "3600" } }));

    const error = await fetchRemotive().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(UpstreamError);
    expect(error).toMatchObject({ source: "remotive", status: 429, retryAfterSeconds: 3600 });
  });

  it("rejects a body without a jobs array", async () => {
    stubFetchOnce(json({ "00-warning": fixture["00-warning"] }));
    await expect(fetchRemotive()).rejects.toThrow("Unexpected response shape");
  });
});

describe("remotiveDateToIso", () => {
  it("treats a value without an offset as UTC", () => {
    expect(remotiveDateToIso("2026-11-14T20:33:53")).toBe("2026-11-14T20:33:53.000Z");
  });

  it("keeps an explicit offset", () => {
    expect(remotiveDateToIso("2026-11-14T20:33:53+02:00")).toBe("2026-11-14T18:33:53.000Z");
    expect(remotiveDateToIso("2026-11-14T20:33:53Z")).toBe("2026-11-14T20:33:53.000Z");
  });

  it("returns null for empty or invalid values", () => {
    expect(remotiveDateToIso("")).toBeNull();
    expect(remotiveDateToIso("yesterday")).toBeNull();
  });
});
