// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import browseFixture from "./fixtures/himalayas-browse.json";
import searchFixture from "./fixtures/himalayas-search.json";
import { COUNTRY_REGION } from "@/lib/matching/filters";
import { countryNameToAlpha2 } from "@/lib/normalize/location";

/**
 * Every Himalayas `locationRestrictions` name must map to an ISO alpha-2
 * code with a region. The trimmed fixtures are always checked. The raw
 * recordings in `tests/fixtures/raw/` (full upstream responses, not meant to
 * be committed) are checked only when that folder exists on this machine.
 */

const RAW_DIR = path.resolve(__dirname, "fixtures/raw");
const RAW_FILES = ["himalayas-browse.json", "himalayas-search.json"];

interface RecordedResponse {
  jobs: { locationRestrictions?: unknown[] | null }[];
}

function restrictionNames(responses: RecordedResponse[]): string[] {
  const names = new Set<string>();
  for (const response of responses) {
    for (const job of response.jobs) {
      for (const item of job.locationRestrictions ?? []) {
        if (typeof item === "string") names.add(item);
      }
    }
  }
  return [...names].sort();
}

function unmapped(names: string[]): string[] {
  return names.filter((name) => {
    const code = countryNameToAlpha2(name);
    return code === null || COUNTRY_REGION[code] === undefined;
  });
}

describe("Himalayas country names", () => {
  it("maps every name in the trimmed fixtures to a country with a region", () => {
    const names = restrictionNames([browseFixture, searchFixture]);
    expect(names.length).toBeGreaterThan(0);
    expect(unmapped(names)).toEqual([]);
  });

  const rawPresent = RAW_FILES.every((file) => existsSync(path.join(RAW_DIR, file)));

  it.skipIf(!rawPresent)("maps every name in the raw recordings (tests/fixtures/raw/)", () => {
    const responses = RAW_FILES.map(
      (file) => JSON.parse(readFileSync(path.join(RAW_DIR, file), "utf8")) as RecordedResponse,
    );
    const names = restrictionNames(responses);
    expect(names.length).toBeGreaterThan(0);
    // On failure the diff lists exactly the names to add to COUNTRY_LOOKUP.
    expect(unmapped(names)).toEqual([]);
  });

  it("returns null for an unknown name instead of guessing", () => {
    expect(countryNameToAlpha2("Atlantis")).toBeNull();
    expect(countryNameToAlpha2("")).toBeNull();
    expect(countryNameToAlpha2("  Papua   New Guinea ")).toBe("PG");
  });
});
