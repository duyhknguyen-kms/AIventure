// @vitest-environment node
import { describe, expect, it } from "vitest";
import { stripHtml } from "@/lib/normalize/html";
import { normalizeEmploymentType } from "@/lib/normalize/employment";
import {
  SENIORITY_LADDER,
  inferSeniorityFromTitle,
  normalizeSeniority,
} from "@/lib/normalize/seniority";
import { parseRemotiveLocation } from "@/lib/normalize/location";
import { parseUtcOffset } from "@/lib/normalize/timezone";

describe("stripHtml (SPEC §8, FR2, FR8.1)", () => {
  it("turns br, /p and /li into line breaks and removes other tags", () => {
    const html = "<p>We build <strong>remote</strong> tools.</p><ul><li>React</li><li>Node</li></ul>Line one<br>Line two<br/>Line three<br />";
    expect(stripHtml(html)).toBe(
      "We build remote tools.\nReact\nNode\nLine one\nLine two\nLine three",
    );
  });

  it("removes nested tags and attributes", () => {
    const html = '<div class="a"><section><p>Health <a href="https://x.test"><em>insurance</em></a></p></section></div>';
    expect(stripHtml(html)).toBe("Health insurance");
  });

  it("decodes named and numeric entities", () => {
    expect(stripHtml("Tom &amp; Jerry &lt;3 &gt; &quot;hi&quot; it&#39;s&nbsp;fine &#169; &#x20AC;")).toBe(
      'Tom & Jerry <3 > "hi" it\'s fine © €',
    );
  });

  it("decodes in a single pass so escaped markup stays text", () => {
    expect(stripHtml("&amp;lt;b&amp;gt;")).toBe("&lt;b&gt;");
    expect(stripHtml("&lt;script&gt;alert(1)&lt;/script&gt;")).toBe("<script>alert(1)</script>");
  });

  it("keeps unknown or invalid entities unchanged", () => {
    expect(stripHtml("a &bogus; b &#0; c &#99999999;")).toBe("a &bogus; b &#0; c &#99999999;");
  });

  it("collapses whitespace and drops blank lines", () => {
    expect(stripHtml("  <p>  lots \t of   space </p>\n\n\n<p></p><p>end</p>  ")).toBe(
      "lots of space\nend",
    );
  });

  it("returns an empty string for empty or non-string input", () => {
    expect(stripHtml("")).toBe("");
    expect(stripHtml(null as unknown as string)).toBe("");
  });
});

describe("normalizeEmploymentType (SPEC §4.2, FR2.3)", () => {
  it.each([
    ["Full Time", "full_time"],
    ["full_time", "full_time"],
    ["Part Time", "part_time"],
    ["part_time", "part_time"],
    ["Contractor", "contract"],
    ["contract", "contract"],
    ["freelance", "contract"],
    ["Temporary", "temporary"],
    ["Intern", "internship"],
    ["internship", "internship"],
    ["Volunteer", "other"],
    ["Other", "other"],
    ["other", "other"],
  ] as const)("maps %s to %s", (raw, expected) => {
    expect(normalizeEmploymentType(raw)).toBe(expected);
  });

  it("is case-insensitive and tolerates hyphens and padding", () => {
    expect(normalizeEmploymentType("  FULL-TIME ")).toBe("full_time");
  });

  it("maps unknown values to other", () => {
    expect(normalizeEmploymentType("gig work")).toBe("other");
  });

  it("maps empty or missing values to null", () => {
    expect(normalizeEmploymentType("")).toBeNull();
    expect(normalizeEmploymentType("   ")).toBeNull();
    expect(normalizeEmploymentType(null)).toBeNull();
    expect(normalizeEmploymentType(undefined)).toBeNull();
  });
});

describe("normalizeSeniority (SPEC §4.2, FR2.4)", () => {
  it("maps every Himalayas value", () => {
    expect(
      normalizeSeniority(["Entry-level", "Mid-level", "Senior", "Manager", "Director", "Executive"]),
    ).toEqual(["entry", "mid", "senior", "manager", "director", "executive"]);
  });

  it("drops unknown values and duplicates", () => {
    expect(normalizeSeniority(["Senior", "Wizard", "senior", "SENIOR"])).toEqual(["senior"]);
  });

  it("returns [] for empty or missing input", () => {
    expect(normalizeSeniority([])).toEqual([]);
    expect(normalizeSeniority(null)).toEqual([]);
    expect(normalizeSeniority(undefined)).toEqual([]);
  });
});

describe("inferSeniorityFromTitle (SPEC §4.2, FR2.4)", () => {
  it.each([
    ["VP of Engineering", "executive"],
    ["Chief Technology Officer", "executive"],
    ["CTO", "executive"],
    ["Director of Product", "director"],
    ["Head of Design", "director"],
    ["Engineering Manager", "manager"],
    ["Senior Frontend Engineer", "senior"],
    ["Sr. Backend Developer", "senior"],
    ["Lead Data Scientist", "senior"],
    ["Staff Engineer", "senior"],
    ["Junior QA Analyst", "entry"],
    ["Graduate Software Engineer", "entry"],
    ["Mid Backend Engineer", "mid"],
    ["Intermediate Developer", "mid"],
  ] as const)("infers %s as %s", (title, expected) => {
    expect(inferSeniorityFromTitle(title)).toEqual([expected]);
  });

  it("applies the first matching rule", () => {
    // "manager" is checked before "senior"
    expect(inferSeniorityFromTitle("Senior Product Manager")).toEqual(["manager"]);
  });

  it("matches whole words only", () => {
    expect(inferSeniorityFromTitle("Internal Tools Engineer")).toEqual([]);
    expect(inferSeniorityFromTitle("Leader-board Developer")).toEqual([]);
  });

  it("returns [] when nothing matches or the title is empty", () => {
    expect(inferSeniorityFromTitle("Frontend Engineer")).toEqual([]);
    expect(inferSeniorityFromTitle("")).toEqual([]);
    expect(inferSeniorityFromTitle(null)).toEqual([]);
  });
});

describe("SENIORITY_LADDER (FR7.3)", () => {
  it("orders levels from entry to executive", () => {
    expect(SENIORITY_LADDER).toEqual(["entry", "mid", "senior", "manager", "director", "executive"]);
  });
});

describe("parseRemotiveLocation (SPEC §4.4, FR2.2)", () => {
  it("treats Worldwide as no restriction", () => {
    expect(parseRemotiveLocation("Worldwide")).toEqual({
      worldwide: true,
      countries: [],
      regions: [],
      raw: "Worldwide",
    });
  });

  it("treats anywhere, global and empty text as worldwide", () => {
    expect(parseRemotiveLocation("Anywhere in the world").worldwide).toBe(true);
    expect(parseRemotiveLocation("Global").worldwide).toBe(true);
    expect(parseRemotiveLocation("").worldwide).toBe(true);
    expect(parseRemotiveLocation(null)).toEqual({
      worldwide: true,
      countries: [],
      regions: [],
      raw: null,
    });
  });

  it("parses countries and ignores timezone tokens", () => {
    expect(parseRemotiveLocation("USA, Canada, USA timezones")).toEqual({
      worldwide: false,
      countries: ["US", "CA"],
      regions: [],
      raw: "USA, Canada, USA timezones",
    });
  });

  it("parses regions", () => {
    expect(parseRemotiveLocation("Europe").regions).toEqual(["EUROPE"]);
    expect(parseRemotiveLocation("EMEA / LATAM").regions).toEqual(["EUROPE", "AMERICAS"]);
    expect(parseRemotiveLocation("APAC; North America").regions).toEqual(["APAC", "AMERICAS"]);
  });

  it("splits on ' or ' and maps aliases, removing duplicates", () => {
    const location = parseRemotiveLocation("UK or United Kingdom or U.S.");
    expect(location.countries).toEqual(["GB", "US"]);
  });

  it("returns no countries or regions for unparseable text", () => {
    expect(parseRemotiveLocation("Mars colony")).toEqual({
      worldwide: false,
      countries: [],
      regions: [],
      raw: "Mars colony",
    });
  });
});

describe("parseUtcOffset (SPEC §4.5)", () => {
  it.each([
    ["-5", -5],
    ["+7", 7],
    ["UTC-05:00", -5],
    ["GMT+5:30", 5.5],
    ["UTC+5:30", 5.5],
    ["UTC+0530", 5.5],
    ["utc -3", -3],
    ["UTC\u22123", -3],
    ["+14", 14],
    ["-12", -12],
    ["UTC", 0],
    ["+0", 0],
  ] as const)("parses %s to %s", (input, expected) => {
    expect(parseUtcOffset(input)).toBe(expected);
  });

  it("does not return -0", () => {
    expect(Object.is(parseUtcOffset("-0"), 0)).toBe(true);
  });

  it("returns null for unparseable input", () => {
    expect(parseUtcOffset("Eastern Time")).toBeNull();
    expect(parseUtcOffset("UTC+5:75")).toBeNull();
    expect(parseUtcOffset("")).toBeNull();
    expect(parseUtcOffset(null)).toBeNull();
  });

  it("returns null for offsets outside -12..+14", () => {
    expect(parseUtcOffset("+15")).toBeNull();
    expect(parseUtcOffset("-13")).toBeNull();
  });
});
