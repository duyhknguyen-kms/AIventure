import type { JobLocation } from "@/lib/types";
import {
  COUNTRY_NAME_MAP,
  REGION_ALIAS_MAP,
  countryNameToAlpha2,
} from "./countries";

export { countryNameToAlpha2 };

/** §4.4 — Parse Remotive `candidate_required_location` free text into JobLocation. */
export function parseRemotiveLocation(text: string | null | undefined): JobLocation {
  const raw = text ?? "";

  if (!raw.trim() || /worldwide|anywhere|global/i.test(raw)) {
    return { worldwide: true, countries: [], regions: [], raw: raw || null };
  }

  // Split on comma, slash, " or ", semicolon
  const tokens = raw.split(/,|\/| or |;/).map((t) => t.trim()).filter(Boolean);

  const countries: string[] = [];
  const regions: string[] = [];

  for (const token of tokens) {
    // Skip timezone-related tokens
    if (/timezone/i.test(token)) continue;

    const lower = token.toLowerCase();

    // Try region alias first
    const region = REGION_ALIAS_MAP[lower];
    if (region) {
      if (!regions.includes(region)) regions.push(region);
      continue;
    }

    // Try country name or alpha-2 passthrough
    const alpha2 = countryNameToAlpha2(lower);
    if (alpha2 && !countries.includes(alpha2)) {
      countries.push(alpha2);
    }
  }

  return { worldwide: false, countries, regions, raw };
}

// Re-export for callers that import from this module
export { COUNTRY_NAME_MAP };
