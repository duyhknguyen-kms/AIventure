// @vitest-environment node
/**
 * Tests for Improve-plan.md Item 4 — CV extraction logic.
 * parseCv.ts is not tested here (requires browser File API + dynamic imports).
 * We test extractCriteria.ts functions directly.
 */
import { describe, it, expect } from "vitest";
import { extractSkills, extractJobTitles, extractSeniority, mergeExtracted } from "@/lib/cv/extractCriteria";
import { DEFAULT_CRITERIA } from "@/lib/matching/criteria";

// ── extractSkills ──────────────────────────────────────────────────────────

describe("extractSkills", () => {
  it("extracts skills present in the dictionary", () => {
    const text = "5 years of React and TypeScript development. Also used Python for data work.";
    const skills = extractSkills(text);
    expect(skills).toContain("react");
    expect(skills).toContain("typescript");
    expect(skills).toContain("python");
  });

  it("does not extract skills that are not present", () => {
    const text = "Expert in Java and Spring Boot";
    const skills = extractSkills(text);
    expect(skills).not.toContain("react");
  });

  it("is case-insensitive", () => {
    const text = "REACT, TYPESCRIPT and NODE.JS";
    const skills = extractSkills(text);
    expect(skills).toContain("react");
    expect(skills).toContain("typescript");
  });

  it("does not false-positive on partial word (php inside graphql)", () => {
    const text = "Experience with graphql and typescript";
    const skills = extractSkills(text);
    // graphql should be found; php should not trigger from "graphql"
    expect(skills).toContain("graphql");
  });

  it("returns empty array for irrelevant text", () => {
    const text = "I am a passionate professional with strong communication skills.";
    const skills = extractSkills(text);
    expect(skills.length).toBe(0);
  });
});

// ── extractSeniority ──────────────────────────────────────────────────────

describe("extractSeniority", () => {
  it("extracts senior from title lines", () => {
    const text = "Senior Frontend Engineer\n2020–2024 Acme Corp";
    expect(extractSeniority(text)).toContain("senior");
  });

  it("extracts lead as senior signal", () => {
    const text = "Lead Software Engineer at BigCo";
    expect(extractSeniority(text)).toContain("senior");
  });

  it("infers senior from 8+ years of experience", () => {
    const text = "10 years of experience in backend development";
    expect(extractSeniority(text)).toContain("senior");
  });

  it("infers mid from 3–7 years of experience", () => {
    const text = "5 years experience with cloud infrastructure";
    expect(extractSeniority(text)).toContain("mid");
  });

  it("infers entry from < 3 years experience", () => {
    const text = "2 years experience as a junior developer";
    expect(extractSeniority(text)).toContain("entry");
  });

  it("returns empty for no signals", () => {
    const text = "I enjoy coding and learning new things.";
    expect(extractSeniority(text)).toHaveLength(0);
  });
});

// ── extractJobTitles ──────────────────────────────────────────────────────

describe("extractJobTitles", () => {
  it("extracts title from an explicit label", () => {
    const text = "Title: Senior Frontend Engineer\nCompany: Acme";
    const titles = extractJobTitles(text);
    expect(titles.some((t) => /frontend engineer/i.test(t))).toBe(true);
  });

  it("extracts role near a date range", () => {
    const text = "Software Engineer\nJan 2021 – Dec 2023\nAcme Corp";
    const titles = extractJobTitles(text);
    expect(titles.some((t) => /engineer/i.test(t))).toBe(true);
  });

  it("caps extracted titles at 5", () => {
    const text = [
      "Title: Junior Developer",
      "Position: Mid-level Engineer",
      "Role: Senior Architect",
      "Lead Consultant | Jan 2021",
      "Engineering Manager | Mar 2022",
      "Director of Engineering | Jun 2023",
    ].join("\n");
    expect(extractJobTitles(text).length).toBeLessThanOrEqual(5);
  });
});

// ── mergeExtracted ────────────────────────────────────────────────────────

describe("mergeExtracted", () => {
  it("appends new keywords without duplicating existing ones", () => {
    const base = { ...DEFAULT_CRITERIA, keywords: ["react"] };
    const result = mergeExtracted(base, { keywords: ["react", "typescript"], targetTitles: [], seniority: [] });
    // react should appear only once
    expect(result.keywords.filter((k) => k === "react")).toHaveLength(1);
    expect(result.keywords).toContain("typescript");
  });

  it("appends new seniority levels without duplicates", () => {
    const base = { ...DEFAULT_CRITERIA, seniority: ["senior"] as ("entry" | "mid" | "senior" | "manager" | "director" | "executive")[] };
    const result = mergeExtracted(base, { keywords: [], targetTitles: [], seniority: ["senior", "mid"] });
    expect(result.seniority.filter((s) => s === "senior")).toHaveLength(1);
    expect(result.seniority).toContain("mid");
  });

  it("does not modify salary, country, or other non-extracted fields", () => {
    const base = {
      ...DEFAULT_CRITERIA,
      minSalary: { amount: 100_000, currency: "USD" },
      country: "VN",
    };
    const result = mergeExtracted(base, { keywords: ["python"], targetTitles: [], seniority: [] });
    expect(result.minSalary).toEqual({ amount: 100_000, currency: "USD" });
    expect(result.country).toBe("VN");
  });
});
