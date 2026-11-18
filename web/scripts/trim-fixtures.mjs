// Trims raw API responses recorded with the SPEC §12 curl commands into small
// test fixtures (SPEC §12: about 10 jobs, keeping at least one null salary,
// one location restriction and one free-text salary).
//
// Usage (from web/): node scripts/trim-fixtures.mjs
// Input:  tests/fixtures/raw/{himalayas-browse,himalayas-search,remotive}.json
// Output: tests/fixtures/{himalayas-browse,himalayas-search,remotive}.json
import { readFileSync, writeFileSync } from "node:fs";

const RAW = "tests/fixtures/raw";
const OUT = "tests/fixtures";

function load(name) {
  return JSON.parse(readFileSync(`${RAW}/${name}.json`, "utf8"));
}

function save(name, data) {
  writeFileSync(`${OUT}/${name}.json`, JSON.stringify(data, null, 2) + "\n");
  console.log(`${OUT}/${name}.json: ${data.jobs.length} jobs`);
}

/** Picks up to `max` jobs: first one per required predicate, then fill in order. */
function pick(jobs, max, predicates) {
  const chosen = [];
  for (const p of predicates) {
    const hit = jobs.find((j) => p(j) && !chosen.includes(j));
    if (hit) chosen.push(hit);
    else console.warn(`no job matched a required predicate: ${p.toString()}`);
  }
  for (const j of jobs) {
    if (chosen.length >= max) break;
    if (!chosen.includes(j)) chosen.push(j);
  }
  // Keep the upstream order so pagination and sort tests read naturally.
  return jobs.filter((j) => chosen.includes(j));
}

const himalayasPredicates = [
  (j) => j.minSalary == null && j.maxSalary == null, // null salary
  (j) => j.minSalary != null && j.maxSalary != null, // structured salary
  (j) => Array.isArray(j.locationRestrictions) && j.locationRestrictions.length > 0,
  (j) => Array.isArray(j.locationRestrictions) && j.locationRestrictions.length === 0,
  (j) => Array.isArray(j.timezoneRestrictions) && j.timezoneRestrictions.length > 0,
];

const browse = load("himalayas-browse");
save("himalayas-browse", { ...browse, jobs: pick(browse.jobs, 10, himalayasPredicates) });

const search = load("himalayas-search");
save("himalayas-search", { ...search, jobs: pick(search.jobs, 5, himalayasPredicates) });

const remotive = load("remotive");
const remotiveJobs = pick(remotive.jobs, 10, [
  (j) => /\d/.test(j.salary ?? ""), // free-text salary with numbers
  (j) => !j.salary, // empty salary
  (j) => /hour/i.test(j.salary ?? ""), // hourly salary
  (j) => /worldwide/i.test(j.candidate_required_location ?? ""),
  (j) => /,/.test(j.candidate_required_location ?? ""), // multi-country text
  (j) => !("company_logo_url" in j), // optional field missing
]);
save("remotive", {
  ...remotive,
  "job-count": remotiveJobs.length,
  jobs: remotiveJobs,
});
