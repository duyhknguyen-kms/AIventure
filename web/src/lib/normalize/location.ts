import type { JobLocation } from "@/lib/types";

/**
 * §4.4 — Remotive location parsing from free text.
 * Real Himalayas API returns country names as strings (not alpha-2 objects),
 * so the country-name→alpha2 table is shared by both adapters.
 */

// Common country names → ISO 3166-1 alpha-2 (upper case)
const COUNTRY_NAME_MAP: Record<string, string> = {
  "afghanistan": "AF", "albania": "AL", "algeria": "DZ", "argentina": "AR",
  "australia": "AU", "austria": "AT", "bangladesh": "BD", "belgium": "BE",
  "brazil": "BR", "bulgaria": "BG", "canada": "CA", "chile": "CL",
  "china": "CN", "colombia": "CO", "croatia": "HR", "czech republic": "CZ",
  "czechia": "CZ", "denmark": "DK", "egypt": "EG", "estonia": "EE",
  "ethiopia": "ET", "finland": "FI", "france": "FR", "germany": "DE",
  "ghana": "GH", "greece": "GR", "hong kong": "HK", "hungary": "HU",
  "india": "IN", "indonesia": "ID", "ireland": "IE", "israel": "IL",
  "italy": "IT", "japan": "JP", "jordan": "JO", "kenya": "KE",
  "latvia": "LV", "lithuania": "LT", "luxembourg": "LU", "malaysia": "MY",
  "mexico": "MX", "morocco": "MA", "netherlands": "NL", "new zealand": "NZ",
  "nigeria": "NG", "norway": "NO", "pakistan": "PK", "peru": "PE",
  "philippines": "PH", "poland": "PL", "portugal": "PT", "romania": "RO",
  "russia": "RU", "saudi arabia": "SA", "serbia": "RS", "singapore": "SG",
  "slovakia": "SK", "slovenia": "SI", "south africa": "ZA", "south korea": "KR",
  "spain": "ES", "sweden": "SE", "switzerland": "CH", "taiwan": "TW",
  "thailand": "TH", "turkey": "TR", "ukraine": "UA",
  "united arab emirates": "AE", "uae": "AE",
  "united kingdom": "GB", "uk": "GB", "great britain": "GB",
  "united states": "US", "usa": "US", "us": "US",
  "vietnam": "VN", "viet nam": "VN",
};

// Region aliases → canonical region label
const REGION_MAP: Record<string, string> = {
  "europe": "EUROPE", "eu": "EUROPE", "emea": "EUROPE",
  "americas": "AMERICAS", "north america": "AMERICAS",
  "latin america": "AMERICAS", "latam": "AMERICAS",
  "apac": "APAC", "asia": "APAC", "asia pacific": "APAC",
};

/** Convert a Himalayas country name string to alpha-2 (or null if unknown). */
export function countryNameToAlpha2(name: string): string | null {
  return COUNTRY_NAME_MAP[name.toLowerCase().trim()] ?? null;
}

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

    // Try exact region match
    const region = REGION_MAP[lower];
    if (region) {
      if (!regions.includes(region)) regions.push(region);
      continue;
    }

    // Try country match (also handles alpha-2 codes directly)
    const alpha2 = lower.length === 2
      ? lower.toUpperCase()
      : COUNTRY_NAME_MAP[lower];
    if (alpha2 && !countries.includes(alpha2)) {
      countries.push(alpha2);
    }
  }

  return { worldwide: false, countries, regions, raw };
}
