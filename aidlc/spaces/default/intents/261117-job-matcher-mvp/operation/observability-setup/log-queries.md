# Log Queries

**Intent:** 261117-job-matcher-mvp  
**Date:** 2026-11-17  
**Platform:** Vercel function logs

---

## How to access logs

Vercel dashboard → your project → **Deployments** → click a deployment → **Functions** tab → select `/api/jobs` → **View logs**.

Logs are retained for 1 day on the Hobby plan.

---

## Useful log patterns

### Source failures

```
# Both sources failed — user got 502
[/api/jobs] Error

# One source failed — user got partial results
himalayas:  error  (or any HTTP error message)
remotive:   error
```

### Skipped jobs (schema validation failures)

```
# Himalayas returned a job that didn't pass Zod validation
[himalayas] skipped N invalid jobs

# Remotive equivalent
[remotive] skipped N invalid jobs
```

If the skip count increases, the upstream API has changed its schema.

### Cache state

The cache does not log explicitly, but you can infer it:
- If `/api/jobs` responds in < 100 ms → cache hit
- If it responds in 500 ms–2 s → cache miss (fresh upstream fetch)

### Rate limiting (429)

```
HTTP 429  (in function duration + error logs)
```

If Himalayas returns 429, the cache records a `blockedUntil` timestamp. The next
request within the block window returns stale data with `ok: false`. This is expected
and handled; no manual action needed unless it persists beyond the `Retry-After` window.

---

## Local log access (dev server)

```bash
cd web && npm run dev
# All console.warn from himalayas.ts and remotive.ts appear in the terminal
# Server logs also appear in the browser DevTools Network tab
```
