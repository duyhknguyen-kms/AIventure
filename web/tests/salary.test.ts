// @vitest-environment node
import { describe, it, expect } from "vitest";
import { parseSalaryText, annualize } from "@/lib/matching/salary";

describe("annualize", () => {
  it("annual is identity", () => {
    expect(annualize(100_000, "annual")).toBe(100_000);
  });

  it("hourly ×2080", () => {
    expect(annualize(50, "hourly")).toBe(104_000);
  });

  it("weekly ×52", () => {
    expect(annualize(1_000, "weekly")).toBe(52_000);
  });

  it("fortnightly ×26", () => {
    expect(annualize(2_000, "fortnightly")).toBe(52_000);
  });

  it("monthly ×12", () => {
    expect(annualize(5_000, "monthly")).toBe(60_000);
  });
});

describe("parseSalaryText — §4.3 table", () => {
  it('"$170k - $200k"', () => {
    const s = parseSalaryText("$170k - $200k")!;
    expect(s.min).toBe(170_000);
    expect(s.max).toBe(200_000);
    expect(s.currency).toBe("USD");
    expect(s.period).toBe("annual");
  });

  it('"USD 100,000 - 120,000"', () => {
    const s = parseSalaryText("USD 100,000 - 120,000")!;
    expect(s.min).toBe(100_000);
    expect(s.max).toBe(120_000);
    expect(s.currency).toBe("USD");
    expect(s.period).toBe("annual");
  });

  it('"€60k"', () => {
    const s = parseSalaryText("€60k")!;
    expect(s.min).toBe(60_000);
    expect(s.max).toBe(60_000);
    expect(s.currency).toBe("EUR");
  });

  it('"$50 - $70 /hr" → hourly with correct annualization', () => {
    const s = parseSalaryText("$50 - $70 /hr")!;
    expect(s.min).toBe(50);
    expect(s.max).toBe(70);
    expect(s.period).toBe("hourly");
    expect(s.annualMin).toBe(50 * 2080);
    expect(s.annualMax).toBe(70 * 2080);
  });

  it('"Competitive" → null', () => {
    expect(parseSalaryText("Competitive")).toBeNull();
  });

  it('"" → null', () => {
    expect(parseSalaryText("")).toBeNull();
  });

  it("null → null", () => {
    expect(parseSalaryText(null)).toBeNull();
  });
});

describe("parseSalaryText — edge cases", () => {
  it("annualMax below 1000 → null (sanity check)", () => {
    expect(parseSalaryText("$500 annual")).toBeNull();
  });

  it("annualMax above 10 million → null", () => {
    expect(parseSalaryText("$20m")).toBeNull();
  });

  it("sets annualMin and annualMax for annual salary", () => {
    const s = parseSalaryText("USD 80,000 - 100,000")!;
    expect(s.annualMin).toBe(80_000);
    expect(s.annualMax).toBe(100_000);
  });

  it("currency null when no currency in text", () => {
    const s = parseSalaryText("80000 - 100000")!;
    expect(s.currency).toBeNull();
  });

  it("single number sets min === max", () => {
    const s = parseSalaryText("$90k")!;
    expect(s.min).toBe(s.max);
    expect(s.min).toBe(90_000);
  });

  it('"negotiable" with no digits → null', () => {
    expect(parseSalaryText("negotiable")).toBeNull();
  });

  it("GBP symbol detected", () => {
    const s = parseSalaryText("£50,000")!;
    expect(s.currency).toBe("GBP");
  });
});
