/**
 * §5.2 — Remotive source adapter
 * Fetches the full public feed once per cache window and normalizes to Job[].
 * Never passes `search` upstream — q-filtering is applied locally by the aggregator.
 */
import { z } from "zod";
import type { Job, SourceName } from "@/lib/types";
import { parseSalaryText } from "@/lib/matching/salary";
import { normalizeEmploymentType } from "@/lib/normalize/employment";
import { inferSeniorityFromTitle } from "@/lib/normalize/seniority";
import { stripHtml } from "@/lib/normalize/html";
import { parseRemotiveLocation } from "@/lib/normalize/location";
import { REMOTIVE_URL } from "@/lib/config";

// ── Zod schema ────────────────────────────────────────────────────────────

const RemotiveJobSchema = z
  .object({
    id: z.number(),
    url: z.string(),
    title: z.string(),
    company_name: z.string(),
    company_logo: z.string().nullish(),
    company_logo_url: z.string().nullish(),
    category: z.string().nullish(),
    tags: z.array(z.string()).nullish(),
    job_type: z.string().nullish(),
    publication_date: z.string(),          // ISO without TZ offset, e.g. "2026-11-14T20:33:53"
    candidate_required_location: z.string().nullish(),
    salary: z.string().nullish(),           // free text
    description: z.string().nullish(),
  })
  .passthrough();

const RemotiveResponseSchema = z.object({
  "job-count": z.number().nullish(),
  "total-job-count": z.number().nullish(),
  jobs: z.array(z.unknown()),
});

// ── toJob ─────────────────────────────────────────────────────────────────

function toJob(raw: z.infer<typeof RemotiveJobSchema>): Job {
  const source: SourceName = "remotive";
  const sourceId = String(raw.id);

  const descriptionHtml = raw.description ?? "";
  const descriptionText = stripHtml(descriptionHtml);

  // Salary: free-text parsed
  const salary = parseSalaryText(raw.salary);

  // Location: free-text parsed
  const location = parseRemotiveLocation(raw.candidate_required_location);

  // publication_date has no TZ offset — treat as UTC
  const publishedAt = new Date(raw.publication_date + "Z").toISOString();

  return {
    id: `${source}:${sourceId}`,
    source,
    sourceId,
    title: raw.title,
    company: raw.company_name,
    companyLogo: raw.company_logo_url ?? raw.company_logo ?? null,
    applyUrl: raw.url,
    sourceUrl: raw.url,
    employmentType: normalizeEmploymentType(raw.job_type),
    seniority: inferSeniorityFromTitle(raw.title),
    salary,
    location,
    timezones: null,                        // Remotive doesn't provide timezone data
    categories: raw.category ? [raw.category] : [],
    tags: raw.tags ?? [],
    excerpt: null,
    descriptionHtml,
    descriptionText,
    publishedAt,
    expiresAt: null,
    alsoOn: [],
  };
}

// ── Public API ────────────────────────────────────────────────────────────

export interface FetchRemotiveResult {
  jobs: Job[];
  skipped: number;
}

/**
 * Fetch the full Remotive public feed.
 * Invalid jobs are skipped and counted, never thrown.
 * Throws on HTTP 4xx/5xx or network failure.
 */
export async function fetchRemotive(): Promise<FetchRemotiveResult> {
  const res = await fetch(REMOTIVE_URL, {
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    throw { type: "http" as const, status: res.status };
  }

  const data = RemotiveResponseSchema.parse(await res.json());

  let skipped = 0;
  const jobs: Job[] = [];

  for (const item of data.jobs) {
    const result = RemotiveJobSchema.safeParse(item);
    if (result.success) {
      jobs.push(toJob(result.data));
    } else {
      skipped++;
    }
  }

  if (skipped > 0) {
    console.warn(`[remotive] skipped ${skipped} invalid jobs`);
  }

  return { jobs, skipped };
}
