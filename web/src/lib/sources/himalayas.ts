/**
 * §5.1 — Himalayas source adapter
 * Fetches jobs from the Himalayas API, validates with Zod, and normalizes to Job[].
 */
import { z } from "zod";
import type { Job, SourceName } from "@/lib/types";
import { annualize } from "@/lib/matching/salary";
import { normalizeEmploymentType } from "@/lib/normalize/employment";
import { normalizeSeniority } from "@/lib/normalize/seniority";
import { stripHtml } from "@/lib/normalize/html";
import { countryNameToAlpha2 } from "@/lib/normalize/location";
import {
  HIMALAYAS_BROWSE_URL,
  HIMALAYAS_SEARCH_URL,
  HIMALAYAS_PAGE_SIZE,
  DEFAULT_HIMALAYAS_MAX_PAGES,
} from "@/lib/config";

// ── Zod schema ────────────────────────────────────────────────────────────
// Use .passthrough() so unknown fields don't break parsing.
// Optional fields use .nullish() so absent fields don't fail validation.

const HimalayasJobSchema = z
  .object({
    guid: z.string(),
    title: z.string(),
    companyName: z.string(),
    companyLogo: z.string().nullish(),
    applicationLink: z.string(),
    employmentType: z.string().nullish(),
    seniority: z.array(z.string()).nullish(),
    minSalary: z.number().nullish(),
    maxSalary: z.number().nullish(),
    currency: z.string().nullish(),
    salaryPeriod: z.string().nullish(),
    // Real API returns string[] of country names (not objects with alpha2)
    locationRestrictions: z.array(z.string()).nullish(),
    // Real API returns number[] of UTC offsets (not strings)
    timezoneRestrictions: z.array(z.union([z.number(), z.string()])).nullish(),
    categories: z.array(z.string()).nullish(),
    parentCategories: z.array(z.string()).nullish(),
    excerpt: z.string().nullish(),
    description: z.string().nullish(),
    pubDate: z.number(),
    expiryDate: z.number().nullish(),
  })
  .passthrough();

const HimalayasResponseSchema = z.object({
  nextCursor: z.string().nullish(),
  jobs: z.array(z.unknown()),
});

export type HimalayasApiError = {
  type: "http";
  status: number;
  retryAfter?: number;
} | {
  type: "network" | "parse";
  message: string;
};

// ── toJob ─────────────────────────────────────────────────────────────────

function toJob(raw: z.infer<typeof HimalayasJobSchema>): Job {
  const sourceId = raw.guid;
  const source: SourceName = "himalayas";

  // Salary
  const hasMin = raw.minSalary != null;
  const hasMax = raw.maxSalary != null;
  const period =
    (raw.salaryPeriod as "annual" | "monthly" | undefined) ?? "annual";
  const salary =
    hasMin || hasMax
      ? {
          min: raw.minSalary ?? null,
          max: raw.maxSalary ?? null,
          currency: raw.currency ?? null,
          period: period as import("@/lib/types").SalaryPeriod,
          annualMin: raw.minSalary != null ? annualize(raw.minSalary, period) : null,
          annualMax: raw.maxSalary != null ? annualize(raw.maxSalary, period) : null,
          raw: null,
        }
      : null;

  // Location — real API sends country name strings
  const restrictions = raw.locationRestrictions ?? [];
  const countries = restrictions
    .map((name) => countryNameToAlpha2(name))
    .filter((c): c is string => c !== null);

  const location = {
    worldwide: restrictions.length === 0,
    countries,
    regions: [],
    raw: null,
  };

  // Timezones — real API sends numbers directly
  const timezones: number[] | null =
    raw.timezoneRestrictions != null
      ? raw.timezoneRestrictions
          .map((v) => (typeof v === "number" ? v : parseFloat(String(v))))
          .filter((n) => isFinite(n))
      : null;

  // Categories (dedupe merged list)
  const categories = [
    ...(raw.categories ?? []),
    ...(raw.parentCategories ?? []),
  ].filter((v, i, a) => a.indexOf(v) === i);

  const descriptionHtml = raw.description ?? "";
  const descriptionText = stripHtml(descriptionHtml);

  return {
    id: `${source}:${sourceId}`,
    source,
    sourceId,
    title: raw.title,
    company: raw.companyName,
    companyLogo: raw.companyLogo ?? null,
    applyUrl: raw.applicationLink,
    sourceUrl: raw.guid, // guid IS the Himalayas job page URL
    employmentType: normalizeEmploymentType(raw.employmentType),
    seniority: normalizeSeniority(raw.seniority ?? []),
    salary,
    location,
    timezones,
    categories,
    tags: [],
    excerpt: raw.excerpt ?? null,
    descriptionHtml,
    descriptionText,
    publishedAt: new Date(raw.pubDate * 1000).toISOString(),
    expiresAt: raw.expiryDate != null
      ? new Date(raw.expiryDate * 1000).toISOString()
      : null,
    alsoOn: [],
  };
}

// ── Fetch helpers ─────────────────────────────────────────────────────────

function buildHeaders(): HeadersInit {
  const key = process.env.HIMALAYAS_API_KEY;
  return key ? { Authorization: `Bearer ${key}` } : {};
}

async function fetchPage(url: string): Promise<Response> {
  return fetch(url, {
    headers: buildHeaders(),
    signal: AbortSignal.timeout(10_000),
  });
}

// ── Public API ────────────────────────────────────────────────────────────

export interface FetchHimalayasResult {
  jobs: Job[];
  skipped: number;
}

/**
 * Fetch up to `maxPages` pages from Himalayas (browse or search).
 * Invalid jobs are skipped and counted, never thrown.
 * Throws HimalayasApiError on HTTP 4xx/5xx or network failure.
 */
export async function fetchHimalayas(
  q?: string,
  maxPages = DEFAULT_HIMALAYAS_MAX_PAGES,
): Promise<FetchHimalayasResult> {
  const jobs: Job[] = [];
  let skipped = 0;
  const isSearch = !!q?.trim();

  if (isSearch) {
    // Search: pages 1..maxPages, stop early when no jobs returned
    for (let page = 1; page <= maxPages; page++) {
      const url = `${HIMALAYAS_SEARCH_URL}?q=${encodeURIComponent(q!)}&page=${page}&limit=${HIMALAYAS_PAGE_SIZE}`;
      const res = await fetchPage(url);
      handleHttpError(res);

      const data = HimalayasResponseSchema.parse(await res.json());
      const { valid, invalid } = parseJobs(data.jobs);
      skipped += invalid;
      jobs.push(...valid.map(toJob));

      if (valid.length === 0) break;
    }
  } else {
    // Browse: cursor pagination, stop when no nextCursor
    let cursor: string | null | undefined = undefined;

    for (let page = 0; page < maxPages; page++) {
      const url = cursor
        ? `${HIMALAYAS_BROWSE_URL}?limit=${HIMALAYAS_PAGE_SIZE}&cursor=${encodeURIComponent(cursor)}`
        : `${HIMALAYAS_BROWSE_URL}?limit=${HIMALAYAS_PAGE_SIZE}`;

      const res = await fetchPage(url);
      handleHttpError(res);

      const data = HimalayasResponseSchema.parse(await res.json());
      const { valid, invalid } = parseJobs(data.jobs);
      skipped += invalid;
      jobs.push(...valid.map(toJob));

      if (!data.nextCursor) break;
      cursor = data.nextCursor;
    }
  }

  if (skipped > 0) {
    console.warn(`[himalayas] skipped ${skipped} invalid jobs`);
  }

  return { jobs, skipped };
}

// ── Private helpers ───────────────────────────────────────────────────────

function handleHttpError(res: Response): void {
  if (res.ok) return;
  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get("Retry-After") ?? "60", 10);
    throw { type: "http" as const, status: 429, retryAfter };
  }
  throw { type: "http" as const, status: res.status };
}

function parseJobs(
  unknowns: unknown[],
): { valid: z.infer<typeof HimalayasJobSchema>[]; invalid: number } {
  let invalid = 0;
  const valid: z.infer<typeof HimalayasJobSchema>[] = [];

  for (const item of unknowns) {
    const result = HimalayasJobSchema.safeParse(item);
    if (result.success) {
      valid.push(result.data);
    } else {
      invalid++;
    }
  }

  return { valid, invalid };
}
