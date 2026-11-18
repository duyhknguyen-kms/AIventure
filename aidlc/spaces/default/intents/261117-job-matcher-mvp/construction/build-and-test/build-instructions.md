# Build Instructions

**Stage:** build-and-test  
**Intent:** 261117-job-matcher-mvp  
**Date:** 2026-11-18

---

## Prerequisites

- Node.js 20 LTS or newer
- npm (bundled with Node.js)

## Setup

```bash
# From repo root
cd web
npm install
cp .env.example .env.local   # add API keys as needed
```

## Commands

| Command | Purpose |
|---------|---------|
| `npm test` | Full unit + component + a11y test suite (Vitest, one pass) |
| `npm run test:watch` | Watch mode |
| `npm test -- --coverage` | With V8 coverage report |
| `npm run lint` | ESLint (zero errors required) |
| `npx tsc --noEmit` | TypeScript strict type check |
| `npm run build` | Next.js production build |
| `npm run dev` | Dev server on http://localhost:3000 |

## Verification command

```bash
cd web && npm test && npx tsc --noEmit && npm run lint >/dev/null && npm run build
```

Expected: 0 test failures, 0 type errors, 0 lint errors, successful build output.
