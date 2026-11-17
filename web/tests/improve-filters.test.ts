// @vitest-environment node
/**
 * Regression tests for Improve-plan.md Item 1 filter fixes.
 */
import { describe, it, expect } from "vitest";
import { applyHardFilters } from "@/lib/matching/filters";
import { scoreJob } from "@/lib/matching/score";
import { DEFAULT_CRITERIA } from "@/lib/matching/criteria";
import { countryNameToAlpha2 } from "@/lib/normalize/countries";
import type { Job } from "@/lib/types";
import type { Criteria } from "@/lib/matching/criteria";

// ── Helpers ────────────────────────────────────────────────────────────────

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: "h:1", source: "himalayas", sourceId: "1",
    title: "Engineer", company: "Acme",
    companyLogo: null, applyUrl: "", sourceUrl: "",
    employmentType: "full_time", seniority: ["senior"], salary: null,
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

// ── Fix 1a — Expanded COUNTRY_REGION (previously missing countries) ────────

describe("Fix 1a — COUNTRY_REGION expanded", () => {
  it("user in Nigeria (NG) passes an AFRICA-region job", () => {
    const job = makeJob({
      location: { worldwide: false, countries: [], regions: ["AFRICA"], raw: null },
    });
    const { kept } = applyHardFilters([job], criteria({ country: "NG" }));
    expect(kept).toHaveLength(1);
  });

  it("user in Egypt (EG) passes an AFRICA-region job", () => {
    const job = makeJob({
      location: { worldwide: false, countries: [], regions: ["AFRICA"], raw: null },
    });
    const { kept } = applyHardFilters([job], criteria({ country: "EG" }));
    expect(kept).toHaveLength(1);
  });

  it("user in UAE (AE) passes a MIDDLE_EAST-region job", () => {
    const job = makeJob({
      location: { worldwide: false, countries: [], regions: ["MIDDLE_EAST"], raw: null },
    });
    const { kept } = applyHardFilters([job], criteria({ country: "AE" }));
    expect(kept).toHaveLength(1);
  });

  it("user in Pakistan (PK) is excluded from an AMERICAS-only job", () => {
    const job = makeJob({
      location: { worldwide: false, countries: [], regions: ["AMERICAS"], raw: null },
    });
    const { excluded } = applyHardFilters([job], criteria({ country: "PK" }));
    expect(excluded).toHaveLength(1);
  });
});

// ── Fix 1b — company included in haystack ─────────────────────────────────

describe("Fix 1b — company in haystack", () => {
  it("excluded keyword matching company name excludes the job", () => {
    const job = makeJob({ company: "PHP Corp", descriptionText: "modern web dev" });
    const { excluded } = applyHardFilters([job], criteria({ excludedKeywords: ["php"] }));
    expect(excluded).toHaveLength(1);
    expect(excluded[0].reason).toContain("php");
  });

  it("keyword matching company name scores the skills factor", () => {
    const job = makeJob({ company: "Stripe", descriptionText: "payments platform" });
    const result = scoreJob(job, criteria({ keywords: ["stripe"] }));
    const skills = result.factors.find((f) => f.key === "skills")!;
    expect(skills.score).toBe(1);
  });

  it("keyword only in company field (not description) still scores", () => {
    const job = makeJob({ company: "OpenAI", descriptionText: "no mention here" });
    const result = scoreJob(job, criteria({ keywords: ["openai"] }));
    const skills = result.factors.find((f) => f.key === "skills")!;
    expect(skills.score).toBe(1);
  });
});

// ── Fix 1c — salary exclusion reason shows annualised figures ─────────────

describe("Fix 1c — salary reason format", () => {
  it("exclusion reason shows /yr units", () => {
    const job = makeJob({
      salary: {
        min: 5_000, max: 6_000, currency: "USD", period: "monthly",
        annualMin: 60_000, annualMax: 72_000, raw: null,
      },
    });
    const { excluded } = applyHardFilters(
      [job],
      criteria({ minSalary: { amount: 80_000, currency: "USD" } }),
    );
    expect(excluded[0].reason).toContain("/yr");
    expect(excluded[0].reason).toContain("72,000");
    expect(excluded[0].reason).toContain("80,000");
  });
});

// ── Fix 1d — country name map expansion ───────────────────────────────────

describe("Fix 1d — expanded country name map", () => {
  it.each([
    ["Pakistan", "PK"],
    ["Romania", "RO"],
    ["Nigeria", "NG"],
    ["Kenya", "KE"],
    ["Egypt", "EG"],
    ["Morocco", "MA"],
    ["Ukraine", "UA"],
    ["Turkiye", "TR"],
    ["Turkey", "TR"],
  ])('"%s" → "%s"', (name, expected) => {
    expect(countryNameToAlpha2(name)).toBe(expected);
  });

  it("alpha-2 passthrough (already a code)", () => {
    expect(countryNameToAlpha2("VN")).toBe("VN");
    expect(countryNameToAlpha2("us")).toBe("US");
  });
});

// ── Fix 1e — hyphen normalisation in excluded keywords ────────────────────

describe("Fix 1e — hyphen normalisation", () => {
  it('"on-site" excluded keyword also catches "on site" (spaced) in description', () => {
    const job = makeJob({ descriptionText: "This is an on site position in NYC." });
    const { excluded } = applyHardFilters(
      [job],
      criteria({ excludedKeywords: ["on-site"] }),
    );
    expect(excluded).toHaveLength(1);
  });

  it('"on site" excluded keyword also catches "on-site" (hyphenated) in description', () => {
    const job = makeJob({ descriptionText: "Must be comfortable in an on-site role." });
    const { excluded } = applyHardFilters(
      [job],
      criteria({ excludedKeywords: ["on site"] }),
    );
    expect(excluded).toHaveLength(1);
  });

  it("hyphen normalisation does not over-match unrelated words", () => {
    const job = makeJob({ descriptionText: "We are a fully remote-first team." });
    const { kept } = applyHardFilters(
      [job],
      criteria({ excludedKeywords: ["on-site"] }),
    );
    expect(kept).toHaveLength(1);
  });
});
