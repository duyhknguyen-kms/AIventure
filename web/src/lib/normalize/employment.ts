import type { EmploymentType } from "@/lib/types";

/**
 * Employment type mapping, case-insensitive (SPEC §4.2, FR2.3).
 * Keys are the source value lower-cased with spaces and hyphens turned into
 * underscores, so "Full Time", "full-time" and "full_time" all match.
 */
const EMPLOYMENT_MAP: Record<string, EmploymentType> = {
  full_time: "full_time",
  part_time: "part_time",
  contractor: "contract",
  contract: "contract",
  freelance: "contract",
  temporary: "temporary",
  intern: "internship",
  internship: "internship",
};

/**
 * Maps a Himalayas `employmentType` or Remotive `job_type` value to the
 * normalized `EmploymentType`. Empty or missing → `null`; any other unknown
 * value (including "Volunteer" and "Other") → `"other"`.
 */
export function normalizeEmploymentType(raw: string | null | undefined): EmploymentType | null {
  if (typeof raw !== "string") return null;
  const key = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (key.length === 0) return null;
  return EMPLOYMENT_MAP[key] ?? "other";
}
