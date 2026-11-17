import type { Salary, SalaryPeriod } from "@/lib/types";

/**
 * §4.3 — Salary helpers
 */

/** Annualize an amount from its period to yearly. */
export function annualize(amount: number, period: SalaryPeriod): number {
  switch (period) {
    case "hourly":      return amount * 2080;
    case "weekly":      return amount * 52;
    case "fortnightly": return amount * 26;
    case "monthly":     return amount * 12;
    case "annual":      return amount;
  }
}

// ── Currency detection ─────────────────────────────────────────────────────

const SYMBOL_MAP: Record<string, string> = {
  "$": "USD", "€": "EUR", "£": "GBP", "₹": "INR",
};

const CURRENCY_CODES = [
  "USD","EUR","GBP","CAD","AUD","INR","SGD","CHF","SEK","NOK","DKK",
  "NZD","JPY","HKD","MXN","BRL","ZAR","PLN","CZK","HUF","RON","TRY",
];

function detectCurrency(text: string): string | null {
  // Symbol first
  for (const [sym, code] of Object.entries(SYMBOL_MAP)) {
    if (text.includes(sym)) return code;
  }
  // Then explicit currency code
  const upper = text.toUpperCase();
  for (const code of CURRENCY_CODES) {
    if (new RegExp(`\\b${code}\\b`).test(upper)) return code;
  }
  return null;
}

// ── Number extraction ──────────────────────────────────────────────────────

/**
 * Extract up to two numeric values from salary text.
 * Handles: thousands separators (`,` `.` ` ` before 3 digits), `k`/`K` ×1000, `m`/`M` ×1_000_000.
 */
function extractNumbers(text: string): number[] {
  // Remove currency symbols / codes to avoid mis-parsing
  const cleaned = text
    .replace(/[€£₹]/g, "")
    .replace(new RegExp(`\\b(${CURRENCY_CODES.join("|")})\\b`, "gi"), "");

  // Pattern: optional sign, digits with separators, optional k/m suffix
  const pattern = /(\d[\d,.\s]*)([kKmM])?/g;
  const results: number[] = [];
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(cleaned)) !== null && results.length < 2) {
    // Remove thousands separators only when followed by exactly 3 digits
    const raw = match[1]
      .replace(/[,.\s](?=\d{3}(?:[,.\s]|$))/g, "")
      .replace(/[,.\s]/g, "");
    let n = parseFloat(raw);
    if (isNaN(n)) continue;

    const suffix = match[2]?.toLowerCase();
    if (suffix === "k") n *= 1_000;
    if (suffix === "m") n *= 1_000_000;

    results.push(n);
  }

  return results;
}

// ── Period detection ───────────────────────────────────────────────────────

function detectPeriod(text: string): SalaryPeriod {
  // \/hr and \/hour start with a non-word char so \b can't precede them
  if (/\bper hour\b|\bhourly\b|\ban hour\b|\/hr\b|\/hour\b/i.test(text)) return "hourly";
  if (/\bweek\b/i.test(text)) return "weekly";
  if (/\bmonth\b|\/mo\b/i.test(text)) return "monthly";
  return "annual";
}

// ── Main parser ────────────────────────────────────────────────────────────

/**
 * §4.3 — Parse a Remotive free-text salary string into a Salary object.
 * Returns null for empty, non-numeric, or out-of-range values.
 */
export function parseSalaryText(raw: string | null | undefined): Salary | null {
  if (!raw?.trim()) return null;

  // Non-numeric descriptions
  if (/competitive|doe|negotiable|tbd/i.test(raw) && !/\d/.test(raw)) return null;

  const currency = detectCurrency(raw);
  const nums = extractNumbers(raw);
  if (!nums.length) return null;

  const min = nums[0];
  const max = nums.length > 1 ? nums[1] : nums[0];
  const period = detectPeriod(raw);

  // Sanity check on annual equivalent
  const annualMax = annualize(max, period);
  if (annualMax < 1_000 || annualMax > 10_000_000) return null;

  return {
    min,
    max,
    currency,
    period,
    annualMin: annualize(min, period),
    annualMax,
    raw,
  };
}
