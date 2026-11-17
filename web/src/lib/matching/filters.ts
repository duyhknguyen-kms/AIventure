/**
 * §7.1 — Hard filters
 * All functions are pure (no I/O).
 */
import type { Job } from "@/lib/types";
import type { Criteria } from "./criteria";

// Country → region mapping (mirrors normalize/location.ts region table)
const COUNTRY_REGION: Record<string, string> = {
  // EUROPE
  AT: "EUROPE", BE: "EUROPE", BG: "EUROPE", CH: "EUROPE", CY: "EUROPE",
  CZ: "EUROPE", DE: "EUROPE", DK: "EUROPE", EE: "EUROPE", ES: "EUROPE",
  FI: "EUROPE", FR: "EUROPE", GB: "EUROPE", GR: "EUROPE", HR: "EUROPE",
  HU: "EUROPE", IE: "EUROPE", IL: "EUROPE", IT: "EUROPE", LT: "EUROPE",
  LU: "EUROPE", LV: "EUROPE", NL: "EUROPE", NO: "EUROPE", PL: "EUROPE",
  PT: "EUROPE", RO: "EUROPE", RS: "EUROPE", SE: "EUROPE", SI: "EUROPE",
  SK: "EUROPE", TR: "EUROPE", UA: "EUROPE",
  // AMERICAS
  AR: "AMERICAS", BR: "AMERICAS", CA: "AMERICAS", CL: "AMERICAS",
  CO: "AMERICAS", MX: "AMERICAS", PE: "AMERICAS", US: "AMERICAS",
  // APAC
  AU: "APAC", CN: "APAC", HK: "APAC", ID: "APAC", IN: "APAC",
  JP: "APAC", KR: "APAC", MY: "APAC", NZ: "APAC", PH: "APAC",
  SG: "APAC", TH: "APAC", TW: "APAC", VN: "APAC",
};

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Build the matching haystack for a job (§7 text helpers). */
function haystack(job: Job): string {
  return [job.title, ...job.tags, ...job.categories, job.descriptionText]
    .join(" ")
    .toLowerCase();
}

export interface FilterResult {
  kept: Job[];
  excluded: { job: Job; reason: string }[];
}

/**
 * §7.1 — Apply hard filters F1–F3.
 * Returns kept jobs and excluded jobs with reasons.
 */
export function applyHardFilters(jobs: Job[], criteria: Criteria): FilterResult {
  const kept: Job[] = [];
  const excluded: { job: Job; reason: string }[] = [];

  for (const job of jobs) {
    const reason = getExclusionReason(job, criteria);
    if (reason) {
      excluded.push({ job, reason });
    } else {
      kept.push(job);
    }
  }

  return { kept, excluded };
}

function getExclusionReason(job: Job, criteria: Criteria): string | null {
  // F1 — Location eligibility
  if (criteria.country !== null) {
    const loc = job.location;
    if (!loc.worldwide) {
      const userCountry = criteria.country.toUpperCase();
      const inCountries = loc.countries.includes(userCountry);
      const userRegion = COUNTRY_REGION[userCountry];
      const inRegions = userRegion ? loc.regions.includes(userRegion) : false;
      const unparseable = !loc.worldwide && loc.countries.length === 0 && loc.regions.length === 0;

      if (!inCountries && !inRegions && !unparseable) {
        return `Location: job restricted to ${loc.countries.join(", ") || loc.regions.join(", ")}`;
      }
    }
  }

  // F2 — Excluded keywords
  if (criteria.excludedKeywords.length > 0) {
    const h = haystack(job);
    for (const term of criteria.excludedKeywords) {
      const re = new RegExp(`\\b${escapeRegex(term.toLowerCase())}\\b`);
      if (re.test(h)) {
        return `Excluded keyword: "${term}"`;
      }
    }
  }

  // F3 — Salary floor
  if (criteria.minSalary !== null && job.salary !== null) {
    const { amount, currency } = criteria.minSalary;
    if (
      job.salary.currency === currency &&
      job.salary.annualMax !== null &&
      job.salary.annualMax < amount
    ) {
      return `Salary below floor: ${job.salary.annualMax} ${currency} < ${amount} ${currency}`;
    }
  }

  return null;
}

/**
 * Returns true when a Remotive job had an unparseable location
 * (no countries, no regions, not worldwide) — the job is kept but flagged.
 */
export function isLocationUncertain(job: Job): boolean {
  const loc = job.location;
  return (
    !loc.worldwide &&
    loc.countries.length === 0 &&
    loc.regions.length === 0 &&
    loc.raw !== null // has raw text but couldn't parse it
  );
}
