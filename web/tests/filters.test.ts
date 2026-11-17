// @vitest-environment node
import { describe, it, expect } from "vitest";
import { applyHardFilters } from "@/lib/matching/filters";
import { DEFAULT_CRITERIA } from "@/lib/matching/criteria";
import type { Job } from "@/lib/types";
import type { Criteria } from "@/lib/matching/criteria";

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: "himalayas:1", source: "himalayas", sourceId: "1",
    title: "Senior Engineer", company: "Acme",
    companyLogo: null, applyUrl: "", sourceUrl: "",
    employmentType: "full_time", seniority: ["senior"],
    salary: { min: 120_000, max: 150_000, currency: "USD", period: "annual", annualMin: 120_000, annualMax: 150_000, raw: null },
    location: { worldwide: true, countries: [], regions: [], raw: null },
    timezones: [], categories: [], tags: [],
    excerpt: null, descriptionHtml: "", descriptionText: "",
    publishedAt: "2026-01-01T00:00:00.000Z", expiresAt: null, alsoOn: [],
    ...overrides,
  };
}

function criteria(overrides: Partial<Criteria> = {}): Criteria {
  return { ...DEFAULT_CRITERIA, ...overrides };
}

// ── Default criteria keeps all jobs ──────────────────────────────────────

describe("applyHardFilters — default criteria", () => {
  it("keeps all jobs when criteria is default", () => {
    const jobs = [makeJob(), makeJob({ id: "remotive:2" })];
    const { kept, excluded } = applyHardFilters(jobs, DEFAULT_CRITERIA);
    expect(kept).toHaveLength(2);
    expect(excluded).toHaveLength(0);
  });
});

// ── F1 — Location ─────────────────────────────────────────────────────────

describe("applyHardFilters — F1 location", () => {
  it("skips F1 when country is null", () => {
    const job = makeJob({ location: { worldwide: false, countries: ["US"], regions: [], raw: null } });
    const { kept } = applyHardFilters([job], criteria({ country: null }));
    expect(kept).toHaveLength(1);
  });

  it("keeps worldwide jobs regardless of user country", () => {
    const job = makeJob({ location: { worldwide: true, countries: [], regions: [], raw: null } });
    const { kept } = applyHardFilters([job], criteria({ country: "VN" }));
    expect(kept).toHaveLength(1);
  });

  it("keeps job when user country is in location.countries", () => {
    const job = makeJob({ location: { worldwide: false, countries: ["VN", "SG"], regions: [], raw: null } });
    const { kept } = applyHardFilters([job], criteria({ country: "VN" }));
    expect(kept).toHaveLength(1);
  });

  it("keeps job when user country region matches location.regions", () => {
    const job = makeJob({ location: { worldwide: false, countries: [], regions: ["APAC"], raw: null } });
    const { kept } = applyHardFilters([job], criteria({ country: "VN" })); // VN is APAC
    expect(kept).toHaveLength(1);
  });

  it("excludes job when user country not in countries or regions", () => {
    const job = makeJob({ location: { worldwide: false, countries: ["US", "CA"], regions: [], raw: null } });
    const { excluded } = applyHardFilters([job], criteria({ country: "VN" }));
    expect(excluded).toHaveLength(1);
    expect(excluded[0].reason).toMatch(/Location/);
  });

  it("keeps unparseable Remotive location (uncertain)", () => {
    // No countries, no regions, not worldwide — location uncertain → keep
    const job = makeJob({
      source: "remotive",
      location: { worldwide: false, countries: [], regions: [], raw: "some timezone region" },
    });
    const { kept } = applyHardFilters([job], criteria({ country: "VN" }));
    expect(kept).toHaveLength(1);
  });
});

// ── F2 — Excluded keywords ────────────────────────────────────────────────

describe("applyHardFilters — F2 excluded keywords", () => {
  it("skips F2 when excludedKeywords is empty", () => {
    const job = makeJob({ descriptionText: "php laravel backend" });
    const { kept } = applyHardFilters([job], criteria({ excludedKeywords: [] }));
    expect(kept).toHaveLength(1);
  });

  it("excludes job when excluded keyword found in descriptionText", () => {
    const job = makeJob({ descriptionText: "php laravel backend" });
    const { excluded } = applyHardFilters([job], criteria({ excludedKeywords: ["php"] }));
    expect(excluded).toHaveLength(1);
    expect(excluded[0].reason).toContain("php");
  });

  it("excludes job when excluded keyword found in title", () => {
    const job = makeJob({ title: "PHP Backend Developer" });
    const { excluded } = applyHardFilters([job], criteria({ excludedKeywords: ["php"] }));
    expect(excluded).toHaveLength(1);
  });

  it("does not exclude on partial word match (word boundary)", () => {
    const job = makeJob({ descriptionText: "graphql typescript" });
    // 'php' is not at a word boundary inside 'graphql'
    const { kept } = applyHardFilters([job], criteria({ excludedKeywords: ["php"] }));
    expect(kept).toHaveLength(1);
  });
});

// ── F3 — Salary floor ─────────────────────────────────────────────────────

describe("applyHardFilters — F3 salary", () => {
  it("skips F3 when minSalary is null", () => {
    const job = makeJob({ salary: { min: 50_000, max: 60_000, currency: "USD", period: "annual", annualMin: 50_000, annualMax: 60_000, raw: null } });
    const { kept } = applyHardFilters([job], criteria({ minSalary: null }));
    expect(kept).toHaveLength(1);
  });

  it("skips F3 when job salary is unknown", () => {
    const job = makeJob({ salary: null });
    const { kept } = applyHardFilters([job], criteria({ minSalary: { amount: 100_000, currency: "USD" } }));
    expect(kept).toHaveLength(1);
  });

  it("skips F3 when currency differs", () => {
    const job = makeJob({ salary: { min: 50_000, max: 60_000, currency: "EUR", period: "annual", annualMin: 50_000, annualMax: 60_000, raw: null } });
    const { kept } = applyHardFilters([job], criteria({ minSalary: { amount: 100_000, currency: "USD" } }));
    expect(kept).toHaveLength(1);
  });

  it("excludes job when annualMax < minSalary.amount (same currency)", () => {
    const job = makeJob({ salary: { min: 50_000, max: 80_000, currency: "USD", period: "annual", annualMin: 50_000, annualMax: 80_000, raw: null } });
    const { excluded } = applyHardFilters([job], criteria({ minSalary: { amount: 100_000, currency: "USD" } }));
    expect(excluded).toHaveLength(1);
    expect(excluded[0].reason).toMatch(/Salary/);
  });

  it("keeps job when annualMax >= minSalary.amount", () => {
    const job = makeJob({
      salary: { min: 90_000, max: 120_000, currency: "USD", period: "annual", annualMin: 90_000, annualMax: 120_000, raw: null },
    });
    const { kept } = applyHardFilters([job], criteria({ minSalary: { amount: 100_000, currency: "USD" } }));
    expect(kept).toHaveLength(1);
  });
});
