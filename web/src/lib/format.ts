import type { EmploymentType, JobLocation, Salary, SalaryPeriod, SourceName } from "@/lib/types";

/**
 * Display formatting shared by the dashboard components (SPEC §10.3). Pure
 * functions with no clock and no locale-dependent output beyond English.
 */

export const SOURCE_LABEL: Readonly<Record<SourceName, string>> = Object.freeze({
  himalayas: "Himalayas",
  remotive: "Remotive",
});

export type MatchLevel = "Strong" | "Medium" | "Low";

/** Strong at 75 and above, Medium 50 to 74, Low below 50 (SPEC §10.5, use of colour). */
export function matchLevel(matchPercent: number): MatchLevel {
  if (matchPercent >= 75) return "Strong";
  if (matchPercent >= 50) return "Medium";
  return "Low";
}

/** Badge text with the number and the level word, e.g. "88% · Strong match". */
export function matchBadgeLabel(matchPercent: number): string {
  return `${matchPercent}% · ${matchLevel(matchPercent)} match`;
}

const PERIOD_SUFFIX: Readonly<Record<SalaryPeriod, string>> = Object.freeze({
  hourly: "/hr",
  weekly: "/wk",
  fortnightly: "/2 wk",
  monthly: "/mo",
  annual: "/yr",
});

/** Compact amount: 950 → "950", 35300 → "35.3k", 120000 → "120k", 1250000 → "1.25M". */
export function formatCompactAmount(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) return `${Number((amount / 1_000_000).toFixed(2))}M`;
  if (abs >= 1_000) return `${Number((amount / 1_000).toFixed(1))}k`;
  return String(Number(amount.toFixed(2)));
}

export const SALARY_NOT_LISTED = "Salary not listed";

/**
 * "CUR min–max/period" (SPEC §10.3), e.g. "USD 120k–150k/yr". One-sided
 * ranges read "from USD 120k/yr" or "up to USD 150k/yr"; a missing currency
 * is left out; no amounts gives "Salary not listed".
 */
export function formatSalary(salary: Salary | null): string {
  if (salary === null) return SALARY_NOT_LISTED;
  const { min, max, currency, period } = salary;
  if (min === null && max === null) return SALARY_NOT_LISTED;
  const prefix = currency ? `${currency.toUpperCase()} ` : "";
  const suffix = PERIOD_SUFFIX[period] ?? "";
  if (min !== null && max !== null) {
    const range = min === max ? formatCompactAmount(min) : `${formatCompactAmount(min)}–${formatCompactAmount(max)}`;
    return `${prefix}${range}${suffix}`;
  }
  if (min !== null) return `from ${prefix}${formatCompactAmount(min)}${suffix}`;
  return `up to ${prefix}${formatCompactAmount(max as number)}${suffix}`;
}

const EMPLOYMENT_LABEL: Readonly<Record<EmploymentType, string>> = Object.freeze({
  full_time: "Full time",
  part_time: "Part time",
  contract: "Contract",
  temporary: "Temporary",
  internship: "Internship",
  other: "Other",
});

/** "Full time", "Contract", ... or null when the type is unknown. */
export function formatEmploymentType(type: EmploymentType | null): string | null {
  return type === null ? null : EMPLOYMENT_LABEL[type];
}

const REGION_LABEL: Readonly<Record<string, string>> = Object.freeze({
  EUROPE: "Europe",
  AMERICAS: "Americas",
  APAC: "Asia-Pacific",
});

/** Countries shown by name before the rest are summarised as "+N more". */
export const MAX_LISTED_COUNTRIES = 3;

let regionNames: Intl.DisplayNames | null | undefined;

function countryName(code: string): string {
  if (regionNames === undefined) {
    try {
      regionNames = new Intl.DisplayNames(["en"], { type: "region" });
    } catch (error) {
      // Older runtimes without Intl.DisplayNames: fall back to the ISO code.
      console.warn("[format] Intl.DisplayNames unavailable; showing country codes.", error);
      regionNames = null;
    }
  }
  if (regionNames === null) return code;
  try {
    return regionNames.of(code) ?? code;
  } catch {
    // Invalid code for DisplayNames (e.g. a malformed value): show the code itself.
    return code;
  }
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

/**
 * Short location summary: "Worldwide", country names (up to three, then
 * "+N more"), region names, the raw text, or "Location not specified".
 */
export function formatLocation(location: JobLocation): string {
  if (location.worldwide) return "Worldwide";
  const parts: string[] = [];
  const countries = location.countries.map(countryName);
  parts.push(...countries.slice(0, MAX_LISTED_COUNTRIES));
  if (countries.length > MAX_LISTED_COUNTRIES) parts.push(`+${countries.length - MAX_LISTED_COUNTRIES} more`);
  parts.push(...location.regions.map((region) => REGION_LABEL[region] ?? titleCase(region)));
  if (parts.length > 0) return parts.join(", ");
  const raw = location.raw?.trim();
  return raw ? raw : "Location not specified";
}

/** "16 Nov 2026" in UTC, or null for an unparseable date. */
export function formatPostedDate(iso: string): string | null {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return null;
  return new Date(time).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

// Letters and digits, Latin and beyond (no `\p{L}`: the project targets ES2017).
const WORD_CHAR = /[0-9A-Za-z\u00C0-\u024F\u0370-\u03FF\u0400-\u04FF\u3040-\u30FF\u4E00-\u9FFF\uAC00-\uD7AF]/;

/** Up to two initials for an avatar fallback: "Acme Corp" → "AC", "acme" → "A". */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter((word) => WORD_CHAR.test(word));
  const letters = words.slice(0, 2).map((word) => (word.match(WORD_CHAR) ?? [""])[0]);
  const result = letters.join("").toUpperCase();
  return result === "" ? "?" : result;
}
