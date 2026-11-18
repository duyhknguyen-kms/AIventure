// @vitest-environment node
import { describe, expect, it } from "vitest";
import { parseCv } from "@/lib/cvParser";

const SAMPLE_CV = `
John Smith
Senior Frontend Engineer

EXPERIENCE
Senior Software Engineer — Acme Corp (2020 – present)
Led React and TypeScript migration. Worked with GraphQL, Node.js, AWS.
5 years of professional experience.

SKILLS
React, TypeScript, Next.js, Node.js, GraphQL, PostgreSQL, Docker, AWS,
CSS, Tailwind, Git, GitHub Actions, Jest, Vitest

EDUCATION
B.Sc. Computer Science
`;

describe("parseCv", () => {
  it("extracts well-known skills from CV text", () => {
    const { keywords } = parseCv(SAMPLE_CV);
    expect(keywords).toContain("React");
    expect(keywords).toContain("TypeScript");
    expect(keywords).toContain("Node.js");
    expect(keywords).toContain("GraphQL");
    expect(keywords).toContain("PostgreSQL");
    expect(keywords).toContain("AWS");
    expect(keywords).toContain("Docker");
  });

  it("caps extracted skills at 30", () => {
    const bigText = Array(100).fill("React Python TypeScript Node.js Go Rust Ruby PHP Swift Kotlin Java CSS HTML SQL Docker AWS GCP Kubernetes Redis MongoDB GraphQL Vue Angular").join(" ");
    const { keywords } = parseCv(bigText);
    expect(keywords.length).toBeLessThanOrEqual(30);
  });

  it("extracts job titles from CV text", () => {
    const { targetTitles } = parseCv(SAMPLE_CV);
    expect(targetTitles.length).toBeGreaterThan(0);
    // Should detect "Frontend Engineer" or "Software Engineer"
    const all = targetTitles.join(" ").toLowerCase();
    expect(all).toMatch(/engineer|developer/);
  });

  it("extracts seniority from title keywords", () => {
    const { seniority } = parseCv("Senior Frontend Engineer with 7 years of experience");
    expect(seniority).toContain("senior");
  });

  it("extracts seniority from years of experience", () => {
    const { seniority } = parseCv("I have 8 years of professional experience building web applications.");
    expect(seniority.length).toBeGreaterThan(0);
    expect(seniority).toContain("senior");
  });

  it("extracts junior/entry seniority", () => {
    const { seniority } = parseCv("Junior React Developer, 1 year of experience, recent graduate");
    expect(seniority).toContain("entry");
  });

  it("detects no seniority when not mentioned", () => {
    const { seniority } = parseCv("I write code and drink coffee.");
    expect(seniority).toHaveLength(0);
  });

  it("returns empty arrays for gibberish text", () => {
    const { keywords, targetTitles, seniority } = parseCv("asdfghjkl qwerty zxcvb");
    expect(keywords).toHaveLength(0);
    expect(targetTitles).toHaveLength(0);
    expect(seniority).toHaveLength(0);
  });

  it("returns rawText and charCount", () => {
    const text = "React developer with TypeScript experience.";
    const { rawText, charCount } = parseCv(text);
    expect(charCount).toBe(text.length);
    expect(rawText).toBe(text);
  });

  it("caps rawText at 10,000 characters", () => {
    const long = "React developer ".repeat(1000);
    const { rawText, charCount } = parseCv(long);
    expect(charCount).toBe(long.length);
    expect(rawText.length).toBeLessThanOrEqual(10_000);
  });

  it("detects manager/director seniority", () => {
    const { seniority } = parseCv("Engineering Manager at Tech Corp, Director of Engineering");
    expect(seniority).toContain("manager");
    expect(seniority).toContain("director");
  });

  it("detects Python and data science skills", () => {
    const { keywords } = parseCv("Python developer with Pandas, NumPy, PyTorch, and scikit-learn experience.");
    expect(keywords).toContain("Python");
    expect(keywords).toContain("Pandas");
    expect(keywords).toContain("PyTorch");
  });
});
