import type { FactorResult } from "@/lib/types";

/**
 * Scoring weights per factor (SPEC §7.2). They sum to 100; a unit test
 * guards that invariant.
 */
export const WEIGHTS: Readonly<Record<FactorResult["key"], number>> = Object.freeze({
  skills: 30,
  title: 20,
  seniority: 10,
  salary: 15,
  employment: 5,
  timezone: 5,
  benefits: 15,
});

/** localStorage key for the user's criteria (SPEC §6). */
export const CRITERIA_STORAGE_KEY = "aiventure.criteria.v1";

export const DEFAULT_CACHE_TTL_SECONDS = 21600; // 6 h
export const DEFAULT_HIMALAYAS_MAX_PAGES = 5;

/**
 * Reads a positive integer from the environment. Missing values fall back to
 * the default silently; malformed values fall back with a warning so a typo in
 * `.env.local` is visible in the server log.
 */
export function readPositiveIntEnv(
  name: string,
  fallback: number,
  env: Record<string, string | undefined> = process.env,
): number {
  const raw = env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = Number(raw.trim());
  if (!Number.isInteger(value) || value <= 0) {
    console.warn(`[config] ${name}="${raw}" is not a positive integer; using ${fallback}.`);
    return fallback;
  }
  return value;
}

/*
 * Server-side settings (SPEC §5.6). They are read from plain (non
 * NEXT_PUBLIC_) env vars, so Next.js never inlines them into the client
 * bundle; in the browser they resolve to their defaults and are unused there.
 */

/** Lifetime of cached upstream responses, seconds. */
export const CACHE_TTL_SECONDS = readPositiveIntEnv(
  "CACHE_TTL_SECONDS",
  DEFAULT_CACHE_TTL_SECONDS,
);

/** Max Himalayas pages fetched per refresh (20 jobs/page). */
export const HIMALAYAS_MAX_PAGES = readPositiveIntEnv(
  "HIMALAYAS_MAX_PAGES",
  DEFAULT_HIMALAYAS_MAX_PAGES,
);
