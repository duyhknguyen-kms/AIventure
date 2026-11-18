import type { Criteria } from "@/lib/matching/criteria";
import type { Job } from "@/lib/types";

/**
 * Hard filters (SPEC §7.1, FR6) and the shared text helpers of the matching
 * engine (SPEC §7). Every function here is pure: no I/O, no clock.
 */

// ---------------------------------------------------------------------------
// Text helpers (SPEC §7), shared with `score.ts`
// ---------------------------------------------------------------------------

/**
 * The searchable text of a job: lower(title + tags + categories +
 * descriptionText), joined with spaces (SPEC §7).
 */
export function haystack(job: Pick<Job, "title" | "tags" | "categories" | "descriptionText">): string {
  return [job.title, job.tags.join(" "), job.categories.join(" "), job.descriptionText]
    .join(" ")
    .toLowerCase();
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Builds the regex for one criteria term. The term is lower-cased, trimmed and
 * regex-escaped; words of a multi-word term may be separated by any run of
 * whitespace, so the term matches as a phrase. The edges use `(?<!\w)` and
 * `(?!\w)`, which equal `\b` for terms that start and end with a letter or
 * digit and also work for terms such as "c++" or ".net", where `\b` would
 * never match. Returns null for a blank term.
 */
export function termPattern(term: string): RegExp | null {
  const words = term.trim().toLowerCase().split(/\s+/).filter((word) => word.length > 0);
  if (words.length === 0) return null;
  return new RegExp(`(?<!\\w)${words.map(escapeRegExp).join("\\s+")}(?!\\w)`, "i");
}

/** True when `term` occurs in `text` as a whole word or phrase (SPEC §7). */
export function matchesTerm(text: string, term: string): boolean {
  const pattern = termPattern(term);
  return pattern !== null && pattern.test(text);
}

/** The terms of `terms` that occur in `text`, in input order. */
export function matchedTerms(text: string, terms: readonly string[]): string[] {
  return terms.filter((term) => matchesTerm(text, term));
}

// ---------------------------------------------------------------------------
// F1 location eligibility
// ---------------------------------------------------------------------------

/**
 * ISO alpha-2 country → region code used by `parseRemotiveLocation`
 * (`normalize/location.ts`: EUROPE, AMERICAS, APAC). It covers every country
 * in that module's COUNTRY_LOOKUP (a unit test guards this). The parser folds
 * "EMEA" into EUROPE, so Middle East and Africa countries map to EUROPE: a
 * user there stays eligible for EMEA jobs, at the cost of also passing F1 for
 * "Europe" jobs. A country missing here only loses the region match; worldwide
 * and country matches still apply.
 */
export const COUNTRY_REGION: Readonly<Record<string, string>> = Object.freeze({
  // Europe
  GB: "EUROPE", IE: "EUROPE", DE: "EUROPE", FR: "EUROPE", ES: "EUROPE", PT: "EUROPE",
  IT: "EUROPE", NL: "EUROPE", BE: "EUROPE", LU: "EUROPE", CH: "EUROPE", AT: "EUROPE",
  PL: "EUROPE", CZ: "EUROPE", SK: "EUROPE", HU: "EUROPE", RO: "EUROPE", BG: "EUROPE",
  GR: "EUROPE", HR: "EUROPE", RS: "EUROPE", SI: "EUROPE", UA: "EUROPE", SE: "EUROPE",
  NO: "EUROPE", DK: "EUROPE", FI: "EUROPE", IS: "EUROPE", EE: "EUROPE", LV: "EUROPE",
  LT: "EUROPE", CY: "EUROPE", MT: "EUROPE", TR: "EUROPE", AL: "EUROPE", AD: "EUROPE",
  BY: "EUROPE", BA: "EUROPE", FO: "EUROPE", GI: "EUROPE", GG: "EUROPE", VA: "EUROPE",
  IM: "EUROPE", JE: "EUROPE", XK: "EUROPE", LI: "EUROPE", MD: "EUROPE", MC: "EUROPE",
  ME: "EUROPE", MK: "EUROPE", RU: "EUROPE", SM: "EUROPE", SJ: "EUROPE", AX: "EUROPE",
  // Middle East and Africa (EMEA, folded into EUROPE by the location parser)
  IL: "EUROPE", AE: "EUROPE", SA: "EUROPE", EG: "EUROPE", ZA: "EUROPE", NG: "EUROPE",
  KE: "EUROPE", GH: "EUROPE", MA: "EUROPE",
  // Americas
  US: "AMERICAS", CA: "AMERICAS", MX: "AMERICAS", BR: "AMERICAS", AR: "AMERICAS",
  CL: "AMERICAS", CO: "AMERICAS", PE: "AMERICAS", UY: "AMERICAS", CR: "AMERICAS",
  BZ: "AMERICAS", BO: "AMERICAS", DO: "AMERICAS", EC: "AMERICAS", SV: "AMERICAS",
  GT: "AMERICAS", HT: "AMERICAS", HN: "AMERICAS", JM: "AMERICAS", PA: "AMERICAS",
  PY: "AMERICAS", PR: "AMERICAS",
  // Asia-Pacific (Oceania and the US Pacific territories included)
  IN: "APAC", PK: "APAC", BD: "APAC", LK: "APAC", NP: "APAC", CN: "APAC", HK: "APAC",
  TW: "APAC", JP: "APAC", KR: "APAC", SG: "APAC", MY: "APAC", ID: "APAC", PH: "APAC",
  TH: "APAC", VN: "APAC", AU: "APAC", NZ: "APAC", AS: "APAC", BT: "APAC", IO: "APAC",
  BN: "APAC", KH: "APAC", CX: "APAC", CC: "APAC", FJ: "APAC", PF: "APAC", GU: "APAC",
  KI: "APAC", LA: "APAC", MO: "APAC", MV: "APAC", MH: "APAC", FM: "APAC", MN: "APAC",
  MM: "APAC", NR: "APAC", NC: "APAC", NU: "APAC", NF: "APAC", MP: "APAC", PW: "APAC",
  PG: "APAC", PN: "APAC", WS: "APAC", SB: "APAC", TL: "APAC", TK: "APAC", TO: "APAC",
  TV: "APAC", UM: "APAC", VU: "APAC", WF: "APAC",
});

/** Region code of an ISO alpha-2 country, or null when unknown. */
export function regionOfCountry(country: string): string | null {
  return COUNTRY_REGION[country.trim().toUpperCase()] ?? null;
}

/**
 * F1 outcome for one job:
 * - `skipped`: the user set no country, so F1 does not apply;
 * - `eligible`: worldwide, the user's country is listed, or its region is;
 * - `uncertain`: the location text was unparseable (not worldwide, no
 *   countries, no regions); the job is kept and flagged;
 * - `ineligible`: restricted to other countries or regions.
 */
export type LocationVerdict = "skipped" | "eligible" | "uncertain" | "ineligible";

export function evaluateLocation(
  job: Pick<Job, "location">,
  country: Criteria["country"],
): LocationVerdict {
  if (country === null) return "skipped";
  const { worldwide, countries, regions } = job.location;
  if (worldwide) return "eligible";
  const userCountry = country.trim().toUpperCase();
  if (countries.some((c) => c.toUpperCase() === userCountry)) return "eligible";
  const userRegion = regionOfCountry(userCountry);
  if (userRegion !== null && regions.some((r) => r.toUpperCase() === userRegion)) return "eligible";
  if (countries.length === 0 && regions.length === 0) return "uncertain";
  return "ineligible";
}

/** True when F1 kept the job only because its location could not be parsed. */
export function isLocationUncertain(job: Pick<Job, "location">, criteria: Criteria): boolean {
  return evaluateLocation(job, criteria.country) === "uncertain";
}

function locationReason(job: Job, country: string): string | null {
  if (evaluateLocation(job, country) !== "ineligible") return null;
  const allowed = [...job.location.countries, ...job.location.regions].join(", ");
  return `Location: not open to applicants in ${country.trim().toUpperCase()} (open to ${allowed})`;
}

// ---------------------------------------------------------------------------
// F2 excluded keywords, F3 salary floor
// ---------------------------------------------------------------------------

function excludedKeywordReason(job: Job, excludedKeywords: readonly string[]): string | null {
  if (excludedKeywords.length === 0) return null;
  const hit = excludedKeywords.find((term) => matchesTerm(haystack(job), term));
  return hit === undefined ? null : `Excluded keyword: "${hit.trim()}"`;
}

function formatAmount(amount: number, currency: string): string {
  return `${Math.round(amount).toLocaleString("en-US")} ${currency}`;
}

function salaryFloorReason(job: Job, minSalary: Criteria["minSalary"]): string | null {
  if (minSalary === null || job.salary === null) return null;
  const { currency, annualMax } = job.salary;
  if (currency === null || annualMax === null) return null; // salary unknown
  const wanted = minSalary.currency.trim().toUpperCase();
  if (currency.toUpperCase() !== wanted) return null; // currency differs
  if (annualMax >= minSalary.amount) return null;
  return `Salary below minimum: up to ${formatAmount(annualMax, wanted)} a year, minimum ${formatAmount(minSalary.amount, wanted)}`;
}

// ---------------------------------------------------------------------------
// applyHardFilters
// ---------------------------------------------------------------------------

export interface ExcludedJob {
  job: Job;
  reason: string;
}

export interface HardFilterResult {
  kept: Job[];
  excluded: ExcludedJob[];
}

/** The reason the first failing filter (F1, F2, F3 in order) gives, or null. */
export function exclusionReason(job: Job, criteria: Criteria): string | null {
  return (
    (criteria.country === null ? null : locationReason(job, criteria.country)) ??
    excludedKeywordReason(job, criteria.excludedKeywords) ??
    salaryFloorReason(job, criteria.minSalary)
  );
}

/**
 * Splits `jobs` into those that pass every hard filter and those excluded,
 * each with one human-readable reason (SPEC §7.1, FR6). Input order is kept.
 * Jobs kept with an unparseable location are flagged later through
 * `MatchResult.locationUncertain` (see `isLocationUncertain`).
 */
export function applyHardFilters(jobs: readonly Job[], criteria: Criteria): HardFilterResult {
  const result: HardFilterResult = { kept: [], excluded: [] };
  for (const job of jobs) {
    const reason = exclusionReason(job, criteria);
    if (reason === null) result.kept.push(job);
    else result.excluded.push({ job, reason });
  }
  return result;
}
