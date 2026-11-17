/**
 * §5.5 — In-memory TTL cache
 *
 * Stored on `globalThis.__aiventureCache` so it survives Next.js dev hot-reloads.
 * In-flight dedupe: concurrent requests for the same key share one pending promise.
 * Stale-on-error: a failed refresh returns the stale value with cached=true + error set.
 * 429 handling: blockedUntil per source key prevents tight retry loops.
 */
import { DEFAULT_CACHE_TTL_SECONDS } from "@/lib/config";

interface CacheEntry<T> {
  value: T;
  expiresAt: number;   // ms since epoch
  fetchedAt: string;   // ISO string shown in API response
}

interface CacheStore {
  entries: Map<string, CacheEntry<unknown>>;
  inflight: Map<string, Promise<unknown>>;
  blockedUntil: Map<string, number>; // key → ms since epoch
}

declare global {
  // eslint-disable-next-line no-var
  var __aiventureCache: CacheStore | undefined;
}

function getStore(): CacheStore {
  if (!globalThis.__aiventureCache) {
    globalThis.__aiventureCache = {
      entries: new Map(),
      inflight: new Map(),
      blockedUntil: new Map(),
    };
  }
  return globalThis.__aiventureCache;
}

/** True if the key is currently rate-limited (Retry-After not yet elapsed). */
export function isBlocked(key: string): boolean {
  const until = getStore().blockedUntil.get(key);
  return until !== undefined && Date.now() < until;
}

/** Record a 429 block for `key` lasting `retryAfterSeconds`. */
export function setBlocked(key: string, retryAfterSeconds = 60): void {
  getStore().blockedUntil.set(key, Date.now() + retryAfterSeconds * 1000);
}

/** Return the stale cached value for `key` if one exists, regardless of TTL. */
export function getStale<T>(key: string): CacheEntry<T> | undefined {
  return getStore().entries.get(key) as CacheEntry<T> | undefined;
}

/**
 * Get a fresh (non-expired) cached value, or call `fetcher()` to populate it.
 * Concurrent callers for the same key share the same in-flight promise.
 *
 * @returns `{ value, fetchedAt, fresh: true }` on cache hit,
 *          `{ value, fetchedAt, fresh: false }` after a successful fetch.
 * @throws  whatever `fetcher` throws (caller decides whether to use stale).
 */
export async function getOrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds = DEFAULT_CACHE_TTL_SECONDS,
): Promise<{ value: T; fetchedAt: string; fresh: boolean }> {
  const store = getStore();
  const existing = store.entries.get(key) as CacheEntry<T> | undefined;

  // Cache hit (non-expired)
  if (existing && Date.now() < existing.expiresAt) {
    return { value: existing.value, fetchedAt: existing.fetchedAt, fresh: true };
  }

  // In-flight dedupe: reuse a pending fetch for the same key
  if (store.inflight.has(key)) {
    const value = (await store.inflight.get(key)) as T;
    const entry = store.entries.get(key) as CacheEntry<T>;
    return { value, fetchedAt: entry?.fetchedAt ?? new Date().toISOString(), fresh: true };
  }

  // Start a new fetch
  const promise = fetcher();
  store.inflight.set(key, promise as Promise<unknown>);

  try {
    const value = await promise;
    const fetchedAt = new Date().toISOString();
    store.entries.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
      fetchedAt,
    });
    return { value, fetchedAt, fresh: false };
  } finally {
    store.inflight.delete(key);
  }
}

/** Remove all entries (useful in tests). */
export function clearCache(): void {
  const store = getStore();
  store.entries.clear();
  store.inflight.clear();
  store.blockedUntil.clear();
}
