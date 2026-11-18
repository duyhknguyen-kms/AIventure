// @vitest-environment node
import { describe, expect, expectTypeOf, it } from "vitest";
import type { z } from "zod";
import { CRITERIA_STORAGE_KEY as CONFIG_STORAGE_KEY } from "@/lib/config";
import {
  BenefitKey,
  CRITERIA_STORAGE_KEY,
  type Criteria,
  CriteriaSchema,
  DEFAULT_CRITERIA,
  EmploymentTypeEnum,
  SeniorityEnum,
} from "@/lib/matching/criteria";
import { BENEFIT_DICTIONARY } from "@/lib/matching/benefits";
import type {
  BenefitKey as BenefitKeyUnion,
  EmploymentType,
  Seniority,
} from "@/lib/types";

function validCriteria(): Criteria {
  return {
    version: 1,
    keywords: ["react", "typescript", "node", "graphql"],
    targetTitles: ["frontend engineer"],
    excludedKeywords: ["php"],
    seniority: ["senior"],
    employmentTypes: ["full_time"],
    minSalary: { amount: 100000, currency: "USD" },
    country: "VN",
    timezoneOffset: 7,
    mustHaveBenefits: ["health", "pto"],
    niceToHaveBenefits: ["learning", "equity"],
  };
}

describe("enums match the unions in lib/types.ts (no drift)", () => {
  it("are the same types at compile time", () => {
    expectTypeOf<z.infer<typeof BenefitKey>>().toEqualTypeOf<BenefitKeyUnion>();
    expectTypeOf<z.infer<typeof SeniorityEnum>>().toEqualTypeOf<Seniority>();
    expectTypeOf<z.infer<typeof EmploymentTypeEnum>>().toEqualTypeOf<EmploymentType>();
  });

  it("list the 9 SPEC benefit keys, the same keys the benefit dictionary uses", () => {
    expect(BenefitKey.options).toEqual([
      "health",
      "retirement",
      "equity",
      "pto",
      "parental_leave",
      "learning",
      "home_office",
      "flexible_hours",
      "wellness",
    ]);
    expect(BENEFIT_DICTIONARY.map((d) => d.key)).toEqual(BenefitKey.options);
  });

  it("re-exports the one storage key from config", () => {
    expect(CRITERIA_STORAGE_KEY).toBe(CONFIG_STORAGE_KEY);
    expect(CRITERIA_STORAGE_KEY).toBe("aiventure.criteria.v1");
  });
});

describe("DEFAULT_CRITERIA", () => {
  it("is valid, with every array empty and every nullable field null", () => {
    expect(CriteriaSchema.parse(DEFAULT_CRITERIA)).toEqual(DEFAULT_CRITERIA);
    expect(DEFAULT_CRITERIA).toEqual({
      version: 1,
      keywords: [],
      targetTitles: [],
      excludedKeywords: [],
      seniority: [],
      employmentTypes: [],
      minSalary: null,
      country: null,
      timezoneOffset: null,
      mustHaveBenefits: [],
      niceToHaveBenefits: [],
    });
  });
});

describe("CriteriaSchema (FR5)", () => {
  it("accepts the SPEC §7.5 worked-example criteria", () => {
    const result = CriteriaSchema.safeParse(validCriteria());
    expect(result.success).toBe(true);
  });

  it("trims keyword strings", () => {
    const parsed = CriteriaSchema.parse({ ...validCriteria(), keywords: ["  react  "] });
    expect(parsed.keywords).toEqual(["react"]);
  });

  it.each<[string, Record<string, unknown>]>([
    ["wrong version", { version: 2 }],
    ["blank keyword", { keywords: ["   "] }],
    ["more than 30 keywords", { keywords: Array.from({ length: 31 }, (_, i) => `k${i}`) }],
    ["more than 10 target titles", { targetTitles: Array.from({ length: 11 }, (_, i) => `t${i}`) }],
    ["unknown seniority", { seniority: ["guru"] }],
    ["unknown employment type", { employmentTypes: ["gig"] }],
    ["non-positive salary", { minSalary: { amount: 0, currency: "USD" } }],
    ["currency not 3 letters", { minSalary: { amount: 1000, currency: "US" } }],
    ["country not 2 letters", { country: "VNM" }],
    ["timezone below -12", { timezoneOffset: -13 }],
    ["timezone above +14", { timezoneOffset: 15 }],
    ["unknown benefit", { mustHaveBenefits: ["free_lunch"] }],
  ])("rejects %s", (_name, patch) => {
    const result = CriteriaSchema.safeParse({ ...validCriteria(), ...patch });
    expect(result.success).toBe(false);
  });

  it("rejects a missing field and non-object input", () => {
    const { keywords: _omitted, ...withoutKeywords } = validCriteria();
    void _omitted;
    expect(CriteriaSchema.safeParse(withoutKeywords).success).toBe(false);
    expect(CriteriaSchema.safeParse(null).success).toBe(false);
    expect(CriteriaSchema.safeParse("criteria").success).toBe(false);
  });
});
