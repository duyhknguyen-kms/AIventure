// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  formatCompactAmount,
  formatEmploymentType,
  formatLocation,
  formatPostedDate,
  formatSalary,
  initials,
  matchBadgeLabel,
  matchLevel,
} from "@/lib/format";
import type { Salary } from "@/lib/types";

function salary(overrides: Partial<Salary> = {}): Salary {
  return { min: 120000, max: 150000, currency: "USD", period: "annual", annualMin: 120000, annualMax: 150000, raw: null, ...overrides };
}

describe("matchLevel / matchBadgeLabel (SPEC §10.5 use of colour)", () => {
  it("uses Strong ≥ 75, Medium 50–74, Low < 50", () => {
    expect([100, 75, 74, 50, 49, 0].map(matchLevel)).toEqual(["Strong", "Strong", "Medium", "Medium", "Low", "Low"]);
  });
  it("puts the number and the level word in the badge", () => {
    expect(matchBadgeLabel(88)).toBe("88% · Strong match");
  });
});

describe("formatSalary (SPEC §10.3 CUR min–max/period)", () => {
  it("formats a range", () => {
    expect(formatSalary(salary())).toBe("USD 120k–150k/yr");
  });
  it("formats hourly and single values", () => {
    expect(formatSalary(salary({ min: 50, max: 70, period: "hourly" }))).toBe("USD 50–70/hr");
    expect(formatSalary(salary({ min: 60000, max: 60000, currency: "eur" }))).toBe("EUR 60k/yr");
  });
  it("handles one-sided ranges and a missing currency", () => {
    expect(formatSalary(salary({ max: null }))).toBe("from USD 120k/yr");
    expect(formatSalary(salary({ min: null, currency: null, period: "monthly", max: 5000 }))).toBe("up to 5k/mo");
  });
  it("says Salary not listed for null or empty salaries", () => {
    expect(formatSalary(null)).toBe("Salary not listed");
    expect(formatSalary(salary({ min: null, max: null }))).toBe("Salary not listed");
  });
  it("compacts amounts", () => {
    expect([950, 35300, 120000, 1250000].map(formatCompactAmount)).toEqual(["950", "35.3k", "120k", "1.25M"]);
  });
});

describe("formatLocation", () => {
  it("summarises worldwide, countries and regions", () => {
    expect(formatLocation({ worldwide: true, countries: [], regions: [], raw: null })).toBe("Worldwide");
    expect(formatLocation({ worldwide: false, countries: ["US", "CA"], regions: ["EUROPE"], raw: null })).toBe(
      "United States, Canada, Europe",
    );
  });
  it("caps the country list with +N more", () => {
    expect(formatLocation({ worldwide: false, countries: ["US", "CA", "MX", "BR", "AR"], regions: [], raw: null })).toBe(
      "United States, Canada, Mexico, +2 more",
    );
  });
  it("falls back to the raw text, then to Location not specified", () => {
    expect(formatLocation({ worldwide: false, countries: [], regions: [], raw: " Mars " })).toBe("Mars");
    expect(formatLocation({ worldwide: false, countries: [], regions: [], raw: null })).toBe("Location not specified");
  });
});

describe("small formatters", () => {
  it("labels employment types and returns null when unknown", () => {
    expect(formatEmploymentType("full_time")).toBe("Full time");
    expect(formatEmploymentType(null)).toBeNull();
  });
  it("builds initials and survives odd names", () => {
    expect(initials("Acme Corp")).toBe("AC");
    expect(initials("  acme  ")).toBe("A");
    expect(initials("— !")).toBe("?");
  });
  it("formats the posted date in UTC and rejects invalid dates", () => {
    expect(formatPostedDate("2026-11-16T23:30:00.000Z")).toBe("16 Nov 2026");
    expect(formatPostedDate("not a date")).toBeNull();
  });
});
