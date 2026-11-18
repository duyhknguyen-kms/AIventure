# CD Configuration

**Intent:** 261117-job-matcher-mvp  
**Date:** 2026-11-17  
**Platform:** GitHub Actions + Vercel

---

## GitHub Actions CI workflow

Create `.github/workflows/ci.yml` in the repo root:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: web

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: web/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npx tsc --noEmit

      - name: Lint
        run: npm run lint

      - name: Test
        run: npm test
```

This workflow runs on every push and PR. All three checks must pass before Vercel is allowed to promote a build to production.

---

## Vercel project setup

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Link project (run from repo root)
vercel link

# 3. Set root directory to web/
# → In Vercel dashboard: Settings → General → Root Directory: web

# 4. Set build command
# → Build Command: npm run build
# → Output Directory: .next (default)
# → Install Command: npm ci

# 5. Add environment variables
# → Settings → Environment Variables
# HIMALAYAS_API_KEY  = <your key>  (Production only, not preview)
# CACHE_TTL_SECONDS  = 21600
# HIMALAYAS_MAX_PAGES = 5
```

---

## Branch protection (GitHub)

Recommended settings for the `main` branch:

```
Branch protection rules for: main
  ✅ Require status checks to pass before merging
      ✅ CI / test (GitHub Actions)
  ✅ Require branches to be up to date before merging
  ✅ Do not allow bypassing the above settings
```

---

## Deployment trigger flow

```
Developer pushes to main
        │
        ▼
GitHub Actions runs: tsc → lint → npm test
        │
    Pass? ──No──► Block merge / notify
        │ Yes
        ▼
Vercel detects push to main
        │
        ▼
Vercel builds: npm ci → npm run build
        │
        ▼
Vercel deploys to production URL
        │
        ▼
Smoke test (manual): curl /api/jobs
```

---

## Vercel project JSON (optional — `vercel.json` at `web/` root)

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm ci",
  "framework": "nextjs"
}
```

This makes the Vercel build reproducible from the CLI as well as the dashboard.
