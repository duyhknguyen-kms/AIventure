// @vitest-environment node
/**
 * Unit tests for Improve-plan.md Items 2 (pagination logic) and 3 (HighlightText segments).
 * Component rendering tests live in the a11y suite; these test pure logic.
 */
import { describe, it, expect } from "vitest";

// ── Item 2 — pagination slice logic ───────────────────────────────────────

const PAGE_SIZE = 10;

function paginate<T>(items: T[], page: number): T[] {
  const start = (page - 1) * PAGE_SIZE;
  return items.slice(start, start + PAGE_SIZE);
}

function totalPages(count: number): number {
  return Math.max(1, Math.ceil(count / PAGE_SIZE));
}

describe("Pagination logic", () => {
  it("first page returns items 1–10 from a 25-item list", () => {
    const items = Array.from({ length: 25 }, (_, i) => i + 1);
    expect(paginate(items, 1)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("second page returns items 11–20", () => {
    const items = Array.from({ length: 25 }, (_, i) => i + 1);
    expect(paginate(items, 2)).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
  });

  it("last partial page returns remaining items", () => {
    const items = Array.from({ length: 25 }, (_, i) => i + 1);
    expect(paginate(items, 3)).toEqual([21, 22, 23, 24, 25]);
  });

  it("totalPages for 0 items returns 1", () => {
    expect(totalPages(0)).toBe(1);
  });

  it("totalPages for 10 items returns 1", () => {
    expect(totalPages(10)).toBe(1);
  });

  it("totalPages for 11 items returns 2", () => {
    expect(totalPages(11)).toBe(2);
  });

  it("totalPages for 100 items returns 10", () => {
    expect(totalPages(100)).toBe(10);
  });

  it("totalPages for 101 items returns 11", () => {
    expect(totalPages(101)).toBe(11);
  });
});

// ── Item 3 — HighlightText segment logic ──────────────────────────────────
// Test the segmentation algorithm independently of React rendering.

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normaliseHyphens(s: string): string {
  return s.replace(/-/g, " ");
}

function segmentText(text: string, terms: string[], warnTerms: string[] = []) {
  type Type = "plain" | "match" | "warn";
  const segments: { text: string; type: Type }[] = [];

  function buildRe(arr: string[]) {
    const unique = [...new Set(arr.map((t) => normaliseHyphens(t.toLowerCase())))].filter(Boolean);
    if (!unique.length) return null;
    return new RegExp(`\\b(${unique.map(escapeRegex).join("|")})\\b`, "gi");
  }

  const matchRe = buildRe(terms);
  const warnRe  = buildRe(warnTerms);

  if (!matchRe && !warnRe) return [{ text, type: "plain" as Type }];

  const parts: string[] = [];
  if (matchRe) parts.push(`(?<match>${matchRe.source})`);
  if (warnRe)  parts.push(`(?<warn>${warnRe.source})`);
  const combined = new RegExp(parts.join("|"), "gi");

  const normText = normaliseHyphens(text);
  let lastIndex = 0;
  let m: RegExpExecArray | null;

  while ((m = combined.exec(normText)) !== null) {
    if (m.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, m.index), type: "plain" });
    }
    const slice = text.slice(m.index, m.index + m[0].length);
    segments.push({ text: slice, type: m.groups?.match !== undefined ? "match" : "warn" });
    lastIndex = m.index + m[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), type: "plain" });
  }

  return segments;
}

describe("HighlightText segmentation", () => {
  it("no terms → single plain segment", () => {
    const segs = segmentText("hello world", []);
    expect(segs).toHaveLength(1);
    expect(segs[0].type).toBe("plain");
  });

  it("matching term → highlighted segment", () => {
    const segs = segmentText("We use React and TypeScript", ["react"]);
    const match = segs.find((s) => s.type === "match");
    expect(match?.text.toLowerCase()).toBe("react");
  });

  it("warn term → warn segment", () => {
    const segs = segmentText("Must be on-site in NYC", [], ["on-site"]);
    const warn = segs.find((s) => s.type === "warn");
    expect(warn).toBeTruthy();
  });

  it("hyphenated term matches spaced variant", () => {
    const segs = segmentText("This is an on site position", [], ["on-site"]);
    expect(segs.some((s) => s.type === "warn")).toBe(true);
  });

  it("surrounding text is plain", () => {
    const segs = segmentText("We love React here", ["react"]);
    const plains = segs.filter((s) => s.type === "plain");
    expect(plains.some((s) => s.text.includes("We love"))).toBe(true);
    expect(plains.some((s) => s.text.includes("here"))).toBe(true);
  });

  it("non-matching term → all plain", () => {
    const segs = segmentText("No typescript here", ["python"]);
    expect(segs.every((s) => s.type === "plain")).toBe(true);
  });

  it("partial word is not highlighted (word boundary)", () => {
    // "php" should not highlight inside "graphql"
    const segs = segmentText("We use graphql daily", [], ["php"]);
    expect(segs.every((s) => s.type === "plain")).toBe(true);
  });

  it("multiple terms highlighted independently", () => {
    const segs = segmentText("React and TypeScript are great", ["react", "typescript"]);
    const matches = segs.filter((s) => s.type === "match");
    expect(matches).toHaveLength(2);
  });
});
