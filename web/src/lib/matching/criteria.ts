import { z } from "zod";
import { CRITERIA_STORAGE_KEY } from "@/lib/config";
import type {
  BenefitKey as BenefitKeyValue,
  EmploymentType,
  Seniority,
} from "@/lib/types";

/**
 * Criteria model (SPEC §6, FR5). The TypeScript unions in `lib/types.ts` stay
 * the single source for the value lists; each Zod enum below is checked
 * against its union with `satisfies` here and for exhaustiveness in
 * `tests/criteria.test.ts`, so the two cannot drift apart.
 */

// Re-exported so callers can import the storage key next to the schema; the
// value itself lives in `lib/config.ts`.
export { CRITERIA_STORAGE_KEY };

export const BenefitKey = z.enum([
  "health",
  "retirement",
  "equity",
  "pto",
  "parental_leave",
  "learning",
  "home_office",
  "flexible_hours",
  "wellness",
] as const satisfies readonly BenefitKeyValue[]);
/** Same type as `BenefitKey` in `lib/types.ts`. */
export type BenefitKey = BenefitKeyValue;

export const SeniorityEnum = z.enum([
  "entry",
  "mid",
  "senior",
  "manager",
  "director",
  "executive",
] as const satisfies readonly Seniority[]);

export const EmploymentTypeEnum = z.enum([
  "full_time",
  "part_time",
  "contract",
  "temporary",
  "internship",
  "other",
] as const satisfies readonly EmploymentType[]);

export const CriteriaSchema = z.object({
  version: z.literal(1),
  keywords: z.array(z.string().trim().min(1)).max(30), // skills, e.g. "react"
  targetTitles: z.array(z.string().trim().min(1)).max(10), // e.g. "frontend engineer"
  excludedKeywords: z.array(z.string().trim().min(1)).max(30), // e.g. "php", "on-site"
  seniority: z.array(SeniorityEnum),
  employmentTypes: z.array(EmploymentTypeEnum),
  minSalary: z
    .object({ amount: z.number().positive(), currency: z.string().length(3) })
    .nullable(), // annual
  country: z.string().length(2).nullable(), // ISO alpha-2 where the user lives
  timezoneOffset: z.number().min(-12).max(14).nullable(), // user's UTC offset in hours
  mustHaveBenefits: z.array(BenefitKey),
  niceToHaveBenefits: z.array(BenefitKey),
});

export type Criteria = z.infer<typeof CriteriaSchema>;

/** Every array empty and every nullable field null: every job scores 100 (SPEC §7.3). */
export const DEFAULT_CRITERIA: Criteria = {
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
};
