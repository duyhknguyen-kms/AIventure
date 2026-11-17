// @vitest-environment node
import { describe, it, expect } from "vitest";
import { scoreJob, rankJobs } from "@/lib/matching/score";
import { DEFAULT_CRITERIA } from "@/lib/matching/criteria";
import { WEIGHTS } from "@/lib/config";
import type { Job } from "@/lib/types";
import type { Criteria } from "@/lib/matching/criteria";

// ── Helpers ────────────────────────────────────────────────────────────────

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: "himalayas:1", source: "himalayas", sourceId: "1",
    title: "Senior Engineer", company: "Acme",
    companyLogo: null, applyUrl: "", sourceUrl: "",
    employmentType: "full_time", seniority: ["senior"],
    salary: null,
    location: { worldwide: true, countries: [], regions: [], raw: null },
    timezones: null, categories: [], tags: [],
    excerpt: null, descriptionHtml: "", descriptionText: "",
    publishedAt: "2026-01-01T00:00:00.000Z", expiresAt: null, alsoOn: [],
    ...overrides,
  };
}

function criteria(overrides: Partial<Criteria> = {}): Criteria {
  return { ...DEFAULT_CRITERIA, ...overrides };
}

// ── Weights ────────────────────────────────────────────────────────────────

describe("WEIGHTS", () => {
  it("sum to 100", () => {
    const sum = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBe(100);
  });
});

// ── Empty criteria → 100% ──────────────────────────────────────────────────

describe("scoreJob — empty criteria", () => {
  it("returns 100 when all criteria arrays are empty and nulls", () => {
    const result = scoreJob(makeJob(), DEFAULT_CRITERIA);
    expect(result.matchPercent).toBe(100);
  });

  it("all factors are inactive with default criteria", () => {
    const result = scoreJob(makeJob(), DEFAULT_CRITERIA);
    expect(result.factors.every((f) => !f.active)).toBe(true);
  });
});

// ── §7.5 Golden test — 88% ─────────────────────────────────────────────────

describe("scoreJob — §7.5 golden test", () => {
  const goldenCriteria: Criteria = {
    version: 1,
    keywords: ["react", "typescript", "node", "graphql"],
    targetTitles: ["frontend engineer"],
    seniority: ["senior"],
    employmentTypes: ["full_time"],
    minSalary: { amount: 100_000, currency: "USD" },
    country: "VN",
    timezoneOffset: 7,
    mustHaveBenefits: ["health", "pto"],
    niceToHaveBenefits: ["learning", "equity"],
    excludedKeywords: ["php"],
  };

  const goldenJob: Job = {
    id: "himalayas:golden",
    source: "himalayas",
    sourceId: "golden",
    title: "Senior Frontend Engineer",
    company: "Acme",
    companyLogo: null,
    applyUrl: "https://himalayas.app/apply",
    sourceUrl: "https://himalayas.app/job",
    employmentType: "full_time",
    seniority: ["senior"],
    salary: {
      min: 120_000, max: 150_000, currency: "USD", period: "annual",
      annualMin: 120_000, annualMax: 150_000, raw: null,
    },
    location: { worldwide: true, countries: [], regions: [], raw: null },
    timezones: [3, 4, 5, 6],
    categories: [], tags: [],
    excerpt: null,
    descriptionHtml: "",
    // description mentions React, TypeScript and Node.js but not GraphQL
    // benefits: health insurance, unlimited PTO and a learning budget — no equity
    descriptionText:
      "Build our React design system using TypeScript. Node.js experience welcome. " +
      "We offer health insurance, unlimited PTO and a learning budget.",
    publishedAt: "2026-11-16T08:00:00.000Z",
    expiresAt: null,
    alsoOn: [],
  };

  it("passes all hard filters (worldwide, no php, salary ≥ floor)", () => {
    const { excluded } = rankJobs([goldenJob], goldenCriteria);
    expect(excluded).toHaveLength(0);
  });

  it("scores exactly 88%", () => {
    const result = scoreJob(goldenJob, goldenCriteria);
    expect(result.matchPercent).toBe(88);
  });

  it("skills: 3/4 (graphql missing)", () => {
    const result = scoreJob(goldenJob, goldenCriteria);
    const skills = result.factors.find((f) => f.key === "skills")!;
    expect(skills.score).toBeCloseTo(0.75, 5);
    expect(skills.detail).toContain("3/4");
  });

  it("title: 1.0 (phrase match)", () => {
    const result = scoreJob(goldenJob, goldenCriteria);
    const title = result.factors.find((f) => f.key === "title")!;
    expect(title.score).toBe(1);
  });

  it("seniority: 1.0 (exact match)", () => {
    const result = scoreJob(goldenJob, goldenCriteria);
    const sen = result.factors.find((f) => f.key === "seniority")!;
    expect(sen.score).toBe(1);
  });

  it("salary: 1.0 (annualMin 120k ≥ 100k)", () => {
    const result = scoreJob(goldenJob, goldenCriteria);
    const sal = result.factors.find((f) => f.key === "salary")!;
    expect(sal.score).toBe(1);
  });

  it("employment: 1.0 (full_time)", () => {
    const result = scoreJob(goldenJob, goldenCriteria);
    const emp = result.factors.find((f) => f.key === "employment")!;
    expect(emp.score).toBe(1);
  });

  it("timezone: 0.5 (nearest +6 is 1h from +7, within 2h)", () => {
    const result = scoreJob(goldenJob, goldenCriteria);
    const tz = result.factors.find((f) => f.key === "timezone")!;
    expect(tz.score).toBe(0.5);
  });

  it("benefits: 5/6 → ~0.8333 (must 2/2, nice 1/2)", () => {
    const result = scoreJob(goldenJob, goldenCriteria);
    const ben = result.factors.find((f) => f.key === "benefits")!;
    // (2×2 + 1) / (2×2 + 2) = 5/6 ≈ 0.8333
    expect(ben.score).toBeCloseTo(5 / 6, 4);
  });
});

// ── Factor edge cases ─────────────────────────────────────────────────────

describe("scoreJob — factor edge cases", () => {
  it("inactive factor does not influence score (renormalization)", () => {
    // Only skills set, everything else default
    const job = makeJob({ descriptionText: "react typescript" });
    const c = criteria({ keywords: ["react", "typescript"] });
    const result = scoreJob(job, c);
    // Both keywords match → skills = 1.0, only active factor
    expect(result.matchPercent).toBe(100);
  });

  it("salary unknown → score 0.5 (not excluded)", () => {
    const job = makeJob({ salary: null });
    const c = criteria({ minSalary: { amount: 100_000, currency: "USD" } });
    const result = scoreJob(job, c);
    const sal = result.factors.find((f) => f.key === "salary")!;
    expect(sal.score).toBe(0.5);
  });

  it("employment type null → score 0.5", () => {
    const job = makeJob({ employmentType: null });
    const c = criteria({ employmentTypes: ["full_time"] });
    const result = scoreJob(job, c);
    const emp = result.factors.find((f) => f.key === "employment")!;
    expect(emp.score).toBe(0.5);
  });

  it("seniority unknown → score 0.5", () => {
    const job = makeJob({ seniority: [] });
    const c = criteria({ seniority: ["senior"] });
    const result = scoreJob(job, c);
    const sen = result.factors.find((f) => f.key === "seniority")!;
    expect(sen.score).toBe(0.5);
  });

  it("timezone null (unknown) → score 0.5", () => {
    const job = makeJob({ timezones: null });
    const c = criteria({ timezoneOffset: 7 });
    const result = scoreJob(job, c);
    const tz = result.factors.find((f) => f.key === "timezone")!;
    expect(tz.score).toBe(0.5);
  });

  it("timezone [] (all) → score 1.0", () => {
    const job = makeJob({ timezones: [] });
    const c = criteria({ timezoneOffset: 7 });
    const result = scoreJob(job, c);
    const tz = result.factors.find((f) => f.key === "timezone")!;
    expect(tz.score).toBe(1);
  });
});

// ── rankJobs ───────────────────────────────────────────────────────────────

describe("rankJobs", () => {
  it("sorts by matchPercent descending", () => {
    const high = makeJob({ id: "h:1", descriptionText: "react typescript node", title: "React Developer" });
    const low = makeJob({ id: "h:2", title: "Java Developer", descriptionText: "java spring" });
    const c = criteria({ keywords: ["react", "typescript", "node"] });

    const { ranked } = rankJobs([low, high], c);
    expect(ranked[0].id).toBe("h:1");
  });

  it("tie-breaks by publishedAt descending", () => {
    const older = makeJob({ id: "h:1", publishedAt: "2026-11-01T00:00:00.000Z" });
    const newer = makeJob({ id: "h:2", publishedAt: "2026-11-15T00:00:00.000Z" });

    const { ranked } = rankJobs([older, newer], DEFAULT_CRITERIA);
    // Both are 100% with default criteria; newer published first
    expect(ranked[0].id).toBe("h:2");
  });

  it("excluded jobs have a reason string", () => {
    const job = makeJob({ descriptionText: "php laravel" });
    const c = criteria({ excludedKeywords: ["php"] });
    const { excluded } = rankJobs([job], c);
    expect(excluded).toHaveLength(1);
    expect(typeof excluded[0].reason).toBe("string");
  });
});
