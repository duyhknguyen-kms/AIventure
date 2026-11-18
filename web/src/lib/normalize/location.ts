import type { JobLocation } from "@/lib/types";

/**
 * Parses Remotive's free-text `candidate_required_location` (SPEC §4.4, FR2.2),
 * e.g. "Worldwide", "USA, Canada, USA timezones", "Europe".
 */

const WORLDWIDE_PATTERN = /worldwide|anywhere|global/i;
const TOKEN_SEPARATOR = /,|\/|;|\s+or\s+/i;

/**
 * Country names and aliases → ISO 3166-1 alpha-2. Keys are lower case with
 * periods removed (see `normalizeCountryName`). Covers the countries Remotive
 * lists most often and every `locationRestrictions` name in the Himalayas
 * responses recorded on 2026-11-17 (`tests/countries.raw.test.ts` checks the
 * raw recordings when they are present). An unknown name is never guessed.
 */
export const COUNTRY_LOOKUP: Readonly<Record<string, string>> = Object.freeze({
  // Names as Himalayas spells them (ISO 3166 short names), 2026-11-17 recording.
  // Kosovo has no official ISO code; XK is the user-assigned code in common use.
  albania: "AL",
  "american samoa": "AS",
  andorra: "AD",
  belarus: "BY",
  belize: "BZ",
  bhutan: "BT",
  bolivia: "BO",
  "bosnia and herzegovina": "BA",
  "british indian ocean territory": "IO",
  "brunei darussalam": "BN",
  brunei: "BN",
  cambodia: "KH",
  "christmas island": "CX",
  "cocos (keeling) islands": "CC",
  "dominican republic": "DO",
  ecuador: "EC",
  "el salvador": "SV",
  "faroe islands": "FO",
  fiji: "FJ",
  "french polynesia": "PF",
  gibraltar: "GI",
  guam: "GU",
  guatemala: "GT",
  guernsey: "GG",
  haiti: "HT",
  "holy see (vatican city state)": "VA",
  "vatican city": "VA",
  honduras: "HN",
  "isle of man": "IM",
  jamaica: "JM",
  jersey: "JE",
  kiribati: "KI",
  kosovo: "XK",
  "lao people's democratic republic": "LA",
  laos: "LA",
  liechtenstein: "LI",
  macao: "MO",
  macau: "MO",
  maldives: "MV",
  "marshall islands": "MH",
  "micronesia, federated states of": "FM",
  micronesia: "FM",
  moldova: "MD",
  monaco: "MC",
  mongolia: "MN",
  montenegro: "ME",
  myanmar: "MM",
  nauru: "NR",
  "new caledonia": "NC",
  niue: "NU",
  "norfolk island": "NF",
  "north macedonia": "MK",
  "northern mariana islands": "MP",
  palau: "PW",
  panama: "PA",
  "papua new guinea": "PG",
  paraguay: "PY",
  pitcairn: "PN",
  "puerto rico": "PR",
  "russian federation": "RU",
  russia: "RU",
  samoa: "WS",
  "san marino": "SM",
  "solomon islands": "SB",
  "svalbard and jan mayen": "SJ",
  "timor-leste": "TL",
  tokelau: "TK",
  tonga: "TO",
  tuvalu: "TV",
  "united states minor outlying islands": "UM",
  vanuatu: "VU",
  "wallis and futuna": "WF",
  "åland islands": "AX",
  // Common names and aliases.
  usa: "US",
  us: "US",
  "united states": "US",
  "united states of america": "US",
  uk: "GB",
  "united kingdom": "GB",
  "great britain": "GB",
  britain: "GB",
  england: "GB",
  scotland: "GB",
  wales: "GB",
  canada: "CA",
  mexico: "MX",
  brazil: "BR",
  argentina: "AR",
  chile: "CL",
  colombia: "CO",
  peru: "PE",
  uruguay: "UY",
  "costa rica": "CR",
  ireland: "IE",
  germany: "DE",
  france: "FR",
  spain: "ES",
  portugal: "PT",
  italy: "IT",
  netherlands: "NL",
  "the netherlands": "NL",
  belgium: "BE",
  luxembourg: "LU",
  switzerland: "CH",
  austria: "AT",
  poland: "PL",
  "czech republic": "CZ",
  czechia: "CZ",
  slovakia: "SK",
  hungary: "HU",
  romania: "RO",
  bulgaria: "BG",
  greece: "GR",
  croatia: "HR",
  serbia: "RS",
  slovenia: "SI",
  ukraine: "UA",
  sweden: "SE",
  norway: "NO",
  denmark: "DK",
  finland: "FI",
  iceland: "IS",
  estonia: "EE",
  latvia: "LV",
  lithuania: "LT",
  cyprus: "CY",
  malta: "MT",
  turkey: "TR",
  turkiye: "TR",
  israel: "IL",
  "united arab emirates": "AE",
  uae: "AE",
  "saudi arabia": "SA",
  egypt: "EG",
  "south africa": "ZA",
  nigeria: "NG",
  kenya: "KE",
  ghana: "GH",
  morocco: "MA",
  india: "IN",
  pakistan: "PK",
  bangladesh: "BD",
  "sri lanka": "LK",
  nepal: "NP",
  china: "CN",
  "hong kong": "HK",
  taiwan: "TW",
  japan: "JP",
  "south korea": "KR",
  korea: "KR",
  singapore: "SG",
  malaysia: "MY",
  indonesia: "ID",
  philippines: "PH",
  thailand: "TH",
  vietnam: "VN",
  "viet nam": "VN",
  australia: "AU",
  "new zealand": "NZ",
});

/** Region names and aliases → region code (SPEC §4.4). */
export const REGION_LOOKUP: Readonly<Record<string, string>> = Object.freeze({
  europe: "EUROPE",
  eu: "EUROPE",
  emea: "EUROPE",
  americas: "AMERICAS",
  "north america": "AMERICAS",
  latam: "AMERICAS",
  "latin america": "AMERICAS",
  "south america": "AMERICAS",
  apac: "APAC",
  asia: "APAC",
  "asia pacific": "APAC",
  "asia-pacific": "APAC",
});

/** Lower case, periods removed, whitespace collapsed: the `COUNTRY_LOOKUP` key form. */
export function normalizeCountryName(name: string): string {
  return name.toLowerCase().replace(/\./g, "").replace(/\s+/g, " ").trim();
}

/** ISO alpha-2 code for a country name or alias, or null when the name is unknown. */
export function countryNameToAlpha2(name: string): string | null {
  return COUNTRY_LOOKUP[normalizeCountryName(name)] ?? null;
}

function normalizeToken(token: string): string {
  return token
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+only$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function pushUnique(list: string[], value: string): void {
  if (!list.includes(value)) list.push(value);
}

export function parseRemotiveLocation(raw: string | null | undefined): JobLocation {
  const text = typeof raw === "string" ? raw.trim() : "";
  const location: JobLocation = {
    worldwide: text.length === 0 || WORLDWIDE_PATTERN.test(text),
    countries: [],
    regions: [],
    raw: typeof raw === "string" ? raw : null,
  };

  for (const part of text.split(TOKEN_SEPARATOR)) {
    if (/timezone/i.test(part)) continue; // "USA timezones" describes hours, not eligibility
    const token = normalizeToken(part);
    if (token.length === 0) continue;
    const country = COUNTRY_LOOKUP[token];
    if (country) {
      pushUnique(location.countries, country);
      continue;
    }
    const region = REGION_LOOKUP[token];
    if (region) pushUnique(location.regions, region);
  }

  return location;
}
