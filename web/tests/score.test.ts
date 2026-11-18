// @vitest-environment node
import { describe, expect, it } from "vitest";
import { WEIGHTS } from "@/lib/config";
import { DEFAULT_CRITERIA, type Criteria } from "@/lib/matching/criteria";
import { FACTOR_KEYS, computeMatchPercent, rankJobs, scoreJob } from "@/lib/matching/score";
import type { FactorResult, Job, MatchResult, Salary } from "@/lib/types";

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: "himalayas:test-1",
    source: "himalayas",
    sourceId: "test-1",
    title: "Software Engineer",
    company: "Acme",
    companyLogo: null,
    applyUrl: "https://example.com/apply",
    sourceUrl: "https://example.com/job",
    employmentType: "full_time",
    seniority: [],
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

function annual(annualMin: number | null, annualMax: number | null, currency: string | null = "USD"): Salary {
  return { min: annualMin, max: annualMax, currency, period: "annual", annualMin, annualMax, raw: null };
}

function factor(result: MatchResult, key: FactorResult["key"]): FactorResult {
  const found = result.factors.find((f) => f.key === key);
  if (!found) throw new Error(`factor ${key} missing`);
  return found;
}

/** Score of one factor when only that criterion is set. */
function scoreOf(key: FactorResult["key"], job: Job, criteria: Partial<Criteria>): number {
  const result = scoreJob(job, makeCriteria(criteria));
  expect(result.factors.filter((f) => f.active).map((f) => f.key)).toEqual([key]);
  return factor(result, key).score;
}

describe("weights (SPEC §7.2)", () => {
  it("sum to 100 and cover every factor", () => {
    expect(Object.values(WEIGHTS).reduce((sum, w) => sum + w, 0)).toBe(100);
    expect(Object.keys(WEIGHTS).sort()).toEqual([...FACTOR_KEYS].sort());
  });
});

describe("scoreJob: worked example (SPEC §7.5, golden)", () => {
  const criteria = makeCriteria({
    keywords: ["react", "typescript", "node", "graphql"],
    targetTitles: ["frontend engineer"],
    seniority: ["senior"],
    employmentTypes: ["full_time"],
    minSalary: { amount: 100000, currency: "USD" },
    country: "VN",
    timezoneOffset: 7,
    mustHaveBenefits: ["health", "pto"],
    niceToHaveBenefits: ["learning", "equity"],
    excludedKeywords: ["php"],
  });
  const job = makeJob({
    id: "himalayas:golden",
    title: "Senior Frontend Engineer",
    seniority: ["senior"],
    employmentType: "full_time",
    salary: annual(120000, 150000),
    location: { worldwide: true, countries: [], regions: [], raw: null },
    timezones: [3, 4, 5, 6],
    categories: ["Software Development"],
    descriptionText:
      "We build our product with React, TypeScript and Node.js. " +
      "Benefits include health insurance, unlimited PTO and a yearly learning budget.",
  });

  it("scores exactly 88 with each factor as in the SPEC table", () => {
    const result = scoreJob(job, criteria);
    const expected: [FactorResult["key"], number, number][] = [
      ["skills", 0.75, 22.5],
      ["title", 1, 20],
      ["seniority", 1, 10],
      ["salary", 1, 15],
      ["employment", 1, 5],
      ["timezone", 0.5, 2.5],
    ];
    for (const [key, score, points] of expected) {
      expect(factor(result, key), key).toMatchObject({ active: true, weight: WEIGHTS[key], score, points });
    }
    expect(factor(result, "benefits").score).toBeCloseTo(5 / 6, 10);
    expect(factor(result, "benefits").points).toBeCloseTo(12.5, 10);
    expect(result.factors.reduce((sum, f) => sum + f.points, 0)).toBeCloseTo(87.5, 10);
    expect(result.matchPercent).toBe(88);
    expect(result.jobId).toBe("himalayas:golden");
    expect(result.locationUncertain).toBe(false);
    expect(result.benefits.map((b) => b.key)).toEqual(["health", "pto", "learning"]);
  });

  it("explains each factor in plain words (SPEC §7.4)", () => {
    const result = scoreJob(job, criteria);
    expect(factor(result, "skills").detail).toBe("3/4 skills: react, typescript, node (missing: graphql)");
    expect(factor(result, "title").detail).toBe('"frontend engineer" found in title');
    expect(factor(result, "seniority").detail).toBe("senior matches");
    expect(factor(result, "salary").detail).toBe("annualMin 120,000 ≥ 100,000 USD");
    expect(factor(result, "timezone").detail).toBe("Nearest UTC+6 is 1 h from UTC+7");
    expect(factor(result, "benefits").detail).toBe(
      "Must-have 2/2 (health, pto), nice-to-have 1/2 (learning)",
    );
  });

  it("passes the hard filters and ranks the job", () => {
    const { ranked, excluded } = rankJobs([job], criteria);
    expect(excluded).toEqual([]);
    expect(ranked).toHaveLength(1);
    expect(ranked[0].match.matchPercent).toBe(88);
    expect(ranked[0].title).toBe(job.title);
  });
});

describe("scoreJob: active factors and renormalization (SPEC §7.3)", () => {
  it("gives 100 with empty criteria, every factor inactive", () => {
    const result = scoreJob(makeJob({ title: "Barista", employmentType: null }), DEFAULT_CRITERIA);
    expect(result.matchPercent).toBe(100);
    expect(result.factors.map((f) => f.key)).toEqual([...FACTOR_KEYS]);
    expect(result.factors.every((f) => !f.active && f.points === 0)).toBe(true);
  });

  it("ignores inactive factors and renormalizes over the active weights", () => {
    const job = makeJob({ descriptionText: "We use React daily." });
    // skills 30 × 0.5 = 15 of 30 → 50
    expect(scoreJob(job, makeCriteria({ keywords: ["react", "graphql"] })).matchPercent).toBe(50);
    // + employment 5 × 1 → 20 of 35 = 57.14 → 57
    const result = scoreJob(job, makeCriteria({ keywords: ["react", "graphql"], employmentTypes: ["full_time"] }));
    expect(result.matchPercent).toBe(57);
    expect(result.factors.filter((f) => f.active).map((f) => f.key)).toEqual(["skills", "employment"]);
  });

  it("computeMatchPercent returns 100 for no active factors and rounds half up", () => {
    expect(computeMatchPercent([])).toBe(100);
    const half: FactorResult = { key: "skills", weight: 1, active: true, score: 0.875, points: 0.875, detail: "" };
    expect(computeMatchPercent([half])).toBe(88); // 87.5 → 88
    const inactive: FactorResult = { ...half, key: "title", active: false, points: 0 };
    expect(computeMatchPercent([inactive])).toBe(100);
  });
});

describe("scoreJob: factors in isolation (SPEC §7.3, FR7.1 to FR7.7)", () => {
  it("title: phrase match, else best token overlap", () => {
    const job = makeJob({ title: "Senior Backend Engineer" });
    expect(scoreOf("title", job, { targetTitles: ["backend engineer"] })).toBe(1);
    expect(scoreOf("title", job, { targetTitles: ["frontend engineer", "data scientist"] })).toBe(0.5);
    expect(scoreOf("title", job, { targetTitles: ["designer"] })).toBe(0);
  });

  it("seniority: intersect 1, one step or unknown 0.5, else 0", () => {
    expect(scoreOf("seniority", makeJob({ seniority: ["senior"] }), { seniority: ["senior", "manager"] })).toBe(1);
    expect(scoreOf("seniority", makeJob({ seniority: ["mid"] }), { seniority: ["senior"] })).toBe(0.5);
    expect(scoreOf("seniority", makeJob({ seniority: [] }), { seniority: ["senior"] })).toBe(0.5);
    expect(scoreOf("seniority", makeJob({ seniority: ["entry"] }), { seniority: ["senior"] })).toBe(0);
  });

  it("salary: min meets 1, floor inside range 0.75, unknown or other currency 0.5, else 0", () => {
    const floor = { minSalary: { amount: 100000, currency: "USD" } };
    expect(scoreOf("salary", makeJob({ salary: annual(100000, 120000) }), floor)).toBe(1);
    expect(scoreOf("salary", makeJob({ salary: annual(90000, 120000) }), floor)).toBe(0.75);
    expect(scoreOf("salary", makeJob({ salary: annual(null, 110000) }), floor)).toBe(0.75);
    expect(scoreOf("salary", makeJob({ salary: null }), floor)).toBe(0.5);
    expect(scoreOf("salary", makeJob({ salary: annual(150000, 160000, "EUR") }), floor)).toBe(0.5);
    expect(scoreOf("salary", makeJob({ salary: annual(60000, 80000) }), floor)).toBe(0);
  });

  it("employment: listed 1, unknown 0.5, else 0", () => {
    const wanted = { employmentTypes: ["full_time" as const, "contract" as const] };
    expect(scoreOf("employment", makeJob({ employmentType: "contract" }), wanted)).toBe(1);
    expect(scoreOf("employment", makeJob({ employmentType: null }), wanted)).toBe(0.5);
    expect(scoreOf("employment", makeJob({ employmentType: "internship" }), wanted)).toBe(0);
  });

  it("timezone: all or within 0.5 h 1, within 2 h or unknown 0.5, else 0", () => {
    const user = { timezoneOffset: 5.5 };
    expect(scoreOf("timezone", makeJob({ timezones: [] }), user)).toBe(1);
    expect(scoreOf("timezone", makeJob({ timezones: [-5, 5] }), user)).toBe(1);
    expect(scoreOf("timezone", makeJob({ timezones: [7] }), user)).toBe(0.5);
    expect(scoreOf("timezone", makeJob({ timezones: null }), user)).toBe(0.5);
    expect(scoreOf("timezone", makeJob({ timezones: [-5, 1] }), user)).toBe(0);
  });

  it("benefits: must-haves count double, nice-to-haves once", () => {
    const job = makeJob({ descriptionText: "Dental cover and a gym membership." });
    expect(scoreOf("benefits", job, { niceToHaveBenefits: ["wellness", "equity"] })).toBe(0.5);
    // must health found (2), nice pto missing (0) → 2/3
    expect(scoreOf("benefits", job, { mustHaveBenefits: ["health"], niceToHaveBenefits: ["pto"] })).toBeCloseTo(2 / 3, 10);
    // listed in both lists counts once, as must-have
    expect(scoreOf("benefits", job, { mustHaveBenefits: ["pto"], niceToHaveBenefits: ["pto"] })).toBe(0);
  });
});

describe("rankJobs (SPEC §7.4, FR7)", () => {
  it("sorts by matchPercent desc and breaks ties by publishedAt desc", () => {
    const criteria = makeCriteria({ keywords: ["react"] });
    const older = makeJob({ id: "older", descriptionText: "react", publishedAt: "2026-10-01T00:00:00.000Z" });
    const newer = makeJob({ id: "newer", descriptionText: "react", publishedAt: "2026-11-10T00:00:00.000Z" });
    const weak = makeJob({ id: "weak", descriptionText: "vue", publishedAt: "2026-11-15T00:00:00.000Z" });
    const { ranked } = rankJobs([older, weak, newer], criteria);
    expect(ranked.map((j) => [j.id, j.match.matchPercent])).toEqual([
      ["newer", 100],
      ["older", 100],
      ["weak", 0],
    ]);
  });

  it("sorts by recency with default criteria, all at 100", () => {
    const a = makeJob({ id: "a", publishedAt: "2026-01-01T00:00:00.000Z" });
    const b = makeJob({ id: "b", publishedAt: "2026-06-01T00:00:00.000Z" });
    const { ranked } = rankJobs([a, b], DEFAULT_CRITERIA);
    expect(ranked.map((j) => j.id)).toEqual(["b", "a"]);
    expect(ranked.every((j) => j.match.matchPercent === 100)).toBe(true);
  });

  it("returns excluded jobs with reasons and flags uncertain locations", () => {
    const criteria = makeCriteria({ country: "VN", excludedKeywords: ["php"] });
    const php = makeJob({ id: "php", tags: ["php"] });
    const unclear = makeJob({
      id: "unclear",
      source: "remotive",
      location: { worldwide: false, countries: [], regions: [], raw: "USA timezones" },
    });
    const { ranked, excluded } = rankJobs([php, unclear], criteria);
    expect(excluded).toEqual([{ job: php, reason: 'Excluded keyword: "php"' }]);
    expect(ranked.map((j) => [j.id, j.match.locationUncertain])).toEqual([["unclear", true]]);
  });

  it("does not mutate the input jobs", () => {
    const job = makeJob();
    const snapshot = structuredClone(job);
    rankJobs([job], makeCriteria({ keywords: ["react"] }));
    expect(job).toEqual(snapshot);
  });
});
