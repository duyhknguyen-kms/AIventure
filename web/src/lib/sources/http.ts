import type { SourceName } from "@/lib/types";

/**
 * Shared upstream HTTP helper for the source adapters (SPEC §5.1, §5.2, §5.5).
 * Server-only: it may receive an `Authorization` header, which it never logs
 * and never puts into an error message.
 */

/** Upstream request timeout (SPEC §5.5). */
export const UPSTREAM_TIMEOUT_MS = 10_000;

/** Wait used when a 429 response has no usable `Retry-After` header (SPEC §5.5). */
export const DEFAULT_RETRY_AFTER_SECONDS = 60;

/**
 * An upstream failure with a short, client-safe message such as
 * `"HTTP 429 (retry after 60s)"`. `status` is the HTTP status, or null for
 * network errors, timeouts and unreadable bodies. `retryAfterSeconds` is set
 * only for 429 responses.
 */
export class UpstreamError extends Error {
  readonly source: SourceName;
  readonly status: number | null;
  readonly retryAfterSeconds: number | null;

  constructor(
    source: SourceName,
    message: string,
    options: { status?: number | null; retryAfterSeconds?: number | null; cause?: unknown } = {},
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "UpstreamError";
    this.source = source;
    this.status = options.status ?? null;
    this.retryAfterSeconds = options.retryAfterSeconds ?? null;
  }

  get isRateLimited(): boolean {
    return this.status === 429;
  }
}

/**
 * Parses a `Retry-After` header: delta seconds (`"120"`) or an HTTP date.
 * Returns whole seconds (at least 1), or null when missing or unparseable.
 */
export function parseRetryAfter(header: string | null, nowMs: number = Date.now()): number | null {
  if (header === null) return null;
  const text = header.trim();
  if (text.length === 0) return null;
  if (/^\d+$/.test(text)) return Math.max(1, Number(text));
  const date = Date.parse(text);
  if (Number.isNaN(date)) return null;
  return Math.max(1, Math.ceil((date - nowMs) / 1000));
}

function describeNetworkError(error: unknown): string {
  if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
    return `Request timed out after ${UPSTREAM_TIMEOUT_MS / 1000}s`;
  }
  return "Network error";
}

/**
 * GETs `url` and returns the parsed JSON body. Throws `UpstreamError` for a
 * network error or timeout, a non-2xx status (429 carries `retryAfterSeconds`,
 * default 60) or a body that is not JSON. Uses the global `fetch` at call
 * time, so tests can stub it with `vi.stubGlobal("fetch", ...)`.
 */
export async function fetchJson(
  source: SourceName,
  url: string,
  headers: Record<string, string> = {},
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: "application/json", ...headers },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      cache: "no-store", // caching is ours (SPEC §5.5), not Next.js fetch caching
    });
  } catch (error) {
    throw new UpstreamError(source, describeNetworkError(error), { cause: error });
  }

  if (response.status === 429) {
    const retryAfter =
      parseRetryAfter(response.headers.get("retry-after")) ?? DEFAULT_RETRY_AFTER_SECONDS;
    throw new UpstreamError(source, `HTTP 429 (retry after ${retryAfter}s)`, {
      status: 429,
      retryAfterSeconds: retryAfter,
    });
  }
  if (!response.ok) {
    throw new UpstreamError(source, `HTTP ${response.status}`, { status: response.status });
  }

  try {
    return await response.json();
  } catch (error) {
    throw new UpstreamError(source, "Response was not valid JSON", {
      status: response.status,
      cause: error,
    });
  }
}

/** True for an absolute `http:` or `https:` URL; guards every link we render. */
export function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

/** Returns the value without duplicates, keeping the first occurrence. */
export function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values)];
}
