/**
 * §5.3 — Aggregation layer
 *
 * Runs both source fetches in parallel (Promise.allSettled), deduplicates,
 * drops expired jobs, and sorts by publishedAt descending.
 * Each source is wrapped in the TTL cache (§5.5).
 */
import type { Job, SourceName, SourceStatus } from "@/lib/types";
import { fetchHimalayas } from "@/lib/sources/himalayas";
import { fetchRemotive } from "@/lib/sources/remotive";
import { dedupeJobs } from "./dedupe";
import {
  getOrFetch,
  getStale,
  isBlocked,
  setBlocked,
} from "./cache";
import { DEFAULT_HIMALAYAS_MAX_PAGES } from "@/lib/config";

const TTL = Number(process.env.CACHE_TTL_SECONDS) || undefined; // undefined → config default

function himlayasKey(q?: string) {
  return q ? `himalayas:search:${q}` : "himalayas:browse";
}

/** Local filter: every q-token must appear in title/company/tags/categories/descriptionText */
function matchesQuery(job: Job, q: string): boolean {
  const haystack = [
    job.title,
    job.company,
    ...job.tags,
    ...job.categories,
    job.descriptionText,
  ]
    .join(" ")
    .toLowerCase();

  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => haystack.includes(token));
}

export interface AggregateResult {
  jobs: Job[];
  sources: SourceStatus[];
  fetchedAt: string;
}

export async function aggregateJobs(opts: { q?: string } = {}): Promise<AggregateResult> {
  const { q } = opts;
  const maxPages = Number(process.env.HIMALAYAS_MAX_PAGES) || DEFAULT_HIMALAYAS_MAX_PAGES;
  const himKey = himlayasKey(q);

  // ── Fetch both sources in parallel ──────────────────────────────────────
  const [himResult, remotiveResult] = await Promise.allSettled([
    fetchWithCache(himKey, () => fetchHimalayas(q, maxPages)),
    fetchWithCache("remotive:all", () => fetchRemotive()),
  ]);

  // ── Build SourceStatus for each ──────────────────────────────────────────
  const sources: SourceStatus[] = [];
  let allJobs: Job[] = [];
  let fetchedAt = new Date().toISOString();

  // Himalayas
  if (himResult.status === "fulfilled") {
    const { jobs, fetchedAt: fa, cached } = himResult.value;
    allJobs.push(...jobs);
    fetchedAt = fa;
    sources.push({ name: "himalayas", ok: true, count: jobs.length, cached });
  } else {
    const error = formatError(himResult.reason);
    // Try stale fallback
    const stale = getStale<{ jobs: Job[] }>(himKey);
    if (stale) {
      allJobs.push(...stale.value.jobs);
      sources.push({ name: "himalayas", ok: false, count: stale.value.jobs.length, cached: true, error });
    } else {
      sources.push({ name: "himalayas", ok: false, count: 0, cached: false, error });
    }
  }

  // Remotive
  if (remotiveResult.status === "fulfilled") {
    const { jobs, fetchedAt: fa, cached } = remotiveResult.value;
    allJobs.push(...jobs);
    if (!fetchedAt || fa > fetchedAt) fetchedAt = fa;
    sources.push({ name: "remotive", ok: true, count: jobs.length, cached });
  } else {
    const error = formatError(remotiveResult.reason);
    const stale = getStale<{ jobs: Job[] }>("remotive:all");
    if (stale) {
      allJobs.push(...stale.value.jobs);
      sources.push({ name: "remotive", ok: false, count: stale.value.jobs.length, cached: true, error });
    } else {
      sources.push({ name: "remotive", ok: false, count: 0, cached: false, error });
    }
  }

  // ── Local q-filter on Remotive + safety net on all ──────────────────────
  if (q) {
    allJobs = allJobs.filter((job) => matchesQuery(job, q));
  }

  // ── Dedupe, drop expired, sort ───────────────────────────────────────────
  const now = new Date().toISOString();
  const deduped = dedupeJobs(allJobs).filter(
    (j) => !j.expiresAt || j.expiresAt > now,
  );
  deduped.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  return { jobs: deduped, sources, fetchedAt };
}

// ── Cache wrapper ─────────────────────────────────────────────────────────

async function fetchWithCache(
  key: string,
  fetcher: () => Promise<{ jobs: Job[]; skipped: number }>,
): Promise<{ jobs: Job[]; fetchedAt: string; cached: boolean }> {
  if (isBlocked(key)) {
    throw new Error(`Source blocked (rate limited): ${key}`);
  }

  try {
    const result = await getOrFetch(key, fetcher, TTL);
    return {
      jobs: result.value.jobs,
      fetchedAt: result.fetchedAt,
      cached: result.fresh,
    };
  } catch (err) {
    // Handle 429 — record block time and re-throw
    type ApiErr = { type: string; status?: number; retryAfter?: number };
    const e = err as ApiErr;
    if (err && typeof err === "object" && "type" in err && e.type === "http" && e.status === 429) {
      setBlocked(key, e.retryAfter ?? 60);
    }
    throw err;
  }
}

function formatError(reason: unknown): string {
  if (!reason || typeof reason !== "object") return String(reason);
  const r = reason as Record<string, unknown>;
  if (r.type === "http") {
    const msg = `HTTP ${r.status}`;
    return r.retryAfter ? `${msg} (retry after ${r.retryAfter}s)` : msg;
  }
  if (typeof r.message === "string") return r.message;
  return "Unknown error";
}
