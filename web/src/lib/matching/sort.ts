import type { RankedJob } from "@/lib/matching/score";

/**
 * Result ordering for the dashboard (SPEC §10.3 JobList): match % (the
 * `rankJobs` order), newest first, or salary (annualMax desc, unknown last).
 * Pure; never mutates its input.
 */

export type SortKey = "match" | "newest" | "salary";

export const SORT_OPTIONS: readonly { value: SortKey; label: string; announce: string }[] = Object.freeze([
  { value: "match", label: "Match %", announce: "match" },
  { value: "newest", label: "Newest", announce: "newest" },
  { value: "salary", label: "Salary", announce: "salary" },
]);

export function isSortKey(value: string): value is SortKey {
  return SORT_OPTIONS.some((option) => option.value === value);
}

function publishedTime(job: RankedJob): number {
  const time = Date.parse(job.publishedAt);
  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time;
}

function annualTop(job: RankedJob): number | null {
  const salary = job.salary;
  if (salary === null) return null;
  return salary.annualMax ?? salary.annualMin;
}

/**
 * Sorts a copy of the ranked list. "match" keeps the `rankJobs` order. Ties
 * in "newest" and "salary" keep the match order (the sort is stable).
 */
export function sortRankedJobs(jobs: readonly RankedJob[], sort: SortKey): RankedJob[] {
  const copy = [...jobs];
  if (sort === "newest") {
    copy.sort((a, b) => publishedTime(b) - publishedTime(a));
  } else if (sort === "salary") {
    copy.sort((a, b) => {
      const top = annualTop(a);
      const other = annualTop(b);
      if (top === null && other === null) return 0;
      if (top === null) return 1;
      if (other === null) return -1;
      return other - top;
    });
  }
  return copy;
}
