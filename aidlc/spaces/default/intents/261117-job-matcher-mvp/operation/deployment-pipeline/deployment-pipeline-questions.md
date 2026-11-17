# Deployment Pipeline — Questions

**Intent:** 261117-job-matcher-mvp  
**Date:** 2026-11-17

> All questions answered from project context (PoC scope, no prior infrastructure design).

---

**Q1: Deployment target?**

[Answer]: Vercel — zero-configuration for Next.js, free Hobby tier covers a PoC, instant rollback via dashboard.

---

**Q2: How many environments?**

[Answer]: Two — Preview (per PR) and Production (main branch). No staging environment for this PoC scope.

---

**Q3: Deployment strategy?**

[Answer]: Rolling deploy (Vercel default). Single instance, atomic traffic cutover. No blue-green or canary needed at PoC scale.

---

**Q4: Quality gates before production deploy?**

[Answer]: `npm test` (289 tests), `npx tsc --noEmit` (0 errors), `npm run lint` (0 errors). Enforced in GitHub Actions; Vercel deploys only when CI is green on `main`.

---

**Q5: Rollback mechanism?**

[Answer]: Vercel dashboard "Promote to Production" on the previous deployment — instant, no rebuild. Fallback: `git revert` + push triggers a new CI/deploy cycle.
