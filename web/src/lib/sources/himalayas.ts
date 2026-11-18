import { z } from "zod";
import { HIMALAYAS_MAX_PAGES } from "@/lib/config";
import { annualize } from "@/lib/matching/salary";
import { normalizeEmploymentType } from "@/lib/normalize/employment";
import { stripHtml } from "@/lib/normalize/html";
import { countryNameToAlpha2 } from "@/lib/normalize/location";
import { normalizeSeniority } from "@/lib/normalize/seniority";
import { parseUtcOffset } from "@/lib/normalize/timezone";
import type { Job, JobLocation, Salary, SalaryPeriod } from "@/lib/types";
import { UpstreamError, fetchJson, isHttpUrl, uniqueStrings } from "./http";

/**
 * Himalayas adapter (SPEC §5.1, mapping §4.2, FR1.1, FR2). Server-only: it
 * reads the optional `HIMALAYAS_API_KEY`, which is sent as a Bearer header
 * and never logged.
 */

export const HIMALAYAS_BROWSE_URL = "https://himalayas.app/jobs/api";
export const HIMALAYAS_SEARCH_URL = "https://himalayas.app/jobs/api/search";
/** Maximum (and default) page size of the browse endpoint. */
export const HIMALAYAS_PAGE_SIZE = 20;

const httpUrl = z.string().trim().refine(isHttpUrl, "must be an http(s) URL");

/**
 * `locationRestrictions` items. The 2026-11-17 recording has country NAME
 * strings ("United States", "Czechia"); the `{ alpha2 }` objects SPEC §4.2
 * describes are still accepted so either format maps.
 */
const LocationRestriction = z.union([
  z.string(),
  z.object({ alpha2: z.string().nullish(), name: z.string().nullish() }).passthrough(),
]);

/**
 * `timezoneRestrictions` items. The recording has numeric UTC offsets
 * (-3.5, 5.75, 12.75); strings ("-5", "UTC-05:00") are still parsed.
 */
const TimezoneRestriction = z.union([z.number(), z.string()]);

export const HimalayasJobSchema = z
  .object({
    guid: httpUrl,
    title: z.string().trim().min(1),
    companyName: z.string().trim().min(1),
    applicationLink: httpUrl,
    pubDate: z.number(),
    companyLogo: z.string().nullish(),
    excerpt: z.string().nullish(),
    description: z.string().nullish(),
    employmentType: z.string().nullish(),
    seniority: z.array(z.string()).nullish(),
    minSalary: z.number().nonnegative().nullish(),
    maxSalary: z.number().nonnegative().nullish(),
    currency: z.string().nullish(),
    salaryPeriod: z.string().nullish(),
    locationRestrictions: z.array(LocationRestriction).nullish(),
    timezoneRestrictions: z.array(TimezoneRestriction).nullish(),
    categories: z.array(z.string()).nullish(),
    parentCategories: z.array(z.string()).nullish(),
    expiryDate: z.number().nullish(),
  })
  .passthrough();

export type HimalayasJob = z.infer<typeof HimalayasJobSchema>;

/** Response envelope; jobs are validated one by one so a bad job is skipped, not fatal. */
export const HimalayasResponseSchema = z
  .object({
    jobs: z.array(z.unknown()),
    nextCursor: z.union([z.string(), z.number()]).nullish(),
    totalCount: z.number().nullish(),
  })
  .passthrough();

const unix = (seconds: number): string => new Date(seconds * 1000).toISOString();

/** Maps `salaryPeriod` text ("year", "month", "hourly", ...) to `SalaryPeriod`; default annual. */
export function normalizeSalaryPeriod(raw: string | null | undefined): SalaryPeriod {
  const text = typeof raw === "string" ? raw.toLowerCase() : "";
  if (/hour/.test(text)) return "hourly";
  if (/fortnight|bi-?week/.test(text)) return "fortnightly";
  if (/week/.test(text)) return "weekly";
  if (/month/.test(text)) return "monthly";
  return "annual";
}

function toSalary(job: HimalayasJob): Salary | null {
  const min = job.minSalary ?? null;
  const max = job.maxSalary ?? null;
  if (min === null && max === null) return null;
  const period = normalizeSalaryPeriod(job.salaryPeriod);
  const currency = typeof job.currency === "string" && job.currency.trim() ? job.currency.trim().toUpperCase() : null;
  return {
    min,
    max,
    currency,
    period,
    annualMin: min === null ? null : annualize(min, period),
    annualMax: max === null ? null : annualize(max, period),
    raw: null,
  };
}

type Restriction = z.infer<typeof LocationRestriction>;

function restrictionText(item: Restriction): string {
  return (typeof item === "string" ? item : (item.alpha2 ?? item.name ?? "")).trim();
}

function restrictionToAlpha2(item: Restriction): string | null {
  const text = restrictionText(item);
  if (/^[a-z]{2}$/i.test(text)) return text.toUpperCase();
  return countryNameToAlpha2(text);
}

/**
 * The `locationRestrictions` entries that map to no ISO alpha-2 code, as
 * written by the source. The adapter logs them so a new spelling is noticed.
 */
export function unmappedRestrictions(job: Pick<HimalayasJob, "locationRestrictions">): string[] {
  const names = (job.locationRestrictions ?? [])
    .filter((item) => restrictionToAlpha2(item) === null)
    .map((item) => restrictionText(item) || JSON.stringify(item));
  return uniqueStrings(names);
}

/**
 * Worldwide only when the source lists no restriction. A list whose names
 * all fail to map gives `countries: []` with `worldwide: false`, which F1
 * reports as "uncertain" (SPEC §7.1), never as open to everyone.
 */
function toLocation(job: HimalayasJob): JobLocation {
  const restrictions = job.locationRestrictions ?? [];
  const countries = restrictions
    .map(restrictionToAlpha2)
    .filter((code): code is string => code !== null);
  return { worldwide: restrictions.length === 0, countries: uniqueStrings(countries), regions: [], raw: null };
}

function toOffset(value: number | string): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= -12 && value <= 14 ? value : null;
  }
  return parseUtcOffset(value);
}

/**
 * `[]` from the source means "all time zones". If every listed value is
 * unparseable the result is `null` (unknown), so a format we cannot read is
 * never mistaken for "no restriction".
 */
function toTimezones(job: HimalayasJob): number[] | null {
  const raw = job.timezoneRestrictions ?? [];
  if (raw.length === 0) return [];
  const offsets = raw.map(toOffset).filter((n): n is number => n !== null);
  return offsets.length === 0 ? null : [...new Set(offsets)];
}

/** Maps one validated Himalayas job to the normalized `Job` (SPEC §4.2). */
export function toJob(job: HimalayasJob): Job {
  const descriptionHtml = job.description ?? "";
  const logo = typeof job.companyLogo === "string" && isHttpUrl(job.companyLogo) ? job.companyLogo : null;
  return {
    id: `himalayas:${job.guid}`,
    source: "himalayas",
    sourceId: job.guid,
    title: job.title,
    company: job.companyName,
    companyLogo: logo,
    applyUrl: job.applicationLink,
    sourceUrl: job.guid,
    employmentType: normalizeEmploymentType(job.employmentType),
    seniority: normalizeSeniority(job.seniority),
    salary: toSalary(job),
    location: toLocation(job),
    timezones: toTimezones(job),
    categories: uniqueStrings([...(job.categories ?? []), ...(job.parentCategories ?? [])]),
    tags: [],
    excerpt: job.excerpt ?? null,
    descriptionHtml,
    descriptionText: stripHtml(descriptionHtml),
    publishedAt: unix(job.pubDate),
    expiresAt: job.expiryDate == null ? null : unix(job.expiryDate),
    alsoOn: [],
  };
}

interface ParsedPage {
  jobs: Job[];
  nextCursor: string | null;
  skipped: number;
  /** Distinct `locationRestrictions` names on this page that map to no country. */
  unmappedLocations: string[];
}

/** Validates one response page; throws only when the envelope itself is wrong. */
export function parseHimalayasPage(body: unknown): ParsedPage {
  const envelope = HimalayasResponseSchema.safeParse(body);
  if (!envelope.success) {
    throw new UpstreamError("himalayas", "Unexpected response shape");
  }
  const jobs: Job[] = [];
  const unmapped: string[] = [];
  let skipped = 0;
  for (const raw of envelope.data.jobs) {
    const parsed = HimalayasJobSchema.safeParse(raw);
    if (!parsed.success) {
      skipped += 1;
      continue;
    }
    jobs.push(toJob(parsed.data));
    unmapped.push(...unmappedRestrictions(parsed.data));
  }
  const cursor = envelope.data.nextCursor;
  return {
    jobs,
    nextCursor: cursor === null || cursor === undefined || cursor === "" ? null : String(cursor),
    skipped,
    unmappedLocations: uniqueStrings(unmapped),
  };
}

export interface FetchHimalayasOptions {
  /** Page cap; defaults to `HIMALAYAS_MAX_PAGES` from the environment. */
  maxPages?: number;
  /** Bearer key; defaults to `process.env.HIMALAYAS_API_KEY`. Empty = unkeyed. */
  apiKey?: string;
}

function pageUrl(q: string | undefined, page: number, cursor: string | null): string {
  if (q) {
    const params = new URLSearchParams({ q, page: String(page) });
    return `${HIMALAYAS_SEARCH_URL}?${params.toString()}`;
  }
  const params = new URLSearchParams({ limit: String(HIMALAYAS_PAGE_SIZE) });
  if (cursor) params.set("cursor", cursor);
  return `${HIMALAYAS_BROWSE_URL}?${params.toString()}`;
}

/**
 * Fetches Himalayas jobs (SPEC §5.1). Without `q` it walks the browse
 * endpoint's opaque cursor until `nextCursor` is absent; with `q` it reads
 * search pages 1.. until a page has no jobs. Both stop at `maxPages`.
 *
 * Errors: a failure on the first page throws `UpstreamError` (429 carries
 * `retryAfterSeconds`). A failure on a later page is logged and the jobs
 * already collected are returned, so one bad page does not discard the rest.
 */
export async function fetchHimalayas(q?: string, options: FetchHimalayasOptions = {}): Promise<Job[]> {
  const query = q?.trim() || undefined;
  const maxPages = Math.max(1, options.maxPages ?? HIMALAYAS_MAX_PAGES);
  const apiKey = (options.apiKey ?? process.env.HIMALAYAS_API_KEY ?? "").trim();
  const headers: Record<string, string> = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};

  const byId = new Map<string, Job>();
  const unmappedLocations = new Set<string>();
  let cursor: string | null = null;
  let skipped = 0;

  for (let page = 1; page <= maxPages; page += 1) {
    let parsed: ParsedPage;
    try {
      parsed = parseHimalayasPage(await fetchJson("himalayas", pageUrl(query, page, cursor), headers));
    } catch (error) {
      if (page === 1) throw error;
      const message = error instanceof Error ? error.message : "Unknown error";
      console.warn(`[himalayas] page ${page} failed (${message}); returning ${byId.size} jobs from earlier pages`);
      break;
    }
    skipped += parsed.skipped;
    for (const name of parsed.unmappedLocations) unmappedLocations.add(name);
    for (const job of parsed.jobs) if (!byId.has(job.id)) byId.set(job.id, job);

    const isLastPage = query ? parsed.jobs.length === 0 && parsed.skipped === 0 : parsed.nextCursor === null;
    if (isLastPage) break;
    cursor = parsed.nextCursor;
  }

  if (skipped > 0) console.warn(`[himalayas] skipped ${skipped} invalid job(s)`);
  if (unmappedLocations.size > 0) {
    // One line per fetch, each name once, so a new upstream spelling is visible.
    console.warn(`[himalayas] unmapped location restriction(s): ${[...unmappedLocations].join("; ")}`);
  }
  return [...byId.values()];
}
