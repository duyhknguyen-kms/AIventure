import { WEIGHTS } from "@/lib/config";
import { extractBenefits } from "@/lib/matching/benefits";
import type { Criteria } from "@/lib/matching/criteria";
import {
  applyHardFilters,
  haystack,
  isLocationUncertain,
  matchedTerms,
  matchesTerm,
  type ExcludedJob,
} from "@/lib/matching/filters";
import { SENIORITY_LADDER } from "@/lib/normalize/seniority";
import type { BenefitKey, DetectedBenefit, FactorResult, Job, MatchResult } from "@/lib/types";

/**
 * Scoring and ranking (SPEC §7.2 to §7.4, FR7). Pure functions: no I/O and no
 * clock, so they give the same result on the server and in the browser.
 */

type FactorKey = FactorResult["key"];

/** A factor's score (0..1) and explanation, or null when the factor is inactive. */
interface FactorOutcome {
  score: number;
  detail: string;
}

/** Factor order used in `MatchResult.factors` (SPEC §7.2 table order). */
export const FACTOR_KEYS: readonly FactorKey[] = Object.freeze([
  "skills",
  "title",
  "seniority",
  "salary",
  "employment",
  "timezone",
  "benefits",
]);

const INACTIVE_DETAIL = "Not set in your criteria";

/** Distances up to this are treated as equal, to absorb float noise. */
const EPSILON = 1e-9;

function formatAmount(amount: number): string {
  return Math.round(amount).toLocaleString("en-US");
}

function formatOffset(hours: number): string {
  const sign = hours < 0 ? "-" : "+";
  const abs = Math.abs(hours);
  const whole = Math.floor(abs);
  const minutes = Math.round((abs - whole) * 60);
  return minutes === 0 ? `UTC${sign}${whole}` : `UTC${sign}${whole}:${String(minutes).padStart(2, "0")}`;
}

function formatHours(hours: number): string {
  return `${Number(hours.toFixed(2))} h`;
}

// ---------------------------------------------------------------------------
// Factors (SPEC §7.3)
// ---------------------------------------------------------------------------

function scoreSkills(job: Job, keywords: readonly string[]): FactorOutcome | null {
  if (keywords.length === 0) return null;
  const matched = matchedTerms(haystack(job), keywords);
  const missing = keywords.filter((k) => !matched.includes(k));
  let detail = `${matched.length}/${keywords.length} skills`;
  if (matched.length > 0) detail += `: ${matched.join(", ")}`;
  if (missing.length > 0) detail += ` (missing: ${missing.join(", ")})`;
  return { score: matched.length / keywords.length, detail };
}

function tokenOverlap(title: string, target: string): number {
  const tokens = target.trim().split(/\s+/).filter((t) => t.length > 0);
  if (tokens.length === 0) return 0;
  return tokens.filter((token) => matchesTerm(title, token)).length / tokens.length;
}

function scoreTitle(job: Job, targetTitles: readonly string[]): FactorOutcome | null {
  if (targetTitles.length === 0) return null;
  const phrase = targetTitles.find((target) => matchesTerm(job.title, target));
  if (phrase !== undefined) return { score: 1, detail: `"${phrase.trim()}" found in title` };

  let best = 0;
  let bestTarget = targetTitles[0];
  for (const target of targetTitles) {
    const overlap = tokenOverlap(job.title, target);
    if (overlap > best) {
      best = overlap;
      bestTarget = target;
    }
  }
  const detail =
    best === 0
      ? `No target title words in "${job.title}"`
      : `${Math.round(best * 100)}% of the words of "${bestTarget.trim()}" in title`;
  return { score: best, detail };
}

function scoreSeniority(job: Job, wanted: Criteria["seniority"]): FactorOutcome | null {
  if (wanted.length === 0) return null;
  if (job.seniority.length === 0) return { score: 0.5, detail: "Seniority not listed" };
  const hit = job.seniority.find((level) => wanted.includes(level));
  if (hit !== undefined) return { score: 1, detail: `${hit} matches` };

  let nearest = Number.POSITIVE_INFINITY;
  for (const level of job.seniority) {
    for (const target of wanted) {
      nearest = Math.min(nearest, Math.abs(SENIORITY_LADDER.indexOf(level) - SENIORITY_LADDER.indexOf(target)));
    }
  }
  const jobLevels = job.seniority.join(", ");
  if (nearest === 1) return { score: 0.5, detail: `${jobLevels} is 1 step from ${wanted.join(", ")}` };
  return { score: 0, detail: `${jobLevels}, wanted ${wanted.join(", ")}` };
}

function scoreSalary(job: Job, minSalary: Criteria["minSalary"]): FactorOutcome | null {
  if (minSalary === null) return null;
  const currency = minSalary.currency.trim().toUpperCase();
  const floor = `${formatAmount(minSalary.amount)} ${currency}`;
  const salary = job.salary;
  if (salary === null || (salary.annualMin === null && salary.annualMax === null)) {
    return { score: 0.5, detail: "Salary not listed" };
  }
  if (salary.currency === null || salary.currency.toUpperCase() !== currency) {
    return { score: 0.5, detail: `Salary in ${salary.currency ?? "an unknown currency"}, not ${currency}` };
  }
  const { annualMin, annualMax } = salary;
  if (annualMin !== null && annualMin >= minSalary.amount) {
    return { score: 1, detail: `annualMin ${formatAmount(annualMin)} ≥ ${floor}` };
  }
  if (annualMax !== null && annualMax >= minSalary.amount) {
    const range = annualMin === null ? `up to ${formatAmount(annualMax)}` : `${formatAmount(annualMin)} to ${formatAmount(annualMax)}`;
    return { score: 0.75, detail: `${floor} is within the range ${range}` };
  }
  const top = annualMax ?? annualMin ?? 0;
  return { score: 0, detail: `Pays up to ${formatAmount(top)} ${currency}, below ${floor}` };
}

function scoreEmployment(job: Job, wanted: Criteria["employmentTypes"]): FactorOutcome | null {
  if (wanted.length === 0) return null;
  if (job.employmentType === null) return { score: 0.5, detail: "Employment type not listed" };
  if (wanted.includes(job.employmentType)) return { score: 1, detail: job.employmentType };
  return { score: 0, detail: `${job.employmentType}, wanted ${wanted.join(", ")}` };
}

function scoreTimezone(job: Job, userOffset: Criteria["timezoneOffset"]): FactorOutcome | null {
  if (userOffset === null) return null;
  const user = formatOffset(userOffset);
  if (job.timezones === null) return { score: 0.5, detail: "Time zones not listed" };
  if (job.timezones.length === 0) return { score: 1, detail: "Open to all time zones" };

  let nearest = job.timezones[0];
  for (const tz of job.timezones) {
    if (Math.abs(tz - userOffset) < Math.abs(nearest - userOffset)) nearest = tz;
  }
  const distance = Math.abs(nearest - userOffset);
  const gap = `nearest ${formatOffset(nearest)} is ${formatHours(distance)} from ${user}`;
  if (distance <= 0.5 + EPSILON) return { score: 1, detail: `Accepts ${user} (${gap})` };
  if (distance <= 2 + EPSILON) return { score: 0.5, detail: gap[0].toUpperCase() + gap.slice(1) };
  return { score: 0, detail: gap[0].toUpperCase() + gap.slice(1) };
}

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function scoreBenefits(detected: readonly DetectedBenefit[], criteria: Criteria): FactorOutcome | null {
  // A benefit listed as both must-have and nice-to-have counts once, as must-have.
  const must = unique(criteria.mustHaveBenefits);
  const nice = unique(criteria.niceToHaveBenefits).filter((key) => !must.includes(key));
  if (must.length === 0 && nice.length === 0) return null;

  const found = new Set<BenefitKey>(detected.map((b) => b.key));
  const mustFound = must.filter((key) => found.has(key));
  const niceFound = nice.filter((key) => found.has(key));
  const score = (2 * mustFound.length + niceFound.length) / (2 * must.length + nice.length);

  const parts: string[] = [];
  if (must.length > 0) parts.push(`must-have ${mustFound.length}/${must.length}${list(mustFound)}`);
  if (nice.length > 0) parts.push(`nice-to-have ${niceFound.length}/${nice.length}${list(niceFound)}`);
  const detail = parts.join(", ");
  return { score, detail: detail[0].toUpperCase() + detail.slice(1) };
}

function list(keys: readonly string[]): string {
  return keys.length === 0 ? "" : ` (${keys.join(", ")})`;
}

// ---------------------------------------------------------------------------
// scoreJob, rankJobs
// ---------------------------------------------------------------------------

function factorOutcomes(
  job: Job,
  criteria: Criteria,
  benefits: readonly DetectedBenefit[],
): Record<FactorKey, FactorOutcome | null> {
  return {
    skills: scoreSkills(job, criteria.keywords),
    title: scoreTitle(job, criteria.targetTitles),
    seniority: scoreSeniority(job, criteria.seniority),
    salary: scoreSalary(job, criteria.minSalary),
    employment: scoreEmployment(job, criteria.employmentTypes),
    timezone: scoreTimezone(job, criteria.timezoneOffset),
    benefits: scoreBenefits(benefits, criteria),
  };
}

/**
 * Weighted, renormalized percentage over the active factors (SPEC §7.3). The
 * ratio is rounded to 6 decimals first, so float noise such as 87.4999999
 * cannot flip the final integer rounding. No active factor gives 100.
 */
export function computeMatchPercent(factors: readonly FactorResult[]): number {
  const active = factors.filter((f) => f.active);
  const totalWeight = active.reduce((sum, f) => sum + f.weight, 0);
  if (active.length === 0 || totalWeight === 0) return 100;
  const points = active.reduce((sum, f) => sum + f.points, 0);
  return Math.round(Number(((100 * points) / totalWeight).toFixed(6)));
}

/** Scores one job against the criteria (SPEC §7.3, §7.4, FR7.1 to FR7.7). */
export function scoreJob(job: Job, criteria: Criteria): MatchResult {
  const benefits = extractBenefits(job);
  const outcomes = factorOutcomes(job, criteria, benefits);
  const factors: FactorResult[] = FACTOR_KEYS.map((key) => {
    const outcome = outcomes[key];
    const weight = WEIGHTS[key];
    if (outcome === null) return { key, weight, active: false, score: 0, points: 0, detail: INACTIVE_DETAIL };
    return { key, weight, active: true, score: outcome.score, points: weight * outcome.score, detail: outcome.detail };
  });
  return {
    jobId: job.id,
    matchPercent: computeMatchPercent(factors),
    factors,
    benefits,
    locationUncertain: isLocationUncertain(job, criteria),
  };
}

export type RankedJob = Job & { match: MatchResult };

export interface RankResult {
  ranked: RankedJob[];
  excluded: ExcludedJob[];
}

function publishedTime(job: Job): number {
  const time = Date.parse(job.publishedAt);
  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time;
}

/**
 * Hard filters, then a score per job, then sort by `matchPercent` desc with
 * ties broken by `publishedAt` desc (SPEC §7.4). A job with an unparseable
 * `publishedAt` sorts last among its ties; the job id breaks any remaining tie
 * so the order is deterministic.
 */
export function rankJobs(jobs: readonly Job[], criteria: Criteria): RankResult {
  const { kept, excluded } = applyHardFilters(jobs, criteria);
  const ranked = kept.map((job): RankedJob => ({ ...job, match: scoreJob(job, criteria) }));
  ranked.sort(
    (a, b) =>
      b.match.matchPercent - a.match.matchPercent ||
      publishedTime(b) - publishedTime(a) ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
  return { ranked, excluded };
}
