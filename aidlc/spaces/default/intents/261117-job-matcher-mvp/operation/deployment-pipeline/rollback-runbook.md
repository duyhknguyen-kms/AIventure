# Rollback Runbook

**Intent:** 261117-job-matcher-mvp  
**Date:** 2026-11-17

---

## When to roll back

Trigger a rollback when any of the following are observed after a production deployment:

| Signal | Threshold |
|---|---|
| `GET /api/jobs` returns non-200 | Immediately |
| Dashboard page returns non-200 | Immediately |
| API response body is missing `jobs` or `sources` fields | Immediately |
| All `sources[].ok` are `false` with no stale cache | Immediately |

---

## Rollback via Vercel dashboard (fastest — < 1 min)

1. Open [vercel.com](https://vercel.com) → your project → **Deployments** tab
2. Find the last known-good deployment (the one before this deploy)
3. Click **⋯** → **Promote to Production**
4. Vercel instantly cuts traffic to the previous build — no rebuild required
5. Verify: `curl -sf https://<your-url>/api/jobs | python3 -c "import json,sys; d=json.load(sys.stdin); print('OK' if d['jobs'] else 'EMPTY')"`

---

## Rollback via Vercel CLI

```bash
# List recent deployments
vercel ls --prod

# Promote a specific deployment URL to production
vercel promote <deployment-url>
```

---

## Rollback via git revert (slower — triggers a fresh build)

Only use this if the Vercel dashboard rollback is not available:

```bash
git revert HEAD            # or revert the specific commit that caused the issue
git push origin main       # triggers CI → Vercel build → deploy
```

---

## Post-rollback actions

1. **Verify** the rollback smoke test passes (see deployment-strategy.md)
2. **Notify** stakeholders: "Rolled back to previous version due to [brief reason]"
3. **Investigate** the failed deployment:
   - Check Vercel function logs: dashboard → deployment → Functions → View logs
   - Check GitHub Actions run: confirm CI was green before the deploy
   - Review the diff between the rolled-back version and the failed version
4. **Fix** the root cause in a feature branch; do not deploy to main until CI is green
5. **Post-mortem** (optional for PoC): document the root cause in a brief entry

---

## In-memory cache behaviour during rollback

The in-memory cache (`globalThis.__aiventureCache`) is per-process and does not persist. After a rollback, the first request hits both upstream APIs. This is expected — subsequent requests within the 6 h TTL window are served from the refreshed cache.

---

## There is no database to roll back

AIventure has no database. Criteria live in browser `localStorage` (client-side only) and are unaffected by server-side rollbacks.
