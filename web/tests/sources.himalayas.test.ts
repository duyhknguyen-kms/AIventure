// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import browseFixture from "./fixtures/himalayas-browse.json";
import searchFixture from "./fixtures/himalayas-search.json";
import { evaluateLocation } from "@/lib/matching/filters";
import {
  HimalayasJobSchema,
  fetchHimalayas,
  normalizeSalaryPeriod,
  toJob,
  unmappedRestrictions,
} from "@/lib/sources/himalayas";
import { UpstreamError, parseRetryAfter } from "@/lib/sources/http";
import type { EmploymentType, Job, Seniority } from "@/lib/types";

/*
 * Fixtures are real responses recorded on 2026-11-17 with the SPEC §12 curl
 * commands and trimmed by scripts/trim-fixtures.mjs (browse: 10 jobs with a
 * nextCursor; search: 5 jobs, no cursor). Expected values are read from the
 * fixture jobs. Cases the sample does not contain (a worldwide job, an hourly
 * salary, an unknown country name) are built from a real job by overriding
 * only the fields under test.
 */

type FixtureJob = (typeof browseFixture.jobs)[number];

/** The real Himalayas values seen in the recording and what they map to. */
const EMPLOYMENT: Record<string, EmploymentType> = { "Full Time": "full_time", Contractor: "contract", Other: "other" };
const SENIORITY: Record<string, Seniority> = {
  Senior: "senior",
  "Mid-level": "mid",
  "Entry-level": "entry",
  Executive: "executive",
};
const COUNTRY: Record<string, string> = { Canada: "CA", "United States": "US", "United Kingdom": "GB" };

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

/** Stubs the global fetch with one response factory per call, in order. */
function stubFetch(...responses: (() => Response | Promise<Response>)[]) {
  const mock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    void input;
    void init;
    const next = responses[Math.min(mock.mock.calls.length - 1, responses.length - 1)];
    return next();
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}

/** A browse page built from the real envelope; `nextCursor` is dropped when not given. */
function page(jobs: unknown[], nextCursor?: string) {
  const { nextCursor: _ignored, ...envelope } = browseFixture;
  void _ignored;
  return { ...envelope, jobs, ...(nextCursor ? { nextCursor } : {}) };
}

/** A real browse job with some fields replaced, under a distinct guid. */
function variant(overrides: Partial<Record<keyof FixtureJob, unknown>>, slug: string, base: FixtureJob = browseFixture.jobs[0]) {
  return { ...base, guid: `${base.guid}-${slug}`, ...overrides };
}

function calledUrl(mock: ReturnType<typeof stubFetch>, call: number): URL {
  return new URL(String(mock.mock.calls[call][0]));
}

let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("fetchHimalayas (browse)", () => {
  it("maps the first recorded browse job field by field", async () => {
    const first = browseFixture.jobs[0];
    // Preconditions of the recording this test relies on.
    expect(first).toMatchObject({ employmentType: "Full Time", seniority: ["Senior"], salaryPeriod: "annual", locationRestrictions: ["Canada"] });
    expect(first.minSalary).not.toBeNull();

    const mock = stubFetch(() => jsonResponse(page(browseFixture.jobs)));
    const jobs = await fetchHimalayas(undefined, { maxPages: 5, apiKey: "" });

    expect(jobs).toHaveLength(browseFixture.jobs.length);
    expect(jobs[0]).toEqual<Job>({
      id: `himalayas:${first.guid}`,
      source: "himalayas",
      sourceId: first.guid,
      title: first.title,
      company: first.companyName,
      companyLogo: first.companyLogo,
      applyUrl: first.applicationLink,
      sourceUrl: first.guid,
      employmentType: "full_time",
      seniority: ["senior"],
      salary: {
        min: first.minSalary,
        max: first.maxSalary,
        currency: first.currency,
        period: "annual",
        annualMin: first.minSalary,
        annualMax: first.maxSalary,
        raw: null,
      },
      location: { worldwide: false, countries: ["CA"], regions: [], raw: null },
      timezones: first.timezoneRestrictions,
      categories: [...first.categories, ...first.parentCategories],
      tags: [],
      excerpt: first.excerpt,
      descriptionHtml: first.description,
      descriptionText: expect.stringContaining("PolarGrid is an early-stage Canadian company"),
      publishedAt: new Date(first.pubDate * 1000).toISOString(),
      expiresAt: new Date(first.expiryDate * 1000).toISOString(),
      alsoOn: [],
    });
    expect(jobs[0].descriptionText).not.toMatch(/<[a-z]/i);

    const url = calledUrl(mock, 0);
    expect(url.origin + url.pathname).toBe("https://himalayas.app/jobs/api");
    expect(url.searchParams.get("limit")).toBe("20");
    expect(url.searchParams.get("offset")).toBeNull();
    const init = mock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("maps the real employment, seniority, salary, location and time zone values of every job", async () => {
    stubFetch(() => jsonResponse(page(browseFixture.jobs)));
    const jobs = await fetchHimalayas(undefined, { maxPages: 1, apiKey: "" });

    browseFixture.jobs.forEach((source, i) => {
      const job = jobs[i];
      expect(job.sourceId).toBe(source.guid);
      expect(job.employmentType).toBe(EMPLOYMENT[source.employmentType]);
      expect(job.seniority).toEqual(source.seniority.map((s) => SENIORITY[s]));
      expect(job.location).toEqual({
        worldwide: false, // every recorded browse job has restrictions
        countries: source.locationRestrictions.map((name) => COUNTRY[name]),
        regions: [],
        raw: null,
      });
      expect(job.timezones).toEqual(source.timezoneRestrictions);
      expect(job.companyLogo).toBe(source.companyLogo === "" ? null : source.companyLogo);
      if (source.minSalary === null && source.maxSalary === null) {
        expect(job.salary).toBeNull();
      } else {
        expect(job.salary).toMatchObject({
          min: source.minSalary,
          max: source.maxSalary,
          currency: source.currency,
          period: "annual",
          // annualize rounds to a whole unit: the recorded GBP 27,580.80 becomes 27,581.
          annualMin: Math.round(source.minSalary ?? Number.NaN),
          annualMax: Math.round(source.maxSalary ?? Number.NaN),
        });
      }
    });
    expect(browseFixture.jobs.some((j) => j.minSalary !== null && !Number.isInteger(j.minSalary))).toBe(true);
    // The sample covers null salaries with a null currency and an empty logo.
    expect(browseFixture.jobs.some((j) => j.minSalary === null && j.currency === null)).toBe(true);
    expect(browseFixture.jobs.some((j) => j.companyLogo === "")).toBe(true);
    expect(warn).not.toHaveBeenCalled();
  });

  it("treats an empty restriction list as worldwide (synthetic, from a real job)", async () => {
    stubFetch(() => jsonResponse(page([variant({ locationRestrictions: [], timezoneRestrictions: [] }, "worldwide")])));
    const [job] = await fetchHimalayas(undefined, { maxPages: 1, apiKey: "" });

    expect(job.location).toEqual({ worldwide: true, countries: [], regions: [], raw: null });
    expect(job.timezones).toEqual([]);
    expect(evaluateLocation(job, "DE")).toBe("eligible");
  });

  it("never treats unmappable names as worldwide and logs each name once", async () => {
    stubFetch(() =>
      jsonResponse(
        page([
          variant({ locationRestrictions: ["Atlantis"] }, "atlantis-1"),
          variant({ locationRestrictions: ["Atlantis", "Lemuria"] }, "atlantis-2"),
          variant({ locationRestrictions: ["Atlantis", "Canada"] }, "mixed"),
        ]),
      ),
    );
    const [onlyUnknown, twoUnknown, mixed] = await fetchHimalayas(undefined, { maxPages: 1, apiKey: "" });

    expect(onlyUnknown.location).toEqual({ worldwide: false, countries: [], regions: [], raw: null });
    expect(twoUnknown.location.worldwide).toBe(false);
    expect(evaluateLocation(onlyUnknown, "US")).toBe("uncertain");
    expect(mixed.location).toMatchObject({ worldwide: false, countries: ["CA"] });
    expect(evaluateLocation(mixed, "US")).toBe("ineligible");

    const lines = warn.mock.calls.map((args: unknown[]) => String(args[0])).filter((l: string) => l.includes("unmapped"));
    expect(lines).toEqual(["[himalayas] unmapped location restriction(s): Atlantis; Lemuria"]);
  });

  it("annualizes an hourly salaryPeriod (synthetic, from a real job)", async () => {
    stubFetch(() =>
      jsonResponse(page([variant({ salaryPeriod: "hourly", minSalary: 40, maxSalary: 60, currency: "usd" }, "hourly")])),
    );
    const [job] = await fetchHimalayas(undefined, { maxPages: 1, apiKey: "" });

    expect(job.salary).toEqual({
      min: 40,
      max: 60,
      currency: "USD",
      period: "hourly",
      annualMin: 83200,
      annualMax: 124800,
      raw: null,
    });
  });

  it("passes the real nextCursor back and stops when it is absent", async () => {
    const realCursor = browseFixture.nextCursor;
    expect(typeof realCursor).toBe("string");
    const firstHalf = browseFixture.jobs.slice(0, 5);
    const secondHalf = browseFixture.jobs.slice(5);
    const mock = stubFetch(
      () => jsonResponse(page(firstHalf, realCursor)),
      () => jsonResponse(page(secondHalf)),
      () => jsonResponse(page([], "should-not-be-called")),
    );

    const jobs = await fetchHimalayas(undefined, { maxPages: 5, apiKey: "" });

    expect(mock).toHaveBeenCalledTimes(2);
    expect(calledUrl(mock, 0).searchParams.get("cursor")).toBeNull();
    expect(calledUrl(mock, 1).searchParams.get("cursor")).toBe(realCursor);
    expect(jobs.map((j) => j.sourceId)).toEqual(browseFixture.jobs.map((j) => j.guid));
  });

  it("stops at maxPages even when more cursors follow", async () => {
    let n = 0;
    const mock = stubFetch(() => {
      n += 1;
      return jsonResponse(page([variant({}, `page-${n}`)], `cursor-${n}`));
    });

    const jobs = await fetchHimalayas(undefined, { maxPages: 3, apiKey: "" });

    expect(mock).toHaveBeenCalledTimes(3);
    expect(jobs).toHaveLength(3);
  });

  it("skips an invalid job, counts it in a log line and keeps the rest", async () => {
    const [good, second, third] = browseFixture.jobs;
    const noGuid: Partial<FixtureJob> = { ...second };
    delete noGuid.guid;
    const badLink = { ...third, applicationLink: "javascript:alert(1)" };
    const badDate = variant({ pubDate: "yesterday" }, "bad-date");
    stubFetch(() => jsonResponse(page([good, noGuid, badLink, badDate])));

    const jobs = await fetchHimalayas(undefined, { maxPages: 5, apiKey: "" });

    expect(jobs.map((j) => j.sourceId)).toEqual([good.guid]);
    expect(warn).toHaveBeenCalledWith("[himalayas] skipped 3 invalid job(s)");
  });

  it("turns 429 into an UpstreamError carrying Retry-After", async () => {
    stubFetch(() => new Response("slow down", { status: 429, headers: { "Retry-After": "120" } }));

    const error = await fetchHimalayas(undefined, { apiKey: "" }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(UpstreamError);
    expect(error).toMatchObject({ source: "himalayas", status: 429, retryAfterSeconds: 120 });
    expect((error as Error).message).toBe("HTTP 429 (retry after 120s)");
  });

  it("defaults Retry-After to 60 s when the header is missing", async () => {
    stubFetch(() => new Response("", { status: 429 }));
    await expect(fetchHimalayas(undefined, { apiKey: "" })).rejects.toMatchObject({ retryAfterSeconds: 60 });
  });

  it("rejects with UpstreamError on other HTTP errors, network errors and bad JSON", async () => {
    stubFetch(() => new Response("down", { status: 503 }));
    await expect(fetchHimalayas(undefined, { apiKey: "" })).rejects.toThrow("HTTP 503");

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    await expect(fetchHimalayas(undefined, { apiKey: "" })).rejects.toThrow("Network error");

    const timeout = Object.assign(new Error("timed out"), { name: "TimeoutError" });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(timeout));
    await expect(fetchHimalayas(undefined, { apiKey: "" })).rejects.toThrow("Request timed out after 10s");

    stubFetch(() => new Response("<html>", { status: 200 }));
    await expect(fetchHimalayas(undefined, { apiKey: "" })).rejects.toThrow("Response was not valid JSON");

    stubFetch(() => jsonResponse({ unexpected: true }));
    await expect(fetchHimalayas(undefined, { apiKey: "" })).rejects.toThrow("Unexpected response shape");
  });

  it("returns earlier pages when a later page fails", async () => {
    stubFetch(
      () => jsonResponse(page([browseFixture.jobs[0]], browseFixture.nextCursor)),
      () => new Response("", { status: 503 }),
    );

    const jobs = await fetchHimalayas(undefined, { maxPages: 5, apiKey: "" });

    expect(jobs).toHaveLength(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("page 2 failed (HTTP 503)"));
  });

  it("sends the API key as a Bearer header and never logs it", async () => {
    const secret = "test-key-123";
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const mock = stubFetch(
      () => jsonResponse(page([browseFixture.jobs[0], { title: "broken" }], "c1")),
      () => new Response("", { status: 401 }),
    );

    await fetchHimalayas(undefined, { maxPages: 2, apiKey: secret });

    const init = mock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${secret}`);
    expect(calledUrl(mock, 0).toString()).not.toContain(secret);
    const logged = [...warn.mock.calls, ...log.mock.calls, ...error.mock.calls].flat().map(String).join(" ");
    expect(logged).not.toContain(secret);
  });
});

describe("fetchHimalayas (search)", () => {
  it("uses the search endpoint, which has no cursor, and stops at the first empty page", async () => {
    expect("nextCursor" in searchFixture).toBe(false);
    const mock = stubFetch(
      () => jsonResponse(searchFixture),
      () => jsonResponse({ ...searchFixture, jobs: [] }),
    );

    const jobs = await fetchHimalayas("  react ", { maxPages: 5, apiKey: "" });

    expect(mock).toHaveBeenCalledTimes(2);
    const first = calledUrl(mock, 0);
    expect(first.origin + first.pathname).toBe("https://himalayas.app/jobs/api/search");
    expect(first.searchParams.get("q")).toBe("react");
    expect(first.searchParams.get("page")).toBe("1");
    expect(calledUrl(mock, 1).searchParams.get("page")).toBe("2");
    expect(jobs.map((j) => j.sourceId)).toEqual(searchFixture.jobs.map((j) => j.guid));
  });

  it("maps long country-name lists and fractional time zone offsets", async () => {
    stubFetch(() => jsonResponse(searchFixture), () => jsonResponse({ ...searchFixture, jobs: [] }));
    const jobs = await fetchHimalayas("react", { maxPages: 5, apiKey: "" });

    searchFixture.jobs.forEach((source, i) => {
      // Every recorded name maps to a distinct country, so nothing is dropped.
      expect(jobs[i].location.countries).toHaveLength(source.locationRestrictions.length);
      expect(jobs[i].location.worldwide).toBe(false);
      expect(jobs[i].timezones).toEqual(source.timezoneRestrictions);
    });
    const latam = searchFixture.jobs.findIndex((j) => j.title.endsWith("LATAM"));
    expect(searchFixture.jobs[latam].locationRestrictions).toEqual(["Argentina", "Brazil", "Colombia", "Mexico", "Peru"]);
    expect(jobs[latam].location.countries).toEqual(["AR", "BR", "CO", "MX", "PE"]);
    expect(jobs[0].location.countries).toEqual(expect.arrayContaining(["BA", "CZ", "MK", "PG", "PR", "US"]));
    expect(jobs[0].timezones).toEqual(expect.arrayContaining([-3.5, 5.75, 12.75]));
    expect(warn).not.toHaveBeenCalled();
  });
});

describe("Himalayas mapping helpers", () => {
  it("maps salaryPeriod text and defaults to annual", () => {
    expect(normalizeSalaryPeriod("annual")).toBe("annual");
    expect(normalizeSalaryPeriod("hourly")).toBe("hourly");
    expect(normalizeSalaryPeriod("Weekly")).toBe("weekly");
    expect(normalizeSalaryPeriod("biweekly")).toBe("fortnightly");
    expect(normalizeSalaryPeriod("month")).toBe("monthly");
    expect(normalizeSalaryPeriod(null)).toBe("annual");
  });

  it("still accepts { alpha2 } objects as SPEC §4.2 describes", () => {
    const base = HimalayasJobSchema.parse(browseFixture.jobs[0]);
    const job = { ...base, locationRestrictions: [{ alpha2: "de", name: "Germany" }, { name: "Czechia" }] };
    expect(toJob(job).location.countries).toEqual(["DE", "CZ"]);
    expect(unmappedRestrictions(job)).toEqual([]);
    expect(unmappedRestrictions({ locationRestrictions: ["Atlantis", "Canada", "Atlantis"] })).toEqual(["Atlantis"]);
  });

  it("treats unreadable time zones as unknown, not as all time zones", () => {
    const base = HimalayasJobSchema.parse(browseFixture.jobs[0]);
    expect(toJob({ ...base, timezoneRestrictions: ["Pacific", 99] }).timezones).toBeNull();
    expect(toJob({ ...base, timezoneRestrictions: ["UTC-05:00", -3.5] }).timezones).toEqual([-5, -3.5]);
    expect(toJob({ ...base, timezoneRestrictions: [] }).timezones).toEqual([]);
    expect(toJob({ ...base, timezoneRestrictions: null }).timezones).toEqual([]);
  });

  it("drops a non-http company logo", () => {
    const base = HimalayasJobSchema.parse(browseFixture.jobs[0]);
    expect(toJob({ ...base, companyLogo: "javascript:alert(1)" }).companyLogo).toBeNull();
    expect(toJob({ ...base, companyLogo: "" }).companyLogo).toBeNull();
  });

  it("parses Retry-After as seconds or an HTTP date", () => {
    const now = Date.parse("2026-11-17T09:00:00Z");
    expect(parseRetryAfter("30", now)).toBe(30);
    expect(parseRetryAfter("Tue, 17 Nov 2026 09:02:00 GMT", now)).toBe(120);
    expect(parseRetryAfter("soon", now)).toBeNull();
    expect(parseRetryAfter(null, now)).toBeNull();
  });
});
