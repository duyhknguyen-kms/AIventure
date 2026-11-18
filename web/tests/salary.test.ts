// @vitest-environment node
import { describe, expect, it } from "vitest";
import { annualize, parseSalaryText } from "@/lib/matching/salary";
import type { Salary } from "@/lib/types";

describe("parseSalaryText — SPEC §4.3 table (FR2.1)", () => {
  const table: Array<[string, Salary]> = [
    [
      "$170k - $200k",
      { min: 170000, max: 200000, currency: "USD", period: "annual", annualMin: 170000, annualMax: 200000, raw: "$170k - $200k" },
    ],
    [
      "USD 100,000 - 120,000",
      { min: 100000, max: 120000, currency: "USD", period: "annual", annualMin: 100000, annualMax: 120000, raw: "USD 100,000 - 120,000" },
    ],
    [
      "€60k",
      { min: 60000, max: 60000, currency: "EUR", period: "annual", annualMin: 60000, annualMax: 60000, raw: "€60k" },
    ],
    [
      "$50 - $70 /hr",
      { min: 50, max: 70, currency: "USD", period: "hourly", annualMin: 104000, annualMax: 145600, raw: "$50 - $70 /hr" },
    ],
  ];

  it.each(table)("parses %s", (input, expected) => {
    expect(parseSalaryText(input)).toEqual(expected);
  });

  it.each(["Competitive", "competitive salary", "DOE", "Negotiable", "TBD"])(
    "returns null for the placeholder %s",
    (input) => {
      expect(parseSalaryText(input)).toBeNull();
    },
  );

  it("returns null for empty, whitespace, null and undefined input", () => {
    expect(parseSalaryText("")).toBeNull();
    expect(parseSalaryText("   ")).toBeNull();
    expect(parseSalaryText(null)).toBeNull();
    expect(parseSalaryText(undefined)).toBeNull();
  });
});

describe("parseSalaryText — rules", () => {
  it("still parses a placeholder word that comes with numbers", () => {
    const salary = parseSalaryText("Competitive, up to $150k");
    expect(salary).toMatchObject({ min: 150000, max: 150000, currency: "USD" });
  });

  it("maps £ and ₹ symbols and prefers an explicit code over $", () => {
    expect(parseSalaryText("£45,000")?.currency).toBe("GBP");
    expect(parseSalaryText("₹1,200,000")?.currency).toBe("INR");
    expect(parseSalaryText("CAD $90k - $110k")?.currency).toBe("CAD");
  });

  it("leaves currency null when none is given", () => {
    expect(parseSalaryText("90000 - 110000")).toMatchObject({ currency: null, min: 90000, max: 110000 });
  });

  it("handles the m suffix, dot and space thousands separators", () => {
    expect(parseSalaryText("$1.2M")).toMatchObject({ min: 1200000, max: 1200000 });
    expect(parseSalaryText("€60.000 - €70.000")).toMatchObject({ min: 60000, max: 70000 });
    expect(parseSalaryText("100 000 - 120 000 EUR")).toMatchObject({ min: 100000, max: 120000, currency: "EUR" });
  });

  it("annualizes hourly, weekly and monthly text", () => {
    expect(parseSalaryText("$45 per hour")).toMatchObject({ period: "hourly", annualMax: 93600 });
    expect(parseSalaryText("$2,000 per week")).toMatchObject({ period: "weekly", annualMax: 104000 });
    expect(parseSalaryText("€5,000/month")).toMatchObject({ period: "monthly", annualMin: 60000, annualMax: 60000 });
    expect(parseSalaryText("$8k/mo")).toMatchObject({ period: "monthly", annualMax: 96000 });
  });

  it("orders a reversed range as min then max", () => {
    expect(parseSalaryText("$200k - $170k")).toMatchObject({ min: 170000, max: 200000 });
  });

  it("returns null when annualMax is out of range (sanity check)", () => {
    expect(parseSalaryText("$20,000,000")).toBeNull(); // above 10,000,000
    expect(parseSalaryText("$500")).toBeNull(); // below 1,000 per year
    expect(parseSalaryText("$10,000 per hour")).toBeNull(); // 20.8M per year
  });

  it("keeps the boundary values 1,000 and 10,000,000", () => {
    expect(parseSalaryText("$1,000")).toMatchObject({ annualMax: 1000 });
    expect(parseSalaryText("$10,000,000")).toMatchObject({ annualMax: 10000000 });
  });
});

describe("parseSalaryText — strings from the recorded Remotive feed (2026-11-17)", () => {
  it("reads a decimal comma before k as a decimal ($35,3k = 35,300)", () => {
    expect(parseSalaryText("$35,3k- $52k")).toEqual<Salary>({
      min: 35300,
      max: 52000,
      currency: "USD",
      period: "annual",
      annualMin: 35300,
      annualMax: 52000,
      raw: "$35,3k- $52k",
    });
  });

  it("still reads a comma followed by three digits as a thousands separator", () => {
    expect(parseSalaryText("$100,000 - $120,000")).toMatchObject({ min: 100000, max: 120000 });
    expect(parseSalaryText("$1,500k")).toMatchObject({ min: 1500000, max: 1500000 });
    expect(parseSalaryText("€12,50k")).toMatchObject({ min: 12500, max: 12500, currency: "EUR" });
  });

  it("parses an OTE (on-target earnings) range like any annual range", () => {
    expect(parseSalaryText("OTE $25k - $35k")).toMatchObject({
      min: 25000,
      max: 35000,
      currency: "USD",
      period: "annual",
      annualMin: 25000,
      annualMax: 35000,
    });
  });

  it("parses the hourly and monthly forms the feed uses", () => {
    expect(parseSalaryText("$14 - $20/hour")).toMatchObject({ min: 14, max: 20, period: "hourly", annualMin: 29120, annualMax: 41600 });
    expect(parseSalaryText("$50-$75 /hour")).toMatchObject({ min: 50, max: 75, period: "hourly", annualMax: 156000 });
    expect(parseSalaryText("$14/hour")).toMatchObject({ min: 14, max: 14, period: "hourly", annualMax: 29120 });
    expect(parseSalaryText("$3.5k–$5k/month")).toMatchObject({ min: 3500, max: 5000, period: "monthly", annualMax: 60000 });
  });

  it("parses ranges with uneven spacing or no currency", () => {
    expect(parseSalaryText("$20k -$35k")).toMatchObject({ min: 20000, max: 35000, currency: "USD" });
    expect(parseSalaryText("70K-80K")).toMatchObject({ min: 70000, max: 80000, currency: null });
  });
});

describe("annualize", () => {
  it("applies the SPEC multipliers per period", () => {
    expect(annualize(50, "hourly")).toBe(104000);
    expect(annualize(1000, "weekly")).toBe(52000);
    expect(annualize(2000, "fortnightly")).toBe(52000);
    expect(annualize(5000, "monthly")).toBe(60000);
    expect(annualize(100000, "annual")).toBe(100000);
  });

  it("throws on a non-finite amount", () => {
    expect(() => annualize(Number.NaN, "annual")).toThrow(RangeError);
    expect(() => annualize(Number.POSITIVE_INFINITY, "hourly")).toThrow(RangeError);
  });
});
