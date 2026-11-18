import { CACHE_TTL_SECONDS } from "@/lib/config";
import { DEFAULT_RETRY_AFTER_SECONDS, UpstreamError } from "@/lib/sources/http";
import type { SourceName } from "@/lib/types";

/**
 * In-memory upstream cache (SPEC §5.5, FR4). Server-only and per process.
 *
 * - Entries live in a `Map` on `globalThis.__aiventureCache`, so they survive
 *   dev hot reloads.
 * - Stale-on-error: a failed refresh returns the expired entry with
 *   `cached: true` and `error` set.
 * - In-flight dedupe: concurrent calls for one key share one pending fetch.
 * - 429: the source is blocked until `Retry-After` (default 60 s) passes, and
 *   is not called again before then.
 */

export interface CacheEntry<T = unknown> {
  value: T;
  expiresAt: number; // epoch ms
  fetchedAt: number; // epoch ms
}

export interface CachedResult<T> {
  value: T;
  /** True when the value came from the cache (fresh hit or stale fallback). */
  cached: boolean;
  fetchedAt: string; // ISO 8601, when the value was fetched upstream
  /** Set when a refresh failed and stale data was returned instead. */
  error?: string;
}

declare global {
  var __aiventureCache: Map<string, CacheEntry> | undefined;
  var __aiventureInflight: Map<string, Promise<CachedResult<unknown>>> | undefined;
  var __aiventureBlockedUntil: Map<SourceName, number> | undefined;
}

function entries(): Map<string, CacheEntry> {
  return (globalThis.__aiventureCache ??= new Map());
}
function inflight(): Map<string, Promise<CachedResult<unknown>>> {
  return (globalThis.__aiventureInflight ??= new Map());
}
function blocked(): Map<SourceName, number> {
  return (globalThis.__aiventureBlockedUntil ??= new Map());
}

/** Clears entries, pending fetches and rate-limit blocks (tests, manual refresh). */
export function resetCache(): void {
  globalThis.__aiventureCache = undefined;
  globalThis.__aiventureInflight = undefined;
  globalThis.__aiventureBlockedUntil = undefined;
}

/** Returns the raw entry for `key`, fresh or stale, if any. */
export function getEntry<T>(key: string): CacheEntry<T> | undefined {
  return entries().get(key) as CacheEntry<T> | undefined;
}

export function setEntry<T>(key: string, value: T, ttlSeconds: number, nowMs: number): CacheEntry<T> {
  const entry: CacheEntry<T> = { value, fetchedAt: nowMs, expiresAt: nowMs + ttlSeconds * 1000 };
  entries().set(key, entry);
  return entry;
}

/** Epoch ms until which `source` must not be called, or null when not blocked. */
export function blockedUntil(source: SourceName, nowMs: number): number | null {
  const until = blocked().get(source);
  return until !== undefined && until > nowMs ? until : null;
}

export function blockSource(source: SourceName, retryAfterSeconds: number, nowMs: number): void {
  blocked().set(source, nowMs + retryAfterSeconds * 1000);
}

/**
 * A short, client-safe message for `SourceStatus.error`. Our own
 * `UpstreamError` messages are safe by construction; anything else is logged
 * in full on the server and reported generically.
 */
export function describeError(error: unknown): string {
  if (error instanceof UpstreamError) return error.message;
  console.error("[cache] unexpected error while fetching a source:", error);
  return "Unexpected error";
}

export interface GetOrFetchOptions<T> {
  key: string;
  source: SourceName;
  fetcher: () => Promise<T>;
  /** Defaults to `CACHE_TTL_SECONDS`. */
  ttlSeconds?: number;
  /** Clock, injectable for deterministic tests. */
  now?: () => number;
}

const toResult = <T>(entry: CacheEntry<T>, cached: boolean, error?: string): CachedResult<T> => ({
  value: entry.value,
  cached,
  fetchedAt: new Date(entry.fetchedAt).toISOString(),
  ...(error === undefined ? {} : { error }),
});

/** A stale entry with the error, or a thrown error when there is nothing stale. */
function staleOrThrow<T>(key: string, message: string, cause: unknown): CachedResult<T> {
  const stale = getEntry<T>(key);
  if (stale) {
    console.warn(`[cache] ${key}: ${message}; serving stale data from ${new Date(stale.fetchedAt).toISOString()}`);
    return toResult(stale, true, message);
  }
  if (cause instanceof Error) throw cause;
  throw new Error(message);
}

async function refresh<T>(options: GetOrFetchOptions<T>, now: () => number): Promise<CachedResult<T>> {
  const { key, source, fetcher, ttlSeconds = CACHE_TTL_SECONDS } = options;
  try {
    const value = await fetcher();
    console.info(`[cache] ${key}: fetched from upstream`);
    return toResult(setEntry(key, value, ttlSeconds, now()), false);
  } catch (error) {
    if (error instanceof UpstreamError && error.isRateLimited) {
      blockSource(source, error.retryAfterSeconds ?? DEFAULT_RETRY_AFTER_SECONDS, now());
    }
    return staleOrThrow<T>(key, describeError(error), error);
  }
}

/**
 * Returns the cached value for `key` while it is fresh; otherwise fetches it
 * once (sharing the pending fetch between concurrent callers) and caches it.
 * Throws only when the fetch fails (or the source is blocked) and no stale
 * entry exists.
 */
export async function getOrFetch<T>(options: GetOrFetchOptions<T>): Promise<CachedResult<T>> {
  const now = options.now ?? Date.now;
  const { key, source } = options;
  const t = now();

  const entry = getEntry<T>(key);
  if (entry && entry.expiresAt > t) {
    console.info(`[cache] ${key}: hit`);
    return toResult(entry, true);
  }

  const until = blockedUntil(source, t);
  if (until !== null) {
    const seconds = Math.ceil((until - t) / 1000);
    const blockedError = new UpstreamError(source, `HTTP 429 (retry after ${seconds}s)`, {
      status: 429,
      retryAfterSeconds: seconds,
    });
    return staleOrThrow<T>(key, blockedError.message, blockedError);
  }

  const pending = inflight().get(key) as Promise<CachedResult<T>> | undefined;
  if (pending) return pending;

  const promise = refresh(options, now).finally(() => inflight().delete(key));
  inflight().set(key, promise as Promise<CachedResult<unknown>>);
  return promise;
}
