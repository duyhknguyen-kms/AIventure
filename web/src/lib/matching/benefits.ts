import type { BenefitKey, DetectedBenefit, Job } from "@/lib/types";

/**
 * Benefit detection (SPEC §8, FR8). A regex dictionary runs over the job's
 * plain-text description and excerpt. Pure: no I/O.
 */

export interface BenefitDefinition {
  key: BenefitKey;
  label: string;
  /** Regex sources, joined with alternation into `pattern`. */
  patterns: readonly string[];
  /** One case-insensitive, word-bounded regex for the whole row. */
  pattern: RegExp;
  /** Matches inside these ranges are not counted (known false positives). */
  exclude?: RegExp;
}

/** Characters of context kept on each side of a match. */
export const EVIDENCE_CONTEXT_CHARS = 60;
/** Evidence snippets kept per benefit. */
export const MAX_EVIDENCE_SNIPPETS = 2;

function defineBenefit(
  key: BenefitKey,
  label: string,
  patterns: readonly string[],
  exclude?: RegExp,
): BenefitDefinition {
  const pattern = new RegExp(`\\b(?:${patterns.join("|")})\\b`, "gi");
  return { key, label, patterns, pattern, exclude };
}

export const BENEFIT_DICTIONARY: readonly BenefitDefinition[] = Object.freeze([
  defineBenefit("health", "Health / Medical", [
    "health insurance",
    "medical",
    "dental",
    "vision",
    "health care",
    "healthcare coverage",
    "private health",
  ]),
  defineBenefit("retirement", "Retirement", [
    "401\\(?k\\)?",
    "pension",
    "retirement",
    "superannuation",
    "rrsp",
  ]),
  defineBenefit(
    "equity",
    "Equity",
    ["equity", "stock options?", "rsus?", "esop", "shares"],
    // "diversity, equity and inclusion" (DEI) is not a compensation benefit.
    /\bdiversity,?\s+equity\b|\bequity,?\s+(?:and|&)\s+inclusion\b/gi,
  ),
  defineBenefit("pto", "Paid time off", [
    "pto",
    "paid time off",
    "unlimited vacation",
    "unlimited holidays?",
    "\\d+ days (?:of )?(?:paid )?vacation",
    "\\d+ days (?:of )?(?:paid )?holidays?",
    "\\d+ days (?:of )?(?:paid )?leave",
    "annual leave",
  ]),
  defineBenefit("parental_leave", "Parental leave", [
    "parental leave",
    "maternity",
    "paternity",
    "family leave",
  ]),
  defineBenefit("learning", "Learning budget", [
    "learning budget",
    "learning stipend",
    "education budget",
    "education allowance",
    "conference",
    "training budget",
    "professional development",
    "courses",
  ]),
  defineBenefit("home_office", "Home-office stipend", [
    "home office stipend",
    "home office budget",
    "home office allowance",
    "equipment budget",
    "equipment stipend",
    "co-?working",
    "internet stipend",
  ]),
  defineBenefit("flexible_hours", "Flexible hours", [
    "flexible hours",
    "flexible schedule",
    "flexible working hours",
    "async",
    "asynchronous",
    "work-life balance",
  ]),
  defineBenefit("wellness", "Wellness", [
    "wellness",
    "wellbeing",
    "well-being",
    "gym",
    "mental health",
    "fitness",
  ]),
]);

interface Range {
  start: number;
  end: number;
}

function findRanges(text: string, regex: RegExp): Range[] {
  const ranges: Range[] = [];
  // matchAll clones the regex, so the shared dictionary regex keeps no state.
  for (const match of text.matchAll(regex)) {
    const start = match.index ?? 0;
    ranges.push({ start, end: start + match[0].length });
  }
  return ranges;
}

function overlaps(range: Range, others: readonly Range[]): boolean {
  return others.some((other) => range.start < other.end && other.start < range.end);
}

function snippetAround(text: string, range: Range): string {
  const from = Math.max(0, range.start - EVIDENCE_CONTEXT_CHARS);
  const to = Math.min(text.length, range.end + EVIDENCE_CONTEXT_CHARS);
  return text.slice(from, to).replace(/\s+/g, " ").trim();
}

function detectOne(text: string, definition: BenefitDefinition): DetectedBenefit | null {
  const excluded = definition.exclude ? findRanges(text, definition.exclude) : [];
  const matches = findRanges(text, definition.pattern).filter((r) => !overlaps(r, excluded));
  if (matches.length === 0) return null;

  const evidence: string[] = [];
  for (const range of matches) {
    const snippet = snippetAround(text, range);
    if (!evidence.includes(snippet)) evidence.push(snippet);
    if (evidence.length === MAX_EVIDENCE_SNIPPETS) break;
  }
  return { key: definition.key, label: definition.label, evidence };
}

/**
 * Detects benefits in `descriptionText` plus `excerpt`. Returns at most one
 * entry per benefit key, in dictionary order, each with up to two evidence
 * snippets of about 60 characters of context on each side.
 */
export function extractBenefits(job: Pick<Job, "descriptionText" | "excerpt">): DetectedBenefit[] {
  const text = [job.descriptionText, job.excerpt]
    .filter((part): part is string => typeof part === "string" && part.trim() !== "")
    .join("\n");
  if (text === "") return [];

  const detected: DetectedBenefit[] = [];
  for (const definition of BENEFIT_DICTIONARY) {
    const benefit = detectOne(text, definition);
    if (benefit) detected.push(benefit);
  }
  return detected;
}
