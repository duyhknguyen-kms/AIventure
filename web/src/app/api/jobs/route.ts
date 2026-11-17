/**
 * §9 — GET /api/jobs
 * Returns merged, deduped, sorted jobs from all sources.
 * Scoring is intentionally left to the client (pure rankJobs).
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { aggregateJobs } from "@/lib/aggregate/aggregate";

// Caching is handled by the in-memory TTL cache (§5.5), not by Next.js fetch cache.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
});

export async function GET(request: NextRequest) {
  // Validate query params
  const raw = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = QuerySchema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { q } = parsed.data;

  try {
    const result = await aggregateJobs({ q });

    // 502 only when ALL sources failed with no stale cache
    const allFailed = result.sources.every((s) => !s.ok && s.count === 0);
    if (allFailed) {
      return NextResponse.json(
        { error: "All sources unavailable", sources: result.sources },
        { status: 502 },
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("[/api/jobs]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
