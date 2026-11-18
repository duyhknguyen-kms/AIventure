import { z } from "zod";
import { aggregateJobs } from "@/lib/aggregate/aggregate";

/**
 * `GET /api/jobs?q=<text>` (SPEC §9, FR1, FR1.3, FR10). Returns unscored,
 * normalized jobs from both sources; the client ranks them.
 *
 * - 200 `{ fetchedAt, sources, jobs }`, also when one source failed.
 * - 400 `{ error }` when `q` is longer than 100 characters.
 * - 502 `{ error, sources }` when both sources failed and no stale cache exists.
 * - 500 `{ error }` for anything unexpected; details go to the server log only.
 */

// No `runtime` / `dynamic` segment config: `next.config.ts` enables
// `cacheComponents`, which rejects both at build time. The handler still runs
// on the default Node runtime and is dynamic because it reads `request.url`;
// caching is handled by `aggregate/cache.ts` (SPEC §5.5), not by Next.js.

// Not exported: Next.js allows only route handlers and route config exports here.
const MAX_QUERY_LENGTH = 100;

const QuerySchema = z.object({
  q: z.string().trim().max(MAX_QUERY_LENGTH).optional(),
});

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request: Request): Promise<Response> {
  const parsed = QuerySchema.safeParse({
    q: new URL(request.url).searchParams.get("q") ?? undefined,
  });
  if (!parsed.success) {
    return Response.json(
      { error: `Query parameter q must be at most ${MAX_QUERY_LENGTH} characters.` },
      { status: 400, headers: NO_STORE },
    );
  }

  try {
    const result = await aggregateJobs({ q: parsed.data.q || undefined });
    if (result.sources.every((source) => !source.ok)) {
      return Response.json(
        { error: "All sources unavailable", sources: result.sources },
        { status: 502, headers: NO_STORE },
      );
    }
    return Response.json(
      { fetchedAt: result.fetchedAt, sources: result.sources, jobs: result.jobs },
      { headers: NO_STORE },
    );
  } catch (error) {
    // Log the error itself, never request headers or env, so no API key can leak.
    console.error("[api/jobs] unexpected error:", error instanceof Error ? error.stack ?? error.message : error);
    return Response.json({ error: "Internal server error" }, { status: 500, headers: NO_STORE });
  }
}
