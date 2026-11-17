/**
 * §6 — Criteria model: schema, defaults, and storage key.
 */
import { z } from "zod";
import { CRITERIA_STORAGE_KEY } from "@/lib/config";

export { CRITERIA_STORAGE_KEY };

export const BenefitKeyEnum = z.enum([
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

export const CriteriaSchema = z.object({
  version: z.literal(1),
  keywords: z.array(z.string().trim().min(1)).max(30),
  targetTitles: z.array(z.string().trim().min(1)).max(10),
  excludedKeywords: z.array(z.string().trim().min(1)).max(30),
  seniority: z.array(
    z.enum(["entry", "mid", "senior", "manager", "director", "executive"]),
  ),
  employmentTypes: z.array(
    z.enum(["full_time", "part_time", "contract", "temporary", "internship", "other"]),
  ),
  minSalary: z
    .object({ amount: z.number().positive(), currency: z.string().length(3) })
    .nullable(),
  country: z.string().length(2).nullable(),
  timezoneOffset: z.number().min(-12).max(14).nullable(),
  mustHaveBenefits: z.array(BenefitKeyEnum),
  niceToHaveBenefits: z.array(BenefitKeyEnum),
});

export type Criteria = z.infer<typeof CriteriaSchema>;

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
