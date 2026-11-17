/**
 * Extract partial Criteria from plain CV text.
 * Returns a Partial<Criteria> the UI merges into existing criteria.
 * All heuristics are intentionally conservative — false negatives are
 * better than false positives that surprise the user.
 */
import { SKILLS_DICTIONARY } from "./skills-dictionary";
import { inferSeniorityFromTitle } from "@/lib/normalize/seniority";
import type { Criteria } from "@/lib/matching/criteria";
import type { Seniority } from "@/lib/types";

// ── Skills extraction ─────────────────────────────────────────────────────

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function extractSkills(text: string): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];

  for (const skill of SKILLS_DICTIONARY) {
    // Word-boundary match, case-insensitive
    const re = new RegExp(`\\b${escapeRegex(skill)}\\b`, "i");
    if (re.test(lower) && !found.includes(skill)) {
      found.push(skill);
    }
  }

  return found;
}

// ── Job title extraction ───────────────────────────────────────────────────

/**
 * Find job titles from work-experience sections.
 * Looks for lines following "Position:", "Title:", "Role:", or standalone
 * capitalised role names near date patterns.
 */
const TITLE_LABEL_RE = /^(?:position|title|role|job title)\s*[:\-]\s*(.+)/im;
const DATE_RANGE_RE = /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4}/i;

// Common role keywords that reliably identify a job title line
const ROLE_KEYWORDS =
  /\b(engineer|developer|designer|manager|analyst|lead|architect|consultant|specialist|director|scientist|researcher|coordinator)\b/i;

export function extractJobTitles(text: string): string[] {
  const titles = new Set<string>();

  // Pattern 1: explicit label
  const labelMatch = text.match(TITLE_LABEL_RE);
  if (labelMatch) {
    const title = labelMatch[1].trim().replace(/\s+/g, " ");
    if (title.length < 80) titles.add(title);
  }

  // Pattern 2: lines near date ranges that contain role keywords
  const lines = text.split(/\n+/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const nearDate =
      DATE_RANGE_RE.test(line) ||
      (i + 1 < lines.length && DATE_RANGE_RE.test(lines[i + 1])) ||
      (i > 0 && DATE_RANGE_RE.test(lines[i - 1]));

    if (nearDate && ROLE_KEYWORDS.test(line) && line.length < 80) {
      // Strip leading bullets / dashes and trailing dates
      const clean = line
        .replace(/^[\-•–]\s*/, "")
        .replace(/\s+\|.*$/, "")
        .replace(/\s+[-–]\s+.*$/, "")
        .trim();
      if (clean) titles.add(clean);
    }
  }

  return [...titles].slice(0, 5); // cap at 5 titles
}

// ── Seniority extraction ───────────────────────────────────────────────────

export function extractSeniority(text: string): Seniority[] {
  const lines = text.split(/\n+/);
  const levels = new Set<Seniority>();

  for (const line of lines) {
    const inferred = inferSeniorityFromTitle(line);
    for (const level of inferred) levels.add(level);
  }

  // Also check for explicit experience years as a seniority signal
  const yearsMatch = text.match(/\b(\d+)\+?\s*years?\s*(?:of\s+)?(?:experience|exp)\b/i);
  if (yearsMatch) {
    const yrs = parseInt(yearsMatch[1], 10);
    if (yrs >= 8 && !levels.has("senior")) levels.add("senior");
    else if (yrs >= 3 && yrs < 8 && !levels.has("mid")) levels.add("mid");
    else if (yrs < 3 && !levels.has("entry")) levels.add("entry");
  }

  return [...levels].slice(0, 3);
}

// ── Main entry point ───────────────────────────────────────────────────────

export type ExtractedCriteria = {
  keywords: string[];
  targetTitles: string[];
  seniority: Seniority[];
};

export function extractCriteriaFromText(text: string): ExtractedCriteria {
  return {
    keywords: extractSkills(text),
    targetTitles: extractJobTitles(text),
    seniority: extractSeniority(text),
  };
}

/**
 * Merge extracted criteria into existing criteria.
 * Appends to arrays rather than replacing; never touches salary / country / etc.
 */
export function mergeExtracted(
  current: Criteria,
  extracted: ExtractedCriteria,
): Criteria {
  return {
    ...current,
    keywords: [...new Set([...current.keywords, ...extracted.keywords])],
    targetTitles: [...new Set([...current.targetTitles, ...extracted.targetTitles])],
    seniority: [...new Set([...current.seniority, ...extracted.seniority])],
  };
}
