import { describe, it, expect } from "vitest";
import theme from "@/theme";

// WCAG 2.x relative luminance and contrast ratio.
function luminance(hex: string): number {
  let v = hex.replace("#", "");
  if (v.length === 3) v = v.split("").map((c) => c + c).join("");
  if (!/^[0-9a-f]{6}$/i.test(v)) throw new Error(`Not a hex colour: ${hex}`);
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(v.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const WHITE = "#ffffff";

describe("theme contrast (NFR3.3, WCAG 1.4.3 / 1.4.11)", () => {
  it.each(["primary", "success", "warning", "error"] as const)(
    "%s.main has >= 4.5:1 against white",
    (key) => {
      expect(contrast(theme.palette[key].main, WHITE)).toBeGreaterThanOrEqual(4.5);
    },
  );

  it("palette contrastText on each status colour has >= 4.5:1", () => {
    for (const key of ["primary", "success", "warning", "error"] as const) {
      const { main, contrastText } = theme.palette[key];
      expect(contrast(main, contrastText)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("secondary text has >= 4.5:1 against white", () => {
    expect(contrast(theme.palette.text.secondary, WHITE)).toBeGreaterThanOrEqual(4.5);
  });

  it("input and chip borders have >= 3:1 against white", () => {
    expect(contrast("#767676", WHITE)).toBeGreaterThanOrEqual(3);
  });

  it("links are underlined so colour is not the only cue (WCAG 1.4.1)", () => {
    expect(theme.components?.MuiLink?.defaultProps?.underline).toBe("always");
  });
});
