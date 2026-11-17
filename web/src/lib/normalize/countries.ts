/**
 * Shared country reference data used by both the location normaliser
 * (name → alpha-2) and the filter engine (alpha-2 → region).
 *
 * Keeping them in one place prevents the two tables from drifting apart.
 */

// ── Country name → ISO 3166-1 alpha-2 (upper case) ───────────────────────
// Covers all countries commonly seen in job listings + common aliases.
export const COUNTRY_NAME_MAP: Record<string, string> = {
  // A
  "afghanistan": "AF", "albania": "AL", "algeria": "DZ",
  "angola": "AO", "argentina": "AR", "armenia": "AM",
  "australia": "AU", "austria": "AT", "azerbaijan": "AZ",
  // B
  "bahrain": "BH", "bangladesh": "BD", "belarus": "BY",
  "belgium": "BE", "bolivia": "BO", "bosnia": "BA",
  "bosnia and herzegovina": "BA", "brazil": "BR", "bulgaria": "BG",
  // C
  "cambodia": "KH", "cameroon": "CM", "canada": "CA",
  "chile": "CL", "china": "CN", "colombia": "CO",
  "costa rica": "CR", "croatia": "HR", "cuba": "CU",
  "cyprus": "CY", "czech republic": "CZ", "czechia": "CZ",
  // D
  "denmark": "DK",
  // E
  "ecuador": "EC", "egypt": "EG", "el salvador": "SV",
  "estonia": "EE", "ethiopia": "ET",
  // F
  "finland": "FI", "france": "FR",
  // G
  "georgia": "GE", "germany": "DE", "ghana": "GH",
  "greece": "GR", "guatemala": "GT",
  // H
  "honduras": "HN", "hong kong": "HK", "hungary": "HU",
  // I
  "iceland": "IS", "india": "IN", "indonesia": "ID",
  "iran": "IR", "iraq": "IQ", "ireland": "IE",
  "israel": "IL", "italy": "IT", "ivory coast": "CI",
  // J
  "japan": "JP", "jordan": "JO",
  // K
  "kazakhstan": "KZ", "kenya": "KE", "kuwait": "KW",
  "kyrgyzstan": "KG",
  // L
  "latvia": "LV", "lebanon": "LB", "libya": "LY",
  "lithuania": "LT", "luxembourg": "LU",
  // M
  "malaysia": "MY", "malta": "MT", "mexico": "MX",
  "moldova": "MD", "mongolia": "MN", "morocco": "MA",
  "mozambique": "MZ",
  // N
  "nepal": "NP", "netherlands": "NL", "new zealand": "NZ",
  "nicaragua": "NI", "nigeria": "NG", "north macedonia": "MK",
  "norway": "NO",
  // O
  "oman": "OM",
  // P
  "pakistan": "PK", "panama": "PA", "paraguay": "PY",
  "peru": "PE", "philippines": "PH", "poland": "PL",
  "portugal": "PT",
  // Q
  "qatar": "QA",
  // R
  "romania": "RO", "russia": "RU",
  // S
  "saudi arabia": "SA", "senegal": "SN", "serbia": "RS",
  "singapore": "SG", "slovakia": "SK", "slovenia": "SI",
  "south africa": "ZA", "south korea": "KR", "spain": "ES",
  "sri lanka": "LK", "sweden": "SE", "switzerland": "CH",
  "syria": "SY",
  // T
  "taiwan": "TW", "tanzania": "TZ", "thailand": "TH",
  "tunisia": "TN", "turkey": "TR", "turkiye": "TR",
  // U
  "uganda": "UG", "ukraine": "UA",
  "united arab emirates": "AE", "uae": "AE",
  "united kingdom": "GB", "uk": "GB", "great britain": "GB", "england": "GB",
  "united states": "US", "usa": "US", "us": "US",
  "uruguay": "UY", "uzbekistan": "UZ",
  // V
  "venezuela": "VE", "vietnam": "VN", "viet nam": "VN",
  // Z
  "zimbabwe": "ZW",
};

// ── ISO 3166-1 alpha-2 → canonical region ────────────────────────────────
// Covers every alpha-2 that appears in COUNTRY_NAME_MAP above.
export const COUNTRY_REGION: Record<string, string> = {
  // EUROPE
  AL: "EUROPE", AM: "EUROPE", AT: "EUROPE", AZ: "EUROPE",
  BA: "EUROPE", BE: "EUROPE", BG: "EUROPE", BY: "EUROPE",
  CH: "EUROPE", CY: "EUROPE", CZ: "EUROPE",
  DE: "EUROPE", DK: "EUROPE",
  EE: "EUROPE", ES: "EUROPE",
  FI: "EUROPE", FR: "EUROPE",
  GB: "EUROPE", GE: "EUROPE", GR: "EUROPE",
  HR: "EUROPE", HU: "EUROPE",
  IE: "EUROPE", IS: "EUROPE", IT: "EUROPE",
  KG: "EUROPE", KZ: "EUROPE",
  LT: "EUROPE", LU: "EUROPE", LV: "EUROPE",
  MD: "EUROPE", MK: "EUROPE", MT: "EUROPE",
  NL: "EUROPE", NO: "EUROPE",
  PL: "EUROPE", PT: "EUROPE",
  RO: "EUROPE", RS: "EUROPE", RU: "EUROPE",
  SE: "EUROPE", SI: "EUROPE", SK: "EUROPE",
  TR: "EUROPE", UA: "EUROPE", UZ: "EUROPE",
  // AMERICAS
  AR: "AMERICAS", BO: "AMERICAS", BR: "AMERICAS",
  CA: "AMERICAS", CL: "AMERICAS", CO: "AMERICAS",
  CR: "AMERICAS", CU: "AMERICAS",
  EC: "AMERICAS", GT: "AMERICAS",
  HN: "AMERICAS",
  MX: "AMERICAS",
  NI: "AMERICAS",
  PA: "AMERICAS", PE: "AMERICAS", PY: "AMERICAS",
  SV: "AMERICAS",
  US: "AMERICAS", UY: "AMERICAS",
  VE: "AMERICAS",
  // APAC
  AU: "APAC",
  CN: "APAC",
  HK: "APAC",
  ID: "APAC", IN: "APAC",
  JP: "APAC",
  KH: "APAC", KR: "APAC",
  LK: "APAC",
  MM: "APAC", MN: "APAC", MY: "APAC",
  NP: "APAC", NZ: "APAC",
  PH: "APAC",
  SG: "APAC",
  TH: "APAC", TW: "APAC",
  VN: "APAC",
  // AFRICA / MIDDLE EAST
  AE: "MIDDLE_EAST", BH: "MIDDLE_EAST",
  IQ: "MIDDLE_EAST", IR: "MIDDLE_EAST", IL: "MIDDLE_EAST",
  JO: "MIDDLE_EAST", KW: "MIDDLE_EAST",
  LB: "MIDDLE_EAST", LY: "MIDDLE_EAST",
  OM: "MIDDLE_EAST",
  QA: "MIDDLE_EAST",
  SA: "MIDDLE_EAST", SY: "MIDDLE_EAST",
  AO: "AFRICA", CI: "AFRICA", CM: "AFRICA",
  EG: "AFRICA",
  ET: "AFRICA",
  GH: "AFRICA",
  KE: "AFRICA",
  MA: "AFRICA", MZ: "AFRICA",
  NG: "AFRICA",
  SN: "AFRICA",
  TN: "AFRICA", TZ: "AFRICA",
  UG: "AFRICA",
  ZA: "AFRICA", ZW: "AFRICA",
  // Central/South Asia
  AF: "ASIA", BD: "ASIA",
  PK: "ASIA",
};

// ── Region aliases for Remotive free-text parsing ─────────────────────────
export const REGION_ALIAS_MAP: Record<string, string> = {
  "europe": "EUROPE", "eu": "EUROPE", "emea": "EUROPE",
  "americas": "AMERICAS", "north america": "AMERICAS",
  "latin america": "AMERICAS", "latam": "AMERICAS", "south america": "AMERICAS",
  "apac": "APAC", "asia": "APAC", "asia pacific": "APAC",
  "middle east": "MIDDLE_EAST", "mena": "MIDDLE_EAST",
  "africa": "AFRICA",
};

/** Convert a country name string to alpha-2 (or null if unknown). */
export function countryNameToAlpha2(name: string): string | null {
  const lower = name.toLowerCase().trim();
  // Direct lookup
  if (COUNTRY_NAME_MAP[lower]) return COUNTRY_NAME_MAP[lower];
  // Passthrough: already a 2-letter alpha-2 code
  if (/^[a-z]{2}$/i.test(lower)) return lower.toUpperCase();
  return null;
}
