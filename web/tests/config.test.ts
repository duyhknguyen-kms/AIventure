// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CACHE_TTL_SECONDS,
  CRITERIA_STORAGE_KEY,
  DEFAULT_CACHE_TTL_SECONDS,
  DEFAULT_HIMALAYAS_MAX_PAGES,
  HIMALAYAS_MAX_PAGES,
  WEIGHTS,
  readPositiveIntEnv,
} from "@/lib/config";

describe("WEIGHTS (SPEC §7.2, FR7)", () => {
  it("sum to 100", () => {
    const total = Object.values(WEIGHTS).reduce((sum, w) => sum + w, 0);
    expect(total).toBe(100);
  });

  it("match the SPEC table per factor", () => {
    expect(WEIGHTS).toEqual({
      skills: 30,
      title: 20,
      seniority: 10,
      salary: 15,
      employment: 5,
      timezone: 5,
      benefits: 15,
    });
  });

  it("cannot be mutated at runtime", () => {
    expect(Object.isFrozen(WEIGHTS)).toBe(true);
  });
});

describe("CRITERIA_STORAGE_KEY (FR5)", () => {
  it("is the versioned v1 key", () => {
    expect(CRITERIA_STORAGE_KEY).toBe("aiventure.criteria.v1");
  });
});

describe("env-driven settings (FR4, SPEC §5.6)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("default to 21600 s and 5 pages when env is unset", () => {
    expect(DEFAULT_CACHE_TTL_SECONDS).toBe(21600);
    expect(DEFAULT_HIMALAYAS_MAX_PAGES).toBe(5);
    expect(readPositiveIntEnv("CACHE_TTL_SECONDS", 21600, {})).toBe(21600);
    expect(readPositiveIntEnv("HIMALAYAS_MAX_PAGES", 5, {})).toBe(5);
  });

  it("exported values are positive integers", () => {
    expect(Number.isInteger(CACHE_TTL_SECONDS) && CACHE_TTL_SECONDS > 0).toBe(true);
    expect(Number.isInteger(HIMALAYAS_MAX_PAGES) && HIMALAYAS_MAX_PAGES > 0).toBe(true);
  });

  it("reads a valid override from env", () => {
    expect(readPositiveIntEnv("CACHE_TTL_SECONDS", 21600, { CACHE_TTL_SECONDS: "60" })).toBe(60);
    expect(readPositiveIntEnv("HIMALAYAS_MAX_PAGES", 5, { HIMALAYAS_MAX_PAGES: " 2 " })).toBe(2);
  });

  it("treats an empty value as unset", () => {
    expect(readPositiveIntEnv("CACHE_TTL_SECONDS", 21600, { CACHE_TTL_SECONDS: "" })).toBe(21600);
  });

  it("falls back with a warning on malformed values", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    for (const bad of ["abc", "-5", "0", "1.5"]) {
      expect(readPositiveIntEnv("HIMALAYAS_MAX_PAGES", 5, { HIMALAYAS_MAX_PAGES: bad })).toBe(5);
    }
    expect(warn).toHaveBeenCalledTimes(4);
  });
});
