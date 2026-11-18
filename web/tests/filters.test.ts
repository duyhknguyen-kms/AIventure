// @vitest-environment node
import { describe, expect, it } from "vitest";
import { DEFAULT_CRITERIA, type Criteria } from "@/lib/matching/criteria";
import {
  COUNTRY_REGION,
  applyHardFilters,
  evaluateLocation,
  haystack,
  isLocationUncertain,
  matchedTerms,
  matchesTerm,
  regionOfCountry,
} from "@/lib/matching/filters";
import { COUNTRY_LOOKUP, REGION_LOOKUP, parseRemotiveLocation } from "@/lib/normalize/location";
import type { Job, Salary } from "@/lib/types";

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: "himalayas:test-1",
    source: "himalayas",
    sourceId: "test-1",
    title: "Senior Frontend Engineer",
    company: "Acme",
    companyLogo: null,
    applyUrl: "https://example.com/apply",
    sourceUrl: "https://example.com/job",
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
    publishedAt: "2026-11-01T00:00:00.000Z",
    expiresAt: null,
    alsoOn: [],
    ...overrides,
  };
}

function makeCriteria(overrides: Partial<Criteria> = {}): Criteria {
  return { ...DEFAULT_CRITERIA, ...overrides };
}

function usd(annualMin: number | null, annualMax: number | null, currency: string | null = "USD"): Salary {
  return { min: annualMin, max: annualMax, currency, period: "annual", annualMin, annualMax, raw: null };
}

const restricted = (countries: string[], regions: string[] = []) => ({
  worldwide: false,
  countries,
  regions,
  raw: null,
});

describe("text helpers (SPEC §7)", () => {
  it("haystack joins title, tags, categories and description in lower case", () => {
    const job = makeJob({
      title: "Senior React Dev",
      tags: ["GraphQL", "AWS"],
      categories: ["Software Development"],
      descriptionText: "We use Node.js",
    });
    expect(haystack(job)).toBe("senior react dev graphql aws software development we use node.js");
  });

  it("matches whole words only, case-insensitively", () => {
    expect(matchesTerm("we use react and node.js", "React")).toBe(true);
    expect(matchesTerm("we use react and node.js", "node")).toBe(true);
    expect(matchesTerm("we use reactive streams", "react")).toBe(false);
    expect(matchesTerm("javascript only", "java")).toBe(false);
  });

  it("matches multi-word terms as a phrase, across any whitespace", () => {
    expect(matchesTerm("a frontend\n  engineer role", "frontend engineer")).toBe(true);
    expect(matchesTerm("frontend and backend engineer", "frontend engineer")).toBe(false);
  });

  it("escapes regex characters and handles symbol-edged terms", () => {
    expect(matchesTerm("we write c++ and c#", "c++")).toBe(true);
    expect(matchesTerm("we write c and go", "c++")).toBe(false);
    expect(matchesTerm("price is a.b", "a.b")).toBe(true);
    expect(matchesTerm("price is axb", "a.b")).toBe(false);
    expect(matchesTerm("anything", "   ")).toBe(false);
  });

  it("matchedTerms keeps input order and only the hits", () => {
    expect(matchedTerms("react typescript node", ["graphql", "node", "react"])).toEqual(["node", "react"]);
  });
});

describe("country to region mapping (F1)", () => {
  it("covers every country the location parser can produce, with known region codes", () => {
    const regionCodes = new Set(Object.values(REGION_LOOKUP));
    for (const alpha2 of new Set(Object.values(COUNTRY_LOOKUP))) {
      expect(COUNTRY_REGION[alpha2], alpha2).toBeDefined();
    }
    for (const region of Object.values(COUNTRY_REGION)) {
      expect(regionCodes.has(region)).toBe(true);
    }
  });

  it("resolves case-insensitively and returns null for unknown countries", () => {
    expect(regionOfCountry("vn")).toBe("APAC");
    expect(regionOfCountry("DE")).toBe("EUROPE");
    expect(regionOfCountry("ZZ")).toBeNull();
  });
});

describe("applyHardFilters (SPEC §7.1, FR6)", () => {
  it("keeps eligible jobs through F1 to F3 (happy path)", () => {
    const jobs = [
      makeJob({ id: "a", location: restricted([], []), salary: usd(120000, 150000) }),
      makeJob({ id: "b", location: { worldwide: true, countries: [], regions: [], raw: null } }),
      makeJob({ id: "c", location: restricted(["VN", "TH"]) }),
      makeJob({ id: "d", location: restricted([], ["APAC"]) }),
    ];
    // "a" has an unparseable location; it is kept (see the dedicated test).
    const criteria = makeCriteria({
      country: "VN",
      excludedKeywords: ["php"],
      minSalary: { amount: 100000, currency: "USD" },
    });
    const { kept, excluded } = applyHardFilters(jobs, criteria);
    expect(kept.map((j) => j.id)).toEqual(["a", "b", "c", "d"]);
    expect(excluded).toEqual([]);
  });

  it("keeps every job with default criteria (all filters skipped)", () => {
    const jobs = [makeJob({ id: "x", location: restricted(["US"]), descriptionText: "php" })];
    expect(applyHardFilters(jobs, DEFAULT_CRITERIA).kept).toHaveLength(1);
  });

  it("F1 excludes jobs restricted to other countries and regions, with a reason", () => {
    const job = makeJob({ id: "us-only", location: restricted(["US", "CA"], ["EUROPE"]) });
    const { kept, excluded } = applyHardFilters([job], makeCriteria({ country: "vn" }));
    expect(kept).toEqual([]);
    expect(excluded).toEqual([
      { job, reason: "Location: not open to applicants in VN (open to US, CA, EUROPE)" },
    ]);
  });

  it("F1 keeps a job listed for the user's region through the country mapping", () => {
    const job = makeJob({ location: parseRemotiveLocation("Europe") });
    expect(evaluateLocation(job, "DE")).toBe("eligible");
    expect(evaluateLocation(job, "US")).toBe("ineligible");
  });

  it("F1 keeps an unparseable Remotive location and flags it as uncertain", () => {
    const job = makeJob({ source: "remotive", location: parseRemotiveLocation("USA timezones") });
    const criteria = makeCriteria({ country: "VN" });
    expect(applyHardFilters([job], criteria).kept).toEqual([job]);
    expect(evaluateLocation(job, "VN")).toBe("uncertain");
    expect(isLocationUncertain(job, criteria)).toBe(true);
    // With no country set, F1 does not apply, so nothing is uncertain.
    expect(isLocationUncertain(job, DEFAULT_CRITERIA)).toBe(false);
  });

  it("F2 excludes a job whose haystack contains an excluded term, by word", () => {
    const phpJob = makeJob({ id: "php", tags: ["PHP"] });
    const onsite = makeJob({ id: "onsite", descriptionText: "This role is On-Site in Berlin." });
    const graphJob = makeJob({ id: "graph", descriptionText: "We use graphql" });
    const { kept, excluded } = applyHardFilters(
      [phpJob, onsite, graphJob],
      makeCriteria({ excludedKeywords: ["php", "on-site", "graph"] }),
    );
    expect(kept.map((j) => j.id)).toEqual(["graph"]);
    expect(excluded.map((e) => e.reason)).toEqual([
      'Excluded keyword: "php"',
      'Excluded keyword: "on-site"',
    ]);
  });

  it("F3 excludes a known same-currency salary whose annualMax is below the floor", () => {
    const low = makeJob({ id: "low", salary: usd(60000, 80000) });
    const edge = makeJob({ id: "edge", salary: usd(90000, 100000) });
    const { kept, excluded } = applyHardFilters(
      [low, edge],
      makeCriteria({ minSalary: { amount: 100000, currency: "usd" } }),
    );
    expect(kept.map((j) => j.id)).toEqual(["edge"]);
    expect(excluded).toEqual([
      { job: low, reason: "Salary below minimum: up to 80,000 USD a year, minimum 100,000 USD" },
    ]);
  });

  it("F3 does not exclude an unknown salary", () => {
    const jobs = [
      makeJob({ id: "none", salary: null }),
      makeJob({ id: "no-max", salary: usd(50000, null) }),
      makeJob({ id: "no-currency", salary: usd(50000, 60000, null) }),
    ];
    const criteria = makeCriteria({ minSalary: { amount: 100000, currency: "USD" } });
    expect(applyHardFilters(jobs, criteria).kept.map((j) => j.id)).toEqual(["none", "no-max", "no-currency"]);
  });

  it("F3 does not exclude a salary in another currency", () => {
    const job = makeJob({ salary: usd(40000, 50000, "EUR") });
    const criteria = makeCriteria({ minSalary: { amount: 100000, currency: "USD" } });
    expect(applyHardFilters([job], criteria).kept).toEqual([job]);
  });

  it("reports only the first failing filter, in F1, F2, F3 order", () => {
    const job = makeJob({ location: restricted(["US"]), tags: ["php"], salary: usd(10000, 20000) });
    const criteria = makeCriteria({
      country: "VN",
      excludedKeywords: ["php"],
      minSalary: { amount: 100000, currency: "USD" },
    });
    const { excluded } = applyHardFilters([job], criteria);
    expect(excluded).toHaveLength(1);
    expect(excluded[0].reason).toMatch(/^Location:/);
  });
});
