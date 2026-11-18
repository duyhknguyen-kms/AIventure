# API Documentation — AIventure

AIventure exposes a single HTTP endpoint. All matching and scoring happens client-side; the API is a pure data feed.

---

## GET /api/jobs

Returns aggregated, deduplicated, and sorted job listings from Himalayas and Remotive.

### Request

```
GET /api/jobs
GET /api/jobs?q=react+typescript
```

**Query parameters**

| Parameter | Type | Required | Constraints | Description |
|-----------|------|----------|-------------|-------------|
| `q` | string | No | max 100 chars, trimmed | Full-text search token(s). Every whitespace-separated token must appear (case-insensitive) in `title`, `company`, `tags`, `categories`, or `descriptionText`. Passed upstream to the Himalayas search endpoint; applied locally on Remotive results. |

Validation is performed with Zod (`QuerySchema`). An invalid `q` (e.g. longer than 100 chars) returns HTTP 400.

### Response — 200 OK

```json
{
  "jobs": [ ...Job[] ],
  "sources": [ ...SourceStatus[] ],
  "fetchedAt": "2026-11-17T10:00:00.000Z"
}
```

#### `Job` object

```typescript
{
  id: string;               // "<source>:<sourceId>", e.g. "himalayas:abc123"
  source: "himalayas" | "remotive";
  sourceId: string;
  title: string;
  company: string;
  companyLogo: string | null;    // URL or null
  applyUrl: string;              // Official apply link (Himalayas: applicationLink; Remotive: url)
  sourceUrl: string;             // Link back to listing on source site
  employmentType: "full_time" | "part_time" | "contract" | "temporary" | "internship" | "other" | null;
  seniority: ("entry" | "mid" | "senior" | "manager" | "director" | "executive")[];  // empty = unknown
  salary: {
    min: number | null;          // In `period` units
    max: number | null;
    currency: string | null;     // ISO 4217, e.g. "USD"
    period: "hourly" | "weekly" | "fortnightly" | "monthly" | "annual";
    annualMin: number | null;    // Annualised
    annualMax: number | null;
    raw: string | null;          // Original free text (Remotive only)
  } | null;
  location: {
    worldwide: boolean;
    countries: string[];         // ISO 3166-1 alpha-2, uppercase
    regions: string[];           // e.g. "EUROPE", "AMERICAS", "APAC", "AFRICA", "MIDDLE_EAST"
    raw: string | null;          // Original text (Remotive only)
  };
  timezones: number[] | null;    // UTC offsets in hours; [] = all; null = unknown
  categories: string[];
  tags: string[];
  excerpt: string | null;
  descriptionHtml: string;       // Stored but NEVER rendered as HTML (XSS prevention)
  descriptionText: string;       // Plain-text version (stripHtml applied)
  publishedAt: string;           // ISO 8601
  expiresAt: string | null;      // ISO 8601; expired jobs are dropped before response
  alsoOn: { source: "himalayas" | "remotive"; url: string }[];  // Cross-source credits
}
```

#### `SourceStatus` object

```typescript
{
  name: "himalayas" | "remotive";
  ok: boolean;        // false = this source failed or is serving stale data
  count: number;      // Number of jobs from this source (may be stale)
  cached: boolean;    // true = data served from in-memory cache
  error?: string;     // Short error message when ok=false
}
```

#### `fetchedAt`

ISO 8601 timestamp of the most recent successful upstream fetch (across both sources).

### Response — 400 Bad Request

```json
{
  "error": "Invalid query parameters",
  "details": { ...ZodFlattenedError }
}
```

Returned when `q` fails Zod validation (e.g. exceeds 100 characters).

### Response — 502 Bad Gateway

```json
{
  "error": "All sources unavailable",
  "sources": [ ...SourceStatus[] ]
}
```

Returned when both sources fail and no stale cache exists. If at least one source is healthy or has a stale cache, 200 is returned with the available data and degraded `SourceStatus`.

### Response — 500 Internal Server Error

```json
{ "error": "Internal server error" }
```

Unexpected exception caught at the top level.

---

## Runtime / Caching Behaviour

| Behaviour | Detail |
|-----------|--------|
| Runtime | `nodejs` (not Edge) |
| Dynamic | `force-dynamic` — no Next.js fetch cache |
| TTL | 21,600 s (6 h) default; override with `CACHE_TTL_SECONDS` env var |
| Stale-on-error | Returns stale cached data with `ok: false` and `cached: true` when a live refresh fails |
| Rate limit (429) | Records `retryAfter` and blocks further requests to that source for the specified duration |
| In-flight dedupe | Concurrent requests for the same cache key share one pending `Promise` |
| Himalayas max pages | 5 (100 jobs) by default; override with `HIMALAYAS_MAX_PAGES` env var |

---

## Scoring (Client-Side)

The API response contains raw, unscored `Job` objects. All scoring is performed client-side by calling `rankJobs(jobs, criteria)` from `src/lib/matching/score.ts`. This keeps the API response cacheable and avoids per-user server state.

```typescript
// Called in page.tsx via useMemo
import { rankJobs } from "@/lib/matching/score";

const { ranked, excluded } = rankJobs(rawJobs, criteria);
// ranked: (Job & { match: MatchResult })[], sorted by matchPercent desc
// excluded: { job: Job, reason: string }[]
```

---

## No Other Endpoints

There are no other API routes. The CV scanning (`/lib/cv/`) is entirely client-side and makes no HTTP requests. Criteria are stored in `localStorage`, not on the server.

---

## Upstream APIs Consumed

### Himalayas (server-side)

| Item | Value |
|------|-------|
| Browse | `GET https://himalayas.app/jobs/api?limit=20[&cursor=<cursor>]` |
| Search | `GET https://himalayas.app/jobs/api/search?q=<text>&page=<n>&limit=20` |
| Auth | `Authorization: Bearer <HIMALAYAS_API_KEY>` (optional; never exposed to browser) |
| Rate limits | Keyed: 60 req/min, 10,000/day |
| Timeout | 10,000 ms (`AbortSignal.timeout`) |

### Remotive (server-side)

| Item | Value |
|------|-------|
| Endpoint | `GET https://remotive.com/api/remote-jobs` |
| Auth | None |
| Rate limit | ~4 requests/day (ToS guidance) |
| Timeout | 10,000 ms (`AbortSignal.timeout`) |
| Notes | Full feed fetched once per cache window; `q` filtering applied locally |
