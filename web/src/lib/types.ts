// §4.1 — Normalized Job model and supporting types
export type SourceName = "himalayas" | "remotive";

export type EmploymentType =
  | "full_time"
  | "part_time"
  | "contract"
  | "temporary"
  | "internship"
  | "other";

export type Seniority =
  | "entry"
  | "mid"
  | "senior"
  | "manager"
  | "director"
  | "executive";

export type SalaryPeriod =
  | "hourly"
  | "weekly"
  | "fortnightly"
  | "monthly"
  | "annual";

export interface Salary {
  min: number | null;
  max: number | null;
  currency: string | null; // ISO 4217 e.g. "USD"
  period: SalaryPeriod;    // default "annual"
  annualMin: number | null;
  annualMax: number | null;
  raw: string | null;      // original free text (Remotive) or null
}

export interface JobLocation {
  worldwide: boolean;
  countries: string[];  // ISO 3166-1 alpha-2, upper case
  regions: string[];    // e.g. "EUROPE", "AMERICAS"
  raw: string | null;   // original text (Remotive) or null
}

export interface Job {
  id: string;               // `${source}:${sourceId}`
  source: SourceName;
  sourceId: string;
  title: string;
  company: string;
  companyLogo: string | null;
  applyUrl: string;         // official source URL — only link used for Apply
  sourceUrl: string;        // link back to listing on source site
  employmentType: EmploymentType | null;
  seniority: Seniority[];   // empty = unknown
  salary: Salary | null;    // null = not provided / unparseable
  location: JobLocation;
  timezones: number[] | null; // UTC offsets in hours; [] = all; null = unknown
  categories: string[];
  tags: string[];
  excerpt: string | null;
  descriptionHtml: string;  // stored, never rendered as HTML (§10.4)
  descriptionText: string;  // stripHtml(descriptionHtml), used for matching
  publishedAt: string;      // ISO 8601
  expiresAt: string | null; // ISO 8601
  alsoOn: { source: SourceName; url: string }[]; // filled by dedupe
}

export interface SourceStatus {
  name: SourceName;
  ok: boolean;
  count: number;
  cached: boolean;
  error?: string;
}

// §7.4 — Matching output types
export type FactorKey =
  | "skills"
  | "title"
  | "seniority"
  | "salary"
  | "employment"
  | "timezone"
  | "benefits";

export interface FactorResult {
  key: FactorKey;
  weight: number;
  active: boolean;
  score: number;   // 0..1
  points: number;  // weight × score (before normalization)
  detail: string;  // human-readable, e.g. "3/4 skills: react, typescript, node"
}

export interface MatchResult {
  jobId: string;
  matchPercent: number;        // 0..100 integer
  factors: FactorResult[];
  benefits: DetectedBenefit[];
  locationUncertain: boolean;
}

// §8 — Benefit detection
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

export interface DetectedBenefit {
  key: BenefitKey;
  label: string;
  evidence: string[]; // up to 2 snippets ±60 chars around each match
}
