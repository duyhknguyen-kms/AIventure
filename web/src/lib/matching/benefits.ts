/**
 * §8 — Benefit analysis
 * Runs a regex dictionary over job.descriptionText + excerpt to detect benefits.
 */
import type { Job, BenefitKey, DetectedBenefit } from "@/lib/types";

// ── Benefit dictionary ────────────────────────────────────────────────────

interface BenefitEntry {
  key: BenefitKey;
  label: string;
  pattern: RegExp;
  /** Optional negative lookahead pattern to filter false positives */
  negative?: RegExp;
}

function wb(patterns: string[]): RegExp {
  return new RegExp(`\\b(?:${patterns.join("|")})\\b`, "i");
}

export const BENEFIT_DICTIONARY: BenefitEntry[] = [
  {
    key: "health",
    label: "Health / Medical",
    pattern: wb([
      "health insurance",
      "medical",
      "dental",
      "vision",
      "health care",
      "healthcare coverage",
      "private health",
    ]),
  },
  {
    key: "retirement",
    label: "Retirement",
    pattern: wb(["401\\(?k\\)?", "pension", "retirement", "superannuation", "rrsp"]),
  },
  {
    key: "equity",
    label: "Equity",
    // Negative: "diversity, equity & inclusion" is not a benefit
    pattern: wb(["equity", "stock options?", "rsus?", "esop", "shares"]),
    negative: /diversity,?\s*equity/i,
  },
  {
    key: "pto",
    label: "Paid time off",
    pattern: new RegExp(
      [
        "\\bpto\\b",
        "\\bpaid time off\\b",
        "\\bunlimited vacation\\b",
        "\\bunlimited holidays?\\b",
        "\\b\\d+ days(?: of)?(?:(?: paid)? vacation| paid holidays?| paid leave)\\b",
        "\\bannual leave\\b",
      ].join("|"),
      "i",
    ),
  },
  {
    key: "parental_leave",
    label: "Parental leave",
    pattern: wb(["parental leave", "maternity", "paternity", "family leave"]),
  },
  {
    key: "learning",
    label: "Learning budget",
    pattern: wb([
      "learning budget",
      "learning stipend",
      "education budget",
      "education allowance",
      "conference",
      "training budget",
      "professional development",
      "courses",
    ]),
  },
  {
    key: "home_office",
    label: "Home-office stipend",
    pattern: wb([
      "home office stipend",
      "home office budget",
      "home office allowance",
      "equipment budget",
      "equipment stipend",
      "co-?working",
      "internet stipend",
    ]),
  },
  {
    key: "flexible_hours",
    label: "Flexible hours",
    pattern: wb([
      "flexible hours",
      "flexible schedule",
      "flexible working hours",
      "async",
      "asynchronous",
      "work-life balance",
    ]),
  },
  {
    key: "wellness",
    label: "Wellness",
    pattern: wb([
      "wellness",
      "wellbeing",
      "well-being",
      "gym",
      "mental health",
      "fitness",
    ]),
  },
];

// ── Evidence extraction ────────────────────────────────────────────────────

const SNIPPET_RADIUS = 60;

function extractEvidence(text: string, pattern: RegExp): string[] {
  const snippets: string[] = [];
  // Need a global version to find multiple matches
  const global = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g");
  let match: RegExpExecArray | null;

  while ((match = global.exec(text)) !== null && snippets.length < 2) {
    const start = Math.max(0, match.index - SNIPPET_RADIUS);
    const end = Math.min(text.length, match.index + match[0].length + SNIPPET_RADIUS);
    const snippet = text.slice(start, end).replace(/\s+/g, " ").trim();
    if (!snippets.includes(snippet)) {
      snippets.push(snippet);
    }
  }

  return snippets;
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * §8 — Extract detected benefits from a job's plain text.
 * Returns at most one DetectedBenefit per key.
 */
export function extractBenefits(job: Job): DetectedBenefit[] {
  const text = [job.descriptionText, job.excerpt ?? ""].join(" ");

  const results: DetectedBenefit[] = [];

  for (const entry of BENEFIT_DICTIONARY) {
    if (!entry.pattern.test(text)) continue;

    // Skip if negative pattern matches (false-positive suppression)
    if (entry.negative?.test(text)) continue;

    const evidence = extractEvidence(text, entry.pattern);
    results.push({ key: entry.key, label: entry.label, evidence });
  }

  return results;
}
