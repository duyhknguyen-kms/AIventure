import type { Job, MatchResult, SourceStatus } from "@/lib/types";

/** A valid normalized job (shape of SPEC §9's example); override only what a test needs. */
export function makeJob(overrides: Partial<Job> = {}): Job {
  const source = overrides.source ?? "himalayas";
  const sourceId = overrides.sourceId ?? "https://himalayas.app/companies/acme/jobs/senior-frontend-engineer";
  return {
    id: `${source}:${sourceId}`,
    source,
    sourceId,
    title: "Senior Frontend Engineer",
    company: "Acme",
    companyLogo: "https://cdn.himalayas.app/acme.png",
    applyUrl: `${sourceId}/apply`,
    sourceUrl: sourceId,
    employmentType: "full_time",
    seniority: ["senior"],
    salary: {
      min: 120000,
      max: 150000,
      currency: "USD",
      period: "annual",
      annualMin: 120000,
      annualMax: 150000,
      raw: null,
    },
    location: { worldwide: true, countries: [], regions: [], raw: null },
    timezones: [3, 4, 5, 6],
    categories: ["Engineering"],
    tags: ["react"],
    excerpt: "Build our React design system.",
    descriptionHtml: "<p>React, TypeScript. Health insurance and paid time off.</p>",
    descriptionText: "React, TypeScript. Health insurance and paid time off.",
    publishedAt: "2026-11-16T08:00:00.000Z",
    expiresAt: null,
    alsoOn: [],
    ...overrides,
  };
}

export function makeMatch(job: Job, overrides: Partial<MatchResult> = {}): MatchResult {
  return {
    jobId: job.id,
    matchPercent: 88,
    factors: [],
    benefits: [
      { key: "health", label: "Health / Medical", evidence: ["Health insurance"] },
      { key: "pto", label: "Paid time off", evidence: ["paid time off"] },
    ],
    locationUncertain: false,
    ...overrides,
  };
}

/** Both sources healthy unless overridden (SPEC §9 `sources` entries). */
export function makeSources(overrides: Partial<Record<SourceStatus["name"], Partial<SourceStatus>>> = {}): SourceStatus[] {
  return [
    { name: "himalayas", ok: true, count: 1, cached: false, ...overrides.himalayas },
    { name: "remotive", ok: true, count: 0, cached: false, ...overrides.remotive },
  ];
}
