/**
 * §7.3–7.4 — Scoring engine
 * All functions are pure (no I/O, no Date.now()).
 */
import type { Job, FactorResult, MatchResult } from "@/lib/types";
import type { Criteria } from "./criteria";
import { WEIGHTS } from "@/lib/config";
import { SENIORITY_LADDER } from "@/lib/normalize/seniority";
import { extractBenefits } from "./benefits";
import { applyHardFilters, isLocationUncertain } from "./filters";

// ── Text helpers ──────────────────────────────────────────────────────────

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function haystack(job: Job): string {
  return [job.title, ...job.tags, ...job.categories, job.descriptionText]
    .join(" ")
    .toLowerCase();
}

function termMatches(term: string, text: string): boolean {
  return new RegExp(`\\b${escapeRegex(term.toLowerCase())}\\b`).test(text);
}

// ── Factor scorers ────────────────────────────────────────────────────────

function scoreSkills(job: Job, criteria: Criteria): FactorResult {
  const h = haystack(job);
  const matched = criteria.keywords.filter((kw) => termMatches(kw, h));
  const score = criteria.keywords.length > 0
    ? matched.length / criteria.keywords.length
    : 1;

  return {
    key: "skills",
    weight: WEIGHTS.skills,
    active: criteria.keywords.length > 0,
    score,
    points: WEIGHTS.skills * score,
    detail: criteria.keywords.length > 0
      ? `${matched.length}/${criteria.keywords.length} skills: ${matched.join(", ") || "none"}`
      : "no keywords set",
  };
}

function scoreTitle(job: Job, criteria: Criteria): FactorResult {
  if (criteria.targetTitles.length === 0) {
    return { key: "title", weight: WEIGHTS.title, active: false, score: 0, points: 0, detail: "no target titles" };
  }

  const jobTitle = job.title.toLowerCase();
  let score = 0;
  let detail = "";

  // 1 if any full phrase found in title
  for (const target of criteria.targetTitles) {
    if (jobTitle.includes(target.toLowerCase())) {
      score = 1;
      detail = `"${target}" found in title`;
      break;
    }
  }

  // Otherwise best token overlap
  if (score < 1) {
    let best = 0;
    let bestTarget = "";
    for (const target of criteria.targetTitles) {
      const tokens = target.toLowerCase().split(/\s+/).filter(Boolean);
      const found = tokens.filter((t) => jobTitle.includes(t)).length;
      const overlap = found / tokens.length;
      if (overlap > best) {
        best = overlap;
        bestTarget = target;
      }
    }
    score = best;
    detail = `best token overlap ${Math.round(best * 100)}% for "${bestTarget}"`;
  }

  return {
    key: "title",
    weight: WEIGHTS.title,
    active: true,
    score,
    points: WEIGHTS.title * score,
    detail,
  };
}

function scoreSeniority(job: Job, criteria: Criteria): FactorResult {
  if (criteria.seniority.length === 0) {
    return { key: "seniority", weight: WEIGHTS.seniority, active: false, score: 0, points: 0, detail: "no seniority set" };
  }

  // Unknown job seniority → 0.5
  if (job.seniority.length === 0) {
    return {
      key: "seniority", weight: WEIGHTS.seniority, active: true,
      score: 0.5, points: WEIGHTS.seniority * 0.5, detail: "job seniority unknown",
    };
  }

  // Exact match
  const intersects = job.seniority.some((s) => criteria.seniority.includes(s));
  if (intersects) {
    return {
      key: "seniority", weight: WEIGHTS.seniority, active: true,
      score: 1, points: WEIGHTS.seniority, detail: "seniority matches",
    };
  }

  // Proximity on the ladder — min distance between any pair
  let minDist = Infinity;
  for (const jobLevel of job.seniority) {
    for (const criLevel of criteria.seniority) {
      const dist = Math.abs(SENIORITY_LADDER.indexOf(jobLevel) - SENIORITY_LADDER.indexOf(criLevel));
      if (dist < minDist) minDist = dist;
    }
  }

  const score = minDist === 1 ? 0.5 : 0;
  return {
    key: "seniority", weight: WEIGHTS.seniority, active: true,
    score, points: WEIGHTS.seniority * score,
    detail: minDist === 1 ? "1 level away" : `${minDist} levels away`,
  };
}

function scoreSalary(job: Job, criteria: Criteria): FactorResult {
  if (criteria.minSalary === null) {
    return { key: "salary", weight: WEIGHTS.salary, active: false, score: 0, points: 0, detail: "no salary requirement" };
  }

  const { amount, currency } = criteria.minSalary;

  // Unknown salary or currency mismatch → 0.5
  if (!job.salary || job.salary.currency !== currency) {
    const reason = !job.salary ? "salary unknown" : "currency differs";
    return {
      key: "salary", weight: WEIGHTS.salary, active: true,
      score: 0.5, points: WEIGHTS.salary * 0.5, detail: reason,
    };
  }

  const { annualMin, annualMax } = job.salary;

  if (annualMin !== null && annualMin >= amount) {
    return {
      key: "salary", weight: WEIGHTS.salary, active: true,
      score: 1, points: WEIGHTS.salary,
      detail: `annualMin ${annualMin} ≥ ${amount} ${currency}`,
    };
  }

  // annualMin < amount ≤ annualMax, or only annualMax known and ≥ amount
  if (
    (annualMax !== null && annualMax >= amount && (annualMin === null || annualMin < amount)) ||
    (annualMin === null && annualMax !== null && annualMax >= amount)
  ) {
    return {
      key: "salary", weight: WEIGHTS.salary, active: true,
      score: 0.75, points: WEIGHTS.salary * 0.75,
      detail: `range straddles floor (annualMax ${annualMax} ≥ ${amount} ${currency})`,
    };
  }

  return {
    key: "salary", weight: WEIGHTS.salary, active: true,
    score: 0, points: 0,
    detail: `annualMax ${annualMax} < ${amount} ${currency}`,
  };
}

function scoreEmployment(job: Job, criteria: Criteria): FactorResult {
  if (criteria.employmentTypes.length === 0) {
    return { key: "employment", weight: WEIGHTS.employment, active: false, score: 0, points: 0, detail: "no employment type set" };
  }

  if (job.employmentType === null) {
    return {
      key: "employment", weight: WEIGHTS.employment, active: true,
      score: 0.5, points: WEIGHTS.employment * 0.5, detail: "employment type unknown",
    };
  }

  const matches = criteria.employmentTypes.includes(job.employmentType);
  return {
    key: "employment", weight: WEIGHTS.employment, active: true,
    score: matches ? 1 : 0, points: matches ? WEIGHTS.employment : 0,
    detail: matches ? job.employmentType : `${job.employmentType} not in list`,
  };
}

function scoreTimezone(job: Job, criteria: Criteria): FactorResult {
  if (criteria.timezoneOffset === null) {
    return { key: "timezone", weight: WEIGHTS.timezone, active: false, score: 0, points: 0, detail: "no timezone set" };
  }

  const userOffset = criteria.timezoneOffset;

  // All timezones
  if (Array.isArray(job.timezones) && job.timezones.length === 0) {
    return {
      key: "timezone", weight: WEIGHTS.timezone, active: true,
      score: 1, points: WEIGHTS.timezone, detail: "all timezones accepted",
    };
  }

  // Unknown timezones
  if (job.timezones === null) {
    return {
      key: "timezone", weight: WEIGHTS.timezone, active: true,
      score: 0.5, points: WEIGHTS.timezone * 0.5, detail: "timezone unknown",
    };
  }

  // Find minimum distance
  const minDist = Math.min(...job.timezones.map((tz) => Math.abs(tz - userOffset)));

  if (minDist <= 0.5) {
    return {
      key: "timezone", weight: WEIGHTS.timezone, active: true,
      score: 1, points: WEIGHTS.timezone,
      detail: `within 0.5 h (nearest ${job.timezones.find((tz) => Math.abs(tz - userOffset) === minDist)})`,
    };
  }

  if (minDist <= 2) {
    return {
      key: "timezone", weight: WEIGHTS.timezone, active: true,
      score: 0.5, points: WEIGHTS.timezone * 0.5,
      detail: `nearest offset is ${minDist} h away`,
    };
  }

  return {
    key: "timezone", weight: WEIGHTS.timezone, active: true,
    score: 0, points: 0,
    detail: `nearest offset is ${minDist} h away`,
  };
}

function scoreBenefits(job: Job, criteria: Criteria, detected: ReturnType<typeof extractBenefits>): FactorResult {
  const { mustHaveBenefits: must, niceToHaveBenefits: nice } = criteria;
  const active = must.length > 0 || nice.length > 0;

  if (!active) {
    return { key: "benefits", weight: WEIGHTS.benefits, active: false, score: 0, points: 0, detail: "no benefits required" };
  }

  const detectedKeys = new Set(detected.map((b) => b.key));
  const mustFound = must.filter((k) => detectedKeys.has(k)).length;
  const niceFound = nice.filter((k) => detectedKeys.has(k)).length;
  const mustTotal = must.length;
  const niceTotal = nice.length;

  const score = (2 * mustFound + niceFound) / (2 * mustTotal + niceTotal);

  return {
    key: "benefits", weight: WEIGHTS.benefits, active: true,
    score, points: WEIGHTS.benefits * score,
    detail: `must ${mustFound}/${mustTotal}, nice ${niceFound}/${niceTotal}`,
  };
}

// ── Main scoring ──────────────────────────────────────────────────────────

export function scoreJob(job: Job, criteria: Criteria): MatchResult {
  const detected = extractBenefits(job);

  const factors: FactorResult[] = [
    scoreSkills(job, criteria),
    scoreTitle(job, criteria),
    scoreSeniority(job, criteria),
    scoreSalary(job, criteria),
    scoreEmployment(job, criteria),
    scoreTimezone(job, criteria),
    scoreBenefits(job, criteria, detected),
  ];

  const activeFactors = factors.filter((f) => f.active);

  let matchPercent: number;
  if (activeFactors.length === 0) {
    matchPercent = 100;
  } else {
    const totalWeight = activeFactors.reduce((s, f) => s + f.weight, 0);
    const totalPoints = activeFactors.reduce((s, f) => s + f.points, 0);
    matchPercent = Math.round((100 * totalPoints) / totalWeight);
  }

  return {
    jobId: job.id,
    matchPercent,
    factors,
    benefits: detected,
    locationUncertain: isLocationUncertain(job),
  };
}

export function rankJobs(
  jobs: Job[],
  criteria: Criteria,
): { ranked: (Job & { match: MatchResult })[]; excluded: { job: Job; reason: string }[] } {
  const { kept, excluded } = applyHardFilters(jobs, criteria);

  const ranked = kept
    .map((job) => ({ ...job, match: scoreJob(job, criteria) }))
    .sort((a, b) => {
      const diff = b.match.matchPercent - a.match.matchPercent;
      if (diff !== 0) return diff;
      // Tie-break by publishedAt descending
      return b.publishedAt.localeCompare(a.publishedAt);
    });

  return { ranked, excluded };
}
