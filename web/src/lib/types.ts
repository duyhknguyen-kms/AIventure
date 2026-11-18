/**
 * Normalized data model shared by the server (source adapters, aggregation)
 * and the client (matching engine, dashboard). See SPEC.md §4.1, §7.4 and §8.
 */

export type SourceName = "himalayas" | "remotive";

export type EmploymentType =
  | "full_time"
  | "part_time"
  | "contract"
  | "temporary"
  | "internship"
  | "other";

export type Seniority = "entry" | "mid" | "senior" | "manager" | "director" | "executive";

export type SalaryPeriod = "hourly" | "weekly" | "fortnightly" | "monthly" | "annual";

export interface Salary {
  min: number | null; // in `period` units
  max: number | null;
  currency: string | null; // ISO 4217, e.g. "USD"
  period: SalaryPeriod; // default "annual"
  annualMin: number | null; // derived via annualize()
  annualMax: number | null;
  raw: string | null; // original free text (Remotive) or null
}

export interface JobLocation {
  worldwide: boolean; // true = no country restriction
  countries: string[]; // ISO 3166-1 alpha-2, upper case
  regions: string[]; // e.g. "EUROPE", "AMERICAS" (Remotive text only)
  raw: string | null; // original text (Remotive) or null
}

export interface Job {
  id: string; // `${source}:${sourceId}`
  source: SourceName;
  sourceId: string;
  title: string;
  company: string;
  companyLogo: string | null;
  applyUrl: string; // official source URL – the ONLY link used for Apply
  sourceUrl: string; // link back to the listing on the source site
  employmentType: EmploymentType | null;
  seniority: Seniority[]; // empty = unknown
  salary: Salary | null; // null = not provided / unparseable
  location: JobLocation;
  timezones: number[] | null; // UTC offsets in hours; [] = all timezones; null = unknown
  categories: string[];
  tags: string[];
  excerpt: string | null;
  descriptionHtml: string; // stored, never rendered as HTML (see SPEC §10.4)
  descriptionText: string; // stripHtml(descriptionHtml), used for matching
  publishedAt: string; // ISO 8601
  expiresAt: string | null; // ISO 8601
  alsoOn: { source: SourceName; url: string }[]; // filled by dedupe (SPEC §5.4)
}

export interface SourceStatus {
  name: SourceName;
  ok: boolean;
  count: number;
  cached: boolean;
  error?: string;
}

/**
 * Benefit categories (SPEC §6). The Zod enum in `matching/criteria.ts`
 * (Step 15) must list exactly these values.
 */
export type BenefitKey =
  | "health"
  | "retirement"
  | "equity"
  | "pto"
  | "parental_leave"
  | "learning"
  | "home_office"
  | "flexible_hours"
  | "wellness";

/** A benefit found in a job description (SPEC §8). */
export interface DetectedBenefit {
  key: BenefitKey;
  label: string; // display name
  evidence: string[]; // up to 2 snippets, ±60 chars around each match, whitespace-collapsed
}

/** One scoring factor's contribution (SPEC §7.4). */
export interface FactorResult {
  key: "skills" | "title" | "seniority" | "salary" | "employment" | "timezone" | "benefits";
  weight: number;
  active: boolean;
  score: number; // 0..1
  points: number; // weight × score (before normalization)
  detail: string; // human-readable, e.g. "3/4 skills: react, typescript, node"
}

/** Result of scoring one job against the user's criteria (SPEC §7.4). */
export interface MatchResult {
  jobId: string;
  matchPercent: number; // 0..100 integer
  factors: FactorResult[];
  benefits: DetectedBenefit[]; // from SPEC §8
  locationUncertain: boolean;
}
