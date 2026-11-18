// @vitest-environment node
import { describe, expect, it } from "vitest";
import { DEFAULT_CRITERIA } from "@/lib/matching/criteria";
import { rankJobs } from "@/lib/matching/score";
import { isSortKey, sortRankedJobs } from "@/lib/matching/sort";
import type { Salary } from "@/lib/types";
import { makeJob } from "./helpers/jobs";

function annual(max: number | null, min: number | null = max): Salary {
  return { min, max, currency: "USD", period: "annual", annualMin: min, annualMax: max, raw: null };
}

const jobs = [
  makeJob({ sourceId: "a", title: "A", publishedAt: "2026-11-10T00:00:00.000Z", salary: annual(90000) }),
  makeJob({ sourceId: "b", title: "B", publishedAt: "2026-11-15T00:00:00.000Z", salary: null }),
  makeJob({ sourceId: "c", title: "C", publishedAt: "2026-11-12T00:00:00.000Z", salary: annual(null, 150000) }),
  makeJob({ sourceId: "d", title: "D", publishedAt: "not a date", salary: annual(120000) }),
];
const { ranked } = rankJobs(jobs, DEFAULT_CRITERIA);

describe("sortRankedJobs (SPEC §10.3 JobList sort options)", () => {
  it("keeps the rankJobs order for match", () => {
    expect(sortRankedJobs(ranked, "match").map((j) => j.title)).toEqual(ranked.map((j) => j.title));
  });
  it("sorts newest first with unparseable dates last", () => {
    expect(sortRankedJobs(ranked, "newest").map((j) => j.title)).toEqual(["B", "C", "A", "D"]);
  });
  it("sorts by annual max (falling back to annual min) with unknown salaries last", () => {
    expect(sortRankedJobs(ranked, "salary").map((j) => j.title)).toEqual(["C", "D", "A", "B"]);
  });
  it("does not mutate its input and validates keys", () => {
    const before = ranked.map((j) => j.id);
    sortRankedJobs(ranked, "salary");
    expect(ranked.map((j) => j.id)).toEqual(before);
    expect(isSortKey("newest")).toBe(true);
    expect(isSortKey("random")).toBe(false);
  });
});
