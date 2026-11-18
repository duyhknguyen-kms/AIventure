# Anomaly Detection Configuration

**Intent:** 261117-job-matcher-mvp  
**Date:** 2026-11-17  
**Platform:** Vercel (PoC)

---

## Automated anomaly detection: not configured

Automated anomaly detection (ML-based alerting on unusual traffic or error patterns)
is not set up for this PoC. The traffic volume is too low and too irregular to
produce meaningful baselines.

---

## Manual anomaly indicators

Watch for these patterns in Vercel function logs and the Vercel Analytics dashboard:

| Pattern | Possible cause | Action |
|---|---|---|
| Sudden spike in function invocations | Traffic spike, crawler, or retry loop | Check referrer; add rate limiting if abuse |
| `skipped N invalid jobs` count increasing | Upstream API changed schema | Check Himalayas or Remotive docs; update Zod schema |
| All requests returning 502 | Both sources down simultaneously | Check both API status pages; use stale cache manually |
| p95 latency increasing gradually | Upstream API slowing down | Check Himalayas API status; consider reducing `HIMALAYAS_MAX_PAGES` |
| `HTTP 429` repeated | Rate limit exhausted | Ensure `HIMALAYAS_API_KEY` is set; verify 6 h TTL is working |

---

## Post-PoC anomaly detection

For a production deployment, consider:
- **Vercel Speed Insights** — detects Web Vitals regressions per deploy
- **UptimeRobot** (free) — 5-minute external ping to `/api/jobs`; emails on downtime
- **Datadog APM** — ML-based anomaly detection on function duration and error rate
