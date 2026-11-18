# Build Instructions

**Intent:** 261117-job-matcher-mvp  
**Date:** 2026-11-17

## Prerequisites

- Node.js 20+ on PATH (`node -v` to verify; see web/README.md for install)
- Dependencies installed: `cd web && npm install`
- Environment: `web/.env.local` exists (copy from `web/.env.example`)

## Commands

```bash
# Install dependencies (first time or after package changes)
cd web && npm install

# Run all tests (289 tests, ~5 s)
cd web && npm test

# TypeScript type check (0 errors expected)
cd web && npx tsc --noEmit

# Lint (0 errors expected)
cd web && npm run lint

# Development server
cd web && npm run dev        # http://localhost:3000

# Production build
cd web && npm run build
```

## Environment variables (`web/.env.local`)

| Variable | Default | Required |
|---|---|---|
| `HIMALAYAS_API_KEY` | (empty) | No — optional for higher rate limits |
| `CACHE_TTL_SECONDS` | `21600` | No |
| `HIMALAYAS_MAX_PAGES` | `5` | No |

## Verification command

The build is verified when all three pass with zero failures/errors:

```bash
cd web && npm test && npx tsc --noEmit && npm run lint
```
