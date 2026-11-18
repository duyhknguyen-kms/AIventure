import type { Seniority } from "@/lib/types";

/**
 * Ordinal ladder used by the seniority score factor (SPEC §4.2, FR7.3):
 * entry < mid < senior < manager < director < executive.
 */
export const SENIORITY_LADDER: readonly Seniority[] = Object.freeze([
  "entry",
  "mid",
  "senior",
  "manager",
  "director",
  "executive",
]);

/**
 * Himalayas seniority values. Keys are lower-cased with every non-letter
 * removed, so "Entry-level", "entry level" and "ENTRY_LEVEL" all match.
 */
const HIMALAYAS_SENIORITY: Record<string, Seniority> = {
  entrylevel: "entry",
  midlevel: "mid",
  senior: "senior",
  manager: "manager",
  director: "director",
  executive: "executive",
};

/**
 * Maps Himalayas `seniority[]` values to `Seniority[]` (SPEC §4.2, FR2.4).
 * Unknown values are dropped and duplicates removed; the result keeps the
 * order of first appearance. Missing input → `[]` (unknown).
 */
export function normalizeSeniority(levels: readonly string[] | null | undefined): Seniority[] {
  if (!Array.isArray(levels)) return [];
  const result: Seniority[] = [];
  for (const level of levels) {
    if (typeof level !== "string") continue;
    const mapped = HIMALAYAS_SENIORITY[level.toLowerCase().replace(/[^a-z]/g, "")];
    if (mapped && !result.includes(mapped)) result.push(mapped);
  }
  return result;
}

/** Title patterns for Remotive, checked in order; the first match wins (SPEC §4.2). */
const TITLE_PATTERNS: readonly [RegExp, Seniority][] = [
  [/\b(chief|vp|vice president|cto|ceo|cfo)\b/i, "executive"],
  [/\b(director|head of)\b/i, "director"],
  [/\bmanager\b/i, "manager"],
  [/\b(senior|sr\.?|lead|principal|staff)\b/i, "senior"],
  [/\b(junior|jr\.?|entry|graduate|intern)\b/i, "entry"],
  [/\b(mid|intermediate)\b/i, "mid"],
];

/**
 * Infers seniority from a job title (Remotive has no seniority field).
 * Returns one level, or `[]` when no pattern matches.
 */
export function inferSeniorityFromTitle(title: string | null | undefined): Seniority[] {
  if (typeof title !== "string" || title.trim().length === 0) return [];
  for (const [pattern, level] of TITLE_PATTERNS) {
    if (pattern.test(title)) return [level];
  }
  return [];
}
