// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  BENEFIT_DICTIONARY,
  EVIDENCE_CONTEXT_CHARS,
  extractBenefits,
} from "@/lib/matching/benefits";
import type { Job } from "@/lib/types";

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

const keysOf = (job: Job) => extractBenefits(job).map((b) => b.key);

describe("BENEFIT_DICTIONARY (SPEC §8)", () => {
  it("has the 9 benefit keys in SPEC order with labels", () => {
    expect(BENEFIT_DICTIONARY.map((d) => [d.key, d.label])).toEqual([
      ["health", "Health / Medical"],
      ["retirement", "Retirement"],
      ["equity", "Equity"],
      ["pto", "Paid time off"],
      ["parental_leave", "Parental leave"],
      ["learning", "Learning budget"],
      ["home_office", "Home-office stipend"],
      ["flexible_hours", "Flexible hours"],
      ["wellness", "Wellness"],
    ]);
  });
});

describe("extractBenefits (FR8)", () => {
  it("detects health, PTO and learning with evidence", () => {
    const job = makeJob({
      descriptionText:
        "We build React apps. Benefits: health insurance for you and family, unlimited PTO, and a yearly learning budget of 1,000 dollars.",
    });
    const benefits = extractBenefits(job);
    expect(benefits.map((b) => b.key)).toEqual(["health", "pto", "learning"]);
    const health = benefits.find((b) => b.key === "health")!;
    expect(health.label).toBe("Health / Medical");
    expect(health.evidence).toHaveLength(1);
    expect(health.evidence[0]).toContain("health insurance");
    expect(benefits.find((b) => b.key === "pto")!.evidence[0]).toContain("unlimited PTO");
  });

  it("detects one benefit per category across all 9 categories", () => {
    const job = makeJob({
      descriptionText: [
        "Dental cover.",
        "A 401(k) plan with match.",
        "Stock options for all.",
        "25 days of paid vacation.",
        "Generous parental leave.",
        "Conference tickets.",
        "Coworking membership.",
        "We work async.",
        "Gym membership.",
      ].join(" "),
    });
    expect(keysOf(job)).toEqual([
      "health",
      "retirement",
      "equity",
      "pto",
      "parental_leave",
      "learning",
      "home_office",
      "flexible_hours",
      "wellness",
    ]);
  });

  it("returns [] when no benefits are mentioned", () => {
    expect(extractBenefits(makeJob({ descriptionText: "Build React components with TypeScript." }))).toEqual([]);
    expect(extractBenefits(makeJob({ descriptionText: "", excerpt: null }))).toEqual([]);
  });

  it("does not count 'diversity, equity and inclusion' as equity", () => {
    for (const text of [
      "We are committed to diversity, equity and inclusion.",
      "We value diversity, equity & inclusion.",
      "Our diversity equity programme is strong.",
    ]) {
      expect(keysOf(makeJob({ descriptionText: text }))).not.toContain("equity");
    }
  });

  it("still counts real equity next to a DEI statement", () => {
    const job = makeJob({
      descriptionText: "We support diversity, equity and inclusion. You also get equity in the company.",
    });
    const equity = extractBenefits(job).find((b) => b.key === "equity");
    expect(equity).toBeDefined();
    expect(equity!.evidence).toHaveLength(1);
    expect(equity!.evidence[0]).toContain("get equity in the company");
  });

  it("keeps at most 2 evidence snippets per benefit and one entry per key", () => {
    const job = makeJob({
      descriptionText:
        "Medical cover from day one. " + "x".repeat(200) + " Dental cover too. " + "y".repeat(200) + " Vision cover as well.",
    });
    const benefits = extractBenefits(job);
    expect(benefits.filter((b) => b.key === "health")).toHaveLength(1);
    const health = benefits[0];
    expect(health.evidence).toHaveLength(2);
    expect(health.evidence[0]).toContain("Medical");
    expect(health.evidence[1]).toContain("Dental");
  });

  it("bounds each snippet to about 60 chars of context and collapses whitespace", () => {
    const before = "a".repeat(100);
    const after = "b".repeat(100);
    const job = makeJob({ descriptionText: `${before}\n\n   pension   ${after}` });
    const [retirement] = extractBenefits(job);
    const snippet = retirement.evidence[0];
    expect(snippet).not.toMatch(/\s{2,}|\n/);
    expect(snippet).toContain("pension");
    expect(snippet.length).toBeLessThanOrEqual("pension".length + 2 * EVIDENCE_CONTEXT_CHARS);
  });

  it("searches the excerpt as well as descriptionText", () => {
    const job = makeJob({ descriptionText: "Build things.", excerpt: "Remote role with a home office stipend." });
    expect(keysOf(job)).toEqual(["home_office"]);
  });

  it("is word-bounded and case-insensitive", () => {
    expect(keysOf(makeJob({ descriptionText: "We use PTOLEMY and gymnastics data." }))).toEqual([]);
    expect(keysOf(makeJob({ descriptionText: "PAID TIME OFF included." }))).toEqual(["pto"]);
  });

  it("gives the same result when called twice (no shared regex state)", () => {
    const job = makeJob({ descriptionText: "Health insurance and wellness stipend." });
    expect(extractBenefits(job)).toEqual(extractBenefits(job));
  });
});
