import type { Job } from "@/lib/types";

/**
 * Cross-source deduplication (SPEC §5.4, FR3).
 *
 * Key = `norm(company) + "|" + norm(title)`. When a Himalayas job and a job
 * from another source share a key, the Himalayas record is kept (its salary
 * is structured) and the other record's `{ source, url }` goes into `alsoOn`.
 * Jobs that collide only with jobs from their own source are all kept: they
 * are separate listings, not cross-posts.
 */

const COMPANY_SUFFIXES = new Set(["inc", "ltd", "llc", "gmbh"]);

/** Lower-cases, strips punctuation, removes company suffixes and collapses whitespace. */
export function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 0 && !COMPANY_SUFFIXES.has(word))
    .join(" ");
}

export function dedupeKey(job: Pick<Job, "company" | "title">): string {
  return `${norm(job.company)}|${norm(job.title)}`;
}

function mergeGroup(group: readonly Job[]): Job[] {
  const himalayas = group.filter((job) => job.source === "himalayas");
  const others = group.filter((job) => job.source !== "himalayas");
  if (himalayas.length === 0 || others.length === 0) return [...group];

  const [primary, ...rest] = himalayas;
  const alsoOn = [...primary.alsoOn];
  for (const other of others) {
    for (const link of [{ source: other.source, url: other.sourceUrl }, ...other.alsoOn]) {
      if (!alsoOn.some((l) => l.source === link.source && l.url === link.url)) alsoOn.push(link);
    }
  }
  return [{ ...primary, alsoOn }, ...rest];
}

/**
 * Returns a new array; input jobs are not mutated. Output keeps the order of
 * each key's first appearance (the aggregator sorts afterwards).
 */
export function dedupeJobs(jobs: readonly Job[]): Job[] {
  const groups = new Map<string, Job[]>();
  for (const job of jobs) {
    const key = dedupeKey(job);
    const group = groups.get(key);
    if (group) group.push(job);
    else groups.set(key, [job]);
  }
  return [...groups.values()].flatMap(mergeGroup);
}
