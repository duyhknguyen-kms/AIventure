"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchJobs, type JobsResult } from "@/lib/jobsClient";

export interface UseJobsResult {
  /** True while the request for the current query (or reload) is pending. */
  loading: boolean;
  /**
   * The latest settled result. While `loading`, this is the previous result
   * (or null on the first load), so the caller can keep showing it.
   */
  result: JobsResult | null;
  /** Calls `/api/jobs` again; the server cache decides whether upstream is hit. */
  reload: () => void;
}

interface Settled {
  key: string;
  result: JobsResult;
}

/**
 * Loads `/api/jobs?q=` for `query` (SPEC §9, §10.4). A new query or a reload
 * aborts the request still in flight (AbortController), so a slow, outdated
 * response can never replace a newer one.
 */
export function useJobs(query: string): UseJobsResult {
  const [reloadCount, setReloadCount] = useState(0);
  const [settled, setSettled] = useState<Settled | null>(null);
  const requestKey = `${reloadCount}|${query}`;

  useEffect(() => {
    const controller = new AbortController();
    fetchJobs(query, controller.signal).then(
      (result) => {
        if (!controller.signal.aborted) setSettled({ key: requestKey, result });
      },
      (error: unknown) => {
        // fetchJobs only rejects on abort; anything else is unexpected and shown as a failure.
        if (controller.signal.aborted) return;
        console.error("[useJobs] unexpected error loading jobs:", error);
        setSettled({
          key: requestKey,
          result: { ok: false, status: null, error: "Something went wrong while loading jobs.", sources: [] },
        });
      },
    );
    return () => controller.abort();
  }, [query, requestKey]);

  const reload = useCallback(() => setReloadCount((count) => count + 1), []);

  return { loading: settled?.key !== requestKey, result: settled?.result ?? null, reload };
}
