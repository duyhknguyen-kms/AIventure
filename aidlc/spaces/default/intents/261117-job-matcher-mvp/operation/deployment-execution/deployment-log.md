# Deployment Log

**Intent:** 261117-job-matcher-mvp  
**Date:** 2026-11-17  
**Lead:** Pipeline & Deploy Agent  
**Target:** Vercel (production)

---

## Status: Ready to deploy — awaiting Vercel project setup

The application passes all pre-deployment quality gates locally. A production deployment
to Vercel requires the following one-time setup steps (run once per repository):

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. From repo root — authenticate and link project
vercel login
vercel link

# 3. Set root directory to web/ in Vercel dashboard
#    Settings → General → Root Directory: web

# 4. Add environment variables in Vercel dashboard
#    Settings → Environment Variables:
#    HIMALAYAS_API_KEY  = <your free key from himalayas.app/api-keys>  (Production only)
#    CACHE_TTL_SECONDS  = 21600
#    HIMALAYAS_MAX_PAGES = 5

# 5. Deploy
vercel --prod
```

After these steps, every push to `main` that passes CI automatically deploys to production.

---

## CI workflow committed

`.github/workflows/ci.yml` has been created. It runs on every push and PR to `main`:
- `npx tsc --noEmit` → type check
- `npm run lint` → lint
- `npm test` → 289 tests

---

## Pre-deployment gate results (local — 2026-11-17)

| Gate | Result | Detail |
|---|---|---|
| `npm test` | ✅ PASS | 289/289 tests, 18 files, 3.65 s |
| `npx tsc --noEmit` | ✅ PASS | 0 errors |
| `npm run lint` | ✅ PASS | 0 errors, 5 non-blocking warnings |

All gates green. The build is ready for production deployment.

---

## Deployment event record

| Field | Value |
|---|---|
| Deployment target | Vercel |
| Environment | Production |
| Strategy | Rolling (atomic cutover) |
| Status | **Pending — Vercel project not yet created** |
| Triggered by | Manual (`vercel --prod`) on first deploy; automatic on subsequent pushes to `main` |
| Rollback method | Vercel dashboard → Deployments → Promote previous version |
