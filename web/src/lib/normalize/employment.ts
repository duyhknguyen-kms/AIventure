import type { EmploymentType } from "@/lib/types";

/**
 * §4.2 — Employment type mapping (case-insensitive)
 */
const MAP: Record<string, EmploymentType> = {
  "full time":   "full_time",
  "full_time":   "full_time",
  "part time":   "part_time",
  "part_time":   "part_time",
  contractor:    "contract",
  contract:      "contract",
  freelance:     "contract",
  temporary:     "temporary",
  intern:        "internship",
  internship:    "internship",
  volunteer:     "other",
  other:         "other",
};

export function normalizeEmploymentType(
  value: string | null | undefined,
): EmploymentType | null {
  if (!value) return null;
  return MAP[value.toLowerCase().trim()] ?? "other";
}
