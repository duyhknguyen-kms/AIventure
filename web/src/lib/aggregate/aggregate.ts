import { CACHE_TTL_SECONDS } from "@/lib/config";
import { fetchHimalayas } from "@/lib/sources/himalayas";
import { fetchRemotive } from "@/lib/sources/remotive";
import type { Job, SourceName, SourceStatus } from "@/lib/types";
import { UpstreamError } from "@/lib/sources/http";
import { type CachedResult, getOrFetch } from "./cache";
import { dedupeJobs } from "./dedupe";

/**
 * Aggregation (SPEC §5.3, FR1, FR1.3, FR3, FR4, FR10): both sources in
 * parallel through the cache, partial results when one fails, local `q`
 * filtering, cross-source dedupe, newest first, expired jobs dropped.
 */

export interface AggregateResult {
  jobs: Job[];
  sources: SourceStatus[];
  fetchedAt: string;
}

/** Injectable collaborators; production uses the real adapters and clock. */
export interface AggregateDeps {
  fetchHimalayas: (q?: string) => Promise<Job[]>;
  fetchRemotive: () => Promise<Job[]>;
  now: () => number;
  ttlSeconds: number;
}

const defaultDeps: AggregateDeps = {
  fetchHimalayas: (q) => fetchHimalayas(q),
  fetchRemotive: () => fetchRemotive(),
  now: () => Date.now(),
  ttlSeconds: CACHE_TTL_SECONDS,
};

/** Cache keys (SPEC §5.5). The query part is lower-cased and whitespace-collapsed. */
export function himalayasCacheKey(q: string | undefined): string {
  return q ? `himalayas:search:${q}` : "himalayas:browse";
}
export const REMOTIVE_CACHE_KEY = "remotive:all";

/** Trims, lower-cases and collapses whitespace; empty → undefined. */
export function normalizeQuery(q: string | undefined): string | undefined {
  const text = (q ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  return text.length > 0 ? text : undefined;
}

/** True when every whitespace-separated token of `q` occurs in the job's text (SPEC §5.3 step 3). */
export function matchesQuery(job: Job, q: string): boolean {
  const text = [job.title, job.company, job.tags.join(" "), job.categories.join(" "), job.descriptionText]
    .join(" ")
    .toLowerCase();
  return q.split(" ").every((token) => text.includes(token));
}

/** True when `expiresAt` is set and in the past (SPEC §5.3 step 5). Unparseable dates are kept. */
export function isExpired(job: Job, nowMs: number): boolean {
  if (job.expiresAt === null) return false;
  const expires = Date.parse(job.expiresAt);
  return !Number.isNaN(expires) && expires < nowMs;
}

function toStatus(
  name: SourceName,
  settled: PromiseSettledResult<CachedResult<Job[]>>,
  count: number,
): SourceStatus {
  if (settled.status === "rejected") {
    // Unexpected errors were already logged in full by the cache.
    const error = settled.reason instanceof UpstreamError ? settled.reason.message : "Unexpected error";
    return { name, ok: false, count: 0, cached: false, error };
  }
  const { cached, error } = settled.value;
  return { name, ok: true, count, cached, ...(error === undefined ? {} : { error }) };
}

function sourceJobs(settled: PromiseSettledResult<CachedResult<Job[]>>): Job[] {
  return settled.status === "fulfilled" ? settled.value.value : [];
}

function byPublishedAtDesc(a: Job, b: Job): number {
  return (Date.parse(b.publishedAt) || 0) - (Date.parse(a.publishedAt) || 0);
}

/**
 * Never rejects for upstream failures: a failed source becomes
 * `{ ok: false, count: 0, error }`. A source served stale after a failed
 * refresh stays `ok: true` with `cached: true` and `error` set (it still
 * delivers jobs). `count` is the source's jobs after `q` filtering and the
 * expiry check, before dedupe.
 */
export async function aggregateJobs(
  opts: { q?: string } = {},
  deps: Partial<AggregateDeps> = {},
): Promise<AggregateResult> {
  const d = { ...defaultDeps, ...deps };
  const q = normalizeQuery(opts.q);

  const [himalayas, remotive] = await Promise.allSettled([
    getOrFetch({
      key: himalayasCacheKey(q),
      source: "himalayas",
      fetcher: () => d.fetchHimalayas(q),
      ttlSeconds: d.ttlSeconds,
      now: d.now,
    }),
    getOrFetch({
      key: REMOTIVE_CACHE_KEY, // full feed, never per query (SPEC §5.2)
      source: "remotive",
      fetcher: () => d.fetchRemotive(),
      ttlSeconds: d.ttlSeconds,
      now: d.now,
    }),
  ]);

  const nowMs = d.now();
  const keep = (job: Job) => !isExpired(job, nowMs) && (q === undefined || matchesQuery(job, q));
  const himalayasJobs = sourceJobs(himalayas).filter(keep);
  const remotiveJobs = sourceJobs(remotive).filter(keep);

  const jobs = dedupeJobs([...himalayasJobs, ...remotiveJobs]).sort(byPublishedAtDesc);

  return {
    jobs,
    sources: [
      toStatus("himalayas", himalayas, himalayasJobs.length),
      toStatus("remotive", remotive, remotiveJobs.length),
    ],
    fetchedAt: new Date(nowMs).toISOString(),
  };
}
