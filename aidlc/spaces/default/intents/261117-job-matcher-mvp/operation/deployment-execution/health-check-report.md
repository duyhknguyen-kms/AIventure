# Health Check Report

**Intent:** 261117-job-matcher-mvp  
**Date:** 2026-11-17  
**Environment:** Local dev server

---

## Health indicators

| Check | Status | Notes |
|---|---|---|
| Dashboard page | ✅ Healthy | HTTP 200, renders job cards |
| `GET /api/jobs` | ✅ Healthy | 117 jobs, both sources ok |
| In-memory cache | ✅ Healthy | Cache hit on second request |
| Himalayas source | ✅ Healthy | 100 jobs, cached: true |
| Remotive source | ✅ Healthy | 17 jobs, cached: true |
| `npm test` | ✅ 289/289 | All tests green |
| TypeScript | ✅ 0 errors | |
| Lint | ✅ 0 errors | 5 non-blocking warnings in test files |

---

## Application health definition

The application is **healthy** when:
1. `GET /` returns HTTP 200
2. `GET /api/jobs` returns HTTP 200 with a non-empty `jobs` array and at least one `sources[].ok === true`

The application is **degraded** when:
- One source returns `ok: false` but the other is healthy (partial results shown with `SourceStatusBanner`)

The application is **down** when:
- `GET /` or `GET /api/jobs` returns non-200
- Both sources fail with no stale cache (`GET /api/jobs` returns 502)

---

## Known limitations (PoC)

- **In-memory cache does not persist** across server restarts or Vercel cold starts. First request after a cold start hits both upstream APIs (~0.5–1 s combined, within Vercel's 10 s function timeout).
- **No health endpoint** (`/api/health`) exists. The `/api/jobs` endpoint serves as the de facto health check.
- **No monitoring or alerting** is configured — this is handled in the Observability Setup stage.
- **No database** to monitor for connection health.
