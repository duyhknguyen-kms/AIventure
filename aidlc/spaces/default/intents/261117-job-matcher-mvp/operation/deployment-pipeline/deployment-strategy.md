# Deployment Strategy

**Intent:** 261117-job-matcher-mvp  
**Date:** 2026-11-17  
**Lead:** Pipeline & Deploy Agent

---

## Context

AIventure is a single Next.js 16 application (`web/`) with no database, no authentication, and no stateful backend beyond an in-memory TTL cache per server process. It is a PoC MVP designed to be demoed and reviewed, not scaled to high traffic. The in-memory cache means no session state to preserve across deploys.

---

## Deployment target

**Vercel** — the natural zero-configuration deployment platform for Next.js.

Rationale:
- Next.js is Vercel's native framework; `next build` output is fully supported
- Free Hobby tier covers a PoC with no traffic commitments
- Automatic HTTPS, CDN edge caching, and instant rollback via dashboard
- No infrastructure provisioning required (IAC out of scope for `express` scope)
- Alternative considered: Railway — simpler than Vercel for a pure Node server, but Vercel's Next.js integration eliminates all configuration

---

## Environments

| Environment | Trigger | Purpose |
|---|---|---|
| **Preview** | Push to any non-main branch / PR | Per-PR preview URL for review |
| **Production** | Merge to `main` | Live demo URL |

No staging environment is defined for this PoC. The preview environment serves that purpose.

---

## Strategy

**Rolling deploy** (Vercel default). Each production deploy:
1. Builds the new version in isolation
2. Cuts traffic over atomically (no blue-green split needed at PoC scale)
3. Previous deployment remains available for instant rollback via Vercel dashboard

---

## Quality gates before production

The following must pass on `main` before Vercel builds and deploys:

```
npm test          → 289 / 289 passing
npx tsc --noEmit  → 0 errors
npm run lint      → 0 errors
```

These are enforced in the CI pipeline (GitHub Actions; see `cd-config.md`).
Vercel builds only when the CI status check on `main` is green.

---

## Environment variables

Set in Vercel project settings → Environment variables. Never in code.

| Variable | Env | Secret |
|---|---|---|
| `HIMALAYAS_API_KEY` | Production | Yes |
| `CACHE_TTL_SECONDS` | Production | No (default 21600) |
| `HIMALAYAS_MAX_PAGES` | Production | No (default 5) |

**Important:** `HIMALAYAS_API_KEY` must NOT be prefixed `NEXT_PUBLIC_` — it is server-only.

---

## Smoke test (post-deploy)

After Vercel marks a deployment live, verify manually:

```bash
# 1. HTTP 200 on the dashboard
curl -sf https://<your-vercel-url>/ -o /dev/null -w "%{http_code}\n"

# 2. API returns jobs
curl -sf https://<your-vercel-url>/api/jobs | python3 -c "
import json,sys; d=json.load(sys.stdin)
print('jobs:', len(d['jobs']), 'sources:', [s['name'] for s in d['sources']])
"
```

---

## Limitations for this PoC

- In-memory cache does not persist across Vercel function cold starts or deployments. The first request after deploy will hit both upstream APIs. This is acceptable for a PoC.
- Vercel Hobby tier has a 10 s serverless function timeout. The upstream APIs respond in < 2 s each; the 6 h cache prevents repeated calls.
- No monitoring or alerting is configured (operation phase observability stage handles this).
