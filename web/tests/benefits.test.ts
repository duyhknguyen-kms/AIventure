// @vitest-environment node
import { describe, it, expect } from "vitest";
import { extractBenefits } from "@/lib/matching/benefits";
import type { Job } from "@/lib/types";

function makeJob(descriptionText: string, excerpt = ""): Job {
  return {
    id: "test:1", source: "himalayas", sourceId: "1",
    title: "Engineer", company: "Acme",
    companyLogo: null, applyUrl: "", sourceUrl: "",
    employmentType: "full_time", seniority: [], salary: null,
    location: { worldwide: true, countries: [], regions: [], raw: null },
    timezones: null, categories: [], tags: [],
    excerpt: excerpt || null,
    descriptionHtml: "", descriptionText,
    publishedAt: "2026-01-01T00:00:00.000Z", expiresAt: null, alsoOn: [],
  };
}

// ── Happy path ─────────────────────────────────────────────────────────────

describe("extractBenefits — detects benefits", () => {
  it("detects health insurance", () => {
    const job = makeJob("We offer health insurance and dental coverage.");
    const benefits = extractBenefits(job);
    expect(benefits.some((b) => b.key === "health")).toBe(true);
  });

  it("detects PTO", () => {
    const job = makeJob("Enjoy unlimited vacation and paid time off.");
    const benefits = extractBenefits(job);
    expect(benefits.some((b) => b.key === "pto")).toBe(true);
  });

  it("detects learning budget", () => {
    const job = makeJob("Annual learning budget and conference attendance.");
    const benefits = extractBenefits(job);
    expect(benefits.some((b) => b.key === "learning")).toBe(true);
  });

  it("detects equity", () => {
    const job = makeJob("Competitive salary plus stock options.");
    const benefits = extractBenefits(job);
    expect(benefits.some((b) => b.key === "equity")).toBe(true);
  });

  it("includes evidence snippets", () => {
    const job = makeJob("We offer health insurance for all full-time employees.");
    const benefits = extractBenefits(job);
    const health = benefits.find((b) => b.key === "health")!;
    expect(health.evidence.length).toBeGreaterThan(0);
    expect(health.evidence[0]).toContain("health insurance");
  });
});

// ── Edge cases ─────────────────────────────────────────────────────────────

describe("extractBenefits — edge cases", () => {
  it("returns [] when no benefits found", () => {
    const job = makeJob("We do backend development with Rust.");
    expect(extractBenefits(job)).toHaveLength(0);
  });

  it('"diversity, equity & inclusion" does NOT count as equity benefit', () => {
    const job = makeJob("We value diversity, equity & inclusion in our team.");
    const benefits = extractBenefits(job);
    expect(benefits.some((b) => b.key === "equity")).toBe(false);
  });

  it("caps evidence at 2 snippets per benefit", () => {
    // Three occurrences of medical in the text
    const text =
      "medical plan available. medical coverage included. medical expenses reimbursed.";
    const job = makeJob(text);
    const health = extractBenefits(job).find((b) => b.key === "health")!;
    expect(health.evidence.length).toBeLessThanOrEqual(2);
  });

  it("produces at most one entry per key", () => {
    const job = makeJob("health insurance, dental, vision coverage, medical plan");
    const benefits = extractBenefits(job);
    const healthBenefits = benefits.filter((b) => b.key === "health");
    expect(healthBenefits).toHaveLength(1);
  });

  it("also scans excerpt field", () => {
    const job = makeJob("", "We offer a learning budget for everyone.");
    const benefits = extractBenefits(job);
    expect(benefits.some((b) => b.key === "learning")).toBe(true);
  });

  it("detects retirement via 401(k)", () => {
    const job = makeJob("We match your 401(k) contributions up to 4%.");
    expect(extractBenefits(job).some((b) => b.key === "retirement")).toBe(true);
  });

  it("detects flexible hours via async", () => {
    const job = makeJob("We are an async-first, fully remote team.");
    expect(extractBenefits(job).some((b) => b.key === "flexible_hours")).toBe(true);
  });

  it("detects parental leave", () => {
    const job = makeJob("16 weeks maternity and 8 weeks paternity leave.");
    expect(extractBenefits(job).some((b) => b.key === "parental_leave")).toBe(true);
  });

  it("detects wellness", () => {
    const job = makeJob("Monthly wellness stipend for gym or mental health.");
    expect(extractBenefits(job).some((b) => b.key === "wellness")).toBe(true);
  });
});
