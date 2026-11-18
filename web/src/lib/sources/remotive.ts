import { z } from "zod";
import { parseSalaryText } from "@/lib/matching/salary";
import { normalizeEmploymentType } from "@/lib/normalize/employment";
import { stripHtml } from "@/lib/normalize/html";
import { parseRemotiveLocation } from "@/lib/normalize/location";
import { inferSeniorityFromTitle } from "@/lib/normalize/seniority";
import type { Job } from "@/lib/types";
import { UpstreamError, fetchJson, isHttpUrl } from "./http";

/**
 * Remotive adapter (SPEC §5.2, mapping §4.2, FR1.2, FR2).
 *
 * Remotive asks for at most 4 requests per day, so the full feed is fetched
 * once per cache window without `search` or `limit`; queries are applied
 * locally by the aggregator (SPEC §5.3).
 */

export const REMOTIVE_URL = "https://remotive.com/api/remote-jobs";

const HAS_OFFSET = /(?:z|[+-]\d{2}:?\d{2})$/i;

/**
 * `publication_date` has no offset (e.g. `2026-11-14T20:33:53`) and is UTC
 * (SPEC §4.2). A value that already carries an offset is used as is.
 * Returns null when the value is not a date.
 */
export function remotiveDateToIso(value: string): string | null {
  const text = value.trim();
  if (text.length === 0) return null;
  const time = Date.parse(HAS_OFFSET.test(text) ? text : `${text}Z`);
  return Number.isNaN(time) ? null : new Date(time).toISOString();
}

export const RemotiveJobSchema = z
  .object({
    id: z.union([z.number().int(), z.string().trim().min(1)]),
    url: z.string().trim().refine(isHttpUrl, "must be an http(s) URL"),
    title: z.string().trim().min(1),
    company_name: z.string().trim().min(1),
    publication_date: z.string().refine((v) => remotiveDateToIso(v) !== null, "must be a date"),
    company_logo: z.string().nullish(),
    category: z.string().nullish(),
    tags: z.array(z.string()).nullish(),
    job_type: z.string().nullish(),
    candidate_required_location: z.string().nullish(),
    salary: z.string().nullish(),
    description: z.string().nullish(),
  })
  .passthrough();

export type RemotiveJob = z.infer<typeof RemotiveJobSchema>;

/** Response envelope; jobs are validated one by one so a bad job is skipped, not fatal. */
export const RemotiveResponseSchema = z
  .object({
    jobs: z.array(z.unknown()),
    "job-count": z.number().nullish(),
    "total-job-count": z.number().nullish(),
  })
  .passthrough();

/** Maps one validated Remotive job to the normalized `Job` (SPEC §4.2). */
export function toJob(job: RemotiveJob): Job {
  const sourceId = String(job.id);
  const descriptionHtml = job.description ?? "";
  const logo = typeof job.company_logo === "string" && isHttpUrl(job.company_logo) ? job.company_logo : null;
  const category = job.category?.trim();
  return {
    id: `remotive:${sourceId}`,
    source: "remotive",
    sourceId,
    title: job.title,
    company: job.company_name,
    companyLogo: logo,
    applyUrl: job.url,
    sourceUrl: job.url,
    employmentType: normalizeEmploymentType(job.job_type),
    seniority: inferSeniorityFromTitle(job.title),
    salary: parseSalaryText(job.salary),
    location: parseRemotiveLocation(job.candidate_required_location),
    timezones: null,
    categories: category ? [category] : [],
    tags: job.tags ?? [],
    excerpt: null,
    descriptionHtml,
    descriptionText: stripHtml(descriptionHtml),
    // Validated by the schema refinement, so this is never null here.
    publishedAt: remotiveDateToIso(job.publication_date) ?? new Date(0).toISOString(),
    expiresAt: null,
    alsoOn: [],
  };
}

/** Validates a response body; throws only when the envelope itself is wrong. */
export function parseRemotiveResponse(body: unknown): { jobs: Job[]; skipped: number } {
  const envelope = RemotiveResponseSchema.safeParse(body);
  if (!envelope.success) {
    throw new UpstreamError("remotive", "Unexpected response shape");
  }
  const jobs: Job[] = [];
  const seen = new Set<string>();
  let skipped = 0;
  for (const raw of envelope.data.jobs) {
    const parsed = RemotiveJobSchema.safeParse(raw);
    if (!parsed.success) {
      skipped += 1;
      continue;
    }
    const job = toJob(parsed.data);
    if (!seen.has(job.id)) {
      seen.add(job.id);
      jobs.push(job);
    }
  }
  return { jobs, skipped };
}

/**
 * Fetches the full Remotive feed with one request (SPEC §5.2). Throws
 * `UpstreamError` on network, HTTP (429 carries `retryAfterSeconds`) or
 * envelope errors; invalid jobs are skipped and counted in a log line.
 */
export async function fetchRemotive(): Promise<Job[]> {
  const { jobs, skipped } = parseRemotiveResponse(await fetchJson("remotive", REMOTIVE_URL));
  if (skipped > 0) console.warn(`[remotive] skipped ${skipped} invalid job(s)`);
  return jobs;
}
