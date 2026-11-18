# Architecture — AIventure

## System Overview

AIventure is a Next.js 16 App Router application running in a single process (Node.js). There is no database, no background worker, and no external persistence. The architecture is a thin two-tier model:

```
Browser                                     Next.js Server Process
─────────────────────────────────────       ────────────────────────────────────────
page.tsx  (React, "use client")             /api/jobs/route.ts  (Node runtime)
  │                                           │
  │  GET /api/jobs[?q=...]                    │  aggregateJobs({ q })
  │◄─────────────────────────────────────────►│
  │  { jobs, sources, fetchedAt }             │  fetchHimalayas() ──► Himalayas API
  │                                           │  fetchRemotive()  ──► Remotive API
  │                                           │  dedupeJobs()
  │                                           │  TTL cache (globalThis)
  │
  │  rankJobs(rawJobs, criteria)   ← pure fn, runs in browser
  │  (no network call)
  │
  │  <JobList> → <JobCard> → <JobDetailPanel>
  │  <CriteriaForm> → <CvScanner>
  │
  │  localStorage["aiventure.criteria.v1"]   ← Criteria persistence
```

## Layers

### 1. API Route (`src/app/api/jobs/route.ts`)

- Entry point: `GET /api/jobs?q=<string>`.
- Validates query params with Zod (`QuerySchema`).
- Calls `aggregateJobs({ q })` from the aggregation layer.
- Returns `{ jobs: Job[], sources: SourceStatus[], fetchedAt: string }` as JSON.
- Returns HTTP 502 when all sources fail and no stale cache exists.
- Marked `export const runtime = "nodejs"` and `export const dynamic = "force-dynamic"` to bypass Next.js fetch cache; TTL caching is handled in-process.

### 2. Aggregation Layer (`src/lib/aggregate/`)

#### `aggregate.ts` — `aggregateJobs(opts)`
- Runs `fetchHimalayas(q)` and `fetchRemotive()` in parallel via `Promise.allSettled`.
- Each source is wrapped by `fetchWithCache(key, fetcher, TTL)`.
- On partial failure, returns the surviving source's jobs with a degraded `SourceStatus`.
- Applies local `q` filtering on all jobs (every token of `q` must appear case-insensitively in `title + company + tags + categories + descriptionText`).
- Deduplicates, drops expired jobs, sorts by `publishedAt` descending.

#### `cache.ts` — in-memory TTL cache
- Stored on `globalThis.__aiventureCache` (survives Next.js dev hot reloads).
- Keys: `himalayas:browse`, `himalayas:search:<q>`, `remotive:all`.
- Default TTL: 21,600 s (6 h).
- In-flight dedupe: concurrent callers for the same key share one pending `Promise`.
- Stale-on-error: a failed refresh returns the stale entry with `cached: true`.
- 429 handling: `setBlocked(key, retryAfterSeconds)` prevents tight retry loops.

#### `dedupe.ts` — `dedupeJobs(jobs)`
- Key = `norm(company) + "|" + norm(title)`.
- `norm` strips legal suffixes (`inc`, `ltd`, `llc`, etc.), punctuation, and extra whitespace.
- Himalayas record wins on collision (structured salary). Losing record's `{source, url}` is pushed into the winner's `alsoOn[]`.

### 3. Source Adapters (`src/lib/sources/`)

Both adapters are server-only (called from the API route).

#### `himalayas.ts`
- Browse mode: cursor-based pagination up to `HIMALAYAS_MAX_PAGES` (default 5 → ≤100 jobs).
- Search mode: 1-based page pagination up to `HIMALAYAS_MAX_PAGES`, stops when a page returns no jobs.
- Zod schema uses `.passthrough()` and `.nullish()` for forward compatibility.
- Invalid jobs are skipped and counted; they never throw.
- 429 → throws `{ type: "http", status: 429, retryAfter }` for the cache layer to record the block.

#### `remotive.ts`
- Always fetches the full feed (no search param).
- Local `q` filtering is applied by the aggregation layer.
- `publication_date` has no TZ offset; treated as UTC by appending `"Z"`.

### 4. Normalise Layer (`src/lib/normalize/`)

Pure functions; no I/O; imported by both source adapters.

| Module | Function | Purpose |
|--------|----------|---------|
| `employment.ts` | `normalizeEmploymentType(value)` | Maps source strings to `EmploymentType` enum |
| `seniority.ts` | `normalizeSeniority(values[])` / `inferSeniorityFromTitle(title)` | Maps Himalayas labels; infers from Remotive titles via regex |
| `location.ts` | `parseRemotiveLocation(text)` | Splits free-text location into `countries[]` and `regions[]` |
| `countries.ts` | `countryNameToAlpha2(name)`, `COUNTRY_REGION` | ~100-entry name→alpha2 map; alpha2→region map |
| `salary.ts` | `parseSalaryText(raw)`, `annualize(amount, period)` | Parses Remotive free-text salary; annualises all periods |
| `html.ts` | `stripHtml(html)` | Strips tags, decodes entities, used to produce `descriptionText` |
| `timezone.ts` | `parseUtcOffset(s)` | Parses UTC offset strings to hours |

### 5. Matching Engine (`src/lib/matching/`)

All functions are **pure** (no I/O, no `Date.now()`). Runs entirely in the browser after the initial job fetch.

#### Data flow in the browser
```
rawJobs (from /api/jobs)  +  criteria (from localStorage)
          │
          ▼
rankJobs(jobs, criteria)
  │
  ├── applyHardFilters(jobs, criteria)
  │     F1: location eligibility
  │     F2: excluded keywords
  │     F3: salary floor
  │
  └── scoreJob(job, criteria)  per kept job
        ├── scoreSkills()       weight 30
        ├── scoreTitle()        weight 20
        ├── scoreSeniority()    weight 10
        ├── scoreSalary()       weight 15
        ├── scoreEmployment()   weight  5
        ├── scoreTimezone()     weight  5
        └── scoreBenefits()     weight 15
              └── extractBenefits(job)  ← benefit dictionary
          │
          ▼
  sort by matchPercent desc, then publishedAt desc
          │
          ▼
  { ranked: (Job & { match: MatchResult })[], excluded: { job, reason }[] }
```

#### Scoring formula
Only active factors (criteria field is non-empty / non-null) contribute:
```
matchPercent = round( 100 × Σ(weight × score) / Σ(weight) )   [over active factors only]
```
If no criteria are set, all factors are inactive and `matchPercent = 100`.

#### `criteria.ts`
- `CriteriaSchema` (Zod) defines and validates the user criteria object.
- `DEFAULT_CRITERIA`: all arrays empty, all nullables null.
- `CRITERIA_STORAGE_KEY = "aiventure.criteria.v1"`.

### 6. CV Parsing Layer (`src/lib/cv/`)

Client-only; never called from the server.

| Module | Purpose |
|--------|---------|
| `parseCv.ts` | Dynamically imports `pdfjs-dist` (PDF) or `mammoth` (DOCX), extracts plain text. Max file size 5 MB. Returns `{ ok: true, text }` or `{ ok: false, error }`. |
| `extractCriteria.ts` | `extractSkills(text)` — word-boundary scan against `SKILLS_DICTIONARY`. `extractJobTitles(text)` — label patterns + proximity to date ranges. `extractSeniority(text)` — same regex as seniority normaliser + years-of-experience heuristic. `mergeExtracted(current, extracted)` — Set-deduplicated append. |
| `skills-dictionary.ts` | ~120-entry flat list of tech skills covering languages, frameworks, databases, cloud/DevOps, AI/ML, and other tech. |

### 7. UI Layer (`src/components/`, `src/hooks/`, `src/app/page.tsx`)

- `page.tsx` is a `"use client"` shell: fetches `/api/jobs`, holds `rawJobs` and `criteria` in React state, runs `rankJobs` in a `useMemo`, and passes results down to `<JobList>` and `<JobDetailPanel>`.
- `useCriteria` (hook): `localStorage` read on mount, debounced write on change, Zod-validated on read.
- All components are pure presentational React; none hold data-fetch logic.

## Data Flow Summary

```
Himalayas API ──┐
                ├──► aggregateJobs() ──► /api/jobs ──► page.tsx rawJobs
Remotive API ───┘                                           │
                                                            │ rankJobs() [browser]
                                     localStorage ──────── criteria
                                                            │
                                                            ▼
                                               ranked jobs with MatchResult
                                                            │
                                                     JobList → JobCard
                                                     JobDetailPanel
```

## Deployment Model

Single Next.js process; no external database; no CDN configuration; no serverless splitting. The in-memory cache (`globalThis.__aiventureCache`) is per-process. This is appropriate for a PoC / single-instance deployment.

Environment variables (server-side only, never `NEXT_PUBLIC_`):
- `HIMALAYAS_API_KEY` — optional, raises rate limits.
- `CACHE_TTL_SECONDS` — overrides default 21,600 s.
- `HIMALAYAS_MAX_PAGES` — overrides default 5 pages.
