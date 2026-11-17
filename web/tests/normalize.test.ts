// @vitest-environment node
import { describe, it, expect } from "vitest";
import { stripHtml } from "@/lib/normalize/html";
import { normalizeEmploymentType } from "@/lib/normalize/employment";
import { normalizeSeniority, inferSeniorityFromTitle } from "@/lib/normalize/seniority";
import { parseUtcOffset } from "@/lib/normalize/timezone";
import { parseRemotiveLocation, countryNameToAlpha2 } from "@/lib/normalize/location";

// ── stripHtml ──────────────────────────────────────────────────────────────
describe("stripHtml", () => {
  it("removes tags", () => {
    expect(stripHtml("<p>Hello <b>world</b></p>")).toBe("Hello world");
  });

  it("converts <br>, </p>, </li> to newlines", () => {
    const result = stripHtml("<p>Line 1</p><p>Line 2</p>");
    expect(result).toContain("Line 1");
    expect(result).toContain("Line 2");
  });

  it("decodes named entities", () => {
    expect(stripHtml("&amp;&lt;&gt;&quot;&#39;")).toBe(`&<>"'`);
    // &nbsp; in the middle becomes a regular space
    expect(stripHtml("a&nbsp;b")).toBe("a b");
    // &nbsp; at end-of-string is trimmed
    expect(stripHtml("hello&nbsp;")).toBe("hello");
  });

  it("decodes numeric entities", () => {
    expect(stripHtml("&#65;&#x42;")).toBe("AB");
  });

  it("collapses whitespace", () => {
    expect(stripHtml("  foo   bar  ")).toBe("foo bar");
  });

  it("handles nested tags", () => {
    expect(stripHtml("<ul><li>item 1</li><li>item 2</li></ul>")).toContain("item 1");
  });

  it("returns empty string for empty input", () => {
    expect(stripHtml("")).toBe("");
  });
});

// ── normalizeEmploymentType ────────────────────────────────────────────────
describe("normalizeEmploymentType", () => {
  it.each([
    ["Full Time", "full_time"],
    ["full_time", "full_time"],
    ["Part Time", "part_time"],
    ["Contractor", "contract"],
    ["freelance", "contract"],
    ["Temporary", "temporary"],
    ["Intern", "internship"],
    ["internship", "internship"],
    ["Volunteer", "other"],
    ["Other", "other"],
  ] as const)('"%s" → "%s"', (input, expected) => {
    expect(normalizeEmploymentType(input)).toBe(expected);
  });

  it("returns null for null/undefined", () => {
    expect(normalizeEmploymentType(null)).toBeNull();
    expect(normalizeEmploymentType(undefined)).toBeNull();
  });

  it("returns 'other' for unknown values", () => {
    expect(normalizeEmploymentType("gig")).toBe("other");
  });
});

// ── normalizeSeniority ─────────────────────────────────────────────────────
describe("normalizeSeniority", () => {
  it.each([
    [["Entry-level"], ["entry"]],
    [["Mid-level"], ["mid"]],
    [["Senior"], ["senior"]],
    [["Manager"], ["manager"]],
    [["Director"], ["director"]],
    [["Executive"], ["executive"]],
    [["Senior", "Manager"], ["senior", "manager"]],
  ] as const)("%j → %j", (input, expected) => {
    expect(normalizeSeniority([...input])).toEqual(expected);
  });

  it("returns [] for empty array", () => {
    expect(normalizeSeniority([])).toEqual([]);
  });

  it("drops unknown labels", () => {
    expect(normalizeSeniority(["Senior", "Unknown"])).toEqual(["senior"]);
  });
});

// ── inferSeniorityFromTitle ────────────────────────────────────────────────
describe("inferSeniorityFromTitle", () => {
  it.each([
    ["Senior Frontend Engineer", "senior"],
    ["Lead Engineer", "senior"],
    ["Principal Engineer", "senior"],
    ["Junior Developer", "entry"],
    ["Graduate Engineer", "entry"],
    ["Engineering Manager", "manager"],
    ["Director of Engineering", "director"],
    ["Head of Product", "director"],
    ["CTO", "executive"],
    ["VP of Engineering", "executive"],
    ["Mid-level Developer", "mid"],
  ])('"%s" → "%s"', (title, expected) => {
    expect(inferSeniorityFromTitle(title)).toEqual([expected]);
  });

  it("returns [] when nothing matches", () => {
    expect(inferSeniorityFromTitle("Software Engineer")).toEqual([]);
  });
});

// ── parseUtcOffset ─────────────────────────────────────────────────────────
describe("parseUtcOffset", () => {
  it.each([
    ["+7", 7],
    ["-5", -5],
    ["0", 0],
    ["UTC-05:00", -5],
    ["GMT+5:30", 5.5],
    [-10, -10],
    [5.5, 5.5],
    [14, 14],
    [-12, -12],
  ])('"%s" → %s', (input, expected) => {
    expect(parseUtcOffset(input)).toBeCloseTo(expected as number, 5);
  });

  it("returns null for out-of-range", () => {
    expect(parseUtcOffset(15)).toBeNull();
    expect(parseUtcOffset(-13)).toBeNull();
  });

  it("returns null for unparseable strings", () => {
    expect(parseUtcOffset("EST")).toBeNull();
    expect(parseUtcOffset("")).toBeNull();
    expect(parseUtcOffset(null)).toBeNull();
  });
});

// ── parseRemotiveLocation ──────────────────────────────────────────────────
describe("parseRemotiveLocation", () => {
  it("worldwide for empty string", () => {
    expect(parseRemotiveLocation("")).toMatchObject({ worldwide: true });
  });

  it("worldwide for 'Worldwide'", () => {
    expect(parseRemotiveLocation("Worldwide")).toMatchObject({ worldwide: true });
  });

  it("parses country names to alpha-2", () => {
    const result = parseRemotiveLocation("USA, Canada");
    expect(result.worldwide).toBe(false);
    expect(result.countries).toContain("US");
    expect(result.countries).toContain("CA");
  });

  it("parses region tokens", () => {
    const result = parseRemotiveLocation("Europe");
    expect(result.regions).toContain("EUROPE");
  });

  it("ignores timezone tokens", () => {
    const result = parseRemotiveLocation("USA, Canada, USA timezones");
    expect(result.countries).toContain("US");
    expect(result.countries).toContain("CA");
    // 'USA timezones' should not add an extra US entry
    expect(result.countries.filter((c) => c === "US")).toHaveLength(1);
  });

  it("preserves raw text", () => {
    const raw = "USA, Canada";
    expect(parseRemotiveLocation(raw).raw).toBe(raw);
  });
});

// ── countryNameToAlpha2 ────────────────────────────────────────────────────
describe("countryNameToAlpha2", () => {
  it.each([
    ["United States", "US"],
    ["USA", "US"],
    ["Canada", "CA"],
    ["United Kingdom", "GB"],
    ["UK", "GB"],
    ["Vietnam", "VN"],
    ["Viet Nam", "VN"],
  ])('"%s" → "%s"', (name, expected) => {
    expect(countryNameToAlpha2(name)).toBe(expected);
  });

  it("returns null for unknown names", () => {
    expect(countryNameToAlpha2("Neverland")).toBeNull();
  });
});
