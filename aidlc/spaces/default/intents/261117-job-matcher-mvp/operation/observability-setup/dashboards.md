# Dashboards

**Intent:** 261117-job-matcher-mvp  
**Date:** 2026-11-17  
**Platform:** Vercel built-in + browser DevTools

---

## Vercel built-in monitoring

Vercel provides function-level observability at no extra cost for all deployments.

### How to access

1. Open [vercel.com](https://vercel.com) → your project
2. Click **Analytics** tab — traffic, page views, Web Vitals
3. Click **Functions** tab — serverless function invocations, duration, errors

### Key panels to monitor

| Panel | What to watch |
|---|---|
| **Functions → Invocations** | Request rate to `/api/jobs` — spikes indicate traffic or retry loops |
| **Functions → Duration** | p50/p95/p99 latency for `GET /api/jobs` |
| **Functions → Errors** | Error rate — any 5xx here warrants investigation |
| **Analytics → Web Vitals** | LCP (Largest Contentful Paint) — target < 2.5 s |
| **Deployments → Functions logs** | Per-request structured logs from Next.js |

---

## Browser DevTools (developer self-monitoring)

```bash
# Open Chrome DevTools → Network tab → filter by /api/jobs
# Check:
# - Response time (< 100 ms on cache hit)
# - Response body has jobs[] and sources[].ok === true

# Console: check for React hydration errors or unhandled promise rejections
```

---

## Application-level metrics already in place

The API route logs two implicit metrics:

| Log line | Meaning |
|---|---|
| `[himalayas] skipped N invalid jobs` | Schema validation failures from Himalayas |
| `[remotive] skipped N invalid jobs` | Schema validation failures from Remotive |
| `[/api/jobs]` + error | Uncaught error in aggregation |

These appear in Vercel function logs and are searchable.

---

## Future dashboard (post-PoC)

For a production deployment with real traffic, consider:
- **Datadog** or **Grafana Cloud** (free tiers) for custom metrics
- A `/api/health` endpoint returning JSON with source status and cache age
- Uptime monitoring via UptimeRobot or Vercel's own status page integration
