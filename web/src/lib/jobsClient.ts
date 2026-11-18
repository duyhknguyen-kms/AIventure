import type { Job, SourceName, SourceStatus } from "@/lib/types";

/**
 * Browser client for `GET /api/jobs` (SPEC §9). Never throws for HTTP or
 * network failures: every outcome is a typed result the dashboard can render.
 * Only an abort (the caller's AbortSignal) rejects, so a superseded request
 * can be ignored by the caller.
 */

export const MAX_QUERY_LENGTH = 100;

export interface JobsPayload {
  fetchedAt: string;
  sources: SourceStatus[];
  jobs: Job[];
}

export type JobsResult =
  | { ok: true; data: JobsPayload }
  | { ok: false; status: number | null; error: string; sources: SourceStatus[] };

const SOURCE_NAMES: readonly SourceName[] = ["himalayas", "remotive"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSourceStatus(value: unknown): value is SourceStatus {
  return (
    isRecord(value) &&
    SOURCE_NAMES.includes(value.name as SourceName) &&
    typeof value.ok === "boolean" &&
    typeof value.count === "number" &&
    typeof value.cached === "boolean" &&
    (value.error === undefined || typeof value.error === "string")
  );
}

/** Light structural check of a job; the server already normalized it. */
function isJob(value: unknown): value is Job {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    SOURCE_NAMES.includes(value.source as SourceName) &&
    typeof value.title === "string" &&
    typeof value.company === "string" &&
    typeof value.sourceUrl === "string" &&
    typeof value.applyUrl === "string" &&
    typeof value.publishedAt === "string" &&
    isRecord(value.location) &&
    Array.isArray(value.alsoOn)
  );
}

function readSources(body: unknown): SourceStatus[] {
  if (!isRecord(body) || !Array.isArray(body.sources)) return [];
  return body.sources.filter(isSourceStatus);
}

function readError(body: unknown, status: number): string {
  if (isRecord(body) && typeof body.error === "string" && body.error.trim() !== "") return body.error;
  return `Request failed with HTTP ${status}`;
}

function parsePayload(body: unknown): JobsPayload | null {
  if (!isRecord(body) || typeof body.fetchedAt !== "string" || !Array.isArray(body.jobs)) return null;
  const jobs = body.jobs.filter(isJob);
  if (jobs.length !== body.jobs.length) {
    console.warn(`[jobsClient] skipped ${body.jobs.length - jobs.length} malformed job(s) from /api/jobs`);
  }
  return { fetchedAt: body.fetchedAt, sources: readSources(body), jobs };
}

export function buildJobsUrl(query: string): string {
  const q = query.trim().slice(0, MAX_QUERY_LENGTH);
  return q === "" ? "/api/jobs" : `/api/jobs?q=${encodeURIComponent(q)}`;
}

function isAbort(error: unknown, signal?: AbortSignal): boolean {
  return signal?.aborted === true || (error instanceof DOMException && error.name === "AbortError");
}

export async function fetchJobs(query: string, signal?: AbortSignal): Promise<JobsResult> {
  let response: Response;
  try {
    response = await fetch(buildJobsUrl(query), { signal, headers: { Accept: "application/json" } });
  } catch (error) {
    if (isAbort(error, signal)) throw error;
    console.error("[jobsClient] network error calling /api/jobs:", error);
    return { ok: false, status: null, error: "Could not reach the server. Check your connection.", sources: [] };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    if (isAbort(error, signal)) throw error;
    console.error(`[jobsClient] /api/jobs returned a non-JSON body (HTTP ${response.status}):`, error);
    return { ok: false, status: response.status, error: `Unexpected response (HTTP ${response.status})`, sources: [] };
  }

  if (!response.ok) {
    return { ok: false, status: response.status, error: readError(body, response.status), sources: readSources(body) };
  }
  const payload = parsePayload(body);
  if (payload === null) {
    console.error("[jobsClient] /api/jobs returned an unexpected shape.");
    return { ok: false, status: response.status, error: "Unexpected response from the server", sources: [] };
  }
  return { ok: true, data: payload };
}
