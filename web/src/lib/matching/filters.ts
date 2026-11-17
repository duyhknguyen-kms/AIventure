/**
 * §7.1 — Hard filters
 * All functions are pure (no I/O).
 */
import type { Job } from "@/lib/types";
import type { Criteria } from "./criteria";
import { COUNTRY_REGION } from "@/lib/normalize/countries";

// ── Text helpers ──────────────────────────────────────────────────────────

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Normalise hyphens to spaces so "on-site" and "on site" match identically.
 * Applied to both terms and haystack before regex matching.
 */
function normaliseHyphens(s: string): string {
  return s.replace(/-/g, " ");
}

/** Build the matching haystack for a job (§7 text helpers). */
export function haystack(job: Job): string {
  // Fix 1f: include company so keyword "stripe" matches company "Stripe"
  return [job.title, job.company, ...job.tags, ...job.categories, job.descriptionText]
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

      // Fix 1d: use the expanded COUNTRY_REGION from countries.ts
      const userRegion = COUNTRY_REGION[userCountry];

      // A job can match via region OR via any "sibling" region the job lists
      // (e.g. user in VN [APAC] should pass a job listing regions: ["APAC"])
      const inRegions =
        userRegion !== undefined &&
        (loc.regions.includes(userRegion) ||
          // Also match EMEA / MENA / AFRICA as EUROPE / MIDDLE_EAST / AFRICA
          loc.regions.some((r) => r === userRegion));

      const unparseable =
        !loc.worldwide &&
        loc.countries.length === 0 &&
        loc.regions.length === 0;

      if (!inCountries && !inRegions && !unparseable) {
        const restriction =
          loc.countries.length > 0
            ? loc.countries.join(", ")
            : loc.regions.join(", ");
        return `Location: job restricted to ${restriction}`;
      }
    }
  }

  // F2 — Excluded keywords
  if (criteria.excludedKeywords.length > 0) {
    // Fix 1e: normalise hyphens before matching
    const h = normaliseHyphens(haystack(job));
    for (const term of criteria.excludedKeywords) {
      const normTerm = normaliseHyphens(term.toLowerCase());
      const re = new RegExp(`\\b${escapeRegex(normTerm)}\\b`);
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
      // Fix 1c: show annualised figures so units always match
      const fmt = (n: number) =>
        n.toLocaleString("en-US", { maximumFractionDigits: 0 });
      return `Salary below floor: ${currency} ${fmt(job.salary.annualMax)}/yr (annualised) < ${currency} ${fmt(amount)}/yr`;
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
    loc.raw !== null
  );
}
