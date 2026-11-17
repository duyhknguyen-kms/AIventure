# Deployment Execution — Questions

**Intent:** 261117-job-matcher-mvp  
**Date:** 2026-11-17

> No deployment infrastructure existed prior to this stage. All questions answered
> from project context (PoC scope, Vercel target defined in Deployment Pipeline).

---

**Q1: Is there an existing production environment to deploy to?**

[Answer]: No. This is a greenfield PoC. The first production deploy requires a one-time
Vercel project setup (`vercel link`, environment variables). Instructions are in
`deployment-log.md`.

---

**Q2: What constitutes a successful deployment?**

[Answer]: HTTP 200 on both `/` and `/api/jobs`, with at least one source returning
`ok: true` and a non-empty `jobs` array. Detailed in `smoke-test-results.md`.

---

**Q3: Has the production deployment been executed?**

[Answer]: No. The application passes all pre-deployment quality gates locally (289 tests,
0 TypeScript errors, 0 lint errors). Production deployment is pending one-time Vercel
project setup by the developer.

---

**Q4: What is the rollback plan?**

[Answer]: Vercel dashboard → Deployments → "Promote to Production" on the previous version.
Instant, no rebuild. Full runbook in `deployment-pipeline/rollback-runbook.md`.
