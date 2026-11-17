# Alarms & Alerts

**Intent:** 261117-job-matcher-mvp  
**Date:** 2026-11-17  
**Platform:** Vercel (PoC — no automated alerting infrastructure)

---

## PoC alert strategy

For this PoC, automated alerting is not set up. The monitoring is manual and event-driven:
- Check Vercel function logs after a deployment
- Check if the demo URL responds before a presentation
- Review the Vercel Functions error rate weekly

---

## Alert thresholds to implement post-PoC

If the app graduates to production with real users, add these alerts:

| Alert | Trigger | Channel | Runbook |
|---|---|---|---|
| **High error rate** | Error rate > 5% over 5 min | Email / Slack | Check Vercel logs → `[/api/jobs]` errors |
| **Both sources down** | `/api/jobs` returns 502 | Email / Slack | Check upstream APIs; verify HIMALAYAS_API_KEY |
| **Slow API** | p95 latency > 10 s | Email | Cold start issue; check Vercel function timeout setting |
| **Deployment failure** | GitHub Actions CI fails | GitHub notification (default) | Fix failing tests; do not push to main until green |

---

## Immediate alert (manual smoke test)

The closest thing to an automated alert for this PoC is the GitHub Actions CI check on `main`. Every push triggers:
1. `npx tsc --noEmit` — type errors would indicate a broken build
2. `npm run lint` — lint errors block merge
3. `npm test` — a failing test indicates a regression

These run before Vercel deploys, so a broken build never reaches production.

---

## Vercel deployment notifications

Enable in Vercel project settings → Notifications:
- **Deployment failed** → email notification (default)
- **Deployment succeeded** → optional

This covers the most critical "my deploy broke production" scenario without any extra tooling.
