import type { Seniority } from "@/lib/types";

/**
 * §4.2 — Seniority normalization
 * Himalayas: explicit label array.
 * Remotive: infer from job title via regex.
 */

/** Ordinal ladder for proximity scoring (§7.3). */
export const SENIORITY_LADDER: Seniority[] = [
  "entry",
  "mid",
  "senior",
  "manager",
  "director",
  "executive",
];

const HIMALAYAS_MAP: Record<string, Seniority> = {
  "entry-level": "entry",
  "mid-level":   "mid",
  senior:        "senior",
  manager:       "manager",
  director:      "director",
  executive:     "executive",
};

/** Normalize a Himalayas seniority array. Unknown labels are dropped. */
export function normalizeSeniority(
  values: string[] | null | undefined,
): Seniority[] {
  if (!values?.length) return [];
  const result: Seniority[] = [];
  for (const v of values) {
    const mapped = HIMALAYAS_MAP[v.toLowerCase().trim()];
    if (mapped && !result.includes(mapped)) result.push(mapped);
  }
  return result;
}

// Remotive: title regex rules, first match wins (§4.2)
const TITLE_RULES: [RegExp, Seniority][] = [
  [/\b(chief|vp|vice president|cto|ceo|cfo)\b/i, "executive"],
  [/\b(director|head of)\b/i,                     "director"],
  [/\bmanager\b/i,                                 "manager"],
  [/\b(senior|sr\.?|lead|principal|staff)\b/i,    "senior"],
  [/\b(junior|jr\.?|entry|graduate|intern)\b/i,   "entry"],
  [/\b(mid|intermediate)\b/i,                     "mid"],
];

/** Infer seniority from a job title (Remotive). Returns `[]` when nothing matches. */
export function inferSeniorityFromTitle(title: string): Seniority[] {
  for (const [re, level] of TITLE_RULES) {
    if (re.test(title)) return [level];
  }
  return [];
}
