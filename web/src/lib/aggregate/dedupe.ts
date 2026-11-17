/**
 * §5.4 — Job deduplication
 *
 * Key = norm(company) + "|" + norm(title).
 * On collision, keep the Himalayas record (structured salary) and push the
 * other record's {source, url} into alsoOn so both sources stay credited.
 */
import type { Job } from "@/lib/types";

const COMPANY_SUFFIXES = /\b(inc|ltd|llc|gmbh|corp|co|limited)\b\.?/gi;

function norm(text: string): string {
  return text
    .toLowerCase()
    .replace(COMPANY_SUFFIXES, "")  // remove legal suffixes
    .replace(/[^\w\s]/g, "")        // strip punctuation
    .replace(/\s+/g, " ")
    .trim();
}

function dedupeKey(job: Job): string {
  return `${norm(job.company)}|${norm(job.title)}`;
}

/**
 * Deduplicate jobs across sources.
 * Himalayas records win on collision; Remotive records are credited via alsoOn.
 * Input order is preserved for non-duplicate entries.
 */
export function dedupeJobs(jobs: Job[]): Job[] {
  // Separate by source so Himalayas always wins
  const himalayas = jobs.filter((j) => j.source === "himalayas");
  const others    = jobs.filter((j) => j.source !== "himalayas");

  const seen = new Map<string, Job>();

  // Index Himalayas records first
  for (const job of himalayas) {
    const key = dedupeKey(job);
    if (!seen.has(key)) {
      seen.set(key, { ...job, alsoOn: [...job.alsoOn] });
    }
  }

  // Merge other sources
  for (const job of others) {
    const key = dedupeKey(job);
    if (seen.has(key)) {
      // Collision — credit the other source
      const winner = seen.get(key)!;
      if (!winner.alsoOn.some((a) => a.source === job.source)) {
        winner.alsoOn.push({ source: job.source, url: job.sourceUrl });
      }
    } else {
      seen.set(key, { ...job, alsoOn: [...job.alsoOn] });
    }
  }

  return Array.from(seen.values());
}
