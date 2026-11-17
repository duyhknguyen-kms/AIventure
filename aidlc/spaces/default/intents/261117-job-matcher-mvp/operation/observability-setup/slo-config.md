# SLO Configuration

**Intent:** 261117-job-matcher-mvp  
**Date:** 2026-11-17  
**Environment:** Vercel (PoC)

> SLOs are proportional to the PoC's real user base and risk profile.
> These are informal targets, not contractual SLAs.

---

## SLI/SLO definitions

### SLO-1 · Availability

| Field | Value |
|---|---|
| SLI | Percentage of requests to `/` and `/api/jobs` that return HTTP 2xx |
| Target | ≥ 99.0% over a 7-day rolling window |
| Measurement | Vercel Functions tab → error rate |
| Error budget | 1.0% → ~1.7 h downtime per week |

**Rationale:** 99.0% is appropriate for a PoC with no on-call rotation. 99.9% would require automated alerting we don't have.

---

### SLO-2 · API latency (p95)

| Field | Value |
|---|---|
| SLI | p95 response time of `GET /api/jobs` |
| Target | ≤ 2 s on cache hit; ≤ 5 s on cold fetch (first call after deploy) |
| Measurement | Vercel Functions tab → duration |
| Notes | Cold-fetch latency is bounded by upstream API response times (~0.5–1 s each). Cache hits should be < 100 ms. |

---

### SLO-3 · Job data freshness

| Field | Value |
|---|---|
| SLI | At least one job source returns `ok: true` per request |
| Target | ≥ 95% of requests over a 24 h window return at least one healthy source |
| Measurement | Manual: check Vercel logs for `[himalayas] skipped` or source error messages |
| Notes | 5% headroom covers expected Himalayas or Remotive outages (both documented as intermittent). |

---

## Error budget policy (PoC)

| Budget remaining | Action |
|---|---|
| > 50% | No action — normal operation |
| 25–50% | Investigate recent errors in Vercel logs |
| < 25% | Pause non-critical feature work; prioritise stability |
| 0% | Notify stakeholders; halt new deployments until budget recovers |
