import type { Salary, SalaryPeriod } from "@/lib/types";

/**
 * Salary parsing and annualization (SPEC §4.3, FR2.1).
 *
 * `parseSalaryText` turns Remotive's free-text salary into a structured
 * `Salary`. `annualize` is shared with the Himalayas adapter to fill
 * `annualMin` / `annualMax`. Both functions are pure.
 */

/** Multipliers that convert an amount in `period` units to a yearly amount. */
export const PERIOD_MULTIPLIERS: Readonly<Record<SalaryPeriod, number>> = Object.freeze({
  hourly: 2080,
  weekly: 52,
  fortnightly: 26,
  monthly: 12,
  annual: 1,
});

/** Sanity bounds for a computed `annualMax` (SPEC §4.3 rule 5). */
export const MIN_PLAUSIBLE_ANNUAL = 1_000;
export const MAX_PLAUSIBLE_ANNUAL = 10_000_000;

/** Converts an amount in `period` units to an annual amount, rounded to a whole unit. */
export function annualize(amount: number, period: SalaryPeriod): number {
  if (!Number.isFinite(amount)) {
    throw new RangeError(`annualize: amount must be a finite number, got ${amount}`);
  }
  const multiplier = PERIOD_MULTIPLIERS[period];
  if (multiplier === undefined) {
    throw new RangeError(`annualize: unknown salary period "${String(period)}"`);
  }
  return Math.round(amount * multiplier);
}

// Rule 2: explicit ISO 4217 codes are checked before symbols, so "CAD $90k" is CAD.
const CURRENCY_CODE_PATTERN =
  /\b(USD|EUR|GBP|CAD|AUD|INR|SGD|NZD|CHF|JPY|SEK|NOK|DKK|PLN|BRL|MXN|ZAR|HKD)\b/i;
const CURRENCY_SYMBOLS: ReadonlyArray<readonly [string, string]> = [
  ["€", "EUR"],
  ["£", "GBP"],
  ["₹", "INR"],
  ["$", "USD"],
];

// Rule 3: a number with thousands separators (",", ".", space), a decimal
// comma directly before a k/m suffix ("$35,3k" is 35,300, as Remotive writes
// it), or a plain number with an optional decimal point; then an optional k/m
// suffix that is not the start of a word (so "5000 month" keeps 5000). A
// comma followed by one or two digits without a suffix stays a separator
// between two numbers, never a decimal.
const NUMBER_PATTERN =
  /(\d{1,3}(?:[,. \u00A0]\d{3})+(?!\d)|\d+,\d{1,2}(?=\s?[kKmM](?![a-zA-Z]))|\d+(?:\.\d+)?)(?:\s?([kKmM])(?![a-zA-Z]))?/g;

// Rule 4: period keywords. "/hr" has no word boundary before "/", so the
// slash forms are matched without a leading \b.
const HOURLY_PATTERN = /\bper hour\b|\/\s?(?:hr|hour)\b|\bhourly\b|\ban hour\b/i;
const WEEKLY_PATTERN = /week|\/\s?wk\b/i;
const FORTNIGHTLY_PATTERN = /fortnight/i;
const MONTHLY_PATTERN = /month|\/\s?mo\b/i;

function detectCurrency(text: string): string | null {
  const code = CURRENCY_CODE_PATTERN.exec(text);
  if (code) return code[1].toUpperCase();
  for (const [symbol, iso] of CURRENCY_SYMBOLS) {
    if (text.includes(symbol)) return iso;
  }
  return null;
}

function detectPeriod(text: string): SalaryPeriod {
  if (HOURLY_PATTERN.test(text)) return "hourly";
  if (FORTNIGHTLY_PATTERN.test(text)) return "fortnightly";
  if (WEEKLY_PATTERN.test(text)) return "weekly";
  if (MONTHLY_PATTERN.test(text)) return "monthly";
  return "annual";
}

function toAmount(digits: string, suffix: string | undefined): number {
  const isGrouped = /^\d{1,3}(?:[,. \u00A0]\d{3})+$/.test(digits);
  // Not grouped: a comma can only be the decimal comma matched before k/m.
  const base = isGrouped ? Number(digits.replace(/[,. \u00A0]/g, "")) : Number(digits.replace(",", "."));
  const scale = suffix === undefined ? 1 : suffix.toLowerCase() === "k" ? 1_000 : 1_000_000;
  return Math.round(base * scale * 100) / 100;
}

/** Extracts up to two amounts (SPEC §4.3 rule 3). */
function extractAmounts(text: string): number[] {
  const amounts: number[] = [];
  for (const match of text.matchAll(NUMBER_PATTERN)) {
    const value = toAmount(match[1], match[2]);
    if (Number.isFinite(value)) amounts.push(value);
    if (amounts.length === 2) break;
  }
  return amounts;
}

/**
 * Parses free-text salary such as "$170k - $200k" or "$50 - $70 /hr".
 * Returns null when the text is empty, a placeholder ("Competitive"), has no
 * number, or the annualized maximum is implausible (below 1,000 or above
 * 10,000,000).
 */
export function parseSalaryText(raw: string | null | undefined): Salary | null {
  if (typeof raw !== "string") return null;
  const text = raw.trim();
  if (text === "") return null;
  // Rule 1: "Competitive", "DOE", "Negotiable", "TBD" and any other text
  // without digits has no amount to extract.
  if (!/\d/.test(text)) return null;

  const amounts = extractAmounts(text);
  if (amounts.length === 0) return null;
  const min = Math.min(...amounts);
  const max = Math.max(...amounts);

  const period = detectPeriod(text);
  const annualMin = annualize(min, period);
  const annualMax = annualize(max, period);
  if (annualMax < MIN_PLAUSIBLE_ANNUAL || annualMax > MAX_PLAUSIBLE_ANNUAL) return null;

  return {
    min,
    max,
    currency: detectCurrency(text),
    period,
    annualMin,
    annualMax,
    raw: text,
  };
}
